from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
from typing import List, Dict, Optional, Any
from pydantic import BaseModel
from app.models import UserInput, User, AnalysisResult
from app.api.auth import get_current_user
from app.services.gemini_service import gemini_service
from app.services.weather_service import weather_service
from app.services.price_service import price_service
from app.services.prediction_service import prediction_service
from app.services.sarvam_service import sarvam_service
from app.services.chat_service import chat_service
from app.services.geocoding_service import geocoding_service
from app.models import AnalysisResult, UserInput, ChatSession, AnalysisHistory
import shutil
import uuid
import base64
from datetime import datetime
import json
import asyncio
import traceback
from google import genai
from google.genai import types
from app.core.config import settings

router = APIRouter()

from app.services.sms_service import sms_service
from app.services.news_service import news_service

class BroadcastRequest(BaseModel):
    message: Optional[str] = None

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, WebSocket, WebSocketDisconnect, BackgroundTasks

# ... (imports)

@router.post("/admin/broadcast-news")
async def trigger_broadcast(
    request: BroadcastRequest,
    current_user: User = Depends(get_current_user)
):
    """Manually trigger the weekly news broadcast (Admin only)."""
    if current_user.email != "sumedhnavuda007@gmail.com":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    await news_service.broadcast_weekly_update(request.message)
    return {"message": "Broadcast triggered successfully"}

@router.get("/admin/broadcast-preview")
async def get_broadcast_preview(
    generate_news: bool = False,
    current_user: User = Depends(get_current_user)
):
    """Get preview of the weekly broadcast (Admin only)."""
    if current_user.email != "sumedhnavuda007@gmail.com":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    return await news_service.get_broadcast_preview(generate_news=generate_news)

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None  # male, female, other
    caste_category: Optional[str] = None  # general, obc, sc, st
    farming_experience: Optional[str] = None
    location: str
    land_size: str
    crops_grown: str
    preferred_language: str
    phone_number: Optional[str] = None
    sms_enabled: bool = False

@router.put("/users/profile", response_model=User)
async def update_user_profile(
    profile: UserProfileUpdate,
    current_user: User = Depends(get_current_user)
):
    # Check username uniqueness if provided
    if profile.username:
        existing_user = await User.find_one(User.username == profile.username)
        if existing_user and existing_user.email != current_user.email:
            raise HTTPException(
                status_code=400,
                detail="Username already taken. Please choose a different one."
            )
        current_user.username = profile.username
    
    # Check if SMS is being enabled for the first time (or re-enabled)
    should_send_welcome = profile.sms_enabled and not current_user.sms_enabled
    
    # Update other profile fields
    if profile.full_name:
        current_user.full_name = profile.full_name
    if profile.age:
        current_user.age = profile.age
    if profile.gender:
        current_user.gender = profile.gender
    if profile.caste_category:
        current_user.caste_category = profile.caste_category
    if profile.farming_experience:
        current_user.farming_experience = profile.farming_experience
    
    # Resolve coordinates to place name if needed
    resolved_location = await geocoding_service.resolve_location(profile.location)
    
    current_user.location = resolved_location
    current_user.land_size = profile.land_size
    current_user.crops_grown = profile.crops_grown
    current_user.preferred_language = profile.preferred_language
    current_user.preferred_language = profile.preferred_language
    
    # Standardize phone number to +91
    if profile.phone_number:
        phone = profile.phone_number.strip()
        if not phone.startswith("+"):
            if len(phone) == 10:
                phone = f"+91{phone}"
            elif len(phone) == 12 and phone.startswith("91"):
                phone = f"+{phone}"
        current_user.phone_number = phone
    else:
        current_user.phone_number = None
        
    current_user.sms_enabled = profile.sms_enabled
    
    await current_user.save()
    
    # Send Welcome SMS if enabled
    if should_send_welcome and current_user.phone_number:
        welcome_msg = "Welcome to Cropic! You will now receive weekly agricultural updates."
        # Translate welcome message
        if current_user.preferred_language and current_user.preferred_language != "en":
             lang = current_user.preferred_language
             if not lang.endswith("-IN") and lang != "en":
                 lang = f"{lang}-IN"
             welcome_msg = await sarvam_service.translate(welcome_msg, lang)
             
        sms_service.send_sms(current_user.phone_number, welcome_msg)
        
    return current_user

