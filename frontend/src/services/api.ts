import axios from 'axios';

export const API_URL = 'http://localhost:8000/api/v1';

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

export const loginWithGoogle = async (email: string, name: string) => {
    const response = await api.post('/auth/login', { email, name });
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
