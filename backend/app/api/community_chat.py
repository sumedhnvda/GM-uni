"""
Community Chat API - Real-time WebSocket chat for farmers by location.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, UploadFile, File
from typing import Dict, List, Set, Optional
from datetime import datetime, timezone, timedelta
import json
import re
import base64
import os

# IST timezone (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

from app.models import User, CommunityMessage, CommunityRoom

from app.services.gemini_service import gemini_service
from app.api.auth import verify_token, get_current_user
from app import db
from fastapi.responses import StreamingResponse
from bson import ObjectId

router = APIRouter(prefix="/community", tags=["community"])

# Connection manager for WebSocket rooms
class ConnectionManager:
    def __init__(self):
        # room_id -> set of (websocket, user_email, user_name, user_picture)
        self.active_connections: Dict[str, List[tuple]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, user_email: str, user_name: str, user_picture: str = None):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append((websocket, user_email, user_name, user_picture))
        
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id] = [
                conn for conn in self.active_connections[room_id] 
                if conn[0] != websocket
            ]
            
    async def broadcast(self, room_id: str, message: dict):
        """Send message to all connections in a room."""
        if room_id in self.active_connections:
            for websocket, _, _, _ in self.active_connections[room_id]:
                try:
                    await websocket.send_json(message)
                except:
                    pass
                    
    def get_online_users(self, room_id: str) -> List[dict]:
        """Get list of online users in a room."""
        if room_id not in self.active_connections:
            return []
        return [
            {"email": email, "name": name, "picture": pic}
            for _, email, name, pic in self.active_connections[room_id]
        ]

manager = ConnectionManager()


def normalize_room_id(location: str) -> str:
    """Convert location to normalized room ID."""
    if not location:
        return "general"
    # Extract city/district - take first part before comma
    city = location.split(",")[0].strip()
    # Normalize: lowercase, remove special chars, replace spaces with dash
    room_id = re.sub(r'[^a-z0-9\s]', '', city.lower())
    room_id = re.sub(r'\s+', '-', room_id.strip())
    return room_id or "general"


async def get_or_create_room(location: str) -> CommunityRoom:
    """Get or create a community room for a location."""
    room_id = normalize_room_id(location)
    display_name = location.split(",")[0].strip() if location else "General"
    
    room = await CommunityRoom.find_one(CommunityRoom.room_id == room_id)
    if not room:
        room = CommunityRoom(
            room_id=room_id,
            display_name=f"{display_name} Farmers",
            member_count=0
        )
        await room.save()
    return room


async def assign_user_to_room(user: User) -> str:
    """Assign user to their location-based room."""
    room = await get_or_create_room(user.location)
    
    # Update user's community_room if not set or changed
    if user.community_room != room.room_id:
        # Decrement old room count if exists
        if user.community_room:
            old_room = await CommunityRoom.find_one(CommunityRoom.room_id == user.community_room)
            if old_room and old_room.member_count > 0:
                old_room.member_count -= 1
                await old_room.save()
        
        # Increment new room count
        room.member_count += 1
        await room.save()
        
        # Update user
        user.community_room = room.room_id
        await user.save()
    
    return room.room_id


# REST Endpoints

@router.get("/my-room")
async def get_my_room(current_user: User = Depends(get_current_user)):
    """Get current user's community room info."""
    room_id = await assign_user_to_room(current_user)
    room = await CommunityRoom.find_one(CommunityRoom.room_id == room_id)
    
    return {
        "room_id": room.room_id,
        "display_name": room.display_name,
        "member_count": room.member_count,
        "user_location": current_user.location
    }


@router.get("/messages/{room_id}")
async def get_messages(room_id: str, limit: int = 50, current_user: User = Depends(get_current_user)):
    """Get recent messages from a room."""
    messages = await CommunityMessage.find(
        CommunityMessage.room_id == room_id,
        CommunityMessage.is_deleted == False
    ).sort(-CommunityMessage.created_at).limit(limit).to_list()
    
    # Reverse to get chronological order
    messages.reverse()
    
    return [
        {
            "id": str(msg.id),
            "user_email": msg.user_email,
            "user_name": msg.user_name,
            "user_picture": msg.user_picture,
            "content": msg.content,
            "message_type": msg.message_type,
            "media_url": msg.media_url,
            "created_at": msg.created_at.isoformat(),
            "is_own": msg.user_email == current_user.email
        }
        for msg in messages
    ]


@router.get("/online/{room_id}")
async def get_online_users(room_id: str, current_user: User = Depends(get_current_user)):
    """Get online users in a room."""
    return manager.get_online_users(room_id)


@router.delete("/message/{message_id}")
async def delete_message(message_id: str, current_user: User = Depends(get_current_user)):
    """Delete own message."""
    from bson import ObjectId
    msg = await CommunityMessage.get(ObjectId(message_id))
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.user_email != current_user.email:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")
    
    msg.is_deleted = True
    msg.content = "[Message deleted]"
    await msg.save()
    
    # Broadcast deletion
    await manager.broadcast(msg.room_id, {
        "type": "message_deleted",
        "message_id": message_id
    })
    
    return {"status": "deleted"}


