import httpx
from app.core.config import settings
import json

class SarvamService:
    def __init__(self):
        self.api_key = settings.SARVAM_API_KEY
        self.api_url = "https://api.sarvam.ai/translate"

    async def translate(self, text: str, target_lang: str, source_lang: str = "en-IN") -> str:
        if not text or not text.strip():
            return text
            
        if not self.api_key:
            print(f"Sarvam Translation: No API key configured")
            return text
        
        if target_lang == "en-IN" or target_lang == "en":
            return text
        
        print(f"Sarvam Translation: Translating to {target_lang}")
        print(f"Sarvam Translation: Text length = {len(text)}")
        
        headers = {
            "api-subscription-key": self.api_key,
            "content-type": "application/json"
        }
        
        payload = {
            "input": text,
            "source_language_code": source_lang,
            "target_language_code": target_lang,
            "mode": "formal",
            "model": "mayura:v1",
            "enable_preprocessing": True
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.api_url, headers=headers, json=payload, timeout=60.0)
                response.raise_for_status()
                data = response.json()
                translated = data.get("translated_text", text)
                print(f"Sarvam Translation: Success! Translated length = {len(translated)}")
                return translated
        except httpx.HTTPStatusError as e:
            print(f"Sarvam Translation HTTP Error: {e}")
            print(f"Response Body: {e.response.text}")
            return text
        except Exception as e:
            print(f"Sarvam Translation Error: {e}")
            return text

sarvam_service = SarvamService()
