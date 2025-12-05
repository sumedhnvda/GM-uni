import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera } from 'lucide-react';

const LiveCall: React.FC = () => {
    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [status, setStatus] = useState('Disconnected');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

    const wsRef = useRef<WebSocket | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const audioQueueRef = useRef<string[]>([]);
    const isPlayingRef = useRef(false);

    // Check for multiple cameras on mount
    useEffect(() => {
        const checkCameras = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = devices.filter(device => device.kind === 'videoinput');
                setHasMultipleCameras(videoInputs.length > 1);
            } catch (err) {
                // Ignore errors, just won't show switch button
            }
        };
        checkCameras();

        return () => {
            stopCall();
        };
    }, []);

    const switchCamera = async () => {
        if (!mediaStreamRef.current || !isStreaming) return;

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);

        try {
            // Stop current video track
            const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.stop();
            }

            // Get new stream with different facing mode
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: newFacingMode,
                    width: 640,
                    height: 480,
                    frameRate: 10
                }
            });

            const newVideoTrack = newStream.getVideoTracks()[0];

            // Replace track in current stream
            mediaStreamRef.current.removeTrack(videoTrack);
            mediaStreamRef.current.addTrack(newVideoTrack);

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStreamRef.current;
            }
        } catch (err) {
            // Revert facing mode on error
            setFacingMode(facingMode);
        }
    };

    const endCall = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            setStatus('Saving summary...');
            wsRef.current.send(JSON.stringify({ type: 'end_session' }));
            // We wait for 'session_ended' message to navigate
            // But add a timeout just in case
            setTimeout(() => {
                if (window.location.pathname === '/live') {
                    navigate('/choice');
                }
            }, 5000);
        } else {
            navigate('/choice');
        }
    };

    const startAudioProcessing = async (stream: MediaStream) => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // Define AudioWorklet Processor code
        const processorCode = `
            class PCMProcessor extends AudioWorkletProcessor {
                process(inputs, outputs, parameters) {
                    const input = inputs[0];
                    if (input.length > 0) {
                        const inputData = input[0];
                        
                        // Convert Float32 to Int16 PCM
                        const pcmData = new Int16Array(inputData.length);
                        for (let i = 0; i < inputData.length; i++) {
                            const s = Math.max(-1, Math.min(1, inputData[i]));
                            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                        }
                        
                        this.port.postMessage(pcmData.buffer, [pcmData.buffer]);
                    }
                    return true;
                }
            }
            registerProcessor('pcm-processor', PCMProcessor);
        `;

        const blob = new Blob([processorCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);

        try {
            await audioContext.audioWorklet.addModule(url);

            const workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');

            workletNode.port.onmessage = (e) => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isMicOn) return;

                const buffer = e.data;
                const binary = String.fromCharCode(...new Uint8Array(buffer));
                const base64 = btoa(binary);

                wsRef.current.send(JSON.stringify({
                    realtime_input: {
                        media_chunks: [{
                            mime_type: "audio/pcm",
                            data: base64
                        }]
                    }
                }));
            };

            source.connect(workletNode);
            workletNode.connect(audioContext.destination); // Keep alive

            // Store reference to clean up later (using processorRef type cast or any)
            (processorRef.current as any) = workletNode;

        } catch (err) {
            console.error("Error loading audio worklet:", err);
        }
    };

    const startVideoProcessing = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Send frames every 100ms (10fps)
        const interval = setInterval(() => {
            if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !isVideoOn || !videoRef.current) {
                if (!isStreaming) clearInterval(interval);
                return;
            }

            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);

            const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

            wsRef.current.send(JSON.stringify({
                realtime_input: {
                    media_chunks: [{
                        mime_type: "image/jpeg",
                        data: base64
                    }]
                }
            }));

        }, 500); // 2 FPS is enough for context and saves bandwidth
    };

    const playNextAudioChunk = async () => {
        if (isPlayingRef.current || audioQueueRef.current.length === 0) return;

        isPlayingRef.current = true;
        const base64Audio = audioQueueRef.current.shift();

        if (base64Audio) {
            try {
                // Convert base64 PCM to AudioBuffer
                // Note: Gemini sends PCM 24kHz usually for response? Or we need to check config.
                // The config in backend said "response_modalities=['AUDIO']". 
                // Usually it returns PCM. Let's assume PCM 24kHz (default for Gemini Live).

                const binaryString = atob(base64Audio);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const int16Data = new Int16Array(bytes.buffer);
                const float32Data = new Float32Array(int16Data.length);

                for (let i = 0; i < int16Data.length; i++) {
                    float32Data[i] = int16Data[i] / 32768.0;
                }

                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const buffer = audioCtx.createBuffer(1, float32Data.length, 24000); // 24kHz is typical for Gemini
                buffer.getChannelData(0).set(float32Data);

                const source = audioCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(audioCtx.destination);
                source.onended = () => {
                    isPlayingRef.current = false;
                    playNextAudioChunk();
                };
                source.start();

            } catch (e) {
                console.error("Error playing audio:", e);
                isPlayingRef.current = false;
                playNextAudioChunk();
            }
        } else {
            isPlayingRef.current = false;
        }
    };

    const stopCall = () => {
        setIsStreaming(false);
        // setStatus('Disconnected'); // Don't overwrite 'Saving summary...'

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    };

    const startCall = async () => {
        try {
            setStatus('Connecting...');

            // 1. Get User Media
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: 16000, // Try to request 16kHz
                },
                video: {
                    facingMode: facingMode,
                    width: 640,
                    height: 480,
                    frameRate: 10
                }
            });

            mediaStreamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // 2. Connect WebSocket
            // Connect to WebSocket with token
            const token = localStorage.getItem('token');
            if (!token) {
                console.error("No token found, redirecting to login");
                navigate('/login');
                return;
            }
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            // In production, use the actual backend URL. For dev, it's localhost:8000
            const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/api/ws/live?token=${token}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('Connected');
                setIsStreaming(true);
                startAudioProcessing(stream);
                startVideoProcessing();
            };

            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);

                if (data.type === 'session_ended') {
                    navigate('/choice');
                    return;
                }

                if (data.audio) {
                    audioQueueRef.current.push(data.audio);
                    playNextAudioChunk();
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket Error:", error);
                setStatus('Error');
            };

            ws.onclose = () => {
                if (status !== 'Saving summary...') {
                    setStatus('Disconnected');
                }
                stopCall();
            };

        } catch (error) {
            console.error("Error starting call:", error);
            setStatus('Failed to access camera/mic');
        }
    };

    // ... (rest of the file)

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-emerald-950 to-gray-900 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Ambient Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-teal-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[50%] left-[50%] w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none transform -translate-x-1/2 -translate-y-1/2" />

            {/* Main Container */}
            <div className="w-full max-w-5xl relative z-10 flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'Connected'
                            ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)] animate-pulse'
                            : status === 'Saving summary...'
                                ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-pulse'
                                : 'bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.4)]'}`}
                        />
                        <span className="text-sm font-medium tracking-wide text-gray-200">{status}</span>
                    </div>
                    <button
                        onClick={endCall}
                        disabled={status === 'Saving summary...'}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/30 text-sm font-medium transition-all backdrop-blur-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {status === 'Saving summary...' ? '✨ Saving...' : '← Exit Call'}
                    </button>
                </div>

                {/* Video Area */}
                <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-emerald-500/20 aspect-video group backdrop-blur-sm">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-opacity duration-500 ${!isVideoOn ? 'opacity-0' : 'opacity-100'}`}
                    />

                    {/* Fallback Avatar when video is off */}
                    <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900/95 to-emerald-950/95 transition-opacity duration-500 ${isVideoOn ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="w-36 h-36 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 p-[3px] shadow-[0_0_40px_rgba(52,211,153,0.3)]">
                            <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                                <VideoOff className="w-14 h-14 text-emerald-400/60" />
                            </div>
                        </div>
                    </div>

                    {/* Corner decorations */}
                    <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-emerald-400/30 rounded-tl-lg pointer-events-none" />
                    <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-emerald-400/30 rounded-tr-lg pointer-events-none" />
                    <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-emerald-400/30 rounded-bl-lg pointer-events-none" />
                    <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-emerald-400/30 rounded-br-lg pointer-events-none" />

                    {/* AI Waveform / Visualizer */}
                    {status === 'Connected' && (
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-950/90 via-emerald-950/50 to-transparent pointer-events-none flex items-end justify-center pb-8">
                            <div className="flex items-center gap-1.5 h-10">
                                {[...Array(7)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1.5 bg-gradient-to-t from-emerald-400 to-teal-300 rounded-full animate-pulse"
                                        style={{
                                            animationDelay: `${i * 0.15}s`,
                                            height: `${30 + Math.sin(i * 0.8) * 20}%`,
                                            opacity: 0.7 + (i % 2) * 0.3
                                        }}
                                    />
                                ))}
                            </div>
                            <span className="absolute bottom-3 text-xs text-emerald-400/60 font-medium">🎙️ AI Expert Listening</span>
                        </div>
                    )}

                    {/* Recording indicator */}
                    {isStreaming && (
                        <div className="absolute top-5 right-5 flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-emerald-500/30">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-xs font-medium text-white/80">LIVE</span>
                        </div>
                    )}
                </div>

                {/* Controls Bar */}
                <div className="flex items-center justify-center gap-4 mt-2 p-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10">
                    {!isStreaming ? (
                        /* Only show start call button when not streaming */
                        <button
                            onClick={startCall}
                            className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_30px_rgba(52,211,153,0.4)] hover:shadow-[0_0_50px_rgba(52,211,153,0.6)] transition-all duration-300 transform hover:scale-105 border border-emerald-400/50"
                        >
                            <Video className="w-8 h-8" />
                        </button>
                    ) : (
                        /* Show mute/unmute, end call, and hide video buttons when streaming */
                        <>
                            <button
                                onClick={() => setIsMicOn(!isMicOn)}
                                className={`p-4 rounded-2xl transition-all duration-300 backdrop-blur-xl border ${isMicOn
                                    ? 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300'
                                    : 'bg-red-500/80 border-red-500/50 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                                    }`}
                                title={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
                            >
                                {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                            </button>

                            <button
                                onClick={endCall}
                                disabled={status === 'Saving summary...'}
                                className="p-5 rounded-2xl bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-400 hover:to-rose-400 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] transition-all duration-300 transform hover:scale-105 border border-red-400/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                <PhoneOff className="w-8 h-8" />
                            </button>

                            <button
                                onClick={() => setIsVideoOn(!isVideoOn)}
                                className={`p-4 rounded-2xl transition-all duration-300 backdrop-blur-xl border ${isVideoOn
                                    ? 'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300'
                                    : 'bg-red-500/80 border-red-500/50 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
                                    }`}
                                title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                            >
                                {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                            </button>

                            {/* Camera Switch Button - Only show on devices with multiple cameras */}
                            {hasMultipleCameras && (
                                <button
                                    onClick={switchCamera}
                                    className="p-4 rounded-2xl transition-all duration-300 backdrop-blur-xl border bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30 text-blue-300"
                                    title="Switch camera"
                                >
                                    <SwitchCamera className="w-6 h-6" />
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Instructions */}
                <div className="text-center text-emerald-300/60 text-sm">
                    {!isStreaming
                        ? '🌱 Click the green button to start your AI consultation'
                        : '💬 Speak naturally about your farming questions. Show crops or soil for visual diagnosis.'
                    }
                </div>
            </div>
        </div>
    );
};

export default LiveCall;
