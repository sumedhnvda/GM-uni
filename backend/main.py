from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, endpoints
from app.db import init_db

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.services.news_service import news_service

app = FastAPI(title="Cropic API")

# Initialize Scheduler
scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def on_startup():
    await init_db()
    
    # Schedule weekly news broadcast (e.g., every Monday at 9:00 AM)
    # For testing purposes, we can also trigger it manually via endpoint
    # scheduler.add_job(news_service.broadcast_weekly_update, 'cron', day_of_week='mon', hour=9, minute=0)
    # scheduler.start()
    # print("Scheduler started: Weekly agricultural updates scheduled for Monday 9:00 AM.")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
def read_root():
    return {"message": "Welcome to Cropic API"}

from app.api import auth
from app.api import endpoints
from app.api import community_chat

app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(endpoints.router, prefix="/api/v1", tags=["analysis"])
app.include_router(community_chat.router, prefix="/api/v1", tags=["community"])

# WebSocket endpoint at /api/ws/live (without v1)
from app.api.endpoints import websocket_endpoint
app.add_api_websocket_route("/api/ws/live", websocket_endpoint)

from fastapi.staticfiles import StaticFiles
import os

# Create uploads directory if not exists
os.makedirs("uploads", exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# Community WebSocket at /api/ws/community/{room_id}
from app.api.community_chat import websocket_chat
app.add_api_websocket_route("/api/ws/community/{room_id}", websocket_chat)
