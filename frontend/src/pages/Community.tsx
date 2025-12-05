import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users, Send, Image, AlertCircle,
    MessageCircle, Loader2, Wifi, WifiOff, ArrowLeft
} from 'lucide-react';
import api, { API_URL } from '../services/api';

interface Message {
    id: string;
    user_email: string;
    user_name: string;
    user_picture?: string;
    content: string;
    message_type: 'text' | 'image' | 'video';
    media_url?: string;
    created_at: string;
    is_own?: boolean;
    client_id?: string;
    status?: 'sending' | 'sent' | 'error';
}

interface RoomInfo {
    room_id: string;
    display_name: string;
    member_count: number;
    user_location: string;
}

interface OnlineUser {
    email: string;
    name: string;
    picture?: string;
}

const Community: React.FC = () => {
    const navigate = useNavigate();
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [connected, setConnected] = useState(false);
    const [, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [, setCurrentUser] = useState<any>(null);
    const currentUserRef = useRef<any>(null);

    const [error, setError] = useState<string | null>(null);
    const [moderationWarning, setModerationWarning] = useState<string | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const prevMessageCountRef = useRef(0);

    const wsRef = useRef<WebSocket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll to bottom only when new messages are added
    useEffect(() => {
        const currentCount = messages.length;
        const prevCount = prevMessageCountRef.current;

        if (currentCount > prevCount && prevCount > 0) {
            // New message added - scroll smoothly
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } else if (currentCount > 0 && prevCount === 0) {
            // Initial load - scroll instantly without animation
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }

        prevMessageCountRef.current = currentCount;
    }, [messages.length]);

    // Fetch room info and messages
    useEffect(() => {
        const init = async () => {
            try {
                setLoading(true);

                // Get user profile for email comparison
                const userRes = await api.get('/users/me');
                setCurrentUser(userRes.data);
                currentUserRef.current = userRes.data;

                // Get user's room
                const roomRes = await api.get('/community/my-room');
                setRoomInfo(roomRes.data);

                // Get message history
                const msgRes = await api.get(`/community/messages/${roomRes.data.room_id}`);
                setMessages(msgRes.data);

                // Connect WebSocket
                connectWebSocket(roomRes.data.room_id);

            } catch (err: any) {
                console.error('Failed to load community:', err);
                setError(err.response?.data?.detail || 'Failed to load community chat');
            } finally {
                setLoading(false);
            }
        };

        init();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const connectWebSocket = (roomId: string) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Derive WebSocket URL from API_URL
        // API_URL is like https://gm-uni.onrender.com/api/v1 or http://localhost:8000/api/v1
        let wsBase: string;
        try {
            const apiUrl = new URL(API_URL);
            const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
            wsBase = `${wsProtocol}//${apiUrl.host}`;
        } catch {
            // Fallback for local development
            wsBase = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:8000`;
        }

        const wsUrl = `${wsBase}/api/ws/community/${roomId}?token=${token}`;

        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            setConnected(true);
        };

        ws.onclose = () => {
            setConnected(false);
            // Attempt reconnect after 3 seconds
            setTimeout(() => {
                if (roomInfo) {
                    connectWebSocket(roomInfo.room_id);
                }
            }, 3000);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            setConnected(false);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            switch (data.type) {
                case 'new_message':
                    const isOwn = data.message.user_email === currentUserRef.current?.email;
                    const incomingClientId = data.client_id;

                    setMessages(prev => {
                        // If we have a client_id, check if we have an optimistic message to replace
                        if (incomingClientId) {
                            const existingIdx = prev.findIndex(m => m.client_id === incomingClientId);
                            if (existingIdx !== -1) {
                                const newMessages = [...prev];
                                newMessages[existingIdx] = { ...data.message, is_own: isOwn, client_id: incomingClientId, status: 'sent' };
                                return newMessages;
                            }
                        }
                        // Otherwise append
                        return [...prev, { ...data.message, is_own: isOwn, status: 'sent' }];
                    });
                    break;

                case 'user_joined':
                    // Could show a notification
                    setOnlineUsers(prev => {
                        if (!prev.find(u => u.name === data.user_name)) {
                            return [...prev, { email: '', name: data.user_name, picture: data.user_picture }];
                        }
                        return prev;
                    });
                    break;

                case 'user_left':
                    setOnlineUsers(prev => prev.filter(u => u.name !== data.user_name));
                    break;

                case 'message_deleted':
                    setMessages(prev => prev.map(m =>
                        m.id === data.message_id
                            ? { ...m, content: '[Message deleted]', is_deleted: true }
                            : m
                    ));
                    break;

                case 'moderation_warning':
                    setModerationWarning(data.message);
                    setTimeout(() => setModerationWarning(null), 5000);

                    // Remove the optimistic message if client_id is present
                    if (data.client_id) {
                        setMessages(prev => prev.filter(m => m.client_id !== data.client_id));
                    }
                    break;
            }
        };

        wsRef.current = ws;
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        setSending(true);

        try {
            const clientId = Date.now().toString();

            // Optimistic update
            const optimisticMsg: Message = {
                id: clientId, // Temp ID
                user_email: currentUserRef.current?.email || '',
                user_name: currentUserRef.current?.full_name || 'Me',
                user_picture: currentUserRef.current?.picture,
                content: input.trim(),
                message_type: 'text',
                created_at: new Date().toISOString(),
                is_own: true,
                client_id: clientId,
                status: 'sending'
            };

            setMessages(prev => [...prev, optimisticMsg]);
            setInput('');
            setSending(true);

            try {
                wsRef.current.send(JSON.stringify({
                    type: 'message',
                    content: optimisticMsg.content,
                    message_type: 'text',
                    client_id: clientId
                }));
            } catch (err) {
                console.error('Failed to send message:', err);
                // Mark as error or remove?
                setMessages(prev => prev.filter(m => m.client_id !== clientId));
            } finally {
                setSending(false);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setSending(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert('Only images and videos are allowed');
            return;
        }

        // Check file size
        const isVideo = file.type.startsWith('video/');
        const limit = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

        if (file.size > limit) {
            alert(`File size too large (max ${isVideo ? '50MB' : '10MB'})`);
            return;
        }

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post('/community/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'message',
                    content: '', // No text content for media message
                    message_type: file.type.startsWith('image/') ? 'image' : 'video',
                    media_url: res.data.url
                }));
            }
        } catch (err: any) {
            console.error('Failed to upload file:', err);
            const errorMessage = err.response?.data?.detail || 'Failed to upload file';
            setModerationWarning(errorMessage);
            setTimeout(() => setModerationWarning(null), 5000);
        } finally {
            setSending(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    };

    // Removed scroll handler - was causing shaking issues

    const getMediaUrl = (url?: string) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        // Remove leading slash if present to avoid double slash with API_URL if it has trailing slash
        // But API_URL usually doesn't have trailing slash.
        // If url starts with /, API_URL + url might be http://localhost:8000/api/v1/api/v1/... if backend returned full path relative to root?
        // Backend returns /api/v1/community/media/...
        // API_URL is http://localhost:8000/api/v1
        // So we want http://localhost:8000 + url
        // Let's parse API_URL to get origin
        try {
            const urlObj = new URL(API_URL);
            return `${urlObj.origin}${url}`;
        } catch (e) {
            return url;
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh]">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading community chat...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center p-4">
                <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-800 mb-2">Unable to Load Community</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full min-h-0 bg-gray-50 -mx-4 md:mx-0 -mt-3 md:mt-0">
            {/* Header - Static, no animation */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2 md:px-6 md:py-3 shadow-lg flex-shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 bg-white/20 rounded-lg md:rounded-xl">
                        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
                    </div>
                    <div className="flex-1">
                        <h1 className="font-bold text-base md:text-lg">{roomInfo?.display_name || 'Community Chat'}</h1>
                        <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-white/80">
                            <Users className="w-3 h-3 md:w-4 md:h-4" />
                            <span>{roomInfo?.member_count} members</span>
                            <span className="mx-0.5 md:mx-1">•</span>
                            {connected ? (
                                <span className="flex items-center gap-1 text-green-300">
                                    <Wifi className="w-3 h-3" /> Online
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-red-300">
                                    <WifiOff className="w-3 h-3" /> Connecting...
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                </div>
            </div>

            {/* Moderation Warning */}
            {moderationWarning && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800">{moderationWarning}</p>
                </div>
            )}

            {/* Messages */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto px-3 py-3 md:p-4 space-y-3 md:space-y-4"
            >
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                        <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="font-medium">No messages yet</p>
                        <p className="text-sm">Be the first to start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const showDate = idx === 0 ||
                            formatDate(messages[idx].created_at) !== formatDate(messages[idx - 1].created_at);

                        return (
                            <React.Fragment key={msg.id}>
                                {showDate && (
                                    <div className="flex justify-center my-3">
                                        <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                                            {formatDate(msg.created_at)}
                                        </span>
                                    </div>
                                )}
                                <div className={`flex gap-2 md:gap-3 ${msg.is_own ? 'flex-row-reverse' : ''}`}>
                                    {/* Avatar - smaller on mobile */}
                                    <div className="flex-shrink-0">
                                        {msg.user_picture ? (
                                            <img
                                                src={msg.user_picture}
                                                alt={msg.user_name}
                                                className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-white shadow"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm shadow">
                                                {msg.user_name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Message Bubble - wider on mobile */}
                                    <div className={`max-w-[80%] md:max-w-[70%] ${msg.is_own ? 'text-right' : ''}`}>
                                        {!msg.is_own && (
                                            <p className="text-xs text-gray-500 mb-0.5 font-medium">
                                                {msg.user_name}
                                            </p>
                                        )}
                                        <div className={`px-3 py-2 md:p-3 rounded-2xl shadow-sm ${msg.is_own
                                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
                                            } ${msg.status === 'sending' ? 'opacity-70' : ''}`}>
                                            {msg.message_type === 'image' && msg.media_url && (
                                                <img
                                                    src={getMediaUrl(msg.media_url)}
                                                    alt="Shared"
                                                    className="max-w-full rounded-lg mb-2"
                                                />
                                            )}
                                            {msg.message_type === 'video' && msg.media_url && (
                                                <video
                                                    src={getMediaUrl(msg.media_url)}
                                                    controls
                                                    className="max-w-full rounded-lg mb-2"
                                                />
                                            )}
                                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        </div>
                                        <p className={`text-xs text-gray-400 mt-1 ${msg.is_own ? 'text-right' : ''}`}>
                                            {formatTime(msg.created_at)}
                                            {msg.status === 'sending' && <span className="ml-1 italic">Sending...</span>}
                                        </p>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,video/*"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        title="Share image or video"
                        disabled={sending || !connected}
                    >
                        <Image className="w-5 h-5" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message about farming..."
                        className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-colors"
                        disabled={!connected || sending}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || !connected || sending}
                        className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {sending ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-gray-400 text-center mt-2">
                    🌾 Only agriculture-related messages are allowed
                </p>
            </form>
        </div>
    );
};

export default Community;
