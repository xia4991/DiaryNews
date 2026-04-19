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
  updateMe: (data) => http.put('/auth/me', data).then(r => r.data),

  // Status
  getStatus: () => http.get('/status').then(r => r.data),

  // AI Assistant
  reindexAssistantWiki: () => http.post('/chat/admin/reindex-wiki').then(r => r.data),
  listChatConversations: () => http.get('/chat/conversations').then(r => r.data),
  getChatConversation: (id) => http.get(`/chat/conversations/${id}`).then(r => r.data),
  createChatConversation: (data) => http.post('/chat/conversations', data).then(r => r.data),
  deleteChatConversation: (id) => http.delete(`/chat/conversations/${id}`).then(r => r.data),
  sendChatMessage: (id, data) => http.post(`/chat/conversations/${id}/messages`, data).then(r => r.data),

  // News
  getNews: () => http.get('/news').then(r => r.data),
  fetchNews: () => http.post('/news/fetch').then(r => r.data),

  // Media
  uploadMedia: (file) => {
    const form = new FormData()
    form.append('image', file)
    return http.post('/media/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }).then(r => r.data)
  },

  // Community
  listCommunityEvents: (params) => http.get('/community/events', { params }).then(r => r.data),
  getCommunityEvent: (id) => http.get(`/community/events/${id}`).then(r => r.data),
  createCommunityEvent: (data) => http.post('/community/events', data).then(r => r.data),
  updateCommunityEvent: (id, data) => http.put(`/community/events/${id}`, data).then(r => r.data),
  deleteCommunityEvent: (id) => http.delete(`/community/events/${id}`).then(r => r.data),

  listCommunityPosts: (params) => http.get('/community/posts', { params }).then(r => r.data),
  getCommunityPost: (id) => http.get(`/community/posts/${id}`).then(r => r.data),
  createCommunityPost: (data) => http.post('/community/posts', data).then(r => r.data),
  updateCommunityPost: (id, data) => http.put(`/community/posts/${id}`, data).then(r => r.data),
  deleteCommunityPost: (id) => http.delete(`/community/posts/${id}`).then(r => r.data),
  listCommunityReplies: (postId) => http.get(`/community/posts/${postId}/replies`).then(r => r.data),
  createCommunityReply: (postId, data) => http.post(`/community/posts/${postId}/replies`, data).then(r => r.data),
  deleteCommunityReply: (id) => http.delete(`/community/replies/${id}`).then(r => r.data),

  // Jobs
  listJobs: (params) => http.get('/jobs', { params }).then(r => r.data),
  getJob: (id) => http.get(`/jobs/${id}`).then(r => r.data),
  createJob: (data) => http.post('/jobs', data).then(r => r.data),
  updateJob: (id, data) => http.put(`/jobs/${id}`, data).then(r => r.data),
  deleteJob: (id) => http.delete(`/jobs/${id}`).then(r => r.data),

  // Real Estate
  listRealEstate: (params) => http.get('/realestate', { params }).then(r => r.data),
  getRealEstate: (id) => http.get(`/realestate/${id}`).then(r => r.data),
  createRealEstate: (data) => http.post('/realestate', data).then(r => r.data),
  updateRealEstate: (id, data) => http.put(`/realestate/${id}`, data).then(r => r.data),
  deleteRealEstate: (id) => http.delete(`/realestate/${id}`).then(r => r.data),

  // Second Hand
  listSecondHand: (params) => http.get('/secondhand', { params }).then(r => r.data),
  getSecondHand: (id) => http.get(`/secondhand/${id}`).then(r => r.data),
  createSecondHand: (data) => http.post('/secondhand', data).then(r => r.data),
  updateSecondHand: (id, data) => http.put(`/secondhand/${id}`, data).then(r => r.data),
  deleteSecondHand: (id) => http.delete(`/secondhand/${id}`).then(r => r.data),

  // Admin / Moderation
  listReports: (params) => http.get('/admin/reports', { params }).then(r => r.data),
  listRecentListings: (params) => http.get('/admin/listings/recent', { params }).then(r => r.data),
  setListingStatus: (id, status) => http.patch(`/admin/listings/${id}/status`, { status }).then(r => r.data),
  reportListing: (id, reason) => http.post(`/listings/${id}/report`, { reason }).then(r => r.data),

  // Ideas
  getIdeas: () => http.get('/ideas').then(r => r.data),
  createIdea: (data) => http.post('/ideas', data).then(r => r.data),
  updateIdea: (id, data) => http.put(`/ideas/${id}`, data).then(r => r.data),
  deleteIdea: (id) => http.delete(`/ideas/${id}`).then(r => r.data),
}
