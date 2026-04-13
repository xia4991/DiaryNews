import axios from 'axios'

const http = axios.create({ baseURL: '/api' })

export const api = {
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

  // Ideas
  getIdeas: () => http.get('/ideas').then(r => r.data),
  createIdea: (data) => http.post('/ideas', data).then(r => r.data),
  updateIdea: (id, data) => http.put(`/ideas/${id}`, data).then(r => r.data),
  deleteIdea: (id) => http.delete(`/ideas/${id}`).then(r => r.data),
}
