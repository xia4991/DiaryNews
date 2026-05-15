import { useCallback, useEffect, useMemo, useState } from 'react'
import ArticleCardFeatured from '../components/news/ArticleCardFeatured'
import ArticleCard from '../components/news/ArticleCard'
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
  const [hotWindow, setHotWindow] = useState('week')
  const [briefModalOpen, setBriefModalOpen] = useState(false)
  const [selectedBrief, setSelectedBrief] = useState(null)
  const [briefs, setBriefs] = useState([])
  const [briefsLoading, setBriefsLoading] = useState(true)
  const topTags = useMemo(() => buildTopTags(articles), [articles])
  const topCategories = useMemo(() => buildTopCategories(articles), [articles])
  const briefType = layout === 'china' ? 'china' : 'portugal'
  const briefLabel = layout === 'china' ? '华人关注' : '葡萄牙新闻'
  const hotArticles = useMemo(() => {
    const featuredLink = articles[0]?.link || null
    return sortArticlesByHotness(articles, { limit: 3, excludeLink: featuredLink, window: hotWindow })
  }, [articles, hotWindow])

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

  const featured = articles[0] || null
  const rest = articles.slice(1)
  const feed = rest.slice(3)
  const chinaSortedFeed = useMemo(
    () => sortChinaFeedArticles(feed, chinaFeedSort),
    [feed, chinaFeedSort]
  )

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

  const visibleFeed = feed.slice(0, visibleCount)
  const hasMoreFeed = feed.length > visibleFeed.length
  const chinaVisibleFeed = chinaSortedFeed.slice(0, visibleCount)
  const chinaHasMoreFeed = chinaSortedFeed.length > chinaVisibleFeed.length

  if (layout === 'china') {
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
        <div className="grid gap-5 sm:gap-6">
          <Card className="overflow-hidden rounded-[30px] border-[#E2D2BF] bg-[linear-gradient(135deg,#fff8ef_0%,#f5ead9_100%)] p-0 shadow-[0_24px_56px_rgba(86,60,33,0.12)]">
            <div className="grid gap-5 px-5 py-5 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_320px]">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge color="#9D3D33">Chinese Focus</Badge>
                  {isAdmin && (
                    <Button variant="ghost" size="sm" icon="edit_calendar" onClick={() => setBriefModalOpen(true)}>
                      生成日报
                    </Button>
                  )}
                </div>
                <h1
                  className="mt-4 text-[1.9rem] font-black tracking-tight text-text sm:text-4xl"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {tabTitle}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-[15px]">
                  {tabSubtitle}
                </p>

                {featured && (
                  <button
                    onClick={() => handleOpenArticle(featured)}
                    className="mt-6 block w-full rounded-[24px] border border-white/75 bg-white/76 px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white sm:px-5 sm:py-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge color="#9D3D33">{featured.tags_zh?.split(',')[0]?.trim() || '重点关注'}</Badge>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                        {featured.source} · {featured.published?.slice(0, 10)} · {formatViews(featured.view_count)}
                      </span>
                    </div>
                    <h2
                      className="mt-4 text-[1.55rem] font-black leading-tight tracking-tight text-text sm:text-[2rem]"
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {featured.title_zh || featured.title}
                    </h2>
                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-text-muted">
                      {featured.summary_zh || featured.content_zh || featured.ai_summary || featured.summary}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                      阅读重点
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_outward</span>
                    </div>
                  </button>
                )}
              </div>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/70 bg-white/85 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">热门话题</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topTags.length > 0 ? topTags.map(([tag, count]) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text"
                      >
                        {tag}
                        <span className="text-text-subtle">{count}</span>
                      </span>
                    )) : (
                      <span className="text-sm text-text-muted">暂无标签聚合</span>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-white/85 px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">热门关注</p>
                    <HotWindowToggle value={hotWindow} onChange={setHotWindow} />
                  </div>
                  <div className="mt-4 grid gap-3">
                    {hotArticles.length > 0 ? hotArticles.map((article, index) => (
                      <button
                        key={article.link}
                        onClick={() => handleOpenArticle(article)}
                        className="flex items-start gap-3 rounded-2xl bg-surface-muted px-4 py-3 text-left transition-colors hover:bg-surface"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-black text-accent">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                            {article.source} · {formatViews(article.view_count)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-text">
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
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <Badge color="#9D3D33">精选内容</Badge>
                  <h2
                    className="mt-3 text-2xl font-black tracking-tight text-text"
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    持续关注
                  </h2>
                </div>
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
              </div>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {chinaVisibleFeed.map(article => (
                  <ArticleCard key={article.link} article={article} onClick={handleOpenArticle} />
                ))}
              </section>

              {chinaHasMoreFeed && (
                <div className="mt-6 flex justify-center">
                  <Button variant="ghost" onClick={() => setVisibleCount(count => count + FEED_STEP)}>
                    加载更多
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-5">
              <DailyBriefsSection
                briefType="china"
                briefs={briefs}
                loading={briefsLoading}
                isAdmin={isAdmin}
                onSelectBrief={handleOpenBrief}
                onGenerateClick={() => setBriefModalOpen(true)}
                compact
              />

              <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_46px_rgba(58,44,31,0.08)]">
                <Badge color="#B8843C">专题卡片</Badge>
                <h2
                  className="mt-3 text-xl font-black tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  今日信号
                </h2>
                <div className="mt-4 grid gap-3">
                  {articles.slice(0, 4).map((article) => (
                    <button
                      key={`signal-${article.link}`}
                      onClick={() => handleOpenArticle(article)}
                      className="rounded-2xl border border-border bg-surface-muted px-4 py-4 text-left transition-colors hover:bg-surface"
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                        {(article.tags_zh?.split(',')[0]?.trim() || article.source)} · {formatViews(article.view_count)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-text">
                        {article.title_zh || article.title}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>
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
          <Card className="overflow-hidden rounded-[30px] border-[#D8E2EF] bg-[linear-gradient(135deg,#f7fbff_0%,#eef4fb_100%)] p-0 shadow-[0_24px_56px_rgba(43,108,176,0.10)]">
            <div className="grid gap-5 px-5 py-5 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.2fr)_320px]">
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
                  className="mt-4 text-[1.9rem] font-black tracking-tight text-text sm:text-4xl"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {tabTitle}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-[15px]">
                  {tabSubtitle}
                </p>

                {featured && (
                  <button
                    onClick={() => handleOpenArticle(featured)}
                    className="mt-6 block w-full rounded-[24px] border border-white/80 bg-white/82 px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:bg-white sm:px-5 sm:py-5"
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
                      className="mt-4 text-[1.55rem] font-black leading-tight tracking-tight text-text sm:text-[2rem]"
                      style={{ fontFamily: 'var(--font-headline)' }}
                    >
                      {featured.title_zh || featured.title}
                    </h2>
                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-text-muted">
                      {featured.summary_zh || featured.content_zh || featured.ai_summary || featured.summary}
                    </p>
                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                      打开头条
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_outward</span>
                    </div>
                  </button>
                )}
              </div>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/80 bg-white/88 px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">新闻台概览</p>
                    <span className="text-xs font-semibold text-text-subtle">{articles.length} 条</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl bg-surface-muted px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">媒体来源</p>
                      <p className="mt-2 text-3xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                        {new Set(articles.map((article) => article.source)).size}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-surface-muted px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">首要分类</p>
                      <p className="mt-2 text-lg font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                        {topCategories[0] ? (CATEGORY_ZH[topCategories[0][0]] || topCategories[0][0]) : '综合'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/80 bg-white/88 px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">热门新闻</p>
                    <HotWindowToggle value={hotWindow} onChange={setHotWindow} />
                  </div>
                  <div className="mt-4 grid gap-3">
                    {hotArticles.length > 0 ? hotArticles.map((article, index) => (
                      <button
                        key={article.link}
                        onClick={() => handleOpenArticle(article)}
                        className="flex items-start gap-3 rounded-2xl bg-surface-muted px-4 py-3 text-left transition-colors hover:bg-surface"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-sm font-black text-accent">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                            {article.source} · {formatViews(article.view_count)}
                          </p>
                          <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-text">
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
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <Badge color="#2B6CB0">最新报道</Badge>
                  <h2
                    className="mt-3 text-2xl font-black tracking-tight text-text"
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    持续更新
                  </h2>
                </div>
              </div>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {visibleFeed.map(article => (
                  <ArticleCard key={article.link} article={article} onClick={handleOpenArticle} />
                ))}
              </section>

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
                <Badge color="#2B6CB0">分类观察</Badge>
                <h2
                  className="mt-3 text-xl font-black tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  今日版面
                </h2>
                <div className="mt-4 grid gap-3">
                  {topCategories.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between rounded-2xl border border-border bg-surface-muted px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block h-3 w-3 rounded-full"
                          style={{ background: categoryColor(category) }}
                        />
                        <span className="text-sm font-semibold text-text">
                          {CATEGORY_ZH[category] || category}
                        </span>
                      </div>
                      <span className="text-sm font-black text-text">{count}</span>
                    </div>
                  ))}
                </div>
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
