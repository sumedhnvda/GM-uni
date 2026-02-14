import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sprout, ArrowRight, MapPin, Ruler, History, Languages, X, Edit2, Check, Loader2 } from 'lucide-react';
import api, { analyzeCrops } from '../services/api';

// All languages supported by Sarvam AI Translation API
const SARVAM_LANGUAGES = [
    { code: 'en-IN', label: 'English' },
    { code: 'hi-IN', label: 'Hindi (हिंदी)' },
    { code: 'bn-IN', label: 'Bengali (বাংলা)' },
    { code: 'gu-IN', label: 'Gujarati (ગુજરાતી)' },
    { code: 'kn-IN', label: 'Kannada (ಕನ್ನಡ)' },
    { code: 'ml-IN', label: 'Malayalam (മലയാളം)' },
    { code: 'mr-IN', label: 'Marathi (मराठी)' },
    { code: 'od-IN', label: 'Odia (ଓଡ଼ିଆ)' },
    { code: 'pa-IN', label: 'Punjabi (ਪੰਜਾਬੀ)' },
    { code: 'ta-IN', label: 'Tamil (தமிழ்)' },
    { code: 'te-IN', label: 'Telugu (తెలుగు)' },
    // Additional scheduled languages supported by Sarvam Translate
    { code: 'as-IN', label: 'Assamese (অসমীয়া)' },
    { code: 'ur-IN', label: 'Urdu (اردو)' },
    { code: 'ne-IN', label: 'Nepali (नेपाली)' },
    { code: 'sa-IN', label: 'Sanskrit (संस्कृतम्)' },
    { code: 'ks-IN', label: 'Kashmiri (कॉशुर)' },
    { code: 'kok-IN', label: 'Konkani (कोंकणी)' },
    { code: 'mai-IN', label: 'Maithili (मैथिली)' },
    { code: 'mni-IN', label: 'Manipuri (মৈতৈলোন্)' },
    { code: 'sd-IN', label: 'Sindhi (سنڌي)' },
    { code: 'doi-IN', label: 'Dogri (डोगरी)' },
    { code: 'sat-IN', label: 'Santali (ᱥᱟᱱᱛᱟᱲᱤ)' },
    { code: 'brx-IN', label: 'Bodo (बड़ो)' },
];

