import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './auth'
import AppShell from './components/AppShell'
import Sidebar from './components/Sidebar'
import CnSidebar from './components/CnSidebar'
import Toast from './components/Toast'
import HomePage from './pages/HomePage'
import NewsTab from './pages/NewsTab'
import IdeasTab from './pages/IdeasTab'
import JobsTab from './pages/JobsTab'
import LoginPage from './pages/LoginPage'
import JobsSidebar from './components/listings/JobsSidebar'
import RealEstateTab from './pages/RealEstateTab'
import RealEstateSidebar from './components/listings/RealEstateSidebar'
import SecondHandTab from './pages/SecondHandTab'
import SecondHandSidebar from './components/listings/SecondHandSidebar'
import { api } from './api'

export default function App() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('首页')
  const [fetching, setFetching] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const [articles, setArticles] = useState([])
  const [newsLastUpdated, setNewsLastUpdated] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeCnTag, setActiveCnTag] = useState('All')

  const [jobs, setJobs] = useState([])
  const [ideas, setIdeas] = useState([])
  const [jobsIndustry, setJobsIndustry] = useState('All')
  const [jobsCounts, setJobsCounts] = useState({})
  const [reDealType, setReDealType] = useState('All')
  const [reRooms, setReRooms] = useState('All')
  const [reCounts, setReCounts] = useState({})
  const [shCategory, setShCategory] = useState('All')
  const [shCondition, setShCondition] = useState('All')
  const [shCounts, setShCounts] = useState({})
  const [toast, setToast] = useState(null)
  const showToast = useCallback(msg => setToast(msg), [])

  // Load news (public)
  useEffect(() => {
    api.getNews().then(d => {
      setArticles(d.articles || [])
      setNewsLastUpdated(d.last_updated)
    })
    api.listJobs({ limit: 12 }).then(d => setJobs(d.items || [])).catch(() => {})
  }, [])

  // Load Ideas only when logged in
  useEffect(() => {
    if (!user) return
    api.getIdeas().then(d => setIdeas(d)).catch(() => {})
  }, [user])

  // If user logs out while on a protected tab, switch to news
  useEffect(() => {
    if (!user && activeTab === 'Ideas') {
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

  const loadJobs = useCallback(async () => {
    const d = await api.listJobs({ limit: 12 })
    setJobs(d.items || [])
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

  // Available tabs based on auth (招聘 is public)
  const tabs = user
    ? ['首页', '华人关注', '葡萄牙新闻', '招聘', '房产', '二手', 'Ideas']
    : ['首页', '华人关注', '葡萄牙新闻', '招聘', '房产', '二手']

  const mobileTabs = user
    ? [
        { label: '首页',    icon: 'home',          tab: '首页' },
        { label: '华人',    icon: 'diversity_3',   tab: '华人关注' },
        { label: '新闻',    icon: 'newspaper',     tab: '葡萄牙新闻' },
        { label: '招聘',    icon: 'work',          tab: '招聘' },
        { label: '房产',    icon: 'home_work',     tab: '房产' },
        { label: '二手',    icon: 'shopping_bag',  tab: '二手' },
        { label: 'Ideas',   icon: 'lightbulb',     tab: 'Ideas' },
      ]
    : [
        { label: '首页',    icon: 'home',          tab: '首页' },
        { label: '华人',    icon: 'diversity_3',   tab: '华人关注' },
        { label: '新闻',    icon: 'newspaper',     tab: '葡萄牙新闻' },
        { label: '招聘',    icon: 'work',          tab: '招聘' },
        { label: '房产',    icon: 'home_work',     tab: '房产' },
        { label: '二手',    icon: 'shopping_bag',  tab: '二手' },
      ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-accent">
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32 }}>progress_activity</span>
      </div>
    )
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setActiveCategory('All')
    setActiveCnTag('All')
    setJobsIndustry('All')
    setReDealType('All')
    setReRooms('All')
    setShCategory('All')
    setShCondition('All')
  }

  let sidebar = null
  if (activeTab === '葡萄牙新闻') {
    sidebar = (
      <Sidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        lastUpdated={newsLastUpdated}
      />
    )
  } else if (activeTab === '华人关注') {
    sidebar = (
      <CnSidebar
        cnTags={cnTags}
        activeCnTag={activeCnTag}
        onCnTagChange={tag => { setActiveCnTag(tag); setActiveCategory('All') }}
        categories={cnCategories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        lastUpdated={newsLastUpdated}
      />
    )
  } else if (activeTab === '招聘') {
    sidebar = (
      <JobsSidebar
        counts={jobsCounts}
        activeIndustry={jobsIndustry}
        onIndustryChange={setJobsIndustry}
      />
    )
  } else if (activeTab === '房产') {
    sidebar = (
      <RealEstateSidebar
        counts={reCounts}
        activeDealType={reDealType}
        onDealTypeChange={setReDealType}
        activeRooms={reRooms}
        onRoomsChange={setReRooms}
      />
    )
  } else if (activeTab === '二手') {
    sidebar = (
      <SecondHandSidebar
        counts={shCounts}
        activeCategory={shCategory}
        onCategoryChange={setShCategory}
        activeCondition={shCondition}
        onConditionChange={setShCondition}
      />
    )
  }

  return (
    <>
      <Toast message={toast} onDismiss={() => setToast(null)} />
      {showLogin && <LoginPage onClose={() => setShowLogin(false)} />}
      <AppShell
        activeTab={activeTab}
        tabs={tabs}
        mobileTabs={mobileTabs}
        onTabChange={handleTabChange}
        onFetchNews={handleFetchNews}
        fetching={fetching}
        user={user}
        onLoginClick={() => setShowLogin(true)}
        sidebar={sidebar}
        fullWidth={activeTab === 'Ideas' || activeTab === '首页'}
      >
        {activeTab === '首页' && (
          <HomePage
            user={user}
            articles={articles}
            cnArticles={cnArticles}
            jobs={jobs}
            ideas={ideas}
            newsLastUpdated={newsLastUpdated}
            onTabChange={handleTabChange}
            onLoginClick={() => setShowLogin(true)}
          />
        )}
        {activeTab === '葡萄牙新闻' && (
          <NewsTab
            articles={filteredArticles}
            layout="portugal"
          />
        )}
        {activeTab === '华人关注' && (
          <NewsTab
            articles={filteredCnArticles}
            tabTitle="华人关注"
            tabSubtitle="与在葡华人相关的新闻精选。"
            emptyHint="获取葡萄牙新闻"
            layout="china"
          />
        )}
        {activeTab === '招聘' && (
          <JobsTab
            activeIndustry={jobsIndustry}
            onCountsChange={setJobsCounts}
            onLoginRequired={() => setShowLogin(true)}
            onJobsChanged={loadJobs}
          />
        )}
        {activeTab === '房产' && (
          <RealEstateTab
            activeDealType={reDealType}
            activeRooms={reRooms}
            onCountsChange={setReCounts}
            onLoginRequired={() => setShowLogin(true)}
          />
        )}
        {activeTab === '二手' && (
          <SecondHandTab
            activeCategory={shCategory}
            activeCondition={shCondition}
            onCountsChange={setShCounts}
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
      </AppShell>
    </>
  )
}
