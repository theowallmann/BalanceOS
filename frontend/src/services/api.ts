import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Profile API
export const profileApi = {
  get: () => api.get('/profile'),
  update: (data: any) => api.put('/profile', data),
  getAiSuggestions: (goal: string) => api.post('/profile/ai-suggestions', { goal }),
};

// Nutrition API
export const nutritionApi = {
  getByDate: (date: string) => api.get(`/nutrition/${date}`),
  create: (data: any) => api.post('/nutrition', data),
  update: (id: string, data: any) => api.put(`/nutrition/${id}`, data),
  delete: (id: string) => api.delete(`/nutrition/${id}`),
  aiEstimate: (description: string, imageBase64?: string) => 
    api.post('/nutrition/ai-estimate', { description, image_base64: imageBase64 }),
  getSummary: (date: string) => api.get(`/nutrition/summary/${date}`),
};

// Vitals API
export const vitalsApi = {
  getByDate: (date: string) => api.get(`/vitals/${date}`),
  create: (data: any) => api.post('/vitals', data),
  getHistory: (days: number) => api.get(`/vitals/history/${days}`),
};

// Sport API
export const sportApi = {
  getByDate: (date: string) => api.get(`/sport/${date}`),
  create: (data: any) => api.post('/sport', data),
  addWorkout: (date: string, workout: any) => api.post(`/sport/${date}/workout`, workout),
  deleteWorkout: (date: string, workoutId: string) => api.delete(`/sport/${date}/workout/${workoutId}`),
  updateCustomMetrics: (date: string, metrics: any) => api.put(`/sport/${date}/custom-metrics`, metrics),
};

// Analytics API
export const analyticsApi = {
  getDaily: (date: string) => api.get(`/analytics/${date}`),
  getWeekly: (endDate: string) => api.get(`/analytics/weekly/${endDate}`),
  getPeriod: (period: string) => api.get(`/analytics/period/${period}`),
};

// Fitbit API
export const fitbitApi = {
  getAuthUrl: () => api.get('/fitbit/auth-url'),
  getStatus: () => api.get('/fitbit/status'),
  sync: (date: string) => api.post(`/fitbit/sync/${date}`),
  disconnect: () => api.delete('/fitbit/disconnect'),
};

// App Blocker API
export const appBlockerApi = {
  getRules: () => api.get('/app-blocker/rules'),
  createRule: (data: any) => api.post('/app-blocker/rules', data),
  getRule: (id: string) => api.get(`/app-blocker/rules/${id}`),
  updateRule: (id: string, data: any) => api.put(`/app-blocker/rules/${id}`, data),
  deleteRule: (id: string) => api.delete(`/app-blocker/rules/${id}`),
  verifyPassword: (id: string, password: string) => api.post(`/app-blocker/rules/${id}/verify-password`, { password }),
  verifySport: (id: string) => api.post(`/app-blocker/rules/${id}/verify-sport`),
  temporaryUnlock: (id: string, appName?: string) => api.post(`/app-blocker/rules/${id}/temporary-unlock`, { app_name: appName }),
  getActiveUnlocks: () => api.get('/app-blocker/temporary-unlocks'),
  getStatus: () => api.get('/app-blocker/status'),
};

// Push Notifications API
export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  create: (data: any) => api.post('/notifications', data),
  update: (id: string, data: any) => api.put(`/notifications/${id}`, data),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  toggle: (id: string) => api.put(`/notifications/${id}/toggle`),
};

export default api;
