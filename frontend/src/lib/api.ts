import axios from 'axios';

const API_URL = import.meta.env.DEV ? 'http://localhost:3001' : 'https://reky-ai.onrender.com';

const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('reky_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;
