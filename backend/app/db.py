from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings
from app.models import User, AnalysisHistory, ChatSession, CommunityMessage, CommunityRoom

from motor.motor_asyncio import AsyncIOMotorGridFSBucket

# Global GridFS bucket
fs = None

async def init_db():
    global fs
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.cropic_db
    fs = AsyncIOMotorGridFSBucket(db)
    
    await init_beanie(
        database=db, 
        document_models=[User, AnalysisHistory, ChatSession, CommunityMessage, CommunityRoom]
    )

