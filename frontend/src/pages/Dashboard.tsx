import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sprout, CloudSun, TrendingUp, FileText, Download, Volume2, Loader2, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Chatbot from '../components/Chatbot';
import api from '../services/api';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);

    useEffect(() => {
        const result = localStorage.getItem('analysisResult');
        if (!result) {
            navigate('/form');
            return;
        }
        setData(JSON.parse(result));
    }, [navigate]);

    const downloadPDF = async () => {
        const element = document.getElementById('report-content');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();

            const margin = 10;
            const contentWidth = pdfWidth - 2 * margin;
            const contentHeight = (canvas.height * contentWidth) / canvas.width;

            let position = margin;
            let imgHeight = contentHeight;

            if (imgHeight < pdf.internal.pageSize.getHeight() - 2 * margin) {
                pdf.addImage(imgData, 'PNG', margin, margin, contentWidth, contentHeight);
            } else {
                let heightLeft = imgHeight;
                let pageNum = 1;

                while (heightLeft > 0) {
                    if (pageNum > 1) {
                        pdf.addPage();
                    }
                    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
                    heightLeft -= (pdf.internal.pageSize.getHeight() - 2 * margin);
                    position -= (pdf.internal.pageSize.getHeight() - 2 * margin);
                    pageNum++;
                }
            }

            pdf.save('cropic-report.pdf');
        } catch (error) {
            console.error('PDF generation failed', error);
        }
    };

    const speakReport = async () => {
        if (!data || isSummarizing) return;

        setIsSummarizing(true);

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
                playAudio(response.data.audio);
            }
        } catch (error) {
            console.error('Summary failed:', error);
            alert('Could not generate audio summary. Please try again.');
        } finally {
            setIsSummarizing(false);
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
            const blob = new Blob([uint8Array], { type: 'audio/mpeg' });
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);

            setIsPlaying(true);
            audio.onended = () => setIsPlaying(false);
            audio.play();
        } catch (error) {
            console.error('Audio playback error:', error);
            setIsPlaying(false);
        }
    };

    if (!data) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 sm:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Analysis Report</h1>
                    <div className="flex gap-3 flex-wrap">
                        <button
                            onClick={speakReport}
                            disabled={isSummarizing || isPlaying}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium ${isSummarizing || isPlaying
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                                }`}
                            title="Listen to report summary"
                        >
                            {isSummarizing ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Volume2 className={`w-4 h-4 ${isPlaying ? 'animate-pulse' : ''}`} />
                            )}
                            {isSummarizing ? 'Summarizing...' : isPlaying ? 'Playing...' : 'Listen'}
                        </button>
                        <button
                            onClick={downloadPDF}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                            title="Download report as PDF"
                        >
                            <Download className="w-4 h-4" /> PDF
                        </button>
                        <button
                            onClick={() => navigate('/choice')}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                            title="Start a new analysis"
                        >
                            <Plus className="w-4 h-4" /> New Analysis
                        </button>
                    </div>
                </div>

                <div id="report-content" className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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

