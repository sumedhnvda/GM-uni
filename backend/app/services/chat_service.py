from openai import OpenAI  # Use sync client for responses API
from app.core.config import settings
from typing import List, Dict, Any, Tuple
import httpx
import tempfile
import os
import json

class ChatService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = "gpt-4o"  # Using gpt-4o (latest available model)
        self.sarvam_api_key = settings.SARVAM_API_KEY
        self.tts_url = "https://api.sarvam.ai/text-to-speech"

    async def chat(self, messages: List[Dict[str, str]], user_context: Dict[str, Any] = None, analysis_context: str = "") -> str:
        system_prompt = """You are an expert agricultural assistant for the 'Cropic' app.
        Your goal is to help farmers with personalized crop advice, pest control, market trends, and GOVERNMENT SCHEMES.
        
        User Profile:
        - Name: {full_name}
        - Username: {username}
        - Age: {age}
        - Gender: {gender}
        - Caste Category: {caste_category}
        - Farming Experience: {farming_experience}
        - Location: {location}
        - Land Size: {land_size}
        - Crops Grown: {crops_grown}
        - Preferred Language: {language}
        
        Current Analysis Context (If Available):
        {analysis_context}
        
        IMPORTANT INSTRUCTIONS:
        1. DOMAIN CONSTRAINT: You ONLY respond to agriculture-related questions. This includes: crop cultivation, pest management, soil health, weather impacts, irrigation, fertilizers, government agricultural schemes, market prices, farming techniques, farm machinery, livestock farming, organic farming, and related agricultural topics.
        2. If a question is NOT related to agriculture, politely decline and redirect the user by saying: "I'm specifically designed to help with agriculture-related questions. Please ask me about crops, farming techniques, government schemes, market prices, or agricultural challenges."
        3. If analysis context is provided (report data from a deep analysis), USE IT as the primary reference for your advice.
        4. Address the user by their name when appropriate to make interactions personal.
        5. Tailor your advice based on their farming experience level (beginner/intermediate/expert).
        6. Consider their land size and location when giving recommendations.
        7. You understand and speak many Indian languages fluently (Hindi, Kannada, Telugu, Tamil, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Odia, etc.).
        8. ALWAYS respond in the SAME language the user uses. If they speak in Hindi, respond in Hindi. If they speak in Kannada, respond in Kannada.
        9. When asked about GOVERNMENT SCHEMES, recommend schemes based on their:
           - Gender (women-specific schemes like Mahila Kissan Sashaktikaran Pariyojana)
           - Caste Category (SC/ST/OBC specific schemes like SC/ST Sub Plan)
           - Land Size (marginal/small/medium farmer schemes)
           - Location (state-specific schemes)
           Common schemes: PM-KISAN, PM Fasal Bima Yojana, Kisan Credit Card, NABARD schemes, state agricultural schemes.
        10. Use web search to get the latest agricultural prices, weather forecasts, farming news, and scheme details when needed.
        11. Be friendly, helpful and concise.
        """.format(
            username=user_context.get('username', 'Farmer') if user_context else 'Farmer',
            full_name=user_context.get('full_name', '') if user_context else '',
            age=user_context.get('age', 0) if user_context else 0,
            gender=user_context.get('gender', 'Not specified') if user_context else 'Not specified',
            caste_category=user_context.get('caste_category', 'Not specified') if user_context else 'Not specified',
            farming_experience=user_context.get('farming_experience', 'beginner') if user_context else 'beginner',
            location=user_context.get('location', 'India') if user_context else 'India',
            land_size=user_context.get('land_size', 'Unknown') if user_context else 'Unknown',
            crops_grown=user_context.get('crops_grown', 'Various') if user_context else 'Various',
            language=user_context.get('preferred_language', 'en') if user_context else 'en',
            analysis_context=analysis_context if analysis_context else "No current analysis - using general user profile context."
        )

        try:
            # Build messages for standard Chat Completion API
            api_messages = [
                {"role": "system", "content": system_prompt}
            ]
            
            # Add conversation history
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                api_messages.append({
                    "role": role,
                    "content": content
                })
            
            # Call Chat Completion API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=api_messages,
                temperature=0.7,
                max_tokens=1024
            )
            
            # Extract text from response
            if response.choices and len(response.choices) > 0:
                return response.choices[0].message.content
                
            return "I apologize, I couldn't generate a response. Please try again."
            
        except Exception as e:
            error_msg = str(e)
            print(f"Chat Error: {error_msg}")
            if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                return "I'm sorry, there's an issue with the AI service configuration. Please contact support."
            elif "model" in error_msg.lower():
                return f"I'm sorry, there's a model configuration issue: {error_msg}"
            return f"I'm sorry, I encountered an error: {error_msg}"
    
    async def chat_with_language(self, messages: List[Dict[str, str]], user_context: Dict[str, Any] = None, analysis_context: str = "") -> Tuple[str, str]:
        """Chat and also detect the language of the response for TTS."""
        # Just use the main chat method and detect language from response
        response_text = await self.chat(messages, user_context, analysis_context)
        
        # Simple language detection based on script
        detected_lang = "en-IN"
        if any('\u0900' <= c <= '\u097F' for c in response_text):  # Devanagari (Hindi/Marathi)
            detected_lang = "hi-IN"
        elif any('\u0C80' <= c <= '\u0CFF' for c in response_text):  # Kannada
            detected_lang = "kn-IN"
        elif any('\u0B80' <= c <= '\u0BFF' for c in response_text):  # Tamil
            detected_lang = "ta-IN"
        elif any('\u0C00' <= c <= '\u0C7F' for c in response_text):  # Telugu
            detected_lang = "te-IN"
        elif any('\u0D00' <= c <= '\u0D7F' for c in response_text):  # Malayalam
            detected_lang = "ml-IN"
        elif any('\u0980' <= c <= '\u09FF' for c in response_text):  # Bengali
            detected_lang = "bn-IN"
        elif any('\u0A80' <= c <= '\u0AFF' for c in response_text):  # Gujarati
            detected_lang = "gu-IN"
        elif any('\u0A00' <= c <= '\u0A7F' for c in response_text):  # Punjabi
            detected_lang = "pa-IN"
        
        return response_text, detected_lang
    
    async def speech_to_text(self, audio_data: bytes, language: str = "en") -> str:
        """Convert speech to text using OpenAI Whisper."""
        try:
            # Determine file extension based on audio format
            # Try to detect format, default to mp3
            file_ext = ".webm"
            if audio_data.startswith(b'\xff\xfb') or audio_data.startswith(b'\xff\xfa'):
                file_ext = ".mp3"
            elif audio_data.startswith(b'ID3') or audio_data.startswith(b'\xff\xe0'):
                file_ext = ".mp3"
            elif audio_data.startswith(b'\x1f\x8b'):
                file_ext = ".gz"
            
            # Save audio to temp file with appropriate extension
            with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as tmp_file:
                tmp_file.write(audio_data)
                tmp_path = tmp_file.name
            
            try:
                # Transcribe using Whisper with language hint
                with open(tmp_path, "rb") as audio_file:
                    transcript = self.client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=language if language and language != "auto" else None
                    )
                
                transcript_text = transcript.text if hasattr(transcript, 'text') else str(transcript)
                return transcript_text.strip()
            finally:
                # Clean up temp file
                if os.path.exists(tmp_path):
                    os.unlink(tmp_path)
        except Exception as e:
            print(f"Whisper STT Error: {e}")
            print(f"Audio data size: {len(audio_data)} bytes")
            return ""
    
    async def text_to_speech(self, text: str, target_language: str = "en-IN", speaker: str = "anushka") -> bytes:
        """Convert text to speech using Sarvam AI Bulbul."""
        try:
            headers = {
                "api-subscription-key": self.sarvam_api_key,
                "content-type": "application/json"
            }
            
            payload = {
                "inputs": [text],
                "target_language_code": target_language,
                "speaker": speaker,
                "pitch": 0,
                "pace": 1.0,
                "loudness": 1.5,
                "speech_sample_rate": 22050,
                "enable_preprocessing": True,
                "model": "bulbul:v2"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.tts_url,
                    headers=headers,
                    json=payload,
                    timeout=60.0
                )
                response.raise_for_status()
                data = response.json()
                
                # Sarvam returns base64 encoded audio in 'audios' array
                if "audios" in data and len(data["audios"]) > 0:
                    import base64
                    audio_b64 = data["audios"][0]
                    return base64.b64decode(audio_b64)
                
                return b""
        except Exception as e:
            print(f"Sarvam TTS Error: {e}")
            return b""

chat_service = ChatService()
