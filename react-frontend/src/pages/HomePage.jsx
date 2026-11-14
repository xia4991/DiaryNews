import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import ArticleModal from '../components/news/ArticleModal'
import Card from '../components/ui/Card'
import HotWindowToggle from '../components/news/HotWindowToggle'
import NewsFeedRow from '../components/news/NewsFeedRow'
import SlotCard from '../components/home/SlotCard'
import FocusTopics from '../components/home/FocusTopics'
import { sortArticlesByHotness } from '../utils/newsHotness'
import { useShowViewCounts } from '../siteSettings'
import { DEAL_TYPE_ZH, formatPrice } from '../constants/realestate'
import { CATEGORY_ZH as SH_CATEGORY_ZH } from '../constants/secondhand'

const CN_LIST_COUNT = 5
const PT_LIST_COUNT = 6
const HOT_COUNT = 5
const JOB_COUNT = 3
const FEED_SLOT_COUNT = 2
const SIDEBAR_NOTICE_COUNT = 3
const SIDEBAR_PROMO_COUNT = 2
const BOARD_COUNT = 3
const GUIDE_COUNT = 4

const IMPORTANCE_SCORE = { high: 3, medium: 2, low: 1 }
const EMPTY_BOARDS = { realEstate: [], secondHand: [], events: [], posts: [] }

const joinMeta = (...parts) => parts.filter(Boolean).join(' · ')
const euros = (priceCents) => (priceCents == null ? '' : formatPrice(priceCents))

const pad = (value) => String(value).padStart(2, '0')

