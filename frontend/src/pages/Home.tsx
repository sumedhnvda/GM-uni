import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sprout, ArrowRight, TrendingUp, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const [searchCrop, setSearchCrop] = useState('');
    const [crops, setCrops] = useState<string[]>([]);
    const [forecast, setForecast] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    React.useEffect(() => {
        // Fetch supported crops
        api.get('/crops').then(res => setCrops(res.data)).catch(console.error);
    }, []);

    const handleQuickPredict = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchCrop.trim()) return;

        setLoading(true);
        setError('');
        setForecast(null);

        try {
            const response = await api.get(`/predict/${searchCrop.trim()}`);
            setForecast(response.data);
        } catch (err) {
            setError('Crop not found or data unavailable. Try "Wheat", "Rice", "Cotton", etc.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 font-sans">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-40">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Sprout className="w-8 h-8 text-green-600" />
                        <span className="text-2xl font-bold text-gray-900">Cropic</span>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="container mx-auto px-4 py-16 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-white rounded-full shadow-lg"
                >
                    <Sprout className="w-12 h-12 text-green-600" />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6"
                >
                    Smart Farming with AI
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-gray-600 mb-10 max-w-2xl"
                >
                    Predict crop prices, analyze soil health, and get personalized farming advice using advanced AI models.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex gap-4"
                >
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                    >
                        Start Deep Analysis <ArrowRight className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>

            {/* Quick Predictor Section */}
            <div className="container mx-auto px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden"
                >
                    <div className="bg-gray-900 p-6 text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-green-400" />
                            <h2 className="text-2xl font-bold">Quick Price Prediction</h2>
                        </div>
                        <span className="text-sm text-gray-400">Powered by Decision Trees</span>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleQuickPredict} className="flex gap-4 mb-8">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <select
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all appearance-none bg-white"
                                    value={searchCrop}
                                    onChange={(e) => setSearchCrop(e.target.value)}
                                >
                                    <option value="">Select a crop...</option>
                                    {crops.map(crop => (
                                        <option key={crop} value={crop}>{crop.charAt(0).toUpperCase() + crop.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !searchCrop}
                                className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-70"
                            >
                                {loading ? 'Analyzing...' : 'Predict'}
                            </button>
                        </form>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6">
                                {error}
                            </div>
                        )}

                        {forecast && (
                            <div className="space-y-8">
                                {/* Graph Section */}
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={forecast}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="month" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="price" stroke="#16a34a" strokeWidth={2} activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {forecast.map((item, index) => (
                                        <div key={index} className="p-4 bg-green-50 rounded-xl border border-green-100">
                                            <p className="text-sm text-gray-500 mb-1">{item.month}</p>
                                            <p className="text-lg font-bold text-green-700">₹{item.price}</p>
                                            <p className="text-xs text-gray-400">WPI: {item.wpi}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {forecast && (
                            <div className="mt-8 text-center">
                                <p className="text-gray-600 mb-4">Want a more detailed report including soil and weather analysis?</p>
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-green-600 font-semibold hover:underline flex items-center justify-center gap-1 mx-auto"
                                >
                                    Go to In-Depth Analysis <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Home;
