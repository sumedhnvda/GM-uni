from app.services.gemini_service import gemini_service
from app.services.sarvam_service import sarvam_service
from app.models import User
from app.services.sms_service import sms_service
import asyncio
import logging

logger = logging.getLogger(__name__)

class NewsService:
    async def fetch_agricultural_news(self) -> str:
        """
        Generates a weekly agricultural update using Gemini with Deep Search.
        """
        prompt = """
        Generate a short, helpful weekly agricultural update for Indian farmers.
        Use Google Search to find the LATEST real-world information.
        
        Include:
        1. One key farming tip relevant to the CURRENT season in India (e.g., Rabi/Kharif).
        2. One REAL current market trend observation for major crops (e.g., Wheat, Rice, Onion, Tomato).
        3. One REAL government scheme update or reminder (e.g., PM-KISAN installment date, new subsidy).
        
        Keep it extremely short and concise. UNDER 140 CHARACTERS.
        Format it as a friendly SMS message. Start with "Kisan Update:".
        Do not use hashtags.
        Output ONLY the SMS message content. Do not include any introductory text.
        """
        
        try:
            # Use Gemini with Search Grounding
            response = await gemini_service.generate_news_with_search(prompt)
            return response
        except Exception as e:
            logger.error(f"Failed to fetch news: {e}")
            return "Kisan Update: Stay tuned for next week's agricultural tips and market trends!"

    async def get_broadcast_preview(self, generate_news: bool = False):
        """
        Generates a preview of the broadcast: the base message and the list of recipients with translations.
        """
        # 1. Fetch "Global" News only if requested
        base_news = ""
        if generate_news:
            base_news = await self.fetch_agricultural_news()
        
        # 2. Get all users with SMS enabled
        users = await User.find(User.sms_enabled == True, User.phone_number != None).to_list()
        
        preview_data = {
            "base_message": base_news,
            "subscribers": []
        }
        
        for user in users:
            # Simulate translation for preview (or actually translate if we want to be accurate)
            # To save API calls/time during preview, maybe we just show the target language?
            # But user said "message must be sent in lanague user has specifed so use a good multilingual model"
            # and "see ... what message will be sent". So we should probably translate.
            
            translated_msg = base_news
            if base_news and user.preferred_language and user.preferred_language != "en":
                lang = user.preferred_language
                if not lang.endswith("-IN") and lang != "en":
                        lang = f"{lang}-IN"
                try:
                    translated_msg = await sarvam_service.translate(base_news, lang)
                except Exception:
                    translated_msg = "[Translation Failed]"

            preview_data["subscribers"].append({
                "name": user.full_name or user.username or "Farmer",
                "phone_number": user.phone_number,
                "language": user.preferred_language,
                "message_preview": translated_msg
            })
            
        return preview_data

    async def broadcast_weekly_update(self, custom_message: str = None):
        """
        Fetches news (or uses custom), translates it for each subscribed user, and sends SMS.
        """
        print("DEBUG: Entering broadcast_weekly_update")
        logger.info("Starting weekly broadcast...")
        
        # 1. Use custom message if provided, else fetch
        base_news = custom_message if custom_message else await self.fetch_agricultural_news()
        print(f"DEBUG: Base News: {base_news}")
        logger.info(f"Base News: {base_news}")
        
        # 2. Get all users with SMS enabled
        users = await User.find(User.sms_enabled == True, User.phone_number != None).to_list()
        print(f"DEBUG: Found {len(users)} subscribers.")
        logger.info(f"Found {len(users)} subscribers.")
        
        # 3. Send to each user sequentially (more reliable than parallel)
        print("DEBUG: Starting sequential send...")
        for user in users:
            print(f"DEBUG: Processing user {user.email}...")
            await self._send_to_user(user, base_news)
        print("DEBUG: Broadcast completed.")
        logger.info("Broadcast completed.")

    async def _send_to_user(self, user: User, base_news: str):
        """Helper to process a single user for broadcast."""
        print(f"DEBUG: Processing user {user.email}")
        print(f"DEBUG: User phone_number: {user.phone_number}")
        print(f"DEBUG: User sms_enabled: {user.sms_enabled}")
        print(f"DEBUG: User preferred_language: {user.preferred_language}")
        
        try:
            # Translate if needed
            message = base_news
            lang = user.preferred_language or "en"
            
            # Skip translation for English variants
            if lang in ["en", "en-IN"]:
                print(f"DEBUG: Language is English ({lang}), skipping translation")
            else:
                # Map language code if needed (Sarvam expects specific codes)
                if not lang.endswith("-IN"):
                    lang = f"{lang}-IN"
                
                print(f"DEBUG: Translating to language: {lang}")
                try:
                    translated = await sarvam_service.translate(base_news, lang)
                    if translated and translated != base_news:
                        message = translated
                        print(f"DEBUG: Translation result: {message[:50]}...")
                    else:
                        print(f"DEBUG: Translation returned same or empty, using original")
                except Exception as e:
                    logger.error(f"Translation failed for {user.email}: {e}")
                    print(f"DEBUG: Translation FAILED: {e}")
                    # Fallback to English if translation fails
            
            # HARD TRUNCATION SAFETY NET
            # Twilio Trial accounts often block long Unicode messages.
            # We strictly truncate to 160 characters to ensure delivery.
            if len(message) > 160:
                print(f"DEBUG: Truncating message from {len(message)} to 160 chars for safety.")
                message = message[:157] + "..."
            
            # Send SMS directly (blocking but reliable)
            if user.phone_number:
                print(f"DEBUG: Calling sms_service.send_sms for {user.phone_number}")
                result = sms_service.send_sms(user.phone_number, message)
                print(f"DEBUG: SMS send result for {user.phone_number}: {result}")
            else:
                print(f"DEBUG: No phone number for user {user.email}, skipping SMS")
                
        except Exception as e:
            logger.error(f"Failed to send update to {user.email}: {e}")
            print(f"DEBUG: Error sending to {user.email}: {e}")

news_service = NewsService()
