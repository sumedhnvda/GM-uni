import axios from 'axios';

// Detect production environment and use appropriate API URL
const getApiUrl = () => {
    // Check if env variable is set
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Production detection - if on Vercel, use Render backend
    if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
        return 'https://gm-uni.onrender.com/api/v1';
    }
    // Default to localhost for development
    return 'http://localhost:8000/api/v1';
};

export const API_URL = getApiUrl();

const api = axios.create({
    baseURL: API_URL,
});

// Add request interceptor to automatically include auth token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const loginWithGoogle = async (token: string) => {
    const response = await api.post('/auth/google', null, {
        params: { token },
    });
    return response.data;
};

export const analyzeCrops = async (data: any, token: string) => {
    const response = await api.post('/analyze', data, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return response.data;
};

export default api;
