import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const uploadFile = async (file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(`${BASE_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/update-profile', data),
  changePassword: (data) => api.put('/auth/change-password', data)
};

export const contactsAPI = {
  getAll: (params = {}) => api.get('/contacts', { params }),
  getOne: (id) => api.get(`/contacts/${id}`),
  getStats: () => api.get('/contacts/stats'),
  create: (data) => api.post('/contacts', data),
  update: (id, data) => api.put(`/contacts/${id}`, data),
  delete: (id) => api.delete(`/contacts/${id}`),
  deleteMany: (ids) => api.delete('/contacts', { data: { ids } }),
  toggleFavorite: (id) => api.patch(`/contacts/${id}/favorite`),
  share: (id, customerId) => api.post(`/contacts/share/${id}`, { customerId }),
  rate: (id, usefulnessRating) => api.patch(`/contacts/${id}/rate`, { usefulnessRating }),
  addNotes: (id, data) => api.patch(`/contacts/${id}/notes`, data)
};

export const chatAPI = {
  getUsers: () => api.get('/chat/users'),
  getMessages: (roomId, page = 1, limit = 30) =>
    api.get(`/chat/messages/${roomId}`, { params: { page, limit } })
};

export const requestsAPI = {
  create: (data) => api.post('/requests', data),
  getAll: (params = {}) => api.get('/requests', { params }),
  getOne: (id) => api.get(`/requests/${id}`),
  getStats: () => api.get('/requests/stats'),
  view: (id) => api.patch(`/requests/${id}/view`),
  accept: (id) => api.patch(`/requests/${id}/accept`),
  updateStatus: (id, data) => api.patch(`/requests/${id}/status`, data),
  requestInfo: (id, data) => api.patch(`/requests/${id}/request-info`, data)
};

export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications')
};

export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getProviderReviews: (providerId, params = {}) => api.get(`/reviews/provider/${providerId}`, { params }),
  getMyReviews: (params = {}) => api.get('/reviews/my-reviews', { params }),
  markHelpful: (id) => api.patch(`/reviews/${id}/helpful`)
};

export const usersAPI = {
  getProviders: (params = {}) => api.get('/users/providers', { params }),
  getProviderStats: () => api.get('/users/providers/stats'),
  getUser: (id) => api.get(`/users/${id}`),
  getAll: (params = {}) => api.get('/users', { params }),
  toggleFavorite: (providerId) => api.patch(`/users/favorites/${providerId}`),
  getFavorites: (params = {}) => api.get('/users/me/favorites', { params }),
  updateProfile: (data) => api.put('/users/profile', data),
  setAvailability: (isAvailable) => api.patch('/users/availability', { isAvailable })
};

export default api;