function publishedTime(article) {
  const timestamp = Date.parse(article.published || '')
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function byNewest(a, b) {
  return publishedTime(b) - publishedTime(a)
}

// Local "MM-DD HH:mm"; the API sends UTC timestamps.
function formatDateTime(value) {
  const timestamp = Date.parse(value || '')
  if (Number.isNaN(timestamp)) return (value || '').slice(5, 16).replace('T', ' ')
  const date = new Date(timestamp)
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function todayLabel() {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日 周${'日一二三四五六'[now.getDay()]}`
}

function hotEmptyLabel(window) {
  if (window === 'today') return '今天还没有热门新闻'
  if (window === 'week') return '本周还没有热门新闻'
  return '还没有热门新闻'
}

// A compact title list for one board (房产 / 二手 / 活动 / 帖子); every row opens that tab.
function BoardSection({ title, items, onOpen, getMeta }) {
  return (
    <section className="grid content-start gap-3">
      <SectionHeading title={title} actionLabel="全部" onAction={onOpen} />
      <Card padding="none" className="divide-y divide-border">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={onOpen}
            className="group block w-full px-4 py-3 text-left transition-colors hover:bg-bg-subtle"
          >
            <span className="line-clamp-1 text-[14px] font-semibold leading-6 text-text transition-colors group-hover:text-accent">
              {item.title}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-text-subtle">{getMeta(item)}</span>
          </button>
        ))}
      </Card>
    </section>
  )
}

function SectionHeading({ title, actionLabel, onAction, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[17px] font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
        {title}
      </h2>
      <div className="flex items-center gap-3">
        {children}
        {actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            {actionLabel}
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Front page: a lead story, the latest Chinese-interest and Portugal news, and a side
 * column with announcements, the hot list and recent jobs. Admin-managed slots
 * (`announcements`, notices and promos) land in three placements: a banner under the
 * date line, cards between the two news sections, and the side column. Content only —
 * navigation lives in the header and sidebar.
 */
export default function HomePage({
  user,
  articles,
  announcements = [],
  cnArticles,
  jobs,
  newsLastUpdated,
  onTabChange,
  onArticleOpen,
  onGuideOpen,
}) {
  const showViews = useShowViewCounts()
  const [selectedArticleState, setSelectedArticleState] = useState(null)
  const [hotWindow, setHotWindow] = useState('week')
  const [boards, setBoards] = useState(EMPTY_BOARDS)
  const [guides, setGuides] = useState([])

  // Other boards: latest few of each; a board with nothing in it is simply not rendered.
  useEffect(() => {
    let cancelled = false
    const params = { limit: BOARD_COUNT }
    Promise.allSettled([
      api.listRealEstate(params),
      api.listSecondHand(params),
      api.listCommunityEvents({ ...params, date_from: new Date().toISOString().slice(0, 10) }),
      api.listCommunityPosts(params),
    ]).then((results) => {
      if (cancelled) return
      const [realEstate, secondHand, events, posts] = results.map(
        (result) => (result.status === 'fulfilled' ? result.value?.items || [] : []).slice(0, BOARD_COUNT)
      )
      setBoards({ realEstate, secondHand, events, posts })
    })
    // The guide data is large and ships with the guide page; load it lazily here too.
    import('../data/practicalGuides')
      .then(({ PRACTICAL_GUIDES }) => {
        if (cancelled) return
        const sorted = [...PRACTICAL_GUIDES].sort((a, b) => (
          (IMPORTANCE_SCORE[b.importance] || 0) - (IMPORTANCE_SCORE[a.importance] || 0)
          || (b.date || '').localeCompare(a.date || '')
        ))
        setGuides(sorted.slice(0, GUIDE_COUNT).map(({ id, title, category }) => ({ id, title, category })))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const boardSections = [
    {
      title: '房产',
      tab: '房产',
      items: boards.realEstate,
      getMeta: (item) => joinMeta(
        DEAL_TYPE_ZH[item.deal_type],
        item.price_cents == null ? '' : formatPrice(item.price_cents, item.deal_type),
        item.rooms ? `T${item.rooms}` : '',
        item.location
      ),
    },
    {
      title: '二手',
      tab: '二手',
      items: boards.secondHand,
      getMeta: (item) => joinMeta(euros(item.price_cents), SH_CATEGORY_ZH[item.category], item.location),
    },
    {
      title: '社区活动',
      tab: '社区',
      items: boards.events,
      getMeta: (item) => joinMeta(formatDateTime(item.start_at), item.city, item.is_free ? '免费' : item.fee_text),
    },
    {
      title: '社区交流',
      tab: '社区',
      items: boards.posts,
      getMeta: (item) => joinMeta(
        item.owner_name,
        item.reply_count ? `${item.reply_count} 条回复` : '',
        formatDateTime(item.created_at)
      ),
    },
  ].filter((section) => section.items.length > 0)

  // Chinese-interest column: newest translated articles, tagged ones first when there are enough.
  const cnLatest = useMemo(() => {
    const translated = cnArticles.filter((article) => article.title_zh)
    const tagged = translated.filter((article) => (article.tags_zh || '').trim())
    const pool = tagged.length > CN_LIST_COUNT ? tagged : translated
    return [...pool].sort(byNewest).slice(0, CN_LIST_COUNT + 1)
  }, [cnArticles])
  const leadArticle = cnLatest[0] || null
  const cnList = cnLatest.slice(1)

  const ptLatest = useMemo(() => {
    const shown = new Set(cnLatest.map((article) => article.link))
    const rest = articles.filter((article) => !shown.has(article.link))
    const translated = rest.filter((article) => article.title_zh)
    return [...(translated.length ? translated : rest)].sort(byNewest).slice(0, PT_LIST_COUNT)
  }, [articles, cnLatest])

  const hotNews = useMemo(
    () => sortArticlesByHotness(articles, { limit: HOT_COUNT, window: hotWindow }),
    [articles, hotWindow]
  )
  const latestJobs = useMemo(
    () => jobs.filter((job) => !job.status || job.status === 'active').slice(0, JOB_COUNT),
    [jobs]
  )
  const sourceCount = useMemo(
    () => new Set(articles.map((article) => article.source).filter(Boolean)).size,
    [articles]
  )
  const cnTaggedCount = useMemo(
    () => cnArticles.filter((article) => (article.tags_zh || '').trim()).length,
    [cnArticles]
  )

  // Slots arrive pinned-first, newest-first; an unknown placement falls back to the sidebar.
  const slots = useMemo(() => {
    const at = (placement) => announcements.filter((item) => (item.placement || 'sidebar') === placement)
    const sidebar = announcements.filter((item) => !['banner', 'feed'].includes(item.placement))
    return {
      banner: at('banner')[0] || null,
      feed: at('feed').slice(0, FEED_SLOT_COUNT),
      notices: sidebar.filter((item) => item.kind !== 'promo').slice(0, SIDEBAR_NOTICE_COUNT),
      sidebarPromos: sidebar.filter((item) => item.kind === 'promo').slice(0, SIDEBAR_PROMO_COUNT),
    }
  }, [announcements])

  const articlesByLink = useMemo(
    () => new Map(articles.map((article) => [article.link, article])),
    [articles]
  )
  const selectedArticle = useMemo(() => {
    if (!selectedArticleState?.link) return null
    return articlesByLink.get(selectedArticleState.link) || selectedArticleState.fallbackArticle
  }, [articlesByLink, selectedArticleState])

  const handleOpenArticle = (article) => {
    const nextViewCount = onArticleOpen?.(article)
    const optimisticArticle = typeof nextViewCount === 'number' ? { ...article, view_count: nextViewCount } : article
    setSelectedArticleState({ link: article.link, fallbackArticle: optimisticArticle })
  }

  return (
    <div className="grid gap-5">
      <h1 className="sr-only">葡萄牙华人信息中心</h1>

      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border pb-3 text-[13px] text-text-muted">
        <span className="font-semibold text-text">{todayLabel()}</span>
        {newsLastUpdated && <span>新闻更新于 {formatDateTime(newsLastUpdated)}</span>}
        {articles.length > 0 && (
          <span>{cnTaggedCount} 条华人相关 · {sourceCount} 个来源</span>
        )}
      </p>

      <FocusTopics onArticleOpen={handleOpenArticle} />

      {slots.banner && <SlotCard slot={slots.banner} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <div className="grid min-w-0 gap-7">
          <section className="grid gap-3">
            <SectionHeading title="华人关注" actionLabel="全部" onAction={() => onTabChange('华人关注')} />
            {leadArticle ? (
              <>
                <NewsFeedRow article={leadArticle} onClick={handleOpenArticle} lead showDate />
                {cnList.map((article) => (
                  <NewsFeedRow key={article.link} article={article} onClick={handleOpenArticle} showDate />
                ))}
              </>
            ) : (
              <Card className="text-sm text-text-muted">还没有翻译好的华人相关新闻。</Card>
            )}
          </section>

          {slots.feed.length > 0 && (
            <div className="grid gap-3">
              {slots.feed.map((slot) => <SlotCard key={slot.id} slot={slot} />)}
            </div>
          )}

          <section className="grid gap-3">
            <SectionHeading title="葡萄牙新闻" actionLabel="全部" onAction={() => onTabChange('葡萄牙新闻')} />
            {ptLatest.length > 0 ? (
              <Card padding="none" className="divide-y divide-border">
                {ptLatest.map((article) => (
                  <button
                    key={article.link}
                    type="button"
                    onClick={() => handleOpenArticle(article)}
                    className="group flex w-full flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 text-left transition-colors hover:bg-bg-subtle sm:px-5"
                  >
                    <span className="min-w-0 text-[15px] font-semibold leading-6 text-text transition-colors group-hover:text-accent">
                      {article.title_zh || article.title}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-text-subtle">
                      {article.source} · {formatDateTime(article.published)}
                    </span>
                  </button>
                ))}
              </Card>
            ) : (
              <Card className="text-sm text-text-muted">还没有新闻。</Card>
            )}
          </section>

          {boardSections.length > 0 && (
            <div className="grid gap-x-6 gap-y-7 md:grid-cols-2">
              {boardSections.map((section) => (
                <BoardSection
                  key={section.title}
                  title={section.title}
                  items={section.items}
                  getMeta={section.getMeta}
                  onOpen={() => onTabChange(section.tab)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="grid gap-6 xl:sticky xl:top-4">
          {slots.notices.length > 0 && (
            <section className="grid gap-3">
              <SectionHeading
                title="平台公告"
                actionLabel={user?.is_admin ? '管理' : null}
                onAction={() => onTabChange('管理')}
              />
              <Card padding="none" className="divide-y divide-border">
                {slots.notices.map((announcement) => (
                  <div key={announcement.id} className="px-4 py-3">
                    <h3 className="text-[15px] font-bold leading-6 text-text">
                      {announcement.is_pinned && (
                        <span className="mr-1.5 rounded bg-accent-subtle px-1.5 py-px align-middle text-[11px] font-semibold text-accent">
                          置顶
                        </span>
                      )}
                      {announcement.title}
                    </h3>
                    <p className="mt-1 whitespace-pre-line text-[13px] leading-6 text-text-muted">
                      {announcement.content}
                    </p>
                    <p className="mt-1 flex items-center justify-between gap-3 text-[12px] tabular-nums text-text-subtle">
                      {formatDateTime(announcement.updated_at || announcement.created_at)}
                      {/^https?:\/\//i.test(announcement.link_url || '') && (
                        <a
                          href={announcement.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-accent transition-colors hover:text-accent-hover"
                        >
                          {announcement.link_label || '了解详情'}
                        </a>
                      )}
                    </p>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {announcements.length === 0 && user?.is_admin && (
            <button
              type="button"
              onClick={() => onTabChange('管理')}
              className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-left text-[13px] text-text-muted transition-colors hover:bg-bg-subtle"
            >
              还没有公告或推广，<span className="font-semibold text-accent">去发布</span>
            </button>
          )}

          {slots.sidebarPromos.map((slot) => (
            <SlotCard key={slot.id} slot={slot} layout="stack" />
          ))}

          <section className="grid gap-3">
            <SectionHeading title="热门新闻">
              <HotWindowToggle value={hotWindow} onChange={setHotWindow} />
            </SectionHeading>
            {hotNews.length > 0 ? (
              <Card padding="none" as="ol" className="divide-y divide-border">
                {hotNews.map((article, index) => (
                  <li key={article.link}>
                    <button
                      type="button"
                      onClick={() => handleOpenArticle(article)}
                      className="group flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-subtle"
                    >
                      <span className="w-4 shrink-0 text-[15px] font-black tabular-nums leading-6 text-accent">
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-[14px] font-semibold leading-6 text-text transition-colors group-hover:text-accent">
                          {article.title_zh || article.title}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-text-subtle">
                          {article.source}{showViews && ` · ${Number(article.view_count || 0)} 次阅读`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </Card>
            ) : (
              <Card className="text-sm text-text-muted">{hotEmptyLabel(hotWindow)}</Card>
            )}
          </section>

          <section className="grid gap-3">
            <SectionHeading title="最新招聘" actionLabel="全部" onAction={() => onTabChange('招聘')} />
            {latestJobs.length > 0 ? (
              <Card padding="none" className="divide-y divide-border">
                {latestJobs.map((job) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => onTabChange('招聘')}
                    className="group block w-full px-4 py-3 text-left transition-colors hover:bg-bg-subtle"
                  >
                    <span className="block text-[14px] font-semibold leading-6 text-text transition-colors group-hover:text-accent">
                      {job.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-text-subtle">
                      {[job.industry, job.location, job.salary_range].filter(Boolean).join(' · ')}
                    </span>
                  </button>
                ))}
              </Card>
            ) : (
              <Card className="text-sm text-text-muted">还没有招聘信息。</Card>
            )}
          </section>

          {guides.length > 0 && (
            <section className="grid gap-3">
              <SectionHeading title="实用指南" actionLabel="全部" onAction={() => onTabChange('实用指南')} />
              <Card padding="none" className="divide-y divide-border">
                {guides.map((guide) => (
                  <button
                    key={guide.id}
                    type="button"
                    onClick={() => (onGuideOpen ? onGuideOpen(guide.id) : onTabChange('实用指南'))}
                    className="group block w-full px-4 py-3 text-left transition-colors hover:bg-bg-subtle"
                  >
                    <span className="line-clamp-2 text-[14px] font-semibold leading-6 text-text transition-colors group-hover:text-accent">
                      {guide.title}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-text-subtle">{guide.category}</span>
                  </button>
                ))}
              </Card>
            </section>
          )}
        </aside>
      </div>

      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticleState(null)} />
      )}
    </div>
  )
}
