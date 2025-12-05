from sarvamai import SarvamAI
from app.core.config import settings
import tempfile
import os

class STTService:
    """Speech-to-Text service using Sarvam AI."""
    
    def __init__(self):
        self.client = SarvamAI(api_subscription_key=settings.SARVAM_API_KEY)
    
    async def transcribe(self, audio_data: bytes, language_code: str = "hi-IN") -> str:
        """Transcribe audio to text using Sarvam AI's saarika model."""
        try:
            # Save audio data to a temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                tmp_file.write(audio_data)
                tmp_path = tmp_file.name
            
            # Transcribe using Sarvam AI
            with open(tmp_path, "rb") as audio_file:
                response = self.client.speech_to_text.transcribe(
                    file=audio_file,
                    language_code=language_code,
                    model="saarika:v2.5"
                )
            
            # Clean up temp file
            os.unlink(tmp_path)
            
            # Get transcription from response
            if hasattr(response, 'transcript'):
                return response.transcript
            elif hasattr(response, 'text'):
                return response.text
            elif isinstance(response, dict):
                return response.get('transcript', response.get('text', ''))
            return str(response)
            
        except Exception as e:
            print(f"STT Error: {e}")
            return ""

stt_service = STTService()
