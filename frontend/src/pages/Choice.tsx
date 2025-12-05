import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Sprout, ArrowRight, MapPin, Ruler, History, Languages, X, Edit2, Check, Loader2, Video, Users } from 'lucide-react';
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

// Conversion factors to acres
const UNIT_TO_ACRES: Record<string, number> = {
    'acres': 1,
    'cents': 0.01,
    'hectares': 2.471,
    'sqft': 0.0000229568
};

const Choice: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshHistory } = useOutletContext<{ refreshHistory?: () => void }>() || {};

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

    const [landValue, setLandValue] = useState('');
    const [landUnit, setLandUnit] = useState('acres');
    const [detectingLocation, setDetectingLocation] = useState(false);

    const [pageLoading, setPageLoading] = useState(true);

    // Check for openAnalysis state
    useEffect(() => {
        if (location.state?.openAnalysis) {
            setShowAnalysisModal(true);
            // Optional: Clear state to prevent reopening on refresh? 
            // React Router's location state persists, but we can leave it.
            // If we wanted to clear it, we'd need to navigate again with replace.
            // navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state]);

    // Convert land size to acres when value or unit changes
    useEffect(() => {
        if (landValue && !isNaN(parseFloat(landValue))) {
            const valueInAcres = parseFloat(landValue) * UNIT_TO_ACRES[landUnit];
            setEditForm(prev => ({
                ...prev,
                land_size: `${valueInAcres.toFixed(2)} acres`
            }));
        }
    }, [landValue, landUnit]);

    const handleLocationDetect = () => {
        setDetectingLocation(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        setEditForm(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
                    } catch (error) {
                        console.error("Location error", error);
                    } finally {
                        setDetectingLocation(false);
                    }
                },
                (error) => {
                    console.error("Geolocation error", error);
                    setDetectingLocation(false);
                }
            );
        } else {
            alert("Geolocation is not supported by this browser.");
            setDetectingLocation(false);
        }
    };

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

            // Parse land size if exists
            if (profileData?.land_size) {
                const match = profileData.land_size.match(/^([\d.]+)/);
                if (match) {
                    setLandValue(match[1]);
                }
            }
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

            // Refresh history to show new analysis in sidebar
            if (refreshHistory) await refreshHistory();

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
        <div className="min-h-full p-4 md:p-12 flex flex-col items-center justify-center pb-24 md:pb-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8 md:mb-12"
            >
                <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-3 md:mb-4">
                    How can we help you today?
                </h1>
                <p className="text-gray-600 max-w-lg mx-auto text-sm md:text-base px-4">
                    Choose to chat with our AI assistant for quick advice or start a deep analysis of your farm conditions.
                </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 max-w-6xl w-full px-2">
                {/* Chat Option */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onClick={() => navigate('/chat')}
                    className="bg-white/90 backdrop-blur-sm p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-lg border border-white/50 cursor-pointer hover:shadow-xl hover:border-blue-200 transition-all duration-300 group hover:-translate-y-1 md:hover:-translate-y-2 touch-active"
                >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 group-hover:scale-105 transition-transform shadow-lg">
                        <MessageSquare className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-3">AI Chat</h2>
                    <p className="text-gray-500 mb-3 md:mb-6 text-xs md:text-base line-clamp-2 md:line-clamp-none">
                        Get instant answers about crops, pests, and farming techniques.
                    </p>
                    <div className="flex items-center text-blue-600 font-semibold group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform text-sm md:text-base">
                        Start <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                    </div>
                </motion.div>

                {/* Analysis Option */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    onClick={handleAnalysisClick}
                    className="bg-white/90 backdrop-blur-sm p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-lg border border-white/50 cursor-pointer hover:shadow-xl hover:border-emerald-200 transition-all duration-300 group hover:-translate-y-1 md:hover:-translate-y-2 touch-active"
                >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 group-hover:scale-105 transition-transform shadow-lg">
                        <Sprout className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-3">Analysis</h2>
                    <p className="text-gray-500 mb-3 md:mb-6 text-xs md:text-base line-clamp-2 md:line-clamp-none">
                        Comprehensive report on soil, weather, and crop viability.
                    </p>
                    <div className="flex items-center text-emerald-600 font-semibold group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform text-sm md:text-base">
                        Start <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                    </div>
                </motion.div>

                {/* Live Expert Option */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={() => navigate('/live')}
                    className="bg-white/90 backdrop-blur-sm p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-lg border border-white/50 cursor-pointer hover:shadow-xl hover:border-purple-200 transition-all duration-300 group hover:-translate-y-1 md:hover:-translate-y-2 touch-active"
                >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 group-hover:scale-105 transition-transform shadow-lg">
                        <Video className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-3">Live Call</h2>
                    <p className="text-gray-500 mb-3 md:mb-6 text-xs md:text-base line-clamp-2 md:line-clamp-none">
                        Video call with AI expert for real-time diagnosis.
                    </p>
                    <div className="flex items-center text-purple-600 font-semibold group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform text-sm md:text-base">
                        Start <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
                    </div>
                </motion.div>

                {/* Community Chat Option */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => navigate('/community')}
                    className="bg-white/90 backdrop-blur-sm p-4 md:p-8 rounded-2xl md:rounded-3xl shadow-lg border border-white/50 cursor-pointer hover:shadow-xl hover:border-orange-200 transition-all duration-300 group hover:-translate-y-1 md:hover:-translate-y-2 touch-active"
                >
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-6 group-hover:scale-105 transition-transform shadow-lg">
                        <Users className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 md:mb-3">Community</h2>
                    <p className="text-gray-500 mb-3 md:mb-6 text-xs md:text-base line-clamp-2 md:line-clamp-none">
                        Connect with local farmers and share experiences.
                    </p>
                    <div className="flex items-center text-orange-600 font-semibold group-hover:translate-x-1 md:group-hover:translate-x-2 transition-transform text-sm md:text-base">
                        Join <ArrowRight className="w-4 h-4 md:w-5 md:h-5 ml-1 md:ml-2" />
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
                                <div className="flex flex-col gap-1">
                                    <span className="text-gray-500 flex items-center gap-2 text-sm">
                                        <MapPin className="w-4 h-4" /> Location
                                    </span>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={editForm.location}
                                                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                placeholder="City or Coordinates"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleLocationDetect}
                                                disabled={detectingLocation}
                                                className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 disabled:opacity-50 text-sm whitespace-nowrap"
                                            >
                                                {detectingLocation ? '...' : 'Detect'}
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="font-semibold text-gray-900">{profileData.location}</span>
                                    )}
                                </div>
                                <div className="border-t border-emerald-100"></div>

                                {/* Land Size */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-gray-500 flex items-center gap-2 text-sm">
                                        <Ruler className="w-4 h-4" /> Land Size
                                    </span>
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={landValue}
                                                onChange={(e) => setLandValue(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                                                placeholder="Size"
                                                step="0.01"
                                            />
                                            <select
                                                value={landUnit}
                                                onChange={(e) => setLandUnit(e.target.value)}
                                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                                            >
                                                <option value="acres">Acres</option>
                                                <option value="cents">Cents</option>
                                                <option value="hectares">Hectares</option>
                                                <option value="sqft">Sq Ft</option>
                                            </select>
                                        </div>
                                    ) : (
                                        <span className="font-semibold text-gray-900">{profileData.land_size}</span>
                                    )}
                                </div>
                                <div className="border-t border-emerald-100"></div>

                                {/* Crops */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-gray-500 flex items-center gap-2 text-sm">
                                        <History className="w-4 h-4" /> Crops
                                    </span>
                                    {isEditing ? (
                                        <textarea
                                            value={editForm.crops_grown}
                                            onChange={(e) => setEditForm({ ...editForm, crops_grown: e.target.value })}
                                            placeholder="e.g., Rice, Wheat"
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
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
                                                // Reset land value
                                                if (profileData.land_size) {
                                                    const match = profileData.land_size.match(/^([\d.]+)/);
                                                    if (match) setLandValue(match[1]);
                                                }
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
                                            onClick={() => {
                                                setIsEditing(true);
                                                if (profileData.land_size) {
                                                    const match = profileData.land_size.match(/^([\d.]+)/);
                                                    if (match) setLandValue(match[1]);
                                                }
                                            }}
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
