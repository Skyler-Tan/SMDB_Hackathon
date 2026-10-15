import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Scan and item identification
export const scanApi = {
  scan: (imageData) =>
    api.post('/scan', { image: imageData }),

  confirmIdentification: (itemId) =>
    api.post(`/scan/${itemId}/confirm`),

  correctItemName: (itemId, name, material) =>
    api.put(`/scan/${itemId}/correct`, { name, material }),

  loadRecycling: (itemId) =>
    api.post(`/recycling/${itemId}`),

  // Matches ScanController: GET /api/scan/history
  getScanHistory: (userId) =>
    api.get('/scan/history', {
      params: userId ? { userId } : {},
    }),
};

// Recycling catalog
export const catalogApi = {
  getAll: () =>
    api.get('/catalog'),

  getById: (id) =>
    api.get(`/catalog/${id}`),
};

// Recycling actions, history, and statistics
export const recycleApi = {
  recycle: (request) =>
    api.post('/recycle', request),

  getStats: (userId) =>
    api.get('/stats', {
      params: userId ? { userId } : {},
    }),

  getHistory: (userId) =>
    api.get('/history', {
      params: userId ? { userId } : {},
    }),
};

// Nearby recycling locations
export const mapApi = {
  findNearby: (lat, lng, material = '') =>
    api.get('/places/recycling', {
      params: { lat, lng, material },
    }),
};

export default api;
