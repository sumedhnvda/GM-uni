import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Sprout, Languages, Ruler, Save, Loader2, Calendar, Award } from 'lucide-react';
import api from '../services/api';

// Conversion factors to acres
const UNIT_TO_ACRES: Record<string, number> = {
    'acres': 1,
    'cents': 0.01,      // 1 cent = 0.01 acres (100 cents = 1 acre)
    'hectares': 2.471,  // 1 hectare = 2.471 acres
    'sqft': 0.0000229568 // 1 sq ft = 0.0000229568 acres
};

// UI Labels for languages (All Sarvam AI supported languages)
const LANGUAGE_LABELS: Record<string, { native: string, english: string }> = {
    'en-IN': { native: 'English', english: 'English' },
    'hi-IN': { native: 'हिंदी', english: 'Hindi' },
    'bn-IN': { native: 'বাংলা', english: 'Bengali' },
    'gu-IN': { native: 'ગુજરાતી', english: 'Gujarati' },
    'kn-IN': { native: 'ಕನ್ನಡ', english: 'Kannada' },
    'ml-IN': { native: 'മലയാളം', english: 'Malayalam' },
    'mr-IN': { native: 'मराठी', english: 'Marathi' },
    'od-IN': { native: 'ଓଡ଼ିଆ', english: 'Odia' },
    'pa-IN': { native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
    'ta-IN': { native: 'தமிழ்', english: 'Tamil' },
    'te-IN': { native: 'తెలుగు', english: 'Telugu' },
    // Additional scheduled languages
    'as-IN': { native: 'অসমীয়া', english: 'Assamese' },
    'ur-IN': { native: 'اردو', english: 'Urdu' },
    'ne-IN': { native: 'नेपाली', english: 'Nepali' },
    'sa-IN': { native: 'संस्कृतम्', english: 'Sanskrit' },
    'ks-IN': { native: 'कॉशुर', english: 'Kashmiri' },
    'kok-IN': { native: 'कोंकणी', english: 'Konkani' },
    'mai-IN': { native: 'मैथिली', english: 'Maithili' },
    'mni-IN': { native: 'მৈতৈলোন্', english: 'Manipuri' },
    'sd-IN': { native: 'سنڌي', english: 'Sindhi' },
    'doi-IN': { native: 'डोगरी', english: 'Dogri' },
    'sat-IN': { native: 'ᱥᱟᱱᱛᱟᱲᱤ', english: 'Santali' },
    'brx-IN': { native: 'बड़ो', english: 'Bodo' },
};

// Translated UI strings for common phrases
const UI_TRANSLATIONS: Record<string, Record<string, string>> = {
    'en-IN': {
        title: 'Complete Your Profile',
        subtitle: 'Help us personalize your farming advice',
        username: 'Username',
        fullName: 'Full Name',
        phone: 'Phone Number',
        sms: 'Enable Weekly SMS Updates',
        age: 'Age',
        gender: 'Gender',
        casteCategory: 'Caste Category',
        experience: 'Experience',
        location: 'Location',
        landSize: 'Land Size',
        crops: 'Previous Crops',
        language: 'Preferred Language',
        save: 'Save Profile',
        saving: 'Saving...',
        detectLocation: 'Detect Location',
        selectUnit: 'Unit',
        none: 'None (First time farmer)',
        beginner: 'Beginner (0-2 years)',
        intermediate: 'Intermediate (3-5 years)',
        experienced: 'Experienced (5-10 years)',
        expert: 'Expert (10+ years)',
    },
    'hi-IN': {
        title: 'अपनी प्रोफ़ाइल पूरी करें',
        subtitle: 'आपकी खेती की सलाह को व्यक्तिगत बनाने में हमारी मदद करें',
        username: 'उपयोगकर्ता नाम',
        fullName: 'पूरा नाम',
        phone: 'फ़ोन नंबर',
        sms: 'साप्ताहिक एसएमएस अपडेट सक्षम करें',
        age: 'आयु',
        gender: 'लिंग',
        casteCategory: 'जाति श्रेणी',
        experience: 'अनुभव',
        location: 'स्थान',
        landSize: 'भूमि का आकार',
        crops: 'पिछली फसलें',
        language: 'पसंदीदा भाषा',
        save: 'प्रोफ़ाइल सहेजें',
        saving: 'सहेजा जा रहा है...',
        detectLocation: 'स्थान पता करें',
        selectUnit: 'इकाई',
        none: 'कोई नहीं (पहली बार किसान)',
        beginner: 'शुरुआती (0-2 वर्ष)',
        intermediate: 'मध्यवर्ती (3-5 वर्ष)',
        experienced: 'अनुभवी (5-10 वर्ष)',
        expert: 'विशेषज्ञ (10+ वर्ष)',
    },
    'kn-IN': {
        title: 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ',
        subtitle: 'ನಿಮ್ಮ ಕೃಷಿ ಸಲಹೆಯನ್ನು ವೈಯಕ್ತೀಕರಿಸಲು ನಮಗೆ ಸಹಾಯ ಮಾಡಿ',
        username: 'ಬಳಕೆದಾರ ಹೆಸರು',
        fullName: 'ಪೂರ್ಣ ಹೆಸರು',
        phone: 'ದೂರವಾಣಿ ಸಂಖ್ಯೆ',
        sms: 'ವಾರದ SMS ನವೀಕರಣಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ',
        age: 'ವಯಸ್ಸು',
        gender: 'ಲಿಂಗ',
        casteCategory: 'ಜಾತಿ ವರ್ಗ',
        experience: 'ಅನುಭವ',
        location: 'ಸ್ಥಳ',
        landSize: 'ಭೂಮಿ ಗಾತ್ರ',
        crops: 'ಹಿಂದಿನ ಬೆಳೆಗಳು',
        language: 'ಆದ್ಯತೆಯ ಭಾಷೆ',
        save: 'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ',
        saving: 'ಉಳಿಸಲಾಗುತ್ತಿದೆ...',
        detectLocation: 'ಸ್ಥಳ ಪತ್ತೆ',
        selectUnit: 'ಘಟಕ',
        none: 'ಯಾವುದೂ ಇಲ್ಲ (ಮೊದಲ ಬಾರಿ ರೈತ)',
        beginner: 'ಆರಂಭಿಕ (0-2 ವರ್ಷ)',
        intermediate: 'ಮಧ್ಯಮ (3-5 ವರ್ಷ)',
        experienced: 'ಅನುಭವಿ (5-10 ವರ್ಷ)',
        expert: 'ತಜ್ಞ (10+ ವರ್ಷ)',
    },
    'ta-IN': {
        title: 'உங்கள் சுயவிவரத்தை நிறைவு செய்யுங்கள்',
        subtitle: 'உங்கள் விவசாய ஆலோசனையை தனிப்பயனாக்க எங்களுக்கு உதவுங்கள்',
        username: 'பயனர்பெயர்',
        fullName: 'முழு பெயர்',
        phone: 'தொலைபேசி எண்',
        sms: 'வாராந்திர SMS புதுப்பிப்புகளை இயக்கு',
        age: 'வயது',
        gender: 'பாலினம்',
        casteCategory: 'ஜாதி வகை',
        experience: 'அனுபவம்',
        location: 'இடம்',
        landSize: 'நில அளவு',
        crops: 'முந்தைய பயிர்கள்',
        language: 'விருப்ப மொழி',
        save: 'சுயவிவரத்தை சேமி',
        saving: 'சேமிக்கிறது...',
        detectLocation: 'இடத்தை கண்டறி',
        selectUnit: 'அலகு',
        none: 'எதுவுமில்லை (முதல் முறை விவசாயி)',
        beginner: 'தொடக்கநிலை (0-2 ஆண்டுகள்)',
        intermediate: 'இடைநிலை (3-5 ஆண்டுகள்)',
        experienced: 'அனுபவமுள்ள (5-10 ஆண்டுகள்)',
        expert: 'நிபுணர் (10+ ஆண்டுகள்)',
    },
    'te-IN': {
        title: 'మీ ప్రొఫైల్‌ను పూర్తి చేయండి',
        subtitle: 'మీ సfarming సలహా వ్యక్తిగతీకరించడానికి మమ్మల్ని సహాయం చేయండి',
        username: 'వినియోగదారు పేరు',
        fullName: 'పూర్తి పేరు',
        phone: 'ఫోన్ నంబర్',
        sms: 'వారపు SMS అప్‌డేట్‌లను ప్రారంభించండి',
        age: 'వయస్సు',
        gender: 'లింగం',
        casteCategory: 'కాస్ట్ కేటగరీ',
        experience: 'అనుభవం',
        location: 'స్థానం',
        landSize: 'భూమి పరిమాణం',
        crops: 'మునుపటి పంటలు',
        language: 'ఇష్టమైన భాష',
        save: 'ప్రొఫైల్‌ను సేవ్ చేయండి',
        saving: 'సేవ్ చేస్తోంది...',
        detectLocation: 'స్థానాన్ని గుర్తించండి',
        selectUnit: 'యూనిట్',
        none: 'ఏదీ లేదు (మొదటిసారి రైతు)',
        beginner: 'తొలిసారి (0-2 సంవత్సరాలు)',
        intermediate: 'మధ్యస్థ (3-5 సంవత్సరాలు)',
        experienced: 'అనుభkerman (5-10 సంవత్సరాలు)',
        expert: 'నిపుణుడు (10+ సంవత్సరాలు)',
    },
};

// Get translation with fallback to English
const getTranslation = (lang: string, key: string): string => {
    return UI_TRANSLATIONS[lang]?.[key] || UI_TRANSLATIONS['en-IN'][key] || key;
};

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [usernameError, setUsernameError] = useState('');
    const [landValue, setLandValue] = useState('');
    const [landUnit, setLandUnit] = useState('acres');

    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        age: '',
        gender: '',
        caste_category: '',
        farming_experience: '',
        location: '',
        land_size: '',
        crops_grown: '',
        preferred_language: 'en-IN',
        phone_number: '',
        sms_enabled: false
    });

    // Current language for UI
    const lang = formData.preferred_language;
    const t = (key: string) => getTranslation(lang, key);

    // Handle language change (Just save preference, no Google Translate)
    const handleLanguageChange = async (newLang: string) => {
        // 1. Update local state
        setFormData(prev => ({ ...prev, preferred_language: newLang }));

        // 2. Auto-save to backend
        try {
            await api.put('/users/profile', {
                ...formData,
                preferred_language: newLang,
                age: formData.age ? parseInt(formData.age) : null,
                crops_grown: formData.crops_grown || 'None'
            });
        } catch (error) {
            console.error("Failed to save language preference:", error);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/users/me');
                const user = res.data;
                if (user) {
                    setFormData({
                        username: user.username || '',
                        full_name: user.full_name || '',
                        age: user.age ? String(user.age) : '',
                        gender: user.gender || '',
                        caste_category: user.caste_category || '',
                        farming_experience: user.farming_experience || '',
                        location: user.location || '',
                        land_size: user.land_size || '',
                        crops_grown: user.crops_grown || '',
                        preferred_language: user.preferred_language || 'en-IN',
                        phone_number: user.phone_number || '',
                        sms_enabled: user.sms_enabled || false
                    });
                    // Parse land size if it contains "acres"
                    if (user.land_size) {
                        const match = user.land_size.match(/^([\d.]+)/);
                        if (match) {
                            setLandValue(match[1]);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching profile", error);
            }
        };
        fetchProfile();
    }, []);

    // Convert land size to acres when value or unit changes
    useEffect(() => {
        if (landValue && !isNaN(parseFloat(landValue))) {
            const valueInAcres = parseFloat(landValue) * UNIT_TO_ACRES[landUnit];
            setFormData(prev => ({
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
                        setFormData(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setUsernameError('');

        try {
            const payload = {
                ...formData,
                age: formData.age ? parseInt(formData.age) : null,
                crops_grown: formData.crops_grown || 'None'
            };

            const response = await api.put('/users/profile', payload);

            // Update form with resolved location from backend
            if (response.data.location) {
                setFormData(prev => ({ ...prev, location: response.data.location }));
            }

            // Navigate to choice page after saving
            navigate('/choice');
        } catch (error: any) {
            if (error.response?.data?.detail?.includes('Username already exists')) {
                setUsernameError('Username already exists. Please choose a different one.');
            } else {
                console.error("Error saving profile:", error);
                alert('Error saving profile. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 py-12 px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-green-100 rounded-full">
                            <Sprout className="w-8 h-8 text-green-600" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
                    <p className="text-gray-600">{t('subtitle')}</p>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Language Selector */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <Languages className="w-4 h-4" />
                                {t('language')}
                            </label>
                            <select
                                value={formData.preferred_language}
                                onChange={(e) => handleLanguageChange(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                {Object.entries(LANGUAGE_LABELS).map(([code, { native, english }]) => (
                                    <option key={code} value={code}>
                                        {native} ({english})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('username')}</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${usernameError ? 'border-red-500' : 'border-gray-300'}`}
                                required
                            />
                            {usernameError && <p className="text-red-500 text-sm mt-1">{usernameError}</p>}
                        </div>

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('fullName')}</label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('phone')}</label>
                            <input
                                type="tel"
                                value={formData.phone_number}
                                onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="+91 9876543210"
                            />
                        </div>

                        {/* Age */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {t('age')}
                            </label>
                            <input
                                type="number"
                                value={formData.age}
                                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                min="18"
                                max="120"
                            />
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('gender')}</label>
                            <select
                                value={formData.gender}
                                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select...</option>
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="O">Other</option>
                            </select>
                        </div>

                        {/* Caste Category */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('casteCategory')}</label>
                            <select
                                value={formData.caste_category}
                                onChange={(e) => setFormData(prev => ({ ...prev, caste_category: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">Select...</option>
                                <option value="SC">SC (Scheduled Caste)</option>
                                <option value="ST">ST (Scheduled Tribe)</option>
                                <option value="OBC">OBC (Other Backward Classes)</option>
                                <option value="General">General</option>
                                <option value="Prefer Not to Say">Prefer Not to Say</option>
                            </select>
                        </div>

                        {/* Farming Experience */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Award className="w-4 h-4" />
                                {t('experience')}
                            </label>
                            <select
                                value={formData.farming_experience}
                                onChange={(e) => setFormData(prev => ({ ...prev, farming_experience: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            >
                                <option value="">{t('none')}</option>
                                <option value="Beginner">{t('beginner')}</option>
                                <option value="Intermediate">{t('intermediate')}</option>
                                <option value="Experienced">{t('experienced')}</option>
                                <option value="Expert">{t('expert')}</option>
                            </select>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {t('location')}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Enter city name or coordinates"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={handleLocationDetect}
                                    disabled={detectingLocation}
                                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors"
                                >
                                    {detectingLocation ? 'Detecting...' : 'Detect'}
                                </button>
                            </div>
                        </div>

                        {/* Land Size */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Ruler className="w-4 h-4" />
                                {t('landSize')}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={landValue}
                                    onChange={(e) => setLandValue(e.target.value)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    placeholder="Enter value"
                                    step="0.01"
                                />
                                <select
                                    value={landUnit}
                                    onChange={(e) => setLandUnit(e.target.value)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                >
                                    <option value="acres">{t('selectUnit')} (acres)</option>
                                    <option value="cents">{t('selectUnit')} (cents)</option>
                                    <option value="hectares">{t('selectUnit')} (hectares)</option>
                                    <option value="sqft">{t('selectUnit')} (sq ft)</option>
                                </select>
                            </div>
                        </div>

                        {/* Crops Grown */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <Sprout className="w-4 h-4" />
                                {t('crops')}
                            </label>
                            <textarea
                                value={formData.crops_grown}
                                onChange={(e) => setFormData(prev => ({ ...prev, crops_grown: e.target.value }))}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                rows={3}
                                placeholder="e.g., Wheat, Rice, Maize (Leave empty if none)"
                            />
                        </div>

                        {/* SMS Toggle */}
                        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
                            <input
                                type="checkbox"
                                id="sms_enabled"
                                checked={formData.sms_enabled}
                                onChange={(e) => setFormData(prev => ({ ...prev, sms_enabled: e.target.checked }))}
                                className="w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
                            />
                            <label htmlFor="sms_enabled" className="text-sm font-medium text-gray-800 cursor-pointer select-none">
                                {t('sms')}
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {t('saving')}
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {t('save')}
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default Profile;
