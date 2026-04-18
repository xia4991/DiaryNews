import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth'
import { api } from '../api'
import SectionHeader from '../components/ui/SectionHeader'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EventFormModal from '../components/community/EventFormModal'
import EventDetailModal from '../components/community/EventDetailModal'
import PostFormModal from '../components/community/PostFormModal'
import PostDetailModal from '../components/community/PostDetailModal'

const EVENT_CATEGORY_ZH = {
  Meetup: '聚会',
  Family: '亲子',
  Talk: '讲座',
  JobFair: '招聘会',
  Business: '商业活动',
  Sports: '运动',
  Hobby: '兴趣小组',
  Dining: '同城聚餐',
  Other: '其他',
}

const POST_CATEGORY_ZH = {
  Life: '生活问答',
  Visa: '签证居留',
  Housing: '租房买房',
  Jobs: '求职交流',
  SecondHand: '二手避坑',
  Recommendations: '本地推荐',
  MutualHelp: '同城互助',
  Chat: '闲聊',
}

function formatDateTime(value) {
  if (!value) return '时间待定'
  return value.slice(0, 16).replace('T', ' ')
}

function SegmentButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active ? 'bg-accent text-text-onaccent' : 'bg-surface text-text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

function FilterChip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-accent bg-accent text-text-onaccent'
          : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}

