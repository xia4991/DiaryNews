export const HOT_WINDOW_OPTIONS = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '本周' },
  { value: 'all', label: '全部' },
]

function parsePublishedTimestamp(value) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? null : timestamp
}

export function isFreshArticle(published, now = Date.now()) {
  const publishedAt = parsePublishedTimestamp(published)
  if (!publishedAt) return false
  const ageHours = Math.max(0, (now - publishedAt) / (1000 * 60 * 60))
  return ageHours <= 24
}

function isWithinWindow(published, window, now = Date.now()) {
  if (window === 'all') return true

  const publishedAt = parsePublishedTimestamp(published)
  if (!publishedAt) return false

  const ageHours = Math.max(0, (now - publishedAt) / (1000 * 60 * 60))
  if (window === 'today') return ageHours <= 24
  if (window === 'week') return ageHours <= 24 * 7
  return true
}

function computeRecencyBoost(published, now = Date.now()) {
  const publishedAt = parsePublishedTimestamp(published)
  if (!publishedAt) return 0

  const ageHours = Math.max(0, (now - publishedAt) / (1000 * 60 * 60))
  if (ageHours <= 24) return 18
  if (ageHours <= 72) return 10
  if (ageHours <= 168) return 4
  if (ageHours <= 336) return 1
  return 0
}

export function computeHotScore(article, now = Date.now()) {
  const views = Number(article?.view_count || 0)
  return views * 12 + computeRecencyBoost(article?.published, now)
}

export function describeHotness(article, now = Date.now()) {
  const views = Number(article?.view_count || 0)
  if (isFreshArticle(article?.published, now) && views > 0) {
    return '今日升温'
  }
  if (views >= 10) {
    return '高热关注'
  }
  if (views >= 3) {
    return '持续上升'
  }
  return '刚被关注'
}

export function sortArticlesByHotness(articles, { limit = null, excludeLink = null, window = 'all' } = {}) {
  const now = Date.now()
  const sorted = [...articles]
    .filter((article) => article?.link && article.link !== excludeLink && isWithinWindow(article.published, window, now))
    .sort((a, b) => {
      const scoreDiff = computeHotScore(b, now) - computeHotScore(a, now)
      if (scoreDiff !== 0) return scoreDiff

      const viewDiff = Number(b.view_count || 0) - Number(a.view_count || 0)
      if (viewDiff !== 0) return viewDiff

      return (b.published || '').localeCompare(a.published || '')
    })

  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}
