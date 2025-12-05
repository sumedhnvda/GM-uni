import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Ruler, History, ArrowRight, Languages } from 'lucide-react';
import api, { analyzeCrops } from '../services/api';

const Form: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [resolvedLocation, setResolvedLocation] = useState<string>('');
    const [formData, setFormData] = useState({
        location: '',
        land_size: '',
        previous_crops: '',
        language: 'en-IN',
    });

    // Load data from profile if available
    React.useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                if (token) {
                    const res = await api.get('/users/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const user = res.data;
                    if (user.location && user.land_size && user.crops_grown) {
                        setFormData({
                            location: user.location,
                            land_size: user.land_size,
                            previous_crops: user.crops_grown,
                            language: user.preferred_language || 'en-IN'
                        });
                        setResolvedLocation(user.location); // Already resolved from profile
                        setShowConfirmation(true);
                    }
                }
            } catch (error) {
                console.error("Error fetching profile", error);
            }
        };
        fetchProfile();
    }, []);

    const handleAnalyzeClick = (e: React.FormEvent) => {
        e.preventDefault();
        setShowConfirmation(true);
    };

    const handleConfirmAnalysis = async () => {
        setShowConfirmation(false);
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            // Prepare data
            const payload = {
                location: formData.location,
                land_size: formData.land_size,
                previous_crops: formData.previous_crops,
                language: formData.language,
            };

            const result = await analyzeCrops(payload, token);

            // Store result in state/localStorage to pass to dashboard
            localStorage.setItem('analysisResult', JSON.stringify(result));
            navigate('/dashboard');

        } catch (error) {
            console.error('Analysis failed', error);
            alert('Failed to analyze. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="bg-green-600 px-6 py-4">
                        <h2 className="text-2xl font-bold text-white">Farm Details</h2>
                        <p className="text-green-100">Tell us about your land</p>
                    </div>

                    {/* If showing confirmation, hide the form to avoid "asking again" visual */}
                    {!showConfirmation && (
                        <form onSubmit={handleAnalyzeClick} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <div className="flex items-center gap-2">
                                        <Languages className="w-4 h-4 text-green-600" />
                                        Report Language
                                    </div>
                                </label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    value={formData.language}
                                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                >
                                    <option value="en-IN">English (India)</option>
                                    <option value="hi-IN">Hindi (हिंदी)</option>
                                    <option value="bn-IN">Bengali (বাংলা)</option>
                                    <option value="te-IN">Telugu (తెలుగు)</option>
                                    <option value="mr-IN">Marathi (मराठी)</option>
                                    <option value="ta-IN">Tamil (தமிழ்)</option>
                                    <option value="ur-IN">Urdu (اردو)</option>
                                    <option value="gu-IN">Gujarati (ગુજરાતી)</option>
                                    <option value="kn-IN">Kannada (ಕನ್ನಡ)</option>
                                    <option value="ml-IN">Malayalam (മലയാളം)</option>
                                    <option value="pa-IN">Punjabi (ਪੰਜਾਬੀ)</option>
                                    <option value="or-IN">Odia (ଓଡ଼ିଆ)</option>
                                    <option value="as-IN">Assamese (অসমীয়া)</option>
                                    <option value="ma-IN">Maithili (मैथिली)</option>
                                    <option value="sa-IN">Sanskrit (संस्कृतम्)</option>
                                    <option value="ne-IN">Nepali (नेपाली)</option>
                                    <option value="sd-IN">Sindhi (सिन्धी)</option>
                                    <option value="kok-IN">Konkani (कोंकणी)</option>
                                    <option value="doi-IN">Dogri (डोगरी)</option>
                                    <option value="mni-IN">Manipuri (মণিপুরী)</option>
                                    <option value="brx-IN">Bodo (बड़ो)</option>
                                    <option value="sat-IN">Santali (ᱥᱟᱱᱛᱟᱲᱤ)</option>
                                    <option value="ks-IN">Kashmiri (कश्मीरी)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-600" />
                                        Location
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g., Punjab, India"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <div className="flex items-center gap-2">
                                        <Ruler className="w-4 h-4 text-green-600" />
                                        Land Size (Acres)
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g., 5.5 acres or '5 big fields'"
                                    value={formData.land_size}
                                    onChange={(e) => setFormData({ ...formData, land_size: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    <div className="flex items-center gap-2">
                                        <History className="w-4 h-4 text-green-600" />
                                        Previous Crops (Comma separated)
                                    </div>
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                                    placeholder="e.g., Wheat, Rice or 'last year i grew corn'"
                                    value={formData.previous_crops}
                                    onChange={(e) => setFormData({ ...formData, previous_crops: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-70"
                            >
                                {loading ? 'Analyzing...' : 'Analyze My Farm'}
                                {!loading && <ArrowRight className="w-5 h-5" />}
                            </button>
                        </form>
                    )}
                    {/* If showing confirmation, we can show a placeholder or just the modal overlay handles it. 
                        But to be cleaner, let's show a "Loading Profile..." or similar if we are in that state, 
                        OR just keep the form hidden. 
                        Actually, the modal is "fixed inset-0", so it covers everything. 
                        But hiding the form underneath prevents any flash or interaction. 
                    */}
                    {showConfirmation && (
                        <div className="p-12 text-center text-gray-500">
                            <p>Reviewing your profile data...</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Confirmation Modal */}
            {
                showConfirmation && (
                    <div className="fixed inset-0 bg-gradient-to-br from-emerald-900/20 via-black/30 to-teal-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/50"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <MapPin className="w-8 h-8 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Confirm Analysis Data</h3>
                                <p className="text-gray-500 mt-2">
                                    We will use this data for your analysis
                                </p>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-5 rounded-2xl space-y-3 mb-6 border border-emerald-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <MapPin className="w-4 h-4" /> Location
                                    </span>
                                    <span className="font-semibold text-gray-900 text-right max-w-[60%] truncate">{resolvedLocation || formData.location}</span>
                                </div>
                                <div className="border-t border-emerald-100"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <Ruler className="w-4 h-4" /> Land Size
                                    </span>
                                    <span className="font-semibold text-gray-900">{formData.land_size}</span>
                                </div>
                                <div className="border-t border-emerald-100"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <History className="w-4 h-4" /> Crops
                                    </span>
                                    <span className="font-semibold text-gray-900">{formData.previous_crops}</span>
                                </div>
                                <div className="border-t border-emerald-100"></div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500 flex items-center gap-2">
                                        <Languages className="w-4 h-4" /> Language
                                    </span>
                                    <span className="font-semibold text-gray-900">{formData.language}</span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowConfirmation(false)}
                                    className="flex-1 px-5 py-3 border-2 border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 font-semibold transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={handleConfirmAnalysis}
                                    disabled={loading}
                                    className="flex-1 px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Analyzing...' : <><ArrowRight className="w-5 h-5" /> Proceed</>}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )
            }
        </div >
    );
};

export default Form;
