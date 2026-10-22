import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://sampies.onrender.com/api';

let memoryToken = null;
const isNative = Capacitor.isNativePlatform();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the saved login token to API requests.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Scan and item identification.
export const scanApi = {
  scan: (imageData, userId) =>
    api.post('/scan', { image: imageData, userId }),

  confirmIdentification: (itemId) =>
    api.post(`/scan/${itemId}/confirm`),

  correctItemName: (itemId, name, material) =>
    api.put(`/scan/${itemId}/correct`, { name, material }),

  // Existing image-scan recycling endpoint.
  loadRecycling: (itemId) =>
    api.post(`/recycling/${itemId}`),

  // NEW: recycling endpoint for catalog selections.
  loadCatalogRecycling: (catalogItemId, userId) =>
    api.post(
      `/catalog/${encodeURIComponent(catalogItemId)}/recycling`,
      null,
      { params: userId ? { userId } : {} }
    ),

  getScanHistory: (userId) =>
    api.get('/scan/history', {
      params: userId ? { userId } : {},
    }),
};

// Recycling catalog.
export const catalogApi = {
  getAll: () =>
    api.get('/catalog'),

  getById: (id) =>
    api.get(`/catalog/${encodeURIComponent(id)}`),
};

// Recycling actions, history, statistics, and reuse confirmation.
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
};

// Nearby recycling locations.
export const mapApi = {
  findNearby: (lat, lng, material = '') =>
    api.get('/places/recycling', {
      params: { lat, lng, material },
    }),
};

// Second-hand marketplace.
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
    api.patch(
      `/market/listings/${id}/status`,
      { status, userId }
    ),

  remove: (id, userId) =>
    api.delete(`/market/listings/${id}`, {
      params: userId ? { userId } : {},
    }),

  report: (id, body) =>
    api.post(`/market/listings/${id}/report`, body),
};

// Saved reuse ideas.
export const savedIdeasApi = {
  getAll: (userId) =>
    api.get('/ideas/saved', { params: { userId } }),

  save: (idea) =>
    api.post('/ideas/saved', idea),

  remove: (id, userId) =>
    api.delete(`/ideas/saved/${id}`, {
      params: { userId },
    }),
};

// Reuse history.
export const reuseHistoryApi = {
  getAll: (userId) =>
    api.get('/reuse/history', {
      params: userId ? { userId } : {},
    }),

  record: (entry) =>
    api.post('/reuse/history', entry),
};

// Token storage.
export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem('34district_token');
    } catch {
      return memoryToken;
    }
  },

  set: (token) => {
    memoryToken = token;

    try {
      localStorage.setItem('34district_token', token);
    } catch {
      // Keep the token in memory if localStorage is unavailable.
    }
  },

  clear: () => {
    memoryToken = null;

    try {
      localStorage.removeItem('34district_token');
    } catch {
      // Nothing else to clear.
    }
  },
};

// Authentication API.
const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = tokenStore.get();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const authApi = {
  register: (body) =>
    client.post('/auth/register', body),

  login: (body) =>
    client.post('/auth/login', body),

  me: () =>
    client.get('/auth/me'),

  logout: () =>
    client.post('/auth/logout'),

  googleLogin: (credential) =>
    client.post('/auth/google', { credential }),
};

export default api;