@router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/analyze", response_model=AnalysisResult)
async def analyze_crops(
    user_input: UserInput,
    current_user: User = Depends(get_current_user)
):
    # 1. Get Weather Data
    weather_data = await weather_service.get_weather(user_input.location)
    
    # 2. Get Price Data & Forecast
    price_data = await price_service.get_prices(user_input.location)
    
    # Try to get forecast for the first crop mentioned (simple heuristic)
    forecast_info = ""
    if user_input.previous_crops:
        # This is a bit loose, ideally we'd parse the crop name better or ask user for target crop
        # For now, let's just pass the raw input to Gemini and let it decide, 
        # BUT we can also try to match a crop from our prediction service if possible.
        # Let's check if any of our supported crops are in the input string
        supported_crops = ["wheat", "rice", "paddy", "maize", "cotton", "soyabean", "sugarcane"] # etc
        found_crop = None
        for crop in supported_crops:
            if crop in user_input.previous_crops.lower():
                found_crop = crop if crop != "rice" else "paddy" # Map rice to paddy
                break
        
        if found_crop:
            forecast = prediction_service.get_forecast(found_crop)
            if forecast:
                forecast_info = f"\n**AI Price Forecast for {found_crop.capitalize()} (Next 6 Months):**\n"
                for f in forecast:
                    forecast_info += f"- {f['month']}: ₹{f['price']}\n"
    
    full_price_context = f"{price_data}\n{forecast_info}"

    # Build user context for scheme recommendations
    user_context = {
        "full_name": current_user.full_name or "",
        "age": current_user.age or 0,
        "gender": current_user.gender or "Not specified",
        "caste_category": current_user.caste_category or "Not specified",
    }
    print(f"Analysis: User context for schemes - Gender: {user_context['gender']}, Caste: {user_context['caste_category']}")

    # 3. Analyze with Gemini (now includes user context for schemes)
    gemini_response = await gemini_service.analyze_farm(user_input, weather_data, full_price_context, user_context)
    
    # 4. Parse Gemini Response (expecting JSON string)
    try:
        # Clean up json string if needed
        cleaned_response = gemini_response.replace("```json", "").replace("```", "").strip()
        analysis_result = json.loads(cleaned_response)
        
        # 5. Translate if needed (Sarvam AI)
        print(f"Analysis: Language requested = '{user_input.language}'")
        if user_input.language and user_input.language != "en-IN" and user_input.language != "en":
            print(f"Analysis: Starting translation to {user_input.language}")
            # Translate specific fields
            # We translate the detailed advice and maybe weather analysis
            # Translating the whole JSON structure is hard, so we translate values.
            
            # Translate Detailed Advice
            translated_advice = await sarvam_service.translate(
                analysis_result.get("detailed_advice", ""), 
                user_input.language
            )
            analysis_result["detailed_advice"] = translated_advice
            
            # Translate Weather Analysis
            translated_weather = await sarvam_service.translate(
                analysis_result.get("weather_analysis", ""), 
                user_input.language
            )
            analysis_result["weather_analysis"] = translated_weather
            
            # Translate Price Prediction text
            translated_price = await sarvam_service.translate(
                analysis_result.get("price_prediction", ""), 
                user_input.language
            )
            analysis_result["price_prediction"] = translated_price

            # Translate Soil Type
            translated_soil = await sarvam_service.translate(
                analysis_result.get("soil_type", ""), 
                user_input.language
            )
            analysis_result["soil_type"] = translated_soil

            # Translate Recommended Crops (List)
            translated_crops = []
            for crop in analysis_result.get("recommended_crops", []):
                translated_crop = await sarvam_service.translate(crop, user_input.language)
                translated_crops.append(translated_crop)
            analysis_result["recommended_crops"] = translated_crops

            # Translate Applicable Schemes
            if analysis_result.get("applicable_schemes"):
                translated_schemes = await sarvam_service.translate(
                    analysis_result.get("applicable_schemes", ""), 
                    user_input.language
                )
                analysis_result["applicable_schemes"] = translated_schemes

        # Save to analysis history
        try:
            history_entry = AnalysisHistory(
                user_email=current_user.email,
                location=user_input.location,
                land_size=user_input.land_size,
                previous_crops=user_input.previous_crops,
                soil_type=analysis_result.get("soil_type", ""),
                recommended_crops=analysis_result.get("recommended_crops", []),
                weather_analysis=analysis_result.get("weather_analysis", ""),
                price_prediction=analysis_result.get("price_prediction", ""),
                detailed_advice=analysis_result.get("detailed_advice", ""),
                applicable_schemes=analysis_result.get("applicable_schemes", ""),
                created_at=datetime.now()
            )
            await history_entry.save()
            print(f"Analysis history saved successfully for {current_user.email}")
        except Exception as e:
            print(f"Error saving analysis history: {e}")
            import traceback
            traceback.print_exc()

        return AnalysisResult(**analysis_result)
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        return AnalysisResult(
            soil_type="Analysis failed to parse",
            recommended_crops=[],
            weather_analysis="N/A",
            price_prediction="N/A",
            detailed_advice=gemini_response # Return raw text
        )

