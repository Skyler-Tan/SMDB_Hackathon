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
};

// Saved reuse ideas
export const savedIdeasApi = {
  getAll: (userId) =>
    api.get('/ideas/saved', { params: { userId } }),

  save: (idea) =>
    api.post('/ideas/saved', idea),

  remove: (id, userId) =>
    api.delete(`/ideas/saved/${id}`, { params: { userId } }),
};

export default api;
