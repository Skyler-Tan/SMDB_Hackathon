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
  scan: (imageData, userId) =>
<<<<<<< HEAD
  api.post('/scan', { image: imageData, userId }),

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
=======
      api.post('/scan', { image: imageData, userId }),

  confirmIdentification: (itemId) =>
      api.post(`/scan/${itemId}/confirm`),

  correctItemName: (itemId, name, material) =>
      api.put(`/scan/${itemId}/correct`, { name, material }),

  loadRecycling: (itemId) =>
      api.post(`/recycling/${itemId}`),

  getScanHistory: (userId) =>
      api.get('/scan/history', {
        params: userId ? { userId } : {},
      }),
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
};

// Recycling catalog
export const catalogApi = {
  getAll: () =>
<<<<<<< HEAD
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
=======
      api.get('/catalog'),

  getById: (id) =>
      api.get(`/catalog/${id}`),
};

// Recycling actions, history, statistics, and reuse confirmation
export const recycleApi = {
  recycle: (request) =>
      api.post('/recycle', request),

  reuse: (payload) =>
      api.post('/reuse/confirm', payload),

  getStats: (userId) =>
      api.get('/stats', {
        params: userId ? { userId } : {},
      }),

  getHistory: (userId) =>
      api.get('/history', {
        params: userId ? { userId } : {},
      }),
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
};

// Nearby recycling locations
export const mapApi = {
  findNearby: (lat, lng, material = '') =>
<<<<<<< HEAD
    api.get('/places/recycling', {
      params: { lat, lng, material },
    }),
};


// Second-hand marketplace
export const marketApi = {
  getListings: (params = {}) =>
    api.get('/market/listings', { params }),
 
  getListing: (id) =>
    api.get(`/market/listings/${id}`),
 
  create: (listing) =>
    api.post('/market/listings', listing),
 
  update: (id, listing) =>
    api.put(`/market/listings/${id}`, listing),
 
  // status: 'AVAILABLE' | 'RESERVED' | 'SOLD'
  updateStatus: (id, status, userId) =>
  api.patch(`/market/listings/${id}/status`, { status, userId }),
 
  remove: (id, userId) =>
    api.delete(`/market/listings/${id}`, {
      params: userId ? { userId } : {},
    }),
 
  report: (id, body) =>
    api.post(`/market/listings/${id}/report`, body),
=======
      api.get('/places/recycling', {
        params: { lat, lng, material },
      }),
};

// Second-hand marketplace
export const marketApi = {
  getListings: (params = {}) =>
      api.get('/market/listings', { params }),

  getListing: (id) =>
      api.get(`/market/listings/${id}`),

  create: (listing) =>
      api.post('/market/listings', listing),

  update: (id, listing) =>
      api.put(`/market/listings/${id}`, listing),

  updateStatus: (id, status, userId) =>
      api.patch(`/market/listings/${id}/status`, { status, userId }),

  remove: (id, userId) =>
      api.delete(`/market/listings/${id}`, {
        params: userId ? { userId } : {},
      }),

  report: (id, body) =>
      api.post(`/market/listings/${id}/report`, body),
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
};

// Saved reuse ideas
export const savedIdeasApi = {
  getAll: (userId) =>
<<<<<<< HEAD
    api.get('/ideas/saved', { params: { userId } }),

  save: (idea) =>
    api.post('/ideas/saved', idea),

  remove: (id, userId) =>
    api.delete(`/ideas/saved/${id}`, { params: { userId } }),
};

export default api;
=======
      api.get('/ideas/saved', { params: { userId } }),

  save: (idea) =>
      api.post('/ideas/saved', idea),

  remove: (id, userId) =>
      api.delete(`/ideas/saved/${id}`, { params: { userId } }),
};

export default api;
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
