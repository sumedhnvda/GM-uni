from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from google.oauth2 import id_token
from google.auth.transport import requests
from datetime import timedelta 
from app.core.config import settings
from app.models import User, Token 
from app.core.security import create_access_token

router = APIRouter()

from jose import jwt, JWTError

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def verify_google_token(token: str):
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), settings.GOOGLE_CLIENT_ID)
        return idinfo
    except ValueError:
        return None

async def verify_token(token: str) -> User:
    try:
        # Try to decode as Custom JWT
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            print("Auth Error: Email is None in payload")
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError as e:
        print(f"Auth Error: JWT Decode Failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await User.find_one(User.email == email)
    if user is None:
        print(f"Auth Error: User not found for email {email}")
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_current_user(token: str = Depends(oauth2_scheme)):
    return await verify_token(token)

@router.post("/auth/google")
async def google_login(token: str):
    # 1. Verify Google Token
    idinfo = await verify_google_token(token)
    if not idinfo:
        raise HTTPException(status_code=401, detail="Invalid Google Token")

    # 2. Create/Update User
    email = idinfo['email']
    name = idinfo.get('name', '')
    picture = idinfo.get('picture', '')

    user = await User.find_one(User.email == email)
    is_new_user = False
    
    if not user:
        # New user - needs to fill profile
        user = User(email=email, name=name, picture=picture)
        await user.insert()
        is_new_user = True
    else:
        user.name = name
        user.picture = picture
        await user.save()

    # Check if profile is complete (has required fields)
    profile_complete = bool(
        user.location and 
        user.land_size and 
        user.crops_grown and
        user.preferred_language
    )

    # 3. Create Access Token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "is_new_user": is_new_user,
        "profile_complete": profile_complete
    }
