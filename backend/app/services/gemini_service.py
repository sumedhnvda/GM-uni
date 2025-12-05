from google import genai
from app.core.config import settings
from app.models import UserInput
from typing import Dict, Any, Optional

class GeminiService:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            self.client = genai.Client(api_key=settings.GEMINI_API_KEY)
            self.model_name = "gemini-3-pro-preview"
        else:
            self.client = None

    async def analyze_farm(self, user_input: UserInput, weather_data: str, price_data: str, user_context: Optional[Dict[str, Any]] = None) -> str:
        if not self.client:
            return "Gemini API Key not configured."

        # Extract user context for scheme recommendations
        gender = user_context.get('gender', 'Not specified') if user_context else 'Not specified'
        caste_category = user_context.get('caste_category', 'Not specified') if user_context else 'Not specified'
        age = user_context.get('age', 0) if user_context else 0
        full_name = user_context.get('full_name', '') if user_context else ''

        prompt = f"""
        Act as an agricultural expert, economist, and government scheme advisor. Analyze the following data and provide a detailed report.
        
        **User Profile:**
        - Name: {full_name}
        - Age: {age}
        - Gender: {gender}
        - Caste Category: {caste_category}
        
        **User Farm Data (Input may be in any language):**
        - Location: {user_input.location}
        - Land Size/Details: {user_input.land_size}
        - Previous Crops/History: {user_input.previous_crops}
        
        **Weather Context:**
        {weather_data}
        
        **Market Prices (Agmarknet/Current):**
        {price_data}
        
        **Task:**
        1. **Understand User Context**: Parse the user's input (which might be in any language) to understand their land and history.
        2. **Historical Analysis**: Estimate the value of the crops grown last year in this or nearby locations.
        3. **Economic Factors**: Consider current food inflation in the country.
        4. **Weather Impact**: Analyze the weather for the year. 
           - If weather aids the crop, add a "reward" factor.
           - If weather is poor (drought, excess rain), add a "penalty" factor.
        5. **Price Estimation**: Calculate an estimated price for the best suitable crop based on these factors.
        6. **Recommendation**: Compare your estimated price with current market rates (from Agmarknet/Government data if known, or your knowledge). 
           - Advise the user clearly: **SELL** or **HOLD/NOT SELL**.
        7. **Government Schemes**: Based on the user's profile (Gender: {gender}, Caste Category: {caste_category}, Land Size: {user_input.land_size}), recommend applicable government schemes:
           - For SC/ST: SC/ST Sub-Plan, Special Central Assistance (SCA), Tribal Sub-Plan (TSP)
           - For OBC: OBC welfare schemes, National Backward Classes Finance & Development Corporation (NBCFDC)
           - For Women: Mahila Kissan Sashaktikaran Pariyojana (MKSP), Women Self Help Group schemes
           - For Small/Marginal Farmers: PM-KISAN, PM Fasal Bima Yojana, Kisan Credit Card (KCC), Soil Health Card Scheme
           - For All: NABARD schemes, State agricultural subsidies, Pradhan Mantri Krishi Sinchai Yojana
        
        **Format:**
        Return the response in valid JSON format with the following keys:
        - soil_type: string (Identified from location)
        - recommended_crops: list of strings
        - weather_analysis: string (Include reward/penalty details)
        - price_prediction: string (Include the estimated price and the logic. **BOLD** the final estimated price range like **₹2,450 - ₹2,850**)
        - detailed_advice: string (markdown supported, include the SELL/HOLD recommendation and reasoning)
        - applicable_schemes: string (markdown supported, list of government schemes the user can apply for based on their gender, caste category, and land size. Include scheme name, eligibility, and how to apply)
        """
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error generating content: {str(e)}"

    async def moderate_text(self, content: str) -> tuple[bool, str]:
        """
        Check if text is appropriate for agricultural community chat.
        Returns (is_allowed, reason)
        """
        if not self.client:
            # If no API key, allow by default
            return True, "Moderation disabled"
        
        # Allow short messages like greetings
        if len(content) < 20:
            return True, "Short message allowed"

        try:
            prompt = f"""
            You are a lenient content moderator for a farmer community chat in India.
            Your job is to ONLY block clearly inappropriate content.
            
            Message: "{content}"
            
            ALLOW these (respond "ALLOWED"):
            - Greetings (hi, hello, namaste, kaise ho, etc.)
            - Farming, crops, weather, soil, seeds, fertilizer
            - Questions about agriculture, prices, markets
            - General conversation, humor, casual chat
            - Rural life, village topics
            - Food, cooking, recipes
            - Family, health discussions
            - Advice, tips, suggestions
            - ANY message in Hindi, Marathi, or other Indian languages
            - Anything that could remotely be farmer community related
            
            ONLY BLOCK these (respond "NOT_ALLOWED: reason"):
            - Explicit hate speech or abuse
            - Spam or advertisements
            - Very explicit inappropriate content
            
            Be VERY lenient. When in doubt, ALLOW the message.
            Answer ONLY with "ALLOWED" or "NOT_ALLOWED: [short reason]".
            """
            
            response = self.client.models.generate_content(
                model="gemini-1.5-flash",
                contents=prompt
            )
            
            result = response.text.strip()
            
            if "ALLOWED" in result.upper():
                return True, "Content approved"
            elif "NOT_ALLOWED" in result.upper():
                reason = result.replace("NOT_ALLOWED:", "").replace("NOT_ALLOWED", "").strip()
                return False, reason or "Content not appropriate"
            else:
                # If unclear, allow by default
                return True, "Content approved"
                
        except Exception as e:
            print(f"Text Moderation Error: {e}")
            # On error, allow the message
            return True, "Moderation check skipped"

    async def generate_news_with_search(self, prompt: str) -> str:
        """
        Generates content using Gemini with Google Search Grounding enabled.
        """
        if not self.client:
            return "Gemini API Key not configured."
            
        try:
            # Enable Google Search Grounding
            # Note: The exact syntax depends on the SDK version. 
            # For google-genai SDK (v1beta/v1), we use tools config.
            from google.genai import types
            
            response = self.client.models.generate_content(
                model="gemini-2.0-flash-exp",
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())]
                )
            )
            return response.text
        except Exception as e:
            print(f"Gemini Search Error: {e}")
            # Fallback to normal generation if search fails (e.g. model doesn't support it)
            try:
                response = self.client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=prompt
                )
                return response.text
            except Exception as e2:
                return f"Error generating news: {str(e2)}"

    async def moderate_media(self, file_content: bytes, mime_type: str) -> tuple[bool, str]:
        """
        Checks if the media (image/video) is agriculture-related using omni-moderation-2024-09-26.
        For videos, extracts 3 frames and validates them.
        Returns (is_allowed, reason)
        """
        if not self.client:
            print("Gemini API Key not configured.")
            return False, "System configuration error (API Key missing)"

        try:
            from google.genai import types
            import cv2
            import numpy as np
            import tempfile
            import os
            
            model_name = "omni-moderation-2024-09-26"
            
            prompt_text = """
            Analyze this content. Is it related to agriculture, farming, crops, rural life, or nature?
            
            Examples of ALLOWED content:
            - Crops, fields, farms, gardens
            - Farmers, farm workers
            - Tractors, farm equipment
            - Animals (cows, goats, chickens, etc.)
            - Plants, seeds, soil, fertilizers
            - Rural landscapes, villages
            - Food, vegetables, fruits
            
            Examples of NOT ALLOWED content:
            - Selfies (unless in a farm context)
            - Cityscapes, buildings (non-farm)
            - Cars (non-farm), bikes
            - Memes, screenshots
            - Inappropriate content
            
            Answer ONLY with "YES" or "NO".
            """

            contents = []
            
            if mime_type.startswith("video/"):
                # Extract frames
                with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
                    tmp.write(file_content)
                    tmp_path = tmp.name
                
                try:
                    cap = cv2.VideoCapture(tmp_path)
                    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                    
                    if total_frames > 0:
                        # Get 3 frames: 10%, 50%, 90%
                        indices = [int(total_frames * 0.1), int(total_frames * 0.5), int(total_frames * 0.9)]
                        
                        for idx in indices:
                            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                            ret, frame = cap.read()
                            if ret:
                                # Encode frame to jpg
                                _, buffer = cv2.imencode('.jpg', frame)
                                contents.append(types.Part.from_bytes(data=buffer.tobytes(), mime_type="image/jpeg"))
                    
                    cap.release()
                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                        
                if not contents:
                    print("Could not extract frames from video")
                    return False, "Could not process video file"
                    
            else:
                # Image
                contents.append(types.Part.from_bytes(data=file_content, mime_type=mime_type))
            
            # Add prompt
            contents.append(prompt_text)
            
            try:
                response = self.client.models.generate_content(
                    model=model_name,
                    contents=contents
                )
            except Exception as e:
                print(f"Model {model_name} failed, falling back to gemini-1.5-flash. Error: {e}")
                response = self.client.models.generate_content(
                    model="gemini-1.5-flash",
                    contents=contents
                )
            
            result = response.text.strip().upper()
            print(f"Moderation Result ({model_name}): {result}")
            
            if "YES" in result:
                return True, "Allowed"
            else:
                return False, "Content does not appear to be agriculture-related."
            
        except Exception as e:
            print(f"Media Moderation Error: {e}")
            return False, "Media moderation check failed. Please try again."

gemini_service = GeminiService()
