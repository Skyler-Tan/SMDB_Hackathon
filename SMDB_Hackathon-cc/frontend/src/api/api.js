
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const scanApi = {
  scan: (imageData) => api.post('/scan', { image: imageData }),

  confirmIdentification: (itemId) =>
    api.post(`/scan/${itemId}/confirm`),

  correctItemName: (itemId, name) =>
    api.put(`/scan/${itemId}/correct`, { name }),

  loadRecycling: (itemId) =>
    api.post(`/recycling/${itemId}`),

  getScanHistory: () =>
    api.get('/scan-history'),
};

export const catalogApi = {
  getAll: () => api.get('/catalog'),

  getById: (id) =>
    api.get(`/catalog/${id}`),
};

export const recycleApi = {
  recycle: (request) =>
    api.post('/recycle', request),

  getStats: (userId) =>
    api.get('/stats', { params: { userId } }),

  getHistory: (userId) =>
    api.get('/history', { params: { userId } }),
};

export const mapApi = {
  findNearby: (lat, lng, material = '') =>
    api.get('/places/recycling', { params: { lat, lng, material } }),
};

export default api;
