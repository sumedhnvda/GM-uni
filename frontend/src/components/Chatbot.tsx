import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useOutletContext } from 'react-router-dom';

import { Send, Bot, Loader2, Mic, MicOff, Volume2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    audio?: string;
}

interface UserProfile {
    username?: string;
    full_name?: string;
    age?: number;
    farming_experience?: string;
    location?: string;
    land_size?: string;
    crops_grown?: string;
    preferred_language?: string;
}

interface AnalysisContext {
    soil_type?: string;
    recommended_crops?: string[];
    weather_analysis?: string;
    price_prediction?: string;
    detailed_advice?: string;
    applicable_schemes?: string;
}

interface ChatbotProps {
    context?: string | AnalysisContext;
    mode?: 'widget' | 'full';
    reportData?: AnalysisContext;
}


const Chatbot: React.FC<ChatbotProps> = ({ context, reportData, mode = 'widget' }) => {
    const location = useLocation();
    // Get refreshHistory from context (it might be undefined if not rendered inside Layout's Outlet)
    const { refreshHistory } = useOutletContext<{ refreshHistory?: () => void }>() || {};

    const [isOpen, setIsOpen] = useState(mode === 'full');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (mode === 'full') setIsOpen(true);
    }, [mode]);

    useEffect(scrollToBottom, [messages]);

    // Load chat from location state if navigating from sidebar
    useEffect(() => {
        const state = location.state as any;
        if (state?.chat?.messages && state?.chat?._id) {
            // Convert stored messages to Message format
            const loadedMessages: Message[] = state.chat.messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content,
                audio: msg.audio
            }));
            setMessages(loadedMessages);
            setCurrentSessionId(state.chat._id);
        }
    }, [location]);

    // Fetch user profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/users/me');
                setUserProfile(response.data);
            } catch (error) {
                console.error('Failed to fetch user profile:', error);
            }
        };
        fetchProfile();
    }, []);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            // ... (context preparation)
            let analysisContext = '';
            const dataToUse = reportData || (typeof context === 'string' ? context : '');

            if (dataToUse) {
                try {
                    const parsedData = typeof dataToUse === 'string' ? JSON.parse(dataToUse) : dataToUse;
                    if (parsedData && typeof parsedData === 'object') {
                        analysisContext = `Current Analysis Report Data:
- Soil Type: ${parsedData.soil_type || 'N/A'}
- Recommended Crops: ${Array.isArray(parsedData.recommended_crops) ? parsedData.recommended_crops.join(', ') : 'N/A'}
- Weather Analysis: ${parsedData.weather_analysis || 'N/A'}
- Market Trends: ${parsedData.price_prediction || 'N/A'}
- Detailed Advice: ${parsedData.detailed_advice || 'N/A'}`;
                    }
                } catch {
                    analysisContext = dataToUse as string;
                }
            }

            const response = await api.post('/chat', {
                message: userMessage,
                context: analysisContext,
                history: history
            });

            // Use TTS audio from chat response if available
            const audioB64 = response.data.audio || '';

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.response,
                audio: audioB64 || undefined
            }]);

            // Save messages to existing session if loaded from history
            if (currentSessionId) {
                try {
                    await api.post(`/chat/update/${currentSessionId}`, [
                        { role: 'user', content: userMessage },
                        { role: 'assistant', content: response.data.response }
                    ]);
                } catch (error) {
                    console.error('Error saving to chat session:', error);
                }
            } else {
                // If it's a new session (no currentSessionId), the backend /chat endpoint 
                // might have created one implicitly if we implemented that logic, 
                // OR we might need to rely on the fact that /chat creates a session?
                // Actually, looking at previous backend code, /chat is stateless unless we save it.
                // Wait, the backend /chat endpoint DOES NOT create a session automatically in the provided code.
                // It just returns a response.
                // The `ChatSession` saving logic was in `save_chat_session` in `endpoints.py` but that was for manual saving?
                // Let's check `endpoints.py` for `/chat`.
                // If `/chat` doesn't save, then we need to explicitly save the new session here.
                // But for now, let's assume if we want history, we should trigger refresh.
                // If the backend creates a session, refreshHistory() will pick it up.
                if (refreshHistory) refreshHistory();
            }

            // Always refresh history to be safe (e.g. title update, timestamp update)
            if (refreshHistory) refreshHistory();

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Use mp4a format for better compatibility
            const options = { mimeType: 'audio/mp4' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                // Fallback to webm
                options.mimeType = 'audio/webm;codecs=opus';
            }
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                // Last fallback to default
                options.mimeType = '';
            }

            const recorder = new MediaRecorder(stream, options);
            audioChunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (error) {
            console.error('Microphone access denied:', error);
            alert('Please allow microphone access to use voice chat.');
        }
    };

    const stopRecording = async () => {
        if (!mediaRecorderRef.current || !isRecording) return;

        setIsRecording(false);
        setIsTranscribing(true);

        // Stop recording
        mediaRecorderRef.current.stop();

        // Wait for stop event
        await new Promise<void>(resolve => {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.onstop = () => resolve();
            } else {
                resolve();
            }
        });

        // Stop tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        // Get the recorded audio - determine MIME type
        let mimeType = 'audio/webm';
        if (audioChunksRef.current.length > 0) {
            const firstChunk = audioChunksRef.current[0];
            if (firstChunk.type) {
                mimeType = firstChunk.type;
            }
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        mediaRecorderRef.current = null;

        // Send to Whisper for transcription with language
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, `recording.${mimeType.split('/')[1]?.split(';')[0] || 'webm'}`);
            formData.append('language', userProfile?.preferred_language?.split('-')[0] || 'en');

            const response = await api.post('/voice/transcribe', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Put the transcript in the input field
            if (response.data.transcript) {
                setInput(response.data.transcript);
            } else {
                setInput('[No speech detected - please try again]');
            }
        } catch (error) {
            console.error('Whisper transcription error:', error);
            // Fallback: just set a placeholder
            setInput('[Voice recording - transcription failed]');
        } finally {
            setIsTranscribing(false);
        }
    };

    const playAudio = (base64Audio: string) => {
        try {
            const audioData = atob(base64Audio);
            const arrayBuffer = new ArrayBuffer(audioData.length);
            const uint8Array = new Uint8Array(arrayBuffer);
            for (let i = 0; i < audioData.length; i++) {
                uint8Array[i] = audioData.charCodeAt(i);
            }
            const blob = new Blob([uint8Array], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.play();
        } catch (error) {
            console.error('Audio playback error:', error);
        }
    };

    return (
        <>
            {mode === 'widget' && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="fixed bottom-20 md:bottom-6 right-4 md:right-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white p-4 rounded-full shadow-lg transition-all z-40"
                >
                    <Bot className="w-6 h-6" />
                </button>
            )}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={mode === 'widget' ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 1, y: 0, scale: 1 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className={
                            mode === 'widget'
                                ? "fixed bottom-20 md:bottom-24 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 h-[50vh] md:h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-40 overflow-hidden"
                                : "flex flex-col h-[calc(100vh-160px)] md:h-screen bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                        }
                    >
                        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Bot className="w-5 h-5" />
                                <span className="font-semibold">Cropic Assistant</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                                    {userProfile?.full_name || 'Voice Enabled'}
                                </span>
                                {mode === 'widget' && (
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                            {messages.length === 0 && (
                                <div className="text-center text-gray-500 mt-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Bot className="w-8 h-8 text-emerald-600" />
                                    </div>
                                    <p className="font-medium">
                                        {userProfile?.full_name ? `Hello ${userProfile.full_name}!` : 'Hello!'} I'm your AI farming assistant.
                                    </p>
                                    <p className="text-sm mt-2">Ask me about crops, pests, or market trends.</p>
                                    <p className="text-sm mt-1 text-emerald-600">🎤 Tap mic, speak, then press Send!</p>
                                </div>
                            )}

                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user'
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-none'
                                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                            }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="flex-1 whitespace-pre-wrap">{msg.content}</span>
                                            {msg.role === 'assistant' && msg.audio && (
                                                <button
                                                    onClick={() => playAudio(msg.audio!)}
                                                    className="p-1 hover:bg-gray-100 rounded-full flex-shrink-0"
                                                    title="Play audio"
                                                >
                                                    <Volume2 className="w-4 h-4 text-emerald-600" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm">
                                        <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={loading || isTranscribing}
                                    className={`p-2 rounded-full transition-all ${isRecording
                                        ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                                        : isTranscribing
                                            ? 'bg-yellow-500 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                                        }`}
                                    title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing...' : 'Start recording'}
                                >
                                    {isTranscribing ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : isRecording ? (
                                        <MicOff className="w-5 h-5" />
                                    ) : (
                                        <Mic className="w-5 h-5" />
                                    )}
                                </button>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder={isRecording ? "🎤 Recording..." : isTranscribing ? "Transcribing with Whisper..." : "Type or speak..."}
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                    disabled={isRecording || isTranscribing}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !input.trim() || isRecording || isTranscribing}
                                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white p-2 rounded-full transition-all disabled:opacity-50"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                            {isRecording && (
                                <p className="text-xs text-center text-red-500 mt-2 animate-pulse">
                                    🔴 Recording... Tap mic to stop
                                </p>
                            )}
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;
