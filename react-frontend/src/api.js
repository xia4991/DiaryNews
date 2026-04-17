import axios from 'axios'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

// Attach JWT token to requests
http.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401 from /auth/me (token validation), clear token and notify app
http.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && err.config?.url === '/auth/me') {
      localStorage.removeItem('token')
      window.dispatchEvent(new Event('auth-change'))
    }
    return Promise.reject(err)
  }
)

export const api = {
  // Auth
  googleLogin: (credential) => http.post('/auth/google', { credential }).then(r => r.data),
  getMe: () => http.get('/auth/me').then(r => r.data),

  // Status
  getStatus: () => http.get('/status').then(r => r.data),

  // News
  getNews: () => http.get('/news').then(r => r.data),
  fetchNews: () => http.post('/news/fetch').then(r => r.data),

  // YouTube
  getYoutube: () => http.get('/youtube').then(r => r.data),
  fetchVideos: () => http.post('/youtube/fetch').then(r => r.data),

  // Channels
  addChannel: (handle, category) =>
    http.post('/youtube/channels', { handle, category }).then(r => r.data),
  removeChannel: (handle) =>
    http.delete(`/youtube/channels/${handle.replace('@', '')}`).then(r => r.data),
  resolveChannel: (handle) =>
    http.post(`/youtube/channels/${handle.replace('@', '')}/resolve`).then(r => r.data),

  // Captions
  getCaption: (videoId, signal) =>
    http.get(`/youtube/videos/${videoId}/caption`, { signal }).then(r => r.data),
  clearCaption: (videoId) =>
    http.delete(`/youtube/videos/${videoId}/caption`).then(r => r.data),

  // Jobs
  listJobs: (params) => http.get('/jobs', { params }).then(r => r.data),
  getJob: (id) => http.get(`/jobs/${id}`).then(r => r.data),
  createJob: (data) => http.post('/jobs', data).then(r => r.data),
  updateJob: (id, data) => http.put(`/jobs/${id}`, data).then(r => r.data),
  deleteJob: (id) => http.delete(`/jobs/${id}`).then(r => r.data),

  // Ideas
  getIdeas: () => http.get('/ideas').then(r => r.data),
  createIdea: (data) => http.post('/ideas', data).then(r => r.data),
  updateIdea: (id, data) => http.put(`/ideas/${id}`, data).then(r => r.data),
  deleteIdea: (id) => http.delete(`/ideas/${id}`).then(r => r.data),
}