@router.get("/media/{file_id}")
async def get_media(file_id: str):
    """Stream media file from GridFS."""
    try:
        if not db.fs:
            raise HTTPException(status_code=500, detail="GridFS not initialized")
            
        oid = ObjectId(file_id)
        grid_out = await db.fs.open_download_stream(oid)
        
        return StreamingResponse(
            grid_out, 
            media_type=grid_out.metadata.get("content_type", "application/octet-stream")
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="File not found")


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload media file for chat with moderation and GridFS storage."""
    # Validate file type
    if not file.content_type.startswith(("image/", "video/")):
        raise HTTPException(status_code=400, detail="Only images and videos are allowed")
    
    # Check file size
    # Read file into memory to check size and moderate
    # Limit: 10MB for images, 50MB for videos
    MAX_IMAGE_SIZE = 10 * 1024 * 1024
    MAX_VIDEO_SIZE = 50 * 1024 * 1024
    
    limit = MAX_VIDEO_SIZE if file.content_type.startswith("video/") else MAX_IMAGE_SIZE
    
    content = await file.read()
    
    if len(content) > limit:
        raise HTTPException(status_code=400, detail=f"File too large. Limit is {limit // (1024*1024)}MB")
        

    
    # Upload to GridFS
    if not db.fs:
        raise HTTPException(status_code=500, detail="GridFS not initialized")
        
    file_id = await db.fs.upload_from_stream(
        file.filename, 
        content,
        metadata={"content_type": file.content_type, "user_id": str(current_user.id)}
    )
    
    # Return URL
    # Assuming API is mounted at /api/v1, so full path is /api/v1/community/media/{file_id}
    # But frontend might need full URL or relative. Let's return relative to API root.
    return {"url": f"/api/v1/community/media/{str(file_id)}", "type": file.content_type}


# WebSocket Endpoint

@router.websocket("/ws/{room_id}")
async def websocket_chat(websocket: WebSocket, room_id: str, token: Optional[str] = None):
    """WebSocket endpoint for real-time community chat."""
    
    # Authenticate
    try:
        if not token or token == "null" or token == "undefined":
            await websocket.close(code=4001)
            return
        
        user = await verify_token(token)
        if not user:
            await websocket.close(code=4001)
            return
    except Exception as e:
        print(f"WebSocket auth error: {e}")
        await websocket.close(code=4001)
        return
    
    # Connect to room
    await manager.connect(websocket, room_id, user.email, user.full_name or user.name, user.picture)
    
    try:
        # Notify room about new user
        await manager.broadcast(room_id, {
            "type": "user_joined",
            "user_name": user.full_name or user.name,
            "user_picture": user.picture,
            "online_count": len(manager.get_online_users(room_id))
        })
        
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "message":
                content = data.get("content", "").strip()
                message_type = data.get("message_type", "text")
                media_url = data.get("media_url")
                
                if not content and not media_url:
                    continue
                
                client_id = data.get("client_id")

                # Moderate text content with proper error handling
                if content and message_type == "text":
                    try:
                        is_allowed, reason = await gemini_service.moderate_text(content)
                        if not is_allowed:
                            await websocket.send_json({
                                "type": "moderation_warning",
                                "message": f"Message blocked: {reason}",
                                "client_id": client_id
                            })
                            continue
                    except Exception as e:
                        # On any moderation error, allow the message through
                        print(f"Moderation error (allowing message): {e}")
                
                # Save message with IST timestamp
                msg = CommunityMessage(
                    room_id=room_id,
                    user_email=user.email,
                    user_name=user.full_name or user.name,
                    user_picture=user.picture,
                    content=content,
                    message_type=message_type,
                    media_url=media_url,
                    created_at=datetime.now(IST)
                )
                await msg.save()
                
                # Keep only last 50 messages per room - delete older ones
                MAX_MESSAGES = 50
                message_count = await CommunityMessage.find(
                    CommunityMessage.room_id == room_id,
                    CommunityMessage.is_deleted == False
                ).count()
                
                if message_count > MAX_MESSAGES:
                    # Get oldest messages to delete
                    excess = message_count - MAX_MESSAGES
                    old_messages = await CommunityMessage.find(
                        CommunityMessage.room_id == room_id,
                        CommunityMessage.is_deleted == False
                    ).sort(CommunityMessage.created_at).limit(excess).to_list()
                    
                    for old_msg in old_messages:
                        await old_msg.delete()
                
                # Broadcast to room
                await manager.broadcast(room_id, {
                    "type": "new_message",
                    "client_id": client_id,
                    "message": {
                        "id": str(msg.id),
                        "user_email": msg.user_email,
                        "user_name": msg.user_name,
                        "user_picture": msg.user_picture,
                        "content": msg.content,
                        "message_type": msg.message_type,
                        "media_url": msg.media_url,
                        "created_at": msg.created_at.isoformat()
                    }
                })
                
            elif data.get("type") == "typing":
                # Broadcast typing indicator
                await manager.broadcast(room_id, {
                    "type": "typing",
                    "user_name": user.full_name or user.name
                })
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        await manager.broadcast(room_id, {
            "type": "user_left",
            "user_name": user.full_name or user.name,
            "online_count": len(manager.get_online_users(room_id))
        })
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, room_id)
