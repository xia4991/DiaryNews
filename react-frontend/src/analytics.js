// Context attached to every analytics event (see api.track / api.recordNewsView).
//
// visitor_id lives in sessionStorage: it tells apart several people behind one IP
// during a visit and is gone when the browser closes — no cross-visit tracking.
// The backend adds IP, user and device itself.

const VISITOR_KEY = 'diarynews.visitorId'

let currentPage = ''
let fallbackVisitorId = ''

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

function visitorId() {
  try {
    let id = sessionStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = randomId()
      sessionStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    if (!fallbackVisitorId) fallbackVisitorId = randomId()
    return fallbackVisitorId
  }
}

export function setAnalyticsPage(page) {
  currentPage = page || ''
}

export function analyticsContext() {
  return { visitor_id: visitorId(), page: currentPage }
}
