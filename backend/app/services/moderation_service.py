from openai import OpenAI
from app.core.config import settings

class ModerationService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def is_agriculture_related(self, content: str) -> tuple[bool, str]:
        """
        Check if content is agriculture-related using GPT.
        Returns (is_allowed, reason)
        """
        if not content or not content.strip():
            return True, "Empty content"
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": """You are a content moderator for an agricultural community chat.
                        You must determine if a message is related to agriculture or farming.
                        
                        ALLOWED topics:
                        - Crops, seeds, planting, harvesting
                        - Weather, climate, seasons
                        - Soil, fertilizers, pesticides
                        - Farm equipment, irrigation
                        - Market prices, selling produce
                        - Government schemes for farmers
                        - Animal husbandry, dairy, poultry
                        - General greetings and casual farming community talk
                        - Sharing farming experiences
                        - Questions about farming
                        
                        NOT ALLOWED:
                        - Politics (unless about farm policies)
                        - Religion, caste discrimination
                        - Violence, abuse, hate speech
                        - Spam, advertisements (non-farming)
                        - Movies, entertainment gossip
                        - Inappropriate content
                        
                        Respond with ONLY: "ALLOWED" or "NOT_ALLOWED: [brief reason]"
                        """
                    },
                    {
                        "role": "user",
                        "content": f"Check this message: {content}"
                    }
                ],
                temperature=0,
                max_tokens=50
            )
            
            result = response.choices[0].message.content.strip()
            
            if result.startswith("ALLOWED"):
                return True, "Content approved"
            else:
                reason = result.replace("NOT_ALLOWED:", "").strip()
                return False, reason or "Content not related to agriculture"
                
        except Exception as e:
            print(f"Moderation Error: {e}")
            # Default to blocking on error for safety
            return False, "Moderation check failed. Please try again."

    async def moderate_media(self, file_content: bytes, mime_type: str) -> tuple[bool, str]:
        """
        Check if media is agriculture-related using GPT-5-Nano.
        Returns (is_allowed, reason)
        """
        try:
            import base64
            import cv2
            import numpy as np
            import tempfile
            import os

            model_name = "gpt-5-nano-2025-08-07"
            
            prompt_text = """
            Analyze this image/video frame. Is it related to agriculture, farming, crops, rural life, or nature?
            
            ALLOWED: Crops, farms, tractors, animals, rural villages, food.
            NOT ALLOWED: Cityscapes, non-farm cars, selfies (unless farm context), memes, inappropriate content.
            
            Answer ONLY with "YES" or "NO".
            """
            
            images_to_send = []
            
            if mime_type.startswith("video/"):
                # Extract frames
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                    tmp.write(file_content)
                    tmp_path = tmp.name
                
                try:
                    cap = cv2.VideoCapture(tmp_path)
                    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    
                    if total_frames > 0:
                        # Get 3 frames
                        indices = [int(total_frames * 0.1), int(total_frames * 0.5), int(total_frames * 0.9)]
                        for idx in indices:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                            ret, frame = cap.read()
                            if ret:
                                _, buffer = cv2.imencode('.jpg', frame)
                                b64_frame = base64.b64encode(buffer).decode('utf-8')
                                images_to_send.append(b64_frame)
                    cap.release()
                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                        
                if not images_to_send:
                    return False, "Could not extract frames from video"
            else:
                # Image
                b64_image = base64.b64encode(file_content).decode('utf-8')
                images_to_send.append(b64_image)
            
            # Prepare messages for GPT
            content_blocks = [{"type": "text", "text": prompt_text}]
            for img_b64 in images_to_send:
                content_blocks.append({
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{img_b64}"
                    }
                })
                
            response = self.client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "user",
                        "content": content_blocks
                    }
                ],
                max_tokens=10
            )
            
            result = response.choices[0].message.content.strip().upper()
            print(f"Moderation Result ({model_name}): {result}")
            
            if "YES" in result:
                return True, "Allowed"
            else:
                return False, "Content does not appear to be agriculture-related."

        except Exception as e:
            print(f"Media Moderation Error: {e}")
            # Fail closed
            return False, "Media moderation check failed. Please try again."

moderation_service = ModerationService()
