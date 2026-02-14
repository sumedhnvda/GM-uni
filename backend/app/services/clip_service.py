"""
CLIP/BLIP Service - Image captioning using Hugging Face Inference API.
Uses Salesforce/blip-image-captioning-large for generating text descriptions of images.
"""
import httpx
import base64
import cv2
import numpy as np
import tempfile
import os
from typing import List, Optional
from app.core.config import settings


class CLIPService:
    """Service for image captioning using Hugging Face's BLIP model."""
    
    def __init__(self):
        self.api_url = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large"
        self.headers = {
            "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}"
        }
    
    async def caption_image(self, image_bytes: bytes) -> Optional[str]:
        """
        Generate a text caption for an image using BLIP model.
        
        Args:
            image_bytes: Raw bytes of the image
            
        Returns:
            Text description of the image, or None if failed
            
        Raises:
            ValueError: If API key is not configured
        """
        if not settings.HUGGINGFACE_API_KEY:
            print("ERROR: Hugging Face API key not configured!")
            raise ValueError("Image moderation service not configured. Please contact admin.")
            
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    self.api_url,
                    headers=self.headers,
                    content=image_bytes
                )
                
                if response.status_code == 200:
                    result = response.json()
                    # BLIP returns list of generated texts
                    if isinstance(result, list) and len(result) > 0:
                        caption = result[0].get("generated_text", "")
                        print(f"CLIP Caption: {caption}")
                        return caption
                    return None
                else:
                    print(f"CLIP API Error: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            print(f"CLIP Service Error: {e}")
            return None
    
    async def caption_video_frames(self, video_bytes: bytes, num_frames: int = 3) -> List[str]:
        """
        Extract frames from video and caption each one.
        
        Args:
            video_bytes: Raw bytes of the video file
            num_frames: Number of frames to extract (default 3: at 10%, 50%, 90%)
            
        Returns:
            List of captions for each extracted frame
        """
        captions = []
        
        # Write video to temp file for OpenCV
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name
        
        try:
            cap = cv2.VideoCapture(tmp_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            if total_frames <= 0:
                print("Could not read video frames")
                return []
            
            # Calculate frame positions (10%, 50%, 90%)
            positions = [0.1, 0.5, 0.9]
            indices = [int(total_frames * pos) for pos in positions[:num_frames]]
            
            for idx in indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                
                if ret:
                    # Encode frame to JPEG bytes
                    _, buffer = cv2.imencode('.jpg', frame)
                    frame_bytes = buffer.tobytes()
                    
                    # Get caption for this frame
                    caption = await self.caption_image(frame_bytes)
                    if caption:
                        captions.append(caption)
            
            cap.release()
            
        except Exception as e:
            print(f"Video frame extraction error: {e}")
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        
        return captions
    
    async def get_media_captions(self, content: bytes, mime_type: str) -> List[str]:
        """
        Get captions for any media type (image or video).
        
        Args:
            content: Raw bytes of the media
            mime_type: MIME type (e.g., "image/jpeg", "video/mp4")
            
        Returns:
            List of captions describing the media content
        """
        if mime_type.startswith("video/"):
            return await self.caption_video_frames(content)
        else:
            caption = await self.caption_image(content)
            return [caption] if caption else []


# Singleton instance
clip_service = CLIPService()
