import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
    const token = localStorage.getItem('token');

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                {/* 404 Icon */}
                <div className="mb-8">
                    <div className="relative inline-block">
                        <span className="text-9xl font-bold text-emerald-200">404</span>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-24 h-24 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    Page Not Found
                </h1>
                <p className="text-gray-600 mb-8">
                    Oops! The page you're looking for doesn't exist or has been moved.
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link
                        to={token ? "/choice" : "/login"}
                        className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:bg-emerald-700 transition-all duration-200 hover:scale-105"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        {token ? "Go to Dashboard" : "Sign In"}
                    </Link>
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center px-6 py-3 bg-white text-emerald-600 font-semibold rounded-lg shadow-lg border-2 border-emerald-600 hover:bg-emerald-50 transition-all duration-200"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Home
                    </Link>
                </div>

                {/* Decorative elements */}
                <div className="mt-12 flex justify-center gap-2">
                    <span className="text-4xl">🌾</span>
                    <span className="text-4xl">🌱</span>
                    <span className="text-4xl">🚜</span>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
