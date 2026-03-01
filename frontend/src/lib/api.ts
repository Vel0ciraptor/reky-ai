import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3001',
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT from localStorage automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('reky_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export default api;