export default function CommunityTab({ onLoginRequired }) {
  const { user } = useAuth()
  const [segment, setSegment] = useState('events')
  const [events, setEvents] = useState([])
  const [posts, setPosts] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventFormMode, setEventFormMode] = useState(null)
  const [selectedPost, setSelectedPost] = useState(null)
  const [postFormMode, setPostFormMode] = useState(null)
  const [postReplies, setPostReplies] = useState([])
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [eventCategoryFilter, setEventCategoryFilter] = useState('All')
  const [eventCityFilter, setEventCityFilter] = useState('')
  const [postCategoryFilter, setPostCategoryFilter] = useState('All')
  const [postCityFilter, setPostCityFilter] = useState('')

  const loadEvents = async (overrides = {}) => {
    const params = {
      limit: 24,
      ...(eventCategoryFilter !== 'All' ? { category: eventCategoryFilter } : {}),
      ...(eventCityFilter.trim() ? { city: eventCityFilter.trim() } : {}),
      ...overrides,
    }
    const data = await api.listCommunityEvents(params)
    setEvents(data.items || [])
  }

  const loadPosts = async (overrides = {}) => {
    const params = {
      limit: 24,
      ...(postCategoryFilter !== 'All' ? { category: postCategoryFilter } : {}),
      ...(postCityFilter.trim() ? { city: postCityFilter.trim() } : {}),
      ...overrides,
    }
    const data = await api.listCommunityPosts(params)
    setPosts(data.items || [])
  }

  useEffect(() => {
    let active = true

    const loadInitialEvents = async () => {
      try {
        const data = await api.listCommunityEvents({
          limit: 24,
          ...(eventCategoryFilter !== 'All' ? { category: eventCategoryFilter } : {}),
          ...(eventCityFilter.trim() ? { city: eventCityFilter.trim() } : {}),
        })
        if (!active) return
        setEvents(data.items || [])
      } finally {
        if (active) setLoadingEvents(false)
      }
    }

    const loadInitialPosts = async () => {
      try {
        const data = await api.listCommunityPosts({
          limit: 24,
          ...(postCategoryFilter !== 'All' ? { category: postCategoryFilter } : {}),
          ...(postCityFilter.trim() ? { city: postCityFilter.trim() } : {}),
        })
        if (!active) return
        setPosts(data.items || [])
      } finally {
        if (active) setLoadingPosts(false)
      }
    }

    loadInitialEvents().catch(() => {
      if (active) setLoadingEvents(false)
    })

    loadInitialPosts().catch(() => {
      if (!active) return
      setLoadingPosts(false)
    })

    return () => { active = false }
  }, [eventCategoryFilter, eventCityFilter, postCategoryFilter, postCityFilter])

  const upcomingEvent = events[0] || null
  const hotPost = posts[0] || null

  const eventCities = useMemo(
    () => [...new Set(events.map((item) => item.city).filter(Boolean))].slice(0, 4),
    [events]
  )

  const postCities = useMemo(
    () => [...new Set(posts.map((item) => item.city).filter(Boolean))].slice(0, 4),
    [posts]
  )

  const hotPostCategories = useMemo(() => (
    Object.entries(
      posts.reduce((acc, post) => {
        acc[post.category] = (acc[post.category] || 0) + 1
        return acc
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
  ), [posts])

  const eventFilterLabel = eventCategoryFilter === 'All'
    ? '全部活动'
    : EVENT_CATEGORY_ZH[eventCategoryFilter] || eventCategoryFilter

  const postFilterLabel = postCategoryFilter === 'All'
    ? '全部交流'
    : POST_CATEGORY_ZH[postCategoryFilter] || postCategoryFilter

  const requireLogin = () => {
    if (!user) {
      onLoginRequired?.()
    }
  }

  const handleCreateEventClick = () => {
    if (!user) {
      onLoginRequired?.()
      return
    }
    setEventFormMode('new')
  }

  const handleSaveEvent = async (payload) => {
    if (eventFormMode === 'new') {
      const created = await api.createCommunityEvent(payload)
      setEvents((prev) => [created, ...prev].sort((a, b) => (a.start_at || '').localeCompare(b.start_at || '')))
    } else {
      const updated = await api.updateCommunityEvent(eventFormMode.event.id, payload)
      setEvents((prev) => prev.map((item) => item.id === updated.id ? updated : item))
      if (selectedEvent?.id === updated.id) setSelectedEvent(updated)
    }
    await loadEvents()
  }

  const handleDeleteEvent = async () => {
    const id = selectedEvent.id
    await api.deleteCommunityEvent(id)
    setEvents((prev) => prev.filter((item) => item.id !== id))
    setSelectedEvent(null)
  }

  const canManageEvent = (event) =>
    Boolean(user && (user.id === event.owner_id || user.is_admin))

  const canManagePost = (post) =>
    Boolean(user && (user.id === post.owner_id || user.is_admin))

  const canManageReply = (reply) =>
    Boolean(user && (user.id === reply.owner_id || user.is_admin))

  const openPostDetail = async (post) => {
    setSelectedPost(post)
    setPostReplies([])
    setLoadingReplies(true)
    try {
      const [freshPost, replies] = await Promise.all([
        api.getCommunityPost(post.id),
        api.listCommunityReplies(post.id),
      ])
      setSelectedPost(freshPost)
      setPostReplies(replies || [])
    } catch {
      setPostReplies([])
    } finally {
      setLoadingReplies(false)
    }
  }

  const handleCreatePostClick = () => {
    if (!user) {
      onLoginRequired?.()
      return
    }
    setPostFormMode('new')
  }

  const handleSavePost = async (payload) => {
    if (postFormMode === 'new') {
      const created = await api.createCommunityPost(payload)
      setPosts((prev) => [created, ...prev])
      setSegment('posts')
    } else {
      const updated = await api.updateCommunityPost(postFormMode.post.id, payload)
      setPosts((prev) => prev.map((item) => item.id === updated.id ? updated : item))
      if (selectedPost?.id === updated.id) setSelectedPost(updated)
    }
    await loadPosts()
  }

  const handleDeletePost = async () => {
    const id = selectedPost.id
    await api.deleteCommunityPost(id)
    setPosts((prev) => prev.filter((item) => item.id !== id))
    setSelectedPost(null)
    setPostReplies([])
  }

  const handleReplyCreate = async (content) => {
    const created = await api.createCommunityReply(selectedPost.id, { content })
    setPostReplies((prev) => [...prev, created])
    const nextCount = (selectedPost.reply_count || 0) + 1
    setSelectedPost((prev) => ({ ...prev, reply_count: nextCount }))
    setPosts((prev) => prev.map((item) => item.id === selectedPost.id ? { ...item, reply_count: nextCount } : item))
  }

  const handleDeleteReply = async (reply) => {
    await api.deleteCommunityReply(reply.id)
    setPostReplies((prev) => prev.filter((item) => item.id !== reply.id))
    const nextCount = Math.max(0, (selectedPost.reply_count || 1) - 1)
    setSelectedPost((prev) => ({ ...prev, reply_count: nextCount }))
    setPosts((prev) => prev.map((item) => item.id === selectedPost.id ? { ...item, reply_count: nextCount } : item))
  }

  return (
    <div className="grid gap-6">
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          canManage={canManageEvent(selectedEvent)}
          onEdit={() => { setEventFormMode({ event: selectedEvent }); setSelectedEvent(null) }}
          onDelete={handleDeleteEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {eventFormMode && (
        <EventFormModal
          event={eventFormMode === 'new' ? null : eventFormMode.event}
          onSave={handleSaveEvent}
          onClose={() => setEventFormMode(null)}
        />
      )}

      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          replies={postReplies}
          loadingReplies={loadingReplies}
          canManage={canManagePost(selectedPost)}
          canManageReply={canManageReply}
          user={user}
          onReply={handleReplyCreate}
          onDeleteReply={handleDeleteReply}
          onEdit={() => { setPostFormMode({ post: selectedPost }); setSelectedPost(null) }}
          onDelete={handleDeletePost}
          onLoginRequired={requireLogin}
          onClose={() => setSelectedPost(null)}
        />
      )}

      {postFormMode && (
        <PostFormModal
          post={postFormMode === 'new' ? null : postFormMode.post}
          onSave={handleSavePost}
          onClose={() => setPostFormMode(null)}
        />
      )}

      <Card className="overflow-hidden rounded-[30px] border-[#DDD7EE] bg-[linear-gradient(135deg,#fbf9ff_0%,#f1eefb_100%)] p-0 shadow-[0_24px_56px_rgba(110,93,170,0.10)]">
        <div className="grid gap-6 px-6 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_340px]">
          <div className="min-w-0">
            <Badge color="#7C63C9">Community</Badge>
            <SectionHeader
              title="社区"
              subtitle="把活动与交流放在一起，既能发现线下活动，也能在同城社区里提问、分享和组织。"
              className="mt-4 mb-0"
              action={
                <div className="hidden sm:flex items-center gap-2">
                  <SegmentButton active={segment === 'events'} onClick={() => setSegment('events')}>
                    活动
                  </SegmentButton>
                  <SegmentButton active={segment === 'posts'} onClick={() => setSegment('posts')}>
                    交流
                  </SegmentButton>
                </div>
              }
            />

            <div className="mt-5 flex sm:hidden items-center gap-2">
              <SegmentButton active={segment === 'events'} onClick={() => setSegment('events')}>
                活动
              </SegmentButton>
              <SegmentButton active={segment === 'posts'} onClick={() => setSegment('posts')}>
                交流
              </SegmentButton>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button icon="event" onClick={handleCreateEventClick} variant={user ? 'subtle' : 'primary'}>
                {user ? '发布活动' : '登录后发布活动'}
              </Button>
              <Button icon="forum" onClick={handleCreatePostClick} variant="ghost">
                {user ? '发交流帖' : '登录后交流'}
              </Button>
            </div>

            {segment === 'events' ? (
              <div className="mt-6 rounded-[24px] border border-white/75 bg-white/78 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge color="#2E7D5A">近期活动</Badge>
                  <span className="text-xs font-semibold text-text-subtle">{events.length} 场</span>
                </div>
                <h2
                  className="mt-4 text-2xl font-black leading-tight tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {upcomingEvent?.title || '活动模块已接入，等你发布第一场活动'}
                </h2>
                <p className="mt-3 text-sm leading-7 text-text-muted">
                  {upcomingEvent?.description || '这里会优先展示近期最值得关注的社区活动，比如聚会、讲座、招聘会、亲子活动和兴趣小组。'}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(eventCities.length ? eventCities : ['Lisboa', 'Porto']).map((city) => (
                    <span key={city} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-[24px] border border-white/75 bg-white/78 px-5 py-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge color="#B8843C">今日交流</Badge>
                  <span className="text-xs font-semibold text-text-subtle">{posts.length} 帖</span>
                </div>
                <h2
                  className="mt-4 text-2xl font-black leading-tight tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {hotPost?.title || '交流模块已接入，等第一批社区帖子出现'}
                </h2>
                <p className="mt-3 text-sm leading-7 text-text-muted">
                  {hotPost?.content || '这里会展示生活问答、签证居留、同城互助、本地推荐等内容，帮助平台从信息中心进一步走向社区。'}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {(hotPostCategories.length ? hotPostCategories.map(([cat]) => POST_CATEGORY_ZH[cat] || cat) : ['生活问答', '签证居留']).map((label) => (
                    <span key={label} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <Card className="rounded-[24px] border-white/80 bg-white/90 shadow-none">
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">社区概览</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl bg-surface-muted px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">活动数量</p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                    {events.length}
                  </p>
                </div>
                <div className="rounded-2xl bg-surface-muted px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">当前浏览</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                    {segment === 'events' ? eventFilterLabel : postFilterLabel}
                  </p>
                  <p className="mt-2 text-xs leading-6 text-text-muted">
                    {segment === 'events'
                      ? `当前结果 ${events.length} 场${eventCityFilter.trim() ? ` · ${eventCityFilter.trim()}` : ''}`
                      : `当前结果 ${posts.length} 帖${postCityFilter.trim() ? ` · ${postCityFilter.trim()}` : ''}`}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[24px] border-white/80 bg-white/90 shadow-none">
              <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">当前阶段</p>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-text-muted">
                <p>这一版已经接通活动发布、交流发帖、帖子详情和基础回复。</p>
                <p>后续可以继续补分类筛选、举报、置顶和更完整的社区治理能力。</p>
              </div>
            </Card>
          </div>
        </div>
      </Card>

      {segment === 'events' ? (
        loadingEvents ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 28 }}>progress_activity</span>
          </div>
        ) : (
          <div className="grid gap-4">
            <Card className="rounded-[26px] border-white/80 bg-white/92 shadow-none">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterChip active={eventCategoryFilter === 'All'} onClick={() => setEventCategoryFilter('All')}>
                    全部
                  </FilterChip>
                  {Object.entries(EVENT_CATEGORY_ZH).map(([value, label]) => (
                    <FilterChip
                      key={value}
                      active={eventCategoryFilter === value}
                      onClick={() => setEventCategoryFilter(value)}
                    >
                      {label}
                    </FilterChip>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    {eventCities.map((city) => (
                      <FilterChip key={city} active={eventCityFilter === city} onClick={() => setEventCityFilter(city)}>
                        {city}
                      </FilterChip>
                    ))}
                    {eventCityFilter && (
                      <Button variant="ghost" size="sm" onClick={() => setEventCityFilter('')}>
                        清空城市
                      </Button>
                    )}
                  </div>
                  <input
                    value={eventCityFilter}
                    onChange={(e) => setEventCityFilter(e.target.value)}
                    placeholder="按城市筛选，例如 Lisboa"
                    className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none sm:max-w-xs"
                  />
                </div>
              </div>
            </Card>

            {events.length === 0 ? (
              <Card className="rounded-[28px] border-dashed border-border-strong bg-surface-muted text-text-muted">
                <p className="text-sm">
                  {eventCategoryFilter === 'All' && !eventCityFilter.trim()
                    ? '还没有活动内容，来发布第一场活动吧。'
                    : '当前筛选条件下还没有活动，试试清空分类或城市。'}
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {events.map((event) => (
                  <Card key={event.id} className="rounded-[24px] cursor-pointer" interactive onClick={() => setSelectedEvent(event)}>
                    <div className="flex items-center justify-between gap-3">
                      <Badge color="#2E7D5A">{EVENT_CATEGORY_ZH[event.category] || event.category}</Badge>
                      <span className="text-[11px] text-text-subtle">{event.city || '城市待定'}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-black leading-7 text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                      {event.title}
                    </h3>
                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-text-muted">
                      {event.description || '活动详情待补充。'}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs text-text-subtle">
                      <span>{formatDateTime(event.start_at)}</span>
                      <span>{event.is_free ? '免费' : (event.fee_text || '收费')}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        loadingPosts ? (
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 28 }}>progress_activity</span>
          </div>
        ) : (
          <div className="grid gap-4">
            <Card className="rounded-[26px] border-white/80 bg-white/92 shadow-none">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <FilterChip active={postCategoryFilter === 'All'} onClick={() => setPostCategoryFilter('All')}>
                    全部
                  </FilterChip>
                  {Object.entries(POST_CATEGORY_ZH).map(([value, label]) => (
                    <FilterChip
                      key={value}
                      active={postCategoryFilter === value}
                      onClick={() => setPostCategoryFilter(value)}
                    >
                      {label}
                    </FilterChip>
                  ))}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    {postCities.map((city) => (
                      <FilterChip key={city} active={postCityFilter === city} onClick={() => setPostCityFilter(city)}>
                        {city}
                      </FilterChip>
                    ))}
                    {postCityFilter && (
                      <Button variant="ghost" size="sm" onClick={() => setPostCityFilter('')}>
                        清空城市
                      </Button>
                    )}
                  </div>
                  <input
                    value={postCityFilter}
                    onChange={(e) => setPostCityFilter(e.target.value)}
                    placeholder="按城市筛选，例如 Porto"
                    className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none sm:max-w-xs"
                  />
                </div>
              </div>
            </Card>

            {posts.length === 0 ? (
              <Card className="rounded-[28px] border-dashed border-border-strong bg-surface-muted text-text-muted">
                <p className="text-sm">
                  {postCategoryFilter === 'All' && !postCityFilter.trim()
                    ? '还没有交流帖子，来发第一篇交流帖吧。'
                    : '当前筛选条件下还没有帖子，试试换个分类或城市。'}
                </p>
              </Card>
            ) : (
              posts.map((post) => (
                <Card
                  key={post.id}
                  className="rounded-[24px] cursor-pointer"
                  interactive
                  onClick={() => openPostDetail(post)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge color="#B8843C">{POST_CATEGORY_ZH[post.category] || post.category}</Badge>
                    <span className="text-[11px] text-text-subtle">
                      {post.reply_count || 0} 回复
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-black leading-7 text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                    {post.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-7 text-text-muted">
                    {post.content || '帖子内容待补充。'}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs text-text-subtle">
                    <span>{post.owner_name || '社区用户'}</span>
                    <span>{formatDateTime(post.created_at)}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )
      )}
    </div>
  )
}
