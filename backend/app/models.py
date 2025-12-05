from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from beanie import Document
from datetime import datetime

class User(Document):
    email: EmailStr
    name: str
    username: Optional[str] = None  # Unique username
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # male, female, other
    caste_category: Optional[str] = None  # general, obc, sc, st
    farming_experience: Optional[str] = None  # e.g., "5 years", "beginner"
    picture: Optional[str] = None  # Google profile picture URL
    location: Optional[str] = None
    land_size: Optional[str] = None
    crops_grown: Optional[str] = None
    preferred_language: str = "en"
    phone_number: Optional[str] = None
    sms_enabled: bool = False
    community_room: Optional[str] = None  # Auto-assigned based on location
    
    class Settings:
        name = "users"

class CommunityMessage(Document):
    """Message in community chat room."""
    room_id: str  # City/district name normalized
    user_email: str
    user_name: str
    user_picture: Optional[str] = None  # Google profile pic
    content: str
    message_type: str = "text"  # text, image, video
    media_url: Optional[str] = None
    created_at: datetime = datetime.now()
    is_deleted: bool = False
    
    class Settings:
        name = "community_messages"

class CommunityRoom(Document):
    """Community chat room for a city/district."""
    room_id: str  # Unique, normalized city name
    display_name: str  # Human readable name
    member_count: int = 0
    created_at: datetime = datetime.now()
    
    class Settings:
        name = "community_rooms"

class AnalysisHistory(Document):
    user_email: EmailStr
    location: str
    land_size: str
    previous_crops: str
    soil_type: str
    recommended_crops: List[str]
    weather_analysis: str
    price_prediction: str
    detailed_advice: str
    applicable_schemes: Optional[str] = None  # Government schemes
    created_at: datetime = datetime.now()
    
    class Settings:
        name = "analyses"

class ChatSession(Document):
    user_email: EmailStr
    title: str
    messages: List[Dict[str, str]]
    created_at: datetime = datetime.now()
    updated_at: datetime = datetime.now()

    class Settings:
        name = "chats"

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


class UserInput(BaseModel):
    location: str
    land_size: str # Allow any format/language
    previous_crops: str # Allow any format/language
    language: str = "en" # en, hi, kn
    
class AnalysisResult(BaseModel):
    soil_type: str
    recommended_crops: List[str]
    weather_analysis: str
    price_prediction: str
    detailed_advice: str
    applicable_schemes: Optional[str] = None  # Government schemes for farmers

