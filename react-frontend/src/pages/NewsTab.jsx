import { useCallback, useEffect, useMemo, useState } from 'react'
import ArticleCardFeatured from '../components/news/ArticleCardFeatured'
import ArticleCard from '../components/news/ArticleCard'
import NewsFeedRow from '../components/news/NewsFeedRow'
import ArticleModal from '../components/news/ArticleModal'
import DailyBriefGenerateModal from '../components/news/DailyBriefGenerateModal'
import DailyBriefDetailModal from '../components/news/DailyBriefDetailModal'
import DailyBriefsSection from '../components/news/DailyBriefsSection'
import HotWindowToggle from '../components/news/HotWindowToggle'
import SectionHeader from '../components/ui/SectionHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { CATEGORY_ZH } from '../constants/categories'
import { categoryColor } from '../constants/colors'
import { api } from '../api'
import { sortArticlesByHotness } from '../utils/newsHotness'

const INITIAL_FEED_COUNT = 24
const FEED_STEP = 24
const CHINA_FEED_SORT_OPTIONS = [
  { value: 'date', label: '按日期' },
  { value: 'views', label: '按浏览' },
]
const DATE_FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
]

function buildTopTags(articles) {
  return Object.entries(
    articles.reduce((acc, article) => {
      for (const tag of (article.tags_zh || '').split(',').map((item) => item.trim()).filter(Boolean)) {
        acc[tag] = (acc[tag] || 0) + 1
      }
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
}

function buildTopCategories(articles) {
  return Object.entries(
    articles.reduce((acc, article) => {
      const key = article.category || 'Geral'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
}

function formatViews(value) {
  return `${Number(value || 0)} 次阅读`
}

function localDateKey(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Local calendar day of the article, so "今天" matches the reader's clock, not UTC.
function articleDateKey(article) {
  const timestamp = Date.parse(article.published || '')
  if (Number.isNaN(timestamp)) return (article.published || '').slice(0, 10)
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function dayLabel(dateKey) {
  if (dateKey === localDateKey(0)) return '今天'
  if (dateKey === localDateKey(-1)) return '昨天'
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey || '未标注日期'
  const weekday = '日一二三四五六'[new Date(year, month - 1, day).getDay()]
  return `${month}月${day}日 周${weekday}`
}

// Consecutive runs of the same day; expects articles already sorted by date.
function groupArticlesByDay(articles) {
  const groups = []
  for (const article of articles) {
    const key = articleDateKey(article)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(article)
    else groups.push({ key, items: [article] })
  }
  return groups
}

function resolveDateFilterKey(value) {
  if (value === 'today') return localDateKey(0)
  if (value === 'yesterday') return localDateKey(-1)
  return value
}

function isPresetDateFilter(value) {
  return DATE_FILTER_OPTIONS.some((option) => option.value === value)
}

function filterArticlesByDate(articles, selectedDateFilter) {
  if (!selectedDateFilter || selectedDateFilter === 'all') return articles
  const targetDate = resolveDateFilterKey(selectedDateFilter)
  return articles.filter((article) => articleDateKey(article) === targetDate)
}

function hotWindowEmptyLabel(window) {
  if (window === 'today') return '今天还没有形成明显热度'
  if (window === 'week') return '本周还没有形成明显热度'
  return '当前还没有热门新闻'
}

function sortChinaFeedArticles(articles, sortBy) {
  const sorted = [...articles]

  if (sortBy === 'views') {
    return sorted.sort((a, b) => {
      const viewDiff = Number(b.view_count || 0) - Number(a.view_count || 0)
      if (viewDiff !== 0) return viewDiff
      return (b.published || '').localeCompare(a.published || '')
    })
  }

  return sorted.sort((a, b) => (b.published || '').localeCompare(a.published || ''))
}

function hasDetailedArticleContent(article) {
  const content = (article.content_zh || '').trim()
  const summary = (article.summary_zh || article.ai_summary || article.summary || '').trim()
  if (!content) return false
  return content.length >= 180 && content.length > summary.length + 40
}

function briefCardText(article) {
  return (
    article.content_zh ||
    article.summary_zh ||
    article.ai_summary ||
    article.summary ||
    article.title_zh ||
    article.title
  )
}

function NewsDateFilter({ value, onChange }) {
  const customValue = value && !isPresetDateFilter(value) ? value : ''

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-full border border-border bg-white/78 p-1 shadow-[0_10px_24px_rgba(62,45,24,0.08)]">
        {DATE_FILTER_OPTIONS.map((option) => {
          const active = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 ${
                active
                  ? 'bg-accent text-white shadow-[0_8px_18px_rgba(157,61,51,0.18)]'
                  : 'text-text-muted hover:bg-surface hover:text-text'
              }`}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <input
        type="date"
        value={customValue}
        onChange={(event) => onChange(event.target.value || 'all')}
        aria-label="选择新闻日期"
        className={`h-9 rounded-full border px-3 text-xs font-semibold outline-none transition-colors ${
          customValue
            ? 'border-accent bg-accent text-white [color-scheme:dark]'
            : 'border-border bg-white/78 text-text-muted hover:bg-surface'
        }`}
      />
    </div>
  )
}

function NewsSearchInput({ value, onChange }) {
  return (
    <div className="relative">
      <span
        className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle"
        style={{ fontSize: 16 }}
      >
        search
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索新闻…"
        aria-label="搜索新闻"
        className="h-9 w-full rounded-full border border-border bg-white/78 pl-9 pr-3 text-xs font-semibold text-text outline-none transition-colors placeholder:text-text-subtle hover:bg-surface focus:border-accent sm:w-48"
      />
    </div>
  )
}

export default function NewsTab({
  articles,
  tabTitle = '葡萄牙新闻',
  tabSubtitle = '葡萄牙新闻，AI翻译中文精炼版。',
  emptyHint = '获取葡萄牙新闻',
  layout = 'default',
  isAdmin = false,
  onArticleOpen,
}) {
  const [selected, setSelected] = useState(null)
  const [articleReturnContext, setArticleReturnContext] = useState(null)
  const [briefInitialScrollTop, setBriefInitialScrollTop] = useState(0)
  const [visibleCount, setVisibleCount] = useState(INITIAL_FEED_COUNT)
  const [chinaFeedSort, setChinaFeedSort] = useState('date')
  const [selectedDateFilter, setSelectedDateFilter] = useState('all')
  const [hotWindow, setHotWindow] = useState('week')
  const [briefModalOpen, setBriefModalOpen] = useState(false)
  const [selectedBrief, setSelectedBrief] = useState(null)
  const [briefs, setBriefs] = useState([])
  const [briefsLoading, setBriefsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showUntranslated, setShowUntranslated] = useState(false)
  // Client-side search over the in-memory feed (no backend search endpoint exists).
  const viewArticles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return articles
    return articles.filter((a) =>
      `${a.title_zh || ''} ${a.title || ''} ${a.summary_zh || ''} ${a.content_zh || ''} ${a.tags_zh || ''} ${a.source || ''}`
        .toLowerCase()
        .includes(q)
    )
  }, [articles, searchQuery])
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value)
    setVisibleCount(INITIAL_FEED_COUNT)
  }, [])
  const topTags = useMemo(() => buildTopTags(viewArticles), [viewArticles])
  const topCategories = useMemo(() => buildTopCategories(viewArticles), [viewArticles])
  const briefType = layout === 'china' ? 'china' : 'portugal'
  const briefLabel = layout === 'china' ? '华人关注' : '葡萄牙新闻'
  const hotArticles = useMemo(() => {
    const featuredLink = viewArticles[0]?.link || null
    return sortArticlesByHotness(viewArticles, { limit: 3, excludeLink: featuredLink, window: hotWindow })
  }, [viewArticles, hotWindow])

  const loadBriefs = useCallback(async () => {
    setBriefsLoading(true)
    try {
      const data = await api.listNewsBriefs({ type: briefType, limit: 7 })
      setBriefs(data.items || [])
    } catch {
      setBriefs([])
    } finally {
      setBriefsLoading(false)
    }
  }, [briefType])

  useEffect(() => {
    loadBriefs()
  }, [loadBriefs])

  const articlesByLink = useMemo(
    () => new Map(articles.map((article) => [article.link, article])),
    [articles]
  )

  const relatedBriefArticles = useMemo(() => {
    if (!selectedBrief) return []
    return (selectedBrief.article_links || [])
      .map((link) => articlesByLink.get(link))
      .filter(Boolean)
  }, [selectedBrief, articlesByLink])

  useEffect(() => {
    if (!selected?.link) return
    const latestArticle = articlesByLink.get(selected.link)
    if (latestArticle && latestArticle.view_count !== selected.view_count) {
      setSelected(prev => (prev?.link === latestArticle.link ? latestArticle : prev))
    }
  }, [articlesByLink, selected])

  const handleBriefGenerated = useCallback((brief) => {
    setBriefs((prev) => {
      const next = [...prev.filter((item) => !(item.brief_type === brief.brief_type && item.brief_date === brief.brief_date)), brief]
      next.sort((a, b) => (b.brief_date || '').localeCompare(a.brief_date || ''))
      return next
    })
  }, [])

  const handleOpenArticle = useCallback((article) => {
    setArticleReturnContext(null)
    const nextViewCount = onArticleOpen?.(article)
    setSelected(typeof nextViewCount === 'number' ? { ...article, view_count: nextViewCount } : article)
  }, [onArticleOpen])

  const handleOpenBrief = useCallback((brief) => {
    setBriefInitialScrollTop(0)
    setSelectedBrief(brief)
  }, [])

  const handleSelectBriefArticle = useCallback((article, scrollTop = 0) => {
    setArticleReturnContext({ brief: selectedBrief, scrollTop })
    setSelectedBrief(null)
    const nextViewCount = onArticleOpen?.(article)
    setSelected(typeof nextViewCount === 'number' ? { ...article, view_count: nextViewCount } : article)
  }, [onArticleOpen, selectedBrief])

  const handleCloseArticle = useCallback(() => {
    setSelected(null)
    setArticleReturnContext(null)
  }, [])

  const handleReturnToBrief = useCallback(() => {
    if (!articleReturnContext?.brief) {
      setSelected(null)
      return
    }
    setSelected(null)
    setBriefInitialScrollTop(articleReturnContext.scrollTop || 0)
    setSelectedBrief(articleReturnContext.brief)
    setArticleReturnContext(null)
  }, [articleReturnContext])

  const handleCloseBrief = useCallback(() => {
    setSelectedBrief(null)
    setBriefInitialScrollTop(0)
  }, [])

  const handleDateFilterChange = useCallback((value) => {
    setSelectedDateFilter(value || 'all')
    setVisibleCount(INITIAL_FEED_COUNT)
  }, [])

  const featured = viewArticles[0] || null
  const rest = viewArticles.slice(1)
  const feed = rest.slice(3)
  const dateFilteredFeed = useMemo(
    () => filterArticlesByDate(feed, selectedDateFilter),
    [feed, selectedDateFilter]
  )
  const isDateFiltered = selectedDateFilter !== 'all'
  const portugalDetailedFeed = useMemo(
    () => dateFilteredFeed.filter(hasDetailedArticleContent),
    [dateFilteredFeed]
  )
  const portugalSummaryFeed = useMemo(
    () => dateFilteredFeed.filter((article) => !hasDetailedArticleContent(article)),
    [dateFilteredFeed]
  )
  // 华人关注: one unified feed. Untranslated rows are hidden by default (unless nothing
  // is translated yet) so the Chinese content is not buried under Portuguese headlines.
  const chinaDateFiltered = useMemo(
    () => filterArticlesByDate(viewArticles, selectedDateFilter),
    [viewArticles, selectedDateFilter]
  )
  const chinaTranslated = useMemo(
    () => chinaDateFiltered.filter((article) => article.title_zh),
    [chinaDateFiltered]
  )
  const chinaCanHideUntranslated = chinaTranslated.length > 0
  const chinaUntranslatedCount = chinaDateFiltered.length - chinaTranslated.length
  const chinaFeed = useMemo(
    () => sortChinaFeedArticles(
      chinaCanHideUntranslated && !showUntranslated ? chinaTranslated : chinaDateFiltered,
      chinaFeedSort
    ),
    [chinaCanHideUntranslated, showUntranslated, chinaTranslated, chinaDateFiltered, chinaFeedSort]
  )
  const chinaHotArticles = useMemo(() => {
    const pool = viewArticles.filter((article) => article.title_zh)
    return sortArticlesByHotness(pool.length ? pool : viewArticles, { limit: 5, window: hotWindow })
  }, [viewArticles, hotWindow])

  if (!articles.length) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <span className="material-symbols-outlined text-4xl text-text-subtle">newspaper</span>
        <p className="text-sm text-text-muted">
          暂无新闻。点击 <strong className="text-text">{emptyHint}</strong> 加载。
        </p>
      </div>
    )
  }

  const visibleFeed = portugalDetailedFeed.slice(0, visibleCount)
  const hasMoreFeed = portugalDetailedFeed.length > visibleFeed.length
  const chinaVisibleFeed = chinaFeed.slice(0, visibleCount)
  const chinaHasMoreFeed = chinaFeed.length > chinaVisibleFeed.length

  if (layout === 'china') {
    const [leadArticle, ...feedAfterLead] = chinaVisibleFeed
    const groupedByDay = chinaFeedSort === 'date'
    const feedGroups = groupedByDay
      ? groupArticlesByDay(feedAfterLead)
      : [{ key: 'all', items: feedAfterLead }]
    const briefsCard = (
      <DailyBriefsSection
        briefType="china"
        briefs={briefs}
        loading={briefsLoading}
        isAdmin={isAdmin}
        onSelectBrief={handleOpenBrief}
        onGenerateClick={() => setBriefModalOpen(true)}
        compact
      />
    )

    return (
      <>
        {briefModalOpen && (
          <DailyBriefGenerateModal
            briefType="china"
            label="华人关注"
            onGenerated={handleBriefGenerated}
            onClose={() => setBriefModalOpen(false)}
          />
        )}
        {selectedBrief && (
          <DailyBriefDetailModal
            brief={selectedBrief}
            relatedArticles={relatedBriefArticles}
            initialScrollTop={briefInitialScrollTop}
            onSelectArticle={handleSelectBriefArticle}
            onClose={handleCloseBrief}
          />
        )}

        <div className="grid gap-4">
          <h1 className="sr-only">{tabTitle}</h1>

          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
            <NewsSearchInput value={searchQuery} onChange={handleSearchChange} />
            <NewsDateFilter value={selectedDateFilter} onChange={handleDateFilterChange} />
            <div className="inline-flex rounded-full border border-border bg-white/78 p-1 shadow-[0_10px_24px_rgba(62,45,24,0.08)]">
              {CHINA_FEED_SORT_OPTIONS.map((option) => {
                const active = chinaFeedSort === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setChinaFeedSort(option.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:px-4 ${
                      active
                        ? 'bg-accent text-white shadow-[0_8px_18px_rgba(157,61,51,0.22)]'
                        : 'text-text-muted hover:bg-surface hover:text-text'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            {chinaCanHideUntranslated && chinaUntranslatedCount > 0 && (
              <button
                type="button"
                aria-pressed={showUntranslated}
                onClick={() => {
                  setShowUntranslated((value) => !value)
                  setVisibleCount(INITIAL_FEED_COUNT)
                }}
                className={`h-9 rounded-full border px-3 text-xs font-semibold transition-colors ${
                  showUntranslated
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-white/78 text-text-muted hover:bg-surface hover:text-text'
                }`}
              >
                {showUntranslated ? '隐藏未翻译' : `显示未翻译 ${chinaUntranslatedCount} 条`}
              </button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="sm" icon="edit_calendar" className="ml-auto" onClick={() => setBriefModalOpen(true)}>
                生成日报
              </Button>
            )}
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="mb-4 xl:hidden">{briefsCard}</div>

              {chinaVisibleFeed.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface-muted px-5 py-10 text-center text-sm text-text-muted">
                  {searchQuery.trim()
                    ? '没有匹配的新闻，换个关键词试试。'
                    : isDateFiltered
                      ? '该日期暂无关注内容。'
                      : '暂无关注内容。'}
                </div>
              ) : (
                <div className="grid gap-3">
                  <NewsFeedRow
                    article={leadArticle}
                    onClick={handleOpenArticle}
                    lead
                    showDate
                  />
                  {feedGroups.map((group) => (
                    <section key={group.key} className="grid gap-3">
                      {groupedByDay && group.items.length > 0 && (
                        <h2 className="mt-3 flex items-center gap-3 text-[13px] font-bold text-text">
                          <span>{dayLabel(group.key)}</span>
                          <span className="h-px flex-1 bg-border" />
                        </h2>
                      )}
                      {group.items.map((article) => (
                        <NewsFeedRow
                          key={article.link}
                          article={article}
                          onClick={handleOpenArticle}
                          showDate={!groupedByDay}
                        />
                      ))}
                    </section>
                  ))}
                </div>
              )}

              {chinaHasMoreFeed && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <Button variant="ghost" onClick={() => setVisibleCount((count) => count + FEED_STEP)}>
                    加载更多
                  </Button>
                  <p className="text-[11px] text-text-subtle">
                    已显示 {chinaVisibleFeed.length} / {chinaFeed.length} 条
                  </p>
                </div>
              )}
            </div>

            <aside className="grid gap-4 xl:sticky xl:top-4">
              <div className="hidden xl:block">{briefsCard}</div>

              <Card className="rounded-2xl">
                <div className="flex items-center justify-between gap-3">
                  <Badge color="#9D3D33">热门关注</Badge>
                  <HotWindowToggle value={hotWindow} onChange={setHotWindow} />
                </div>
                <div className="mt-3 grid gap-1">
                  {chinaHotArticles.length > 0 ? chinaHotArticles.map((article, index) => (
                    <button
                      key={article.link}
                      onClick={() => handleOpenArticle(article)}
                      className="flex items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-bg-subtle"
                    >
                      <span className="w-5 shrink-0 text-center text-base font-black tabular-nums text-accent">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-[13px] font-bold leading-5 text-text">
                          {article.title_zh || article.title}
                        </p>
                        <p className="mt-1 text-[11px] text-text-subtle">
                          {article.source} · {formatViews(article.view_count)}
                        </p>
                      </div>
                    </button>
                  )) : (
                    <p className="rounded-xl bg-surface-muted px-4 py-4 text-sm text-text-muted">
                      {hotWindowEmptyLabel(hotWindow)}
                    </p>
                  )}
                </div>
              </Card>
            </aside>
          </div>
        </div>

        {selected && (
          <ArticleModal
            article={selected}
            onClose={handleCloseArticle}
            onBack={articleReturnContext ? handleReturnToBrief : undefined}
          />
        )}
      </>
    )
  }

  if (layout === 'portugal') {
    return (
      <>
        {briefModalOpen && (
          <DailyBriefGenerateModal
            briefType="portugal"
            label="葡萄牙新闻"
            onGenerated={handleBriefGenerated}
            onClose={() => setBriefModalOpen(false)}
          />
        )}
        {selectedBrief && (
          <DailyBriefDetailModal
            brief={selectedBrief}
            relatedArticles={relatedBriefArticles}
            initialScrollTop={briefInitialScrollTop}
            onSelectArticle={handleSelectBriefArticle}
            onClose={handleCloseBrief}
          />
        )}
        <div className="grid gap-5 sm:gap-6">
          <Card className="overflow-hidden rounded-[22px] border-[#D8E2EF] bg-[linear-gradient(135deg,#f7fbff_0%,#eef4fb_100%)] p-0 shadow-[0_16px_34px_rgba(43,108,176,0.08)]">
            <div className="grid gap-4 px-4 py-4 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,1.35fr)_280px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge color="#2B6CB0">Portugal Desk</Badge>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" icon="edit_calendar" onClick={() => setBriefModalOpen(true)}>
                      生成日报
                    </Button>
                  )}
                </div>
                <h1
                  className="mt-3 text-[1.55rem] font-black tracking-tight text-text sm:text-[2rem]"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {tabTitle}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted sm:text-[14px]">
                  {tabSubtitle}
                </p>

                {featured && (
                  <button
                    onClick={() => handleOpenArticle(featured)}
                    className="mt-4 block w-full rounded-[18px] border border-white/80 bg-white/82 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:bg-white sm:px-4 sm:py-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color={categoryColor(featured.category)}>
                        {CATEGORY_ZH[featured.category] || featured.category}
                      </Badge>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                        {featured.source} · {featured.published?.slice(0, 10)} · {formatViews(featured.view_count)}
                      </span>
                    </div>
                    <h2
                      className="mt-3 text-[1.2rem] font-black leading-tight tracking-tight text-text sm:text-[1.55rem]"
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {featured.title_zh || featured.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-muted">
                      {featured.summary_zh || featured.content_zh || featured.ai_summary || featured.summary}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                      打开头条
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_outward</span>
                    </div>
                  </button>
                )}
              </div>

              <div className="grid gap-3">
                <div className="rounded-[18px] border border-white/80 bg-white/88 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">新闻台概览</p>
                    <span className="text-xs font-semibold text-text-subtle">{articles.length} 条</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-surface-muted px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">媒体来源</p>
                      <p className="mt-1 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                        {new Set(articles.map((article) => article.source)).size}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-muted px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">首要分类</p>
                      <p className="mt-1 line-clamp-1 text-base font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                        {topCategories[0] ? (CATEGORY_ZH[topCategories[0][0]] || topCategories[0][0]) : '综合'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[18px] border border-white/80 bg-white/88 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">热门新闻</p>
                    <HotWindowToggle value={hotWindow} onChange={setHotWindow} />
                  </div>
                  <div className="mt-3 grid gap-2">
                    {hotArticles.length > 0 ? hotArticles.map((article, index) => (
                      <button
                        key={article.link}
                        onClick={() => handleOpenArticle(article)}
                        className="flex items-start gap-3 rounded-2xl bg-surface-muted px-3 py-2.5 text-left transition-colors hover:bg-surface"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-black text-accent">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                            {article.source} · {formatViews(article.view_count)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-[13px] font-bold leading-5 text-text">
                            {article.title_zh || article.title}
                          </p>
                        </div>
                      </button>
                    )) : (
                      <p className="rounded-2xl bg-surface-muted px-4 py-4 text-sm text-text-muted">
                        {hotWindowEmptyLabel(hotWindow)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
            <div>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge color="#2B6CB0">最新报道</Badge>
                  <h2
                    className="mt-3 text-2xl font-black tracking-tight text-text"
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    持续更新
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <NewsSearchInput value={searchQuery} onChange={handleSearchChange} />
                  <NewsDateFilter value={selectedDateFilter} onChange={handleDateFilterChange} />
                </div>
              </div>

              {visibleFeed.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface-muted px-5 py-8 text-center text-sm text-text-muted">
                  {isDateFiltered ? '该日期暂无带完整正文的新闻。' : '暂无带完整正文的新闻，右侧可先浏览简讯。'}
                </div>
              ) : (
                <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {visibleFeed.map(article => (
                    <ArticleCard key={article.link} article={article} onClick={handleOpenArticle} />
                  ))}
                </section>
              )}

              {hasMoreFeed && (
                <div className="mt-6 flex justify-center">
                  <Button variant="ghost" onClick={() => setVisibleCount(count => count + FEED_STEP)}>
                    加载更多
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-5">
              <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_46px_rgba(58,44,31,0.08)]">
                <Badge color="#2B6CB0">简讯</Badge>
                <h2
                  className="mt-3 text-xl font-black tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  简讯内容
                </h2>
                <p className="mt-2 text-xs leading-5 text-text-muted">
                  这些新闻内容较短，直接显示中文正文，适合快速扫读。
                </p>
                {portugalSummaryFeed.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-surface-muted px-4 py-4 text-sm text-text-muted">
                    {isDateFiltered ? '该日期暂无摘要简讯。' : '当前没有摘要简讯。'}
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {portugalSummaryFeed.slice(0, 8).map((article) => (
                      <button
                        key={`summary-${article.link}`}
                        onClick={() => handleOpenArticle(article)}
                        className="rounded-2xl border border-border bg-surface-muted px-4 py-3 text-left transition-colors hover:bg-surface"
                      >
                        <div className="flex items-center gap-2">
                          <Badge color={categoryColor(article.category)}>
                            {CATEGORY_ZH[article.category] || article.category}
                          </Badge>
                          <span className="min-w-0 truncate text-[11px] text-text-subtle">
                            {article.source} · {formatViews(article.view_count)}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-4 text-sm font-semibold leading-6 text-text">
                          {briefCardText(article)}
                        </p>
                      </button>
                    ))}
                    {portugalSummaryFeed.length > 8 && (
                      <p className="text-center text-[11px] text-text-subtle">
                        还有 {portugalSummaryFeed.length - 8} 条摘要简讯
                      </p>
                    )}
                  </div>
                )}
              </Card>

              <DailyBriefsSection
                briefType="portugal"
                briefs={briefs}
                loading={briefsLoading}
                isAdmin={isAdmin}
                onSelectBrief={handleOpenBrief}
                onGenerateClick={() => setBriefModalOpen(true)}
                compact
              />
            </div>
          </div>
        </div>

        {selected && (
          <ArticleModal
            article={selected}
            onClose={handleCloseArticle}
            onBack={articleReturnContext ? handleReturnToBrief : undefined}
          />
        )}
      </>
    )
  }

  return (
    <>
      {briefModalOpen && (
        <DailyBriefGenerateModal
          briefType={briefType}
          label={briefLabel}
          onGenerated={handleBriefGenerated}
          onClose={() => setBriefModalOpen(false)}
        />
      )}
      {selectedBrief && (
        <DailyBriefDetailModal
          brief={selectedBrief}
          relatedArticles={relatedBriefArticles}
          initialScrollTop={briefInitialScrollTop}
          onSelectArticle={handleSelectBriefArticle}
          onClose={handleCloseBrief}
        />
      )}
      <SectionHeader title={tabTitle} subtitle={tabSubtitle} />
      {isAdmin && (
        <div className="mb-5 flex justify-end">
          <Button variant="ghost" size="sm" icon="edit_calendar" onClick={() => setBriefModalOpen(true)}>
            生成日报
          </Button>
        </div>
      )}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ArticleCardFeatured article={featured} onClick={handleOpenArticle} />
        {rest.map(article => (
          <ArticleCard key={article.link} article={article} onClick={handleOpenArticle} />
        ))}
      </section>

      {selected && (
        <ArticleModal
          article={selected}
          onClose={handleCloseArticle}
          onBack={articleReturnContext ? handleReturnToBrief : undefined}
        />
      )}
    </>
  )
}
