import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './auth'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import CnSidebar from './components/CnSidebar'
import YoutubeSidebar from './components/youtube/YoutubeSidebar'
import Toast from './components/Toast'
import NewsTab from './pages/NewsTab'
import YoutubeTab from './pages/YoutubeTab'
import IdeasTab from './pages/IdeasTab'
import JobsTab from './pages/JobsTab'
import LoginPage from './pages/LoginPage'
import JobsSidebar from './components/listings/JobsSidebar'
import { api } from './api'

export default function App() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('华人关注')
  const [fetching, setFetching] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const [articles, setArticles] = useState([])
  const [newsLastUpdated, setNewsLastUpdated] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeCnTag, setActiveCnTag] = useState('All')

  const [channels, setChannels] = useState([])
  const [videos, setVideos] = useState([])
  const [ytLastUpdated, setYtLastUpdated] = useState(null)
  const [ytFilter, setYtFilter] = useState({ kind: 'all', value: '' })
  const [ideas, setIdeas] = useState([])
  const [jobsIndustry, setJobsIndustry] = useState('All')
  const [jobsCounts, setJobsCounts] = useState({})
  const [fetchError, setFetchError] = useState(null)
  const [toast, setToast] = useState(null)
  const showToast = useCallback(msg => setToast(msg), [])

  // Load news (public)
  useEffect(() => {
    api.getNews().then(d => {
      setArticles(d.articles || [])
      setNewsLastUpdated(d.last_updated)
    })
  }, [])

  // Load YouTube + Ideas only when logged in
  useEffect(() => {
    if (!user) return
    api.getYoutube().then(d => {
      setChannels(d.channels || [])
      setVideos(d.videos || [])
      setYtLastUpdated(d.last_updated)
    }).catch(() => {})
    api.getIdeas().then(d => setIdeas(d)).catch(() => {})
  }, [user])

  // If user logs out while on a protected tab, switch to news
  useEffect(() => {
    if (!user && (activeTab === 'YouTube' || activeTab === 'Ideas')) {
      setActiveTab('华人关注')
    }
  }, [user, activeTab])

  const handleFetchNews = async () => {
    setFetching(true)
    try {
      await api.fetchNews()
      const d = await api.getNews()
      setArticles(d.articles || [])
      setNewsLastUpdated(d.last_updated)
    } finally {
      setFetching(false)
    }
  }

  const handleFetchVideos = async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const result = await api.fetchVideos()
      const d = await api.getYoutube()
      setChannels(d.channels || [])
      setVideos(d.videos || [])
      setYtLastUpdated(d.last_updated)
      if (result.resolve_errors?.length) {
        setFetchError(result.resolve_errors.map(e => `${e.handle}: ${e.error}`).join(' · '))
      }
    } catch (err) {
      setFetchError(err.response?.data?.detail || 'Fetch failed. Check the server logs.')
    } finally {
      setFetching(false)
    }
  }

  const handleChannelsUpdate = useCallback(async () => {
    const d = await api.getYoutube()
    setChannels(d.channels || [])
    setVideos(d.videos || [])
  }, [])

  const handleCreateIdea = useCallback(async (data) => {
    const idea = await api.createIdea(data)
    setIdeas(prev => [idea, ...prev])
  }, [])

  const handleUpdateIdea = useCallback(async (id, data) => {
    const idea = await api.updateIdea(id, data)
    setIdeas(prev => prev.map(i => i.id === id ? idea : i))
  }, [])

  const handleDeleteIdea = useCallback(async (id) => {
    await api.deleteIdea(id)
    setIdeas(prev => prev.filter(i => i.id !== id))
  }, [])

  const handleCaptionUpdate = useCallback((videoId, caption) => {
    setVideos(prev => prev.map(v =>
      v.video_id === videoId
        ? (caption === undefined
            ? (({ caption: _, ...rest }) => rest)(v)
            : { ...v, caption })
        : v
    ))
  }, [])

  // Build category list with counts
  const categoryMap = {}
  for (const a of articles) {
    categoryMap[a.category] = (categoryMap[a.category] || 0) + 1
  }
  const categories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const filteredArticles = activeCategory === 'All'
    ? articles
    : articles.filter(a => a.category === activeCategory)

  // Chinese-interest articles (have non-empty tags_zh)
  const cnArticles = articles.filter(a => a.tags_zh && a.tags_zh.trim() !== '')
  const cnTagMap = {}
  for (const a of cnArticles) {
    for (const tag of a.tags_zh.split(',').map(t => t.trim()).filter(Boolean)) {
      cnTagMap[tag] = (cnTagMap[tag] || 0) + 1
    }
  }
  const cnTags = Object.entries(cnTagMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const cnTagFiltered = activeCnTag === 'All'
    ? cnArticles
    : cnArticles.filter(a => a.tags_zh.split(',').map(t => t.trim()).includes(activeCnTag))

  const cnCategoryMap = {}
  for (const a of cnTagFiltered) {
    cnCategoryMap[a.category] = (cnCategoryMap[a.category] || 0) + 1
  }
  const cnCategories = Object.entries(cnCategoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const filteredCnArticles = activeCategory === 'All'
    ? cnTagFiltered
    : cnTagFiltered.filter(a => a.category === activeCategory)

  const filteredVideos = (() => {
    if (ytFilter.kind === 'channel') return videos.filter(v => v.channel_id === ytFilter.value)
    if (ytFilter.kind === 'category') {
      const ids = new Set(channels.filter(c => c.category === ytFilter.value).map(c => c.channel_id))
      return videos.filter(v => ids.has(v.channel_id))
    }
    return videos
  })()

  // Available tabs based on auth (招聘 is public)
  const tabs = user
    ? ['华人关注', '葡萄牙新闻', '招聘', 'YouTube', 'Ideas']
    : ['华人关注', '葡萄牙新闻', '招聘']

  const mobileTabs = user
    ? [
        { label: '华人',    icon: 'diversity_3',   tab: '华人关注' },
        { label: '新闻',    icon: 'newspaper',     tab: '葡萄牙新闻' },
        { label: '招聘',    icon: 'work',          tab: '招聘' },
        { label: 'YouTube', icon: 'video_library', tab: 'YouTube' },
        { label: 'Ideas',   icon: 'lightbulb',     tab: 'Ideas' },
      ]
    : [
        { label: '华人',    icon: 'diversity_3',   tab: '华人关注' },
        { label: '新闻',    icon: 'newspaper',     tab: '葡萄牙新闻' },
        { label: '招聘',    icon: 'work',          tab: '招聘' },
      ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b1326' }}>
        <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: 32 }}>hourglass_empty</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0b1326', color: '#dae2fd' }}>
      <Toast message={toast} onDismiss={() => setToast(null)} />
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
      <Header
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={tab => { setActiveTab(tab); setActiveCategory('All'); setActiveCnTag('All'); setYtFilter({ kind: 'all', value: '' }); setJobsIndustry('All') }}
        onFetchNews={handleFetchNews}
        onFetchVideos={handleFetchVideos}
        fetching={fetching}
        user={user}
        onLoginClick={() => setShowLogin(true)}
      />

      {activeTab === '葡萄牙新闻' && (
        <Sidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          lastUpdated={newsLastUpdated}
        />
      )}

      {activeTab === '华人关注' && (
        <CnSidebar
          cnTags={cnTags}
          activeCnTag={activeCnTag}
          onCnTagChange={tag => { setActiveCnTag(tag); setActiveCategory('All') }}
          categories={cnCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          lastUpdated={newsLastUpdated}
        />
      )}

      {activeTab === '招聘' && (
        <JobsSidebar
          counts={jobsCounts}
          activeIndustry={jobsIndustry}
          onIndustryChange={setJobsIndustry}
        />
      )}

      {activeTab === 'YouTube' && (
        <YoutubeSidebar
          channels={channels}
          videos={videos}
          activeFilter={ytFilter}
          onFilterChange={setYtFilter}
          lastUpdated={ytLastUpdated}
        />
      )}

      <main className={`pt-14 px-5 lg:px-8 pb-12 ${activeTab === 'Ideas' ? '' : 'lg:ml-52'}`}>
        {activeTab === '葡萄牙新闻' && (
          <NewsTab articles={filteredArticles} />
        )}
        {activeTab === '华人关注' && (
          <NewsTab articles={filteredCnArticles} tabTitle="华人关注" tabSubtitle="与在葡华人相关的新闻精选。" emptyHint="获取葡萄牙新闻" />
        )}
        {activeTab === 'YouTube' && (
          <YoutubeTab
            channels={channels}
            videos={filteredVideos}
            fetchError={fetchError}
            onChannelsUpdate={handleChannelsUpdate}
            onCaptionUpdate={handleCaptionUpdate}
            onError={showToast}
          />
        )}
        {activeTab === '招聘' && (
          <JobsTab
            activeIndustry={jobsIndustry}
            onCountsChange={setJobsCounts}
            onLoginRequired={() => setShowLogin(true)}
          />
        )}
        {activeTab === 'Ideas' && (
          <IdeasTab
            ideas={ideas}
            onCreate={handleCreateIdea}
            onUpdate={handleUpdateIdea}
            onDelete={handleDeleteIdea}
          />
        )}
      </main>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 w-full glass-panel h-12 flex justify-around items-center z-50"
        style={{ borderTop: '1px solid rgba(70,69,84,0.3)' }}>
        {mobileTabs.map(({ label, icon, tab }) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === tab ? 'text-secondary' : 'text-on-surface-variant'
            }`}>
            <span className="material-symbols-outlined"
              style={{ fontVariationSettings: activeTab === tab ? "'FILL' 1" : "'FILL' 0" }}>
              {icon}
            </span>
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
