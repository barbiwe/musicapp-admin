import axios from 'axios';

const API_URL = 'http://localhost:8080';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// --- AUTH ---
export const loginAdmin = async (email, password) => {
    try {
        const res = await api.post('/api/Auth/login', { Email: email, Password: password });

        console.log("LOGIN RESPONSE:", res.data); // 👇 ДИВИСЬ В КОНСОЛЬ БРАУЗЕРА (F12)

        // 👇 ВИПРАВЛЕНА ЛОГІКА:
        // 1. Бекенд надсилає дані плоско (немає поля "user", є зразу "role")
        // 2. Перевіряємо роль (1 = Admin)
        if (res.data.role !== 1) {
            console.error("Access denied: Role is " + res.data.role);
            return { error: "Access denied. You are not an Admin." };
        }

        if (res.data.token) {
            localStorage.setItem('adminToken', res.data.token);
            localStorage.setItem('adminName', res.data.username);
        }

        return res.data;
    } catch (e) {
        console.error("Login Error Details:", e);
        // Повертаємо текст помилки з сервера, якщо він є
        return { error: e.response?.data || 'Login failed (Check Console F12)' };
    }
};

export const createGenreFast = async (name, slug) => {
    return await api.get(`/api/admin/create-genre-fast?name=${name}&slug=${slug}`);
};
export const getPendingTracks = async () => (await api.get('/api/admin/pending')).data;
export const approveTrack = async (id) => await api.post(`/api/admin/${id}/approve`);
export const rejectTrack = async (id) => await api.post(`/api/admin/${id}/reject`);
export const getAuthorRequests = async () => (await api.get('/api/admin/admin/author-requests')).data;
export const approveAuthor = async (id) => await api.post(`/api/admin/admin/author-requests/${id}/approve`);
export const rejectAuthor = async (id) => await api.post(`/api/admin/admin/author-requests/${id}/reject`);

export default api;