const Choice: React.FC = () => {
    const navigate = useNavigate();
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState<any>(null);

    // Analysis language (can be different from profile language)
    const [analysisLanguage, setAnalysisLanguage] = useState('en-IN');

    // Edit form state
    const [editForm, setEditForm] = useState({
        location: '',
        land_size: '',
        crops_grown: '',
        preferred_language: 'en-IN'
    });

    const [pageLoading, setPageLoading] = useState(true);

    // Fetch user profile on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/users/me');
                setProfileData(res.data);
                setEditForm({
                    location: res.data.location || '',
                    land_size: res.data.land_size || '',
                    crops_grown: res.data.crops_grown || '',
                    preferred_language: res.data.preferred_language || 'en-IN'
                });
                // Set default analysis language from profile
                setAnalysisLanguage(res.data.preferred_language || 'en-IN');
            } catch (error) {
                console.error("Error fetching profile", error);
            } finally {
                setPageLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const handleAnalysisClick = () => {
        if (profileData?.location && profileData?.land_size && profileData?.crops_grown) {
            setShowAnalysisModal(true);
            setIsEditing(false);
        } else {
            // Profile incomplete, open modal in edit mode to complete it here
            setShowAnalysisModal(true);
            setIsEditing(true);
        }
    };

    const handleSaveEdit = async () => {
        setSaving(true);
        try {
            const payload = {
                ...profileData,
                location: editForm.location,
                land_size: editForm.land_size,
                crops_grown: editForm.crops_grown,
                preferred_language: editForm.preferred_language
            };

            const res = await api.put('/users/profile', payload);
            setProfileData(res.data);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to save', error);
            alert('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmAnalysis = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const payload = {
                location: profileData.location,
                land_size: profileData.land_size,
                previous_crops: profileData.crops_grown,
                language: analysisLanguage,  // Use selected analysis language
            };

            const result = await analyzeCrops(payload, token);
            localStorage.setItem('analysisResult', JSON.stringify(result));
            navigate('/dashboard');
        } catch (error) {
            console.error('Analysis failed', error);
            alert('Failed to analyze. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) {
        return (
            <div className="min-h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="min-h-full p-6 md:p-12 flex flex-col items-center justify-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    How can we help you today?
                </h1>
                <p className="text-gray-600 max-w-lg mx-auto">
                    Choose to chat with our AI assistant for quick advice or start a deep analysis of your farm conditions.
                </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl w-full">
                {/* Chat Option */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/chat')}
                    className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50 cursor-pointer hover:shadow-2xl hover:border-blue-200 transition-all duration-300 group hover:-translate-y-2"
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                        <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">AI Assistant</h2>
                    <p className="text-gray-500 mb-6">
                        Chat with our advanced AI to get instant answers about crops, pests, and farming techniques.
                    </p>
                    <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-2 transition-transform">
                        Start Chatting <ArrowRight className="w-5 h-5 ml-2" />
                    </div>
                </motion.div>

                {/* Analysis Option */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={handleAnalysisClick}
                    className="bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-xl border border-white/50 cursor-pointer hover:shadow-2xl hover:border-emerald-200 transition-all duration-300 group hover:-translate-y-2"
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                        <Sprout className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Deep Analysis</h2>
                    <p className="text-gray-500 mb-6">
                        Get a comprehensive report on soil health, weather, and crop viability using satellite data.
                    </p>
                    <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-2 transition-transform">
                        Start Analysis <ArrowRight className="w-5 h-5 ml-2" />
                    </div>
                </motion.div>
            </div>

            {/* Analysis Confirmation Modal */}
            <AnimatePresence>
                {showAnalysisModal && profileData && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-gradient-to-br from-emerald-900/20 via-black/30 to-teal-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        onClick={() => !loading && !saving && setShowAnalysisModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/50 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close button */}
                            <button
                                onClick={() => setShowAnalysisModal(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                                disabled={loading || saving}
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <Sprout className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">
                                    {isEditing ? 'Edit Analysis Data' : 'Ready to Analyze'}
                                </h3>
                                <p className="text-gray-500 mt-2">
                                    {isEditing ? 'Update your details below' : 'Using your profile data for analysis'}
                                </p>
                            </div>

                            {/* Data Display / Edit Form */}
                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl space-y-3 mb-6 border border-emerald-100">
                                {/* Location */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> Location
                                    </span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editForm.location}
                                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                            className="px-3 py-1 border border-gray-300 rounded-lg text-right w-[60%] focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    ) : (
                                        <span className="font-semibold text-gray-900 text-right max-w-[60%] truncate">{profileData.location}</span>
                                    )}
                                </div>
                                <div className="border-t border-emerald-100"></div>

                                {/* Land Size */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <Ruler className="w-4 h-4" /> Land Size
                                    </span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editForm.land_size}
                                            onChange={(e) => setEditForm({ ...editForm, land_size: e.target.value })}
                                            placeholder="e.g., 5 acres"
                                            className="px-3 py-1 border border-gray-300 rounded-lg text-right w-[60%] focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    ) : (
                                        <span className="font-semibold text-gray-900">{profileData.land_size}</span>
                                    )}
                                </div>
                                <div className="border-t border-emerald-100"></div>

                                {/* Crops */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <History className="w-4 h-4" /> Crops
                                    </span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={editForm.crops_grown}
                                            onChange={(e) => setEditForm({ ...editForm, crops_grown: e.target.value })}
                                            placeholder="e.g., Rice, Wheat"
                                            className="px-3 py-1 border border-gray-300 rounded-lg text-right w-[60%] focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    ) : (
                                        <span className="font-semibold text-gray-900">{profileData.crops_grown}</span>
                                    )}
                                </div>
                                <div className="border-t border-emerald-100"></div>

                                {/* Report Language - Always editable */}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <Languages className="w-4 h-4" /> Report Language
                                    </span>
                                    <select
                                        value={analysisLanguage}
                                        onChange={(e) => setAnalysisLanguage(e.target.value)}
                                        disabled={loading}
                                        className="px-3 py-1 border border-emerald-300 rounded-lg text-right w-[60%] focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-semibold text-gray-900"
                                    >
                                        {SARVAM_LANGUAGES.map((lang: { code: string, label: string }) => (
                                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <p className="text-xs text-gray-400 mt-1 text-right">Analysis will be translated via Sarvam AI</p>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                // Reset form to original data
                                                setEditForm({
                                                    location: profileData.location || '',
                                                    land_size: profileData.land_size || '',
                                                    crops_grown: profileData.crops_grown || '',
                                                    preferred_language: profileData.preferred_language || 'en-IN'
                                                });
                                            }}
                                            disabled={saving}
                                            className="flex-1 px-5 py-3 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveEdit}
                                            disabled={saving}
                                            className="flex-1 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <Check className="w-5 h-5" /> Save
                                                </>
                                            )}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            disabled={loading}
                                            className="flex-1 px-5 py-3 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Edit2 className="w-4 h-4" /> Edit
                                        </button>
                                        <button
                                            onClick={handleConfirmAnalysis}
                                            disabled={loading}
                                            className="flex-1 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                                        >
                                            {loading ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Analyzing...
                                                </span>
                                            ) : (
                                                <>
                                                    <ArrowRight className="w-5 h-5" /> Analyze
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Choice;
