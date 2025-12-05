import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sprout, CloudSun, TrendingUp, FileText, Download, Volume2, Loader2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Chatbot from '../components/Chatbot';
import AudioPlayer from '../components/AudioPlayer';
import api from '../services/api';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    useEffect(() => {
        const result = localStorage.getItem('analysisResult');
        if (!result) {
            navigate('/form');
            return;
        }
        setData(JSON.parse(result));
    }, [navigate]);

    const downloadImage = async () => {
        const element = document.getElementById('report-content');
        if (!element) return;

        try {

            // Import html-to-image
            const { toPng } = await import('html-to-image');

            // Generate image
            const dataUrl = await toPng(element, {
                quality: 1.0,
                backgroundColor: '#ffffff',
                style: {
                    // Force white background and ensure text is visible
                    backgroundColor: '#ffffff',
                },
                // Filter out any potential problematic elements if needed
                filter: (node) => {
                    // Example: exclude buttons from the print
                    if (node.tagName === 'BUTTON') return false;
                    return true;
                }
            });


            // Create download link
            const link = document.createElement('a');
            link.download = 'cropic-report.png';
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Image generation failed', error);
            alert(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
        }
    };



    const speakReport = async () => {
        if (!data || isSummarizing) return;

        setIsSummarizing(true);
        setAudioUrl(null);

        try {
            const token = localStorage.getItem('token');
            const userLanguage = localStorage.getItem('userLanguage') || 'en-IN';

            const response = await api.post('/analysis/summarize', {
                soil_type: data.soil_type,
                recommended_crops: data.recommended_crops,
                weather_analysis: data.weather_analysis,
                price_prediction: data.price_prediction,
                detailed_advice: data.detailed_advice,
                language: userLanguage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.audio) {
                // Set URL for AudioPlayer - it handles autoPlay
                const audioData = atob(response.data.audio);
                const arrayBuffer = new ArrayBuffer(audioData.length);
                const uint8Array = new Uint8Array(arrayBuffer);
                for (let i = 0; i < audioData.length; i++) {
                    uint8Array[i] = audioData.charCodeAt(i);
                }
                const blob = new Blob([uint8Array], { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            } else if (response.data.summary) {
                alert("Summary generated but audio synthesis failed. The backend TTS service may be unavailable.");
            }
        } catch (error: any) {
            console.error('Summary failed:', error);
            const errorMessage = error.response?.data?.detail || 'Could not generate audio summary. Please try again.';
            alert(errorMessage);
        } finally {
            setIsSummarizing(false);
        }
    };

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-8 pb-24 md:pb-8">
            <div className="max-w-6xl mx-auto">
                {/* Header - Mobile Responsive */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Analysis Report</h1>
                    <div className="flex gap-2 flex-wrap items-center">
                        {audioUrl ? (
                            <div className="mr-2">
                                <AudioPlayer audioSrc={audioUrl} autoPlay />
                            </div>
                        ) : (
                            <button
                                onClick={speakReport}
                                disabled={isSummarizing}
                                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl transition-all font-medium text-sm md:text-base touch-active ${isSummarizing
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                                    }`}
                                title="Listen to report summary"
                            >
                                {isSummarizing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Volume2 className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">{isSummarizing ? 'Summarizing...' : 'Listen'}</span>
                            </button>
                        )}
                        <button
                            onClick={downloadImage}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-xl transition-colors font-medium text-sm md:text-base touch-active"
                            title="Download report as image"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Image</span>
                        </button>
                        <button
                            onClick={() => navigate('/choice', { state: { openAnalysis: true } })}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-4 py-2 rounded-xl transition-colors font-medium text-sm md:text-base touch-active"
                            title="Start a new analysis"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">New</span>
                        </button>
                    </div>
                </div>

                <div id="report-content" className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                        {/* Soil Type */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-amber-500"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <Sprout className="w-6 h-6 text-amber-600" />
                                </div>
                                <h3 className="font-semibold text-gray-700">Soil Type</h3>
                            </div>
                            <p className="text-xl font-bold text-gray-900">{data.soil_type}</p>
                        </motion.div>

                        {/* Recommended Crops */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Sprout className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="font-semibold text-gray-700">Recommended</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {data.recommended_crops.map((crop: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                                        {crop}
                                    </span>
                                ))}
                            </div>
                        </motion.div>

                        {/* Weather Analysis */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <CloudSun className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="font-semibold text-gray-700">Weather</h3>
                            </div>
                            <p className="text-gray-600 text-sm">{data.weather_analysis}</p>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Price Prediction */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white p-6 rounded-xl shadow-sm lg:col-span-1"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-purple-600" />
                                </div>
                                <h3 className="font-semibold text-gray-700">Market Trends</h3>
                            </div>
                            <p className="text-gray-600">{data.price_prediction}</p>
                        </motion.div>

                        {/* Detailed Advice */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white p-8 rounded-xl shadow-sm lg:col-span-2"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-gray-100 rounded-lg">
                                    <FileText className="w-6 h-6 text-gray-600" />
                                </div>
                                <h3 className="font-semibold text-gray-700">Detailed Analysis</h3>
                            </div>
                            <div className="prose prose-green max-w-none">
                                <ReactMarkdown
                                    components={{
                                        strong: ({ node, ...props }) => <span className="font-extrabold text-green-700 bg-green-50 px-1 rounded" {...props} />
                                    }}
                                >
                                    {data.detailed_advice}
                                </ReactMarkdown>
                            </div>
                        </motion.div>
                    </div>

                    {/* Government Schemes Section */}
                    {data.applicable_schemes && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-8 rounded-xl shadow-sm border border-indigo-100"
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <FileText className="w-6 h-6 text-indigo-600" />
                                </div>
                                <h3 className="font-semibold text-indigo-800 text-lg">🏛️ Government Schemes For You</h3>
                            </div>
                            <div className="prose prose-indigo max-w-none">
                                <ReactMarkdown
                                    components={{
                                        strong: ({ node, ...props }) => <span className="font-extrabold text-indigo-700 bg-indigo-50 px-1 rounded" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-indigo-700 font-bold mt-4 mb-2" {...props} />,
                                        li: ({ node, ...props }) => <li className="text-gray-700" {...props} />
                                    }}
                                >
                                    {data.applicable_schemes}
                                </ReactMarkdown>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>
            <Chatbot reportData={data} mode="widget" />
        </div>
    );
};

export default Dashboard;

