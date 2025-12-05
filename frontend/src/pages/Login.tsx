import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { loginWithGoogle } from '../services/api';
import { motion } from 'framer-motion';
import { Sprout } from 'lucide-react';

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleSuccess = async (credentialResponse: any) => {
        setIsLoading(true);
        setError(null);
        try {
            if (credentialResponse.credential) {
                // Verify with backend and get custom JWT
                const data = await loginWithGoogle(credentialResponse.credential);
                localStorage.setItem('token', data.access_token);

                // Backend now tells us if profile is complete
                if (data.profile_complete) {
                    // Existing user with complete profile -> go to Choice
                    navigate('/choice');
                } else {
                    // New user or incomplete profile -> go to Profile
                    navigate('/profile');
                }
            }
        } catch (error) {
            console.error('Login failed', error);
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4 relative overflow-hidden">
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-1/2 -right-32 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute -bottom-20 left-1/3 w-56 h-56 bg-green-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-md text-center relative z-10 border border-white/50"
            >
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg">
                        <Sprout className="w-10 h-10 text-white" />
                    </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Cropic</h1>
                <p className="text-gray-500 mb-8">Smart farming decisions powered by AI</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                <div className="flex justify-center relative">
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-green-600 font-medium py-2">
                            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                            Signing in...
                        </div>
                    ) : (
                        <GoogleLogin
                            onSuccess={handleSuccess}
                            onError={() => {
                                setError('Google Login Failed');
                            }}
                            useOneTap
                        />
                    )}
                </div>

                <p className="mt-8 text-xs text-gray-400">
                    By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
            </motion.div>
        </div>
    );
};

export default Login;
