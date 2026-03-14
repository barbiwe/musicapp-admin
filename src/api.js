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
export const getIconMap = async () => {
    const endpoints = [
        '/api/Icon/all',
        '/api/icons/map',
        '/api/Icons/map',
        '/api/icon-map',
        '/api/icons',
        '/api/Icons',
    ];

    for (const endpoint of endpoints) {
        try {
            const res = await api.get(endpoint);
            const payload = res?.data;
            if (!payload || typeof payload !== 'object') continue;

            if (payload.icons && typeof payload.icons === 'object') {
                return payload;
            }

            if (Array.isArray(payload)) {
                const icons = payload.reduce((acc, item) => {
                    if (!item || typeof item !== 'object') return acc;
                    const fileName = item.fileName || item.name || item.key;
                    const rawUrl = item.url || item.path || item.src;
                    if (typeof fileName === 'string' && fileName.trim() && typeof rawUrl === 'string' && rawUrl.trim()) {
                        acc[fileName.trim()] = rawUrl.trim();
                    }
                    return acc;
                }, {});
                return { icons };
            }

            if (payload.data && typeof payload.data === 'object') {
                if (Array.isArray(payload.data)) {
                    const icons = payload.data.reduce((acc, item) => {
                        if (!item || typeof item !== 'object') return acc;
                        const fileName = item.fileName || item.name || item.key;
                        const rawUrl = item.url || item.path || item.src;
                        if (typeof fileName === 'string' && fileName.trim() && typeof rawUrl === 'string' && rawUrl.trim()) {
                            acc[fileName.trim()] = rawUrl.trim();
                        }
                        return acc;
                    }, {});
                    return { icons };
                }
                if (payload.data.icons && typeof payload.data.icons === 'object') return payload.data;
                return { icons: payload.data };
            }

            return { icons: payload };
        } catch (_) {
            // continue trying fallback endpoints
        }
    }

    return null;
};

export const getTrackDetails = async (id) => {
    const endpoints = [
        `/api/admin/${id}/details`,
        `/api/admin/pending/${id}`,
        `/api/admin/track/${id}`,
        `/api/admin/tracks/${id}`,
        `/api/tracks/${id}`,
    ];

    let lastError;
    for (const endpoint of endpoints) {
        try {
            const res = await api.get(endpoint);
            if (res?.data) {
                return res.data.data ?? res.data;
            }
        } catch (e) {
            lastError = e;
        }
    }

    throw lastError || new Error('Failed to load track details');
};

export const uploadAd = async ({ title, targetUrl, imageFile, audioFile, durationSeconds = 1 }) => {
    const formData = new FormData();
    formData.append('title', title);
    if (targetUrl) formData.append('targetUrl', targetUrl);
    formData.append('durationSeconds', String(durationSeconds));
    formData.append('image', imageFile);
    formData.append('audio', audioFile);

    const token = localStorage.getItem('adminToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    return await api.post('/api/ads/upload', formData, { headers });
};

export const getAllAds = async () => (await api.get('/api/ads')).data;
export const deleteAd = async (id) => await api.delete(`/api/ads/${id}`);
export const disableAd = async (id) => await api.put(`/api/ads/${id}/disable`);

export const uploadBanner = async ({ title, link, imageFile }) => {
    const formData = new FormData();
    formData.append('title', title);
    if (link) formData.append('link', link);
    formData.append('image', imageFile);

    return await api.post('/api/banners/upload', formData);
};

export const getBanners = async () => (await api.get('/api/banners')).data;
export const deleteBanner = async (id) => await api.delete(`/api/banners/${id}`);

export const resolveAssetUrl = (value) => {
    if (!value || typeof value !== 'string') return '';
    if (value.startsWith('http://') || value.startsWith('https://')) return value;
    if (value.startsWith('/')) return `${API_URL}${value}`;
    return `${API_URL}/${value}`;
};

export const approveTrack = async (id) => await api.post(`/api/admin/${id}/approve`);
export const rejectTrack = async (id) => await api.post(`/api/admin/${id}/reject`);
export const getAuthorRequests = async () => (await api.get('/api/admin/admin/author-requests')).data;
export const approveAuthor = async (id) => await api.post(`/api/admin/admin/author-requests/${id}/approve`);
export const rejectAuthor = async (id) => await api.post(`/api/admin/admin/author-requests/${id}/reject`);

export default api;