@router.get("/crops")
async def get_supported_crops():
    return prediction_service.get_supported_crops()

@router.get("/predict/{crop_name}")
async def predict_crop_price(crop_name: str):
    forecast = prediction_service.get_forecast(crop_name)
    if not forecast:
        raise HTTPException(status_code=404, detail="Crop not found or model unavailable")
    return forecast

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = ""
    history: List[Dict[str, str]] = []
    user_context: Optional[Dict[str, Any]] = None  # Accept user context from frontend

@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    current_user: User = Depends(get_current_user)
):
    # Build comprehensive user context from database (priority) and request
    user_context = {
        "username": current_user.username or "Farmer",
        "full_name": current_user.full_name or "",
        "age": current_user.age or 0,
        "gender": current_user.gender or "Not specified",
        "caste_category": current_user.caste_category or "Not specified",
        "farming_experience": current_user.farming_experience or "beginner",
        "location": current_user.location or "India",
        "land_size": current_user.land_size or "Unknown",
        "crops_grown": current_user.crops_grown or "Various",
        "preferred_language": current_user.preferred_language or "en"
    }
    
    response = await chat_service.chat(
        messages=request.history + [{"role": "user", "content": request.message}], 
        user_context=user_context,
        analysis_context=request.context
    )
    
    # Generate TTS audio for the response
    audio_data = None
    try:
        # Map language code to Sarvam format (e.g., 'en' -> 'en-IN')
        lang_code = current_user.preferred_language or "en-IN"
        if not lang_code.endswith("-IN"):
            lang_code = f"{lang_code}-IN"
        
        audio_data = await chat_service.text_to_speech(
            text=response,
            target_language=lang_code,
            speaker="anushka"
        )
        print(f"TTS audio generated for {current_user.email}: {len(audio_data) if audio_data else 0} bytes")
    except Exception as e:
        print(f"TTS Error: {e}")
        # Continue without audio if TTS fails
    
    # Save chat session to history
    try:
        chat_session = ChatSession(
            user_email=current_user.email,
            title=request.message[:30] + "...",
            messages=request.history + [{"role": "user", "content": request.message}, {"role": "assistant", "content": response}],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        await chat_session.save()
        print(f"Chat session saved successfully for {current_user.email}")
    except Exception as e:
        print(f"Error saving chat session: {e}")
        import traceback
        traceback.print_exc()
    
    # Return response with optional audio
    result = {"response": response}
    if audio_data:
        import base64
        result["audio"] = base64.b64encode(audio_data).decode('utf-8')
    
    return result

@router.get("/history/analyses", response_model=List[AnalysisHistory])
async def get_analysis_history(current_user: User = Depends(get_current_user)):
    return await AnalysisHistory.find(AnalysisHistory.user_email == current_user.email).sort("-created_at").to_list()

@router.get("/history/chats", response_model=List[ChatSession])
async def get_chat_history(current_user: User = Depends(get_current_user)):
    return await ChatSession.find(ChatSession.user_email == current_user.email).sort("-updated_at").to_list()

@router.get("/chat/{session_id}")
async def get_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Retrieve a specific chat session by ID."""
    try:
        from beanie import ObjectId
        session = await ChatSession.get(ObjectId(session_id))
        
        if not session or session.user_email != current_user.email:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        return session
    except Exception as e:
        print(f"Error retrieving chat session: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving chat session: {str(e)}")

@router.post("/chat/update/{session_id}")
async def update_chat_session(
    session_id: str,
    messages: List[Dict[str, str]],
    current_user: User = Depends(get_current_user)
):
    """Append messages to an existing chat session."""
    try:
        from beanie import ObjectId
        session = await ChatSession.get(ObjectId(session_id))
        
        if not session or session.user_email != current_user.email:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Append new messages
        session.messages.extend(messages)
        session.updated_at = datetime.now()
        await session.save()
        
        print(f"Chat session {session_id} updated for {current_user.email}")
        return {"status": "updated", "session_id": session_id}
    except Exception as e:
        print(f"Error updating chat session: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating chat session: {str(e)}")

@router.post("/voice/transcribe/sarvam")
async def transcribe_with_sarvam(
    file: UploadFile = File(...),
    language_code: str = "hi-IN",
    current_user: User = Depends(get_current_user)
):
    """Transcribe audio to text using Sarvam STT (legacy)."""
    audio_data = await file.read()
    transcript = await sarvam_service.transcribe(audio_data, language_code)
    return {"transcript": transcript}

@router.post("/voice/transcribe")
async def transcribe_with_whisper(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Transcribe audio to text using OpenAI Whisper in user's preferred language."""
    # Map language code from user profile to Whisper format
    lang_mapping = {
        'en-IN': 'en', 'hi-IN': 'hi', 'bn-IN': 'bn', 'gu-IN': 'gu',
        'kn-IN': 'kn', 'ml-IN': 'ml', 'mr-IN': 'mr', 'od-IN': 'or',
        'pa-IN': 'pa', 'ta-IN': 'ta', 'te-IN': 'te', 'as-IN': 'as',
        'ur-IN': 'ur', 'ne-IN': 'ne', 'sa-IN': 'sa', 'ks-IN': 'ks',
        'kok-IN': 'kok', 'mai-IN': 'mai', 'mni-IN': 'mni', 'sd-IN': 'sd',
        'doi-IN': 'doi', 'sat-IN': 'sat', 'brx-IN': 'brx'
    }
    
    # Get user's preferred language, default to Hindi
    user_lang = current_user.preferred_language or "hi-IN"
    whisper_lang = lang_mapping.get(user_lang, 'hi')  # Map to Whisper language code
    
    audio_data = await file.read()
    transcript = await chat_service.speech_to_text(audio_data, whisper_lang)
    return {"transcript": transcript}

@router.post("/voice/tts")
async def text_to_speech(
    text: str,
    language: str = "en-IN",
    current_user: User = Depends(get_current_user)
):
    """Convert text to speech using Sarvam Bulbul."""
    audio_data = await chat_service.text_to_speech(text, language)
    if audio_data:
        return Response(content=audio_data, media_type="audio/wav")
    raise HTTPException(status_code=500, detail="TTS failed")

class VoiceChatRequest(BaseModel):
    language_code: str = "hi-IN"
    context: Optional[str] = ""
    history: List[Dict[str, str]] = []

@router.post("/voice/chat")
async def voice_chat(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Full voice chat: Whisper STT -> GPT-4o Chat -> Sarvam Bulbul TTS pipeline."""
    # 1. Map language code from user profile to Whisper format
    lang_mapping = {
        'en-IN': 'en', 'hi-IN': 'hi', 'bn-IN': 'bn', 'gu-IN': 'gu',
        'kn-IN': 'kn', 'ml-IN': 'ml', 'mr-IN': 'mr', 'od-IN': 'or',
        'pa-IN': 'pa', 'ta-IN': 'ta', 'te-IN': 'te', 'as-IN': 'as',
        'ur-IN': 'ur', 'ne-IN': 'ne', 'sa-IN': 'sa', 'ks-IN': 'ks',
        'kok-IN': 'kok', 'mai-IN': 'mai', 'mni-IN': 'mni', 'sd-IN': 'sd',
        'doi-IN': 'doi', 'sat-IN': 'sat', 'brx-IN': 'brx'
    }
    
    # Get user's preferred language, default to Hindi
    user_lang = current_user.preferred_language or "hi-IN"
    whisper_lang = lang_mapping.get(user_lang, 'hi')  # Map to Whisper language code
    
    # 1. Transcribe audio using Whisper with user's language
    audio_data = await file.read()
    transcript = await chat_service.speech_to_text(audio_data, whisper_lang)
    
    if not transcript:
        raise HTTPException(status_code=400, detail="Could not transcribe audio")
    
    # 2. Get chat response with language detection
    user_context = {
        "username": current_user.username or "Farmer",
        "full_name": current_user.full_name or "",
        "location": current_user.location,
        "land_size": current_user.land_size,
        "crops_grown": current_user.crops_grown,
        "preferred_language": current_user.preferred_language
    }
    
    response_text, detected_language = await chat_service.chat_with_language(
        messages=[{"role": "user", "content": transcript}],
        user_context=user_context
    )
    
    # 3. Convert response to speech using user's language
    audio_response = await chat_service.text_to_speech(response_text, user_lang)
    
    import base64
    audio_b64 = base64.b64encode(audio_response).decode() if audio_response else ""
    
    # 4. Save voice chat to history
    try:
        voice_chat_session = ChatSession(
            user_email=current_user.email,
            title=f"Voice Chat: {transcript[:30]}..." if transcript else "Voice Chat",
            messages=[
                {"role": "user", "content": transcript},
                {"role": "assistant", "content": response_text}
            ],
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        await voice_chat_session.save()
        print(f"Voice chat session saved successfully for {current_user.email}")
    except Exception as e:
        print(f"Error saving voice chat session: {e}")
        import traceback
        traceback.print_exc()
    
    return {
        "transcript": transcript,
        "response": response_text,
        "language": detected_language,
        "audio": audio_b64
    }

class SummarizeRequest(BaseModel):
    soil_type: str
    recommended_crops: List[str]
    weather_analysis: str
    price_prediction: str
    detailed_advice: str
    language: Optional[str] = "en-IN"

@router.post("/analysis/summarize")
async def summarize_analysis(
    request: SummarizeRequest,
    current_user: User = Depends(get_current_user)
):
    """Summarize the analysis report using GPT-4o and return audio via Sarvam Bulbul TTS."""
    
    # Build summary prompt
    summary_prompt = f"""Summarize this agricultural analysis report in a clear, conversational way that a farmer can easily understand. 
Keep it under 2 minutes of speaking time (about 250-300 words).
Speak in the user's preferred language: {request.language}

Report Data:
- Soil Type: {request.soil_type}
- Recommended Crops: {', '.join(request.recommended_crops)}
- Weather Analysis: {request.weather_analysis}
- Market Trends: {request.price_prediction}
- Detailed Advice: {request.detailed_advice}

Create a friendly, helpful summary that covers the key points and recommendations. Start with a greeting."""
    
    try:
        # Get summary from GPT-5-nano
        summary = await chat_service.chat(
            messages=[{"role": "user", "content": summary_prompt}],
            user_context={
                "location": current_user.location,
                "land_size": current_user.land_size,
                "crops_grown": current_user.crops_grown,
                "preferred_language": request.language
            }
        )
        
        # Convert to speech using Sarvam Bulbul with the correct language
        audio_data = await chat_service.text_to_speech(summary, request.language)
        
        import base64
        audio_b64 = base64.b64encode(audio_data).decode() if audio_data else ""
        
        return {
            "summary": summary,
            "audio": audio_b64
        }
    except Exception as e:
        print(f"Summarize error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Gemini Live WebSocket Endpoint

from app.api.auth import verify_token

# ... (imports remain the same)

class GeminiLiveSession:
    def __init__(self, api_key: str, sys_instruction: str):
        self.client = genai.Client(
            api_key=api_key, 
            http_options={"api_version": "v1alpha"}
        )
        self.model = "gemini-2.0-flash-exp"
        self.config = {
            "response_modalities": ["AUDIO"], 
            "speech_config": {
                "voice_config": {
                    "prebuilt_voice_config": {
                        "voice_name": "Zephyr"
                    }
                }
            },
            "system_instruction": sys_instruction
        }
        self.session = None
        self.quit = asyncio.Event()
        self.last_video_time = 0
        
    async def connect(self, websocket: WebSocket):
        try:
            async with self.client.aio.live.connect(model=self.model, config=self.config) as session:
                self.session = session
                print("Connected to Gemini Live")
                
                # Start receive loop
                receive_task = asyncio.create_task(self.receive_from_gemini(websocket))
                
                try:
                    while not self.quit.is_set():
                        # Receive from WebSocket
                        message = await websocket.receive_text()
                        data = json.loads(message)
                        
                        if "realtime_input" in data:
                            for chunk in data["realtime_input"]["media_chunks"]:
                                if chunk["mime_type"] == "audio/pcm":
                                    await session.send(input={"mime_type": "audio/pcm", "data": chunk["data"]})
                                    
                                elif chunk["mime_type"] == "image/jpeg":
                                    # Throttle video to 1 FPS
                                    import time
                                    now = time.time()
                                    if now - self.last_video_time > 1.0:
                                        self.last_video_time = now
                                        # print("Sending video frame to Gemini")
                                        await session.send(input={"mime_type": "image/jpeg", "data": chunk["data"]})
                                        
                        elif "text_input" in data:
                            print(f"Received text input: {data['text_input']}")
                            await session.send(input=data["text_input"], end_of_turn=True)
                        
                        elif "type" in data and data["type"] == "end_session":
                            print("Received end_session request")
                            await websocket.send_json({"type": "session_ended"})
                            self.quit.set()
                            break
                            
                except WebSocketDisconnect:
                    print("Client disconnected")
                except Exception as e:
                    print(f"Error in send loop: {e}")
                finally:
                    self.quit.set()
                    receive_task.cancel()
                    
        except Exception as e:
            print(f"Gemini Connection Error: {e}")
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)

    async def receive_from_gemini(self, websocket: WebSocket):
        try:
            while not self.quit.is_set():
                async for response in self.session.receive():
                    if response.server_content is None:
                        continue

                    model_turn = response.server_content.model_turn
                    if model_turn:
                        for part in model_turn.parts:
                            if part.inline_data:
                                # print(f"Received audio response from Gemini ({len(part.inline_data.data)} bytes)")
                                base64_audio = base64.b64encode(part.inline_data.data).decode('utf-8')
                                await websocket.send_json({"audio": base64_audio})
                            if part.text:
                                print(f"Received text response from Gemini: {part.text}")
                                await websocket.send_json({"text": part.text})

                    if response.server_content.turn_complete:
                        # print("Gemini turn complete")
                        await websocket.send_json({"turn_complete": True})
                        
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Error receiving from Gemini: {e}")
            self.quit.set()

@router.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    await websocket.accept()
    
    # Authenticate
    try:
        if not token or token == "null" or token == "undefined":
            print("WebSocket auth failed: Missing token")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        user = await verify_token(token)
        print(f"WebSocket connected for user: {user.email}")
    except Exception as e:
        print(f"WebSocket auth failed: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Build detailed user context
    user_context = f"""
    User Profile:
    - Name: {user.full_name or 'Farmer'}
    - Location: {user.location or 'India'}
    - Crops Grown: {user.crops_grown or 'Various'}
    - Land Size: {user.land_size or 'Unknown'}
    - Farming Experience: {user.farming_experience or 'Unknown'}
    - Preferred Language: {user.preferred_language or 'English'}
    """

    sys_instruction = f"""You are an agricultural expert assistant for Indian farmers. 
    You provide helpful advice on crops, weather, prices, and government schemes. 
    You DO NOT answer questions unrelated to agriculture (like movies, coding, politics). 
    If asked about other topics, politely decline and steer the conversation back to farming. 
    Keep responses concise and helpful.
    
    {user_context}
    """
    
    session_handler = GeminiLiveSession(settings.GEMINI_API_KEY, sys_instruction)
    await session_handler.connect(websocket)
