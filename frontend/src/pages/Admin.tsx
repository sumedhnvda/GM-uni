import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Shield, Send, Users, MessageSquare, AlertCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react';

interface Subscriber {
    name: string;
    phone_number: string;
    language: string;
    message_preview: string;
}

interface PreviewData {
    base_message: string;
    subscribers: Subscriber[];
}

const Admin: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sending, setSending] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [customMessage, setCustomMessage] = useState("");
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        // Initial load: fetch subscribers only (fast)
        fetchPreview(false);
    }, []);

    const fetchPreview = async (generateNew = false) => {
        try {
            if (generateNew) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            // Pass generate_news param
            const res = await api.get(`/admin/broadcast-preview?generate_news=${generateNew}`);
            setPreviewData(res.data);

            // Only update message if we got one (don't overwrite with empty string if user typed something)
            if (res.data.base_message) {
                setCustomMessage(res.data.base_message);
            }

            if (generateNew) {
                setStatus({ type: 'success', message: "AI-generated content ready!" });
            }
        } catch (error: any) {
            console.error("Error fetching preview", error);
            setStatus({
                type: 'error',
                message: error.response?.status === 403 ? "Unauthorized Access" : "Failed to load preview"
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };



    const executeBroadcast = async () => {
        try {
            setSending(true);
            setStatus(null);
            await api.post('/admin/broadcast-news', { message: customMessage });
            setStatus({ type: 'success', message: "Broadcast sent successfully!" });
        } catch (error: any) {
            console.error("Error sending broadcast", error);
            setStatus({ type: 'error', message: error.response?.data?.detail || "Failed to send broadcast" });
        } finally {
            setSending(false);
            setShowConfirmModal(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading subscribers...</p>
            </div>
        );
    }

    if (!previewData && status?.type === 'error') {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center">
                <Shield className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
                <p className="text-gray-600">{status.message}</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 md:p-3 bg-purple-100 rounded-xl">
                        <Shield className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-500 text-sm md:text-base">Manage weekly agricultural updates</p>
                    </div>
                </div>
            </div>

            {/* Status Message */}
            {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <p className="font-medium">{status.message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Message Editor */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-gray-400" />
                                <h2 className="font-semibold text-gray-800">Broadcast Message</h2>
                            </div>
                            <button
                                onClick={() => fetchPreview(true)}
                                disabled={loading || refreshing}
                                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50 bg-purple-50 px-2 py-1 rounded-lg"
                            >
                                {refreshing ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3 h-3" />
                                )}
                                {refreshing ? 'Generating...' : 'AI Generate'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Message (English)
                                </label>
                                <textarea
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    disabled={refreshing}
                                    rows={8}
                                    className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm ${refreshing ? 'bg-gray-50 opacity-70' : ''}`}
                                    placeholder="Type your message or click 'AI Generate' for smart content..."
                                />
                                <p className="text-xs text-gray-400 mt-2 text-right">
                                    {customMessage.length} characters
                                </p>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg">
                                <p className="text-xs text-blue-700">
                                    💡 Message will be auto-translated to each subscriber's language (Hindi, Kannada, etc.)
                                </p>
                            </div>

                            <button
                                onClick={() => setShowConfirmModal(true)}
                                disabled={sending || !customMessage.trim()}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl font-medium transition-colors"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Send Broadcast
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recipient Preview */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-gray-400" />
                                <h2 className="font-semibold text-gray-800">Recipients</h2>
                            </div>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                {previewData?.subscribers.length || 0} Subscribers
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Name</th>
                                        <th className="px-6 py-3 font-medium">Phone</th>
                                        <th className="px-6 py-3 font-medium">Language</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {previewData?.subscribers.map((sub, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-4 font-medium text-gray-900">{sub.name}</td>
                                            <td className="px-6 py-4 text-gray-500">{sub.phone_number}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium uppercase">
                                                    {sub.language || 'en'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {previewData?.subscribers.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                                No subscribers found with SMS enabled.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-purple-100 rounded-full">
                                <Send className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">Confirm Broadcast</h3>
                        </div>

                        <div className="space-y-4 mb-6">
                            <p className="text-gray-600">
                                You are about to send this message to <span className="font-bold text-gray-900">{previewData?.subscribers.length || 0} subscribers</span>.
                            </p>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-500 mb-1">Message Preview:</p>
                                <p className="text-gray-800 font-medium line-clamp-3">"{customMessage}"</p>
                            </div>

                            <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
                                ℹ️ This will be automatically translated to each user's preferred language.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={executeBroadcast}
                                disabled={sending}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {sending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Confirm Send
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Admin;
