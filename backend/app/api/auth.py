from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from datetime import timedelta
from app.core.config import settings
from app.models import User
from app.core.security import create_access_token
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class LoginRequest(BaseModel):
    email: EmailStr
    name: str = "User" # Optional name for new users

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        # Try to decode as Custom JWT
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await User.find_one(User.email == email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/auth/login")
async def login(request: LoginRequest):
    email = request.email
    name = request.name
    
    user = await User.find_one(User.email == email)
    is_new_user = False
    
    if not user:
        # New user - needs to fill profile
        # Use default picture or empty
        user = User(email=email, name=name, picture="")
        await user.insert()
        is_new_user = True
    else:
        # Update name if provided and not set? Or just ignore.
        # For now, let's just keep existing logic of not updating unless explicit.
        pass

    # Check if profile is complete (has required fields)
    profile_complete = bool(
        user.location and 
        user.land_size and 
        user.crops_grown and
        user.preferred_language
    )

    # Create Access Token
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
