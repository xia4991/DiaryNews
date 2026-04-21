import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from 'react'
import { useAuth } from './auth'
import AppShell from './components/AppShell'
import Sidebar from './components/Sidebar'
import CnSidebar from './components/CnSidebar'
import Toast from './components/Toast'
import HomePage from './pages/HomePage'
import NewsTab from './pages/NewsTab'
import NewsTabSkeleton from './components/news/NewsTabSkeleton'
import CommunityTab from './pages/CommunityTab'
import AIAssistantTab from './pages/AIAssistantTab'
import JobsTab from './pages/JobsTab'
import LoginPage from './pages/LoginPage'
import JobsSidebar from './components/listings/JobsSidebar'
import RealEstateTab from './pages/RealEstateTab'
import RealEstateSidebar from './components/listings/RealEstateSidebar'
import SecondHandTab from './pages/SecondHandTab'
import SecondHandSidebar from './components/listings/SecondHandSidebar'
import AdminModerationTab from './pages/AdminModerationTab'
import ProfilePage from './pages/ProfilePage'
import CookieConsent from './components/CookieConsent'
import LegalModal from './components/LegalModal'
import { api } from './api'

export default function App() {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState('首页')
  const [fetching, setFetching] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [legalPage, setLegalPage] = useState(null)

  const [articles, setArticles] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [newsLastUpdated, setNewsLastUpdated] = useState(null)
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeCnTag, setActiveCnTag] = useState('All')

  const [jobs, setJobs] = useState([])
  const [jobsIndustry, setJobsIndustry] = useState('All')
  const [jobsCounts, setJobsCounts] = useState({})
  const [reDealType, setReDealType] = useState('All')
  const [reRooms, setReRooms] = useState('All')
  const [reCounts, setReCounts] = useState({})
  const [shCategory, setShCategory] = useState('All')
  const [shCondition, setShCondition] = useState('All')
  const [shCounts, setShCounts] = useState({})
  const [toast, setToast] = useState(null)
  const [newsTabLoading, setNewsTabLoading] = useState(null)
  const newsTabTimerRef = useRef(null)

  const applyArticleViewCount = useCallback((link, viewCount) => {
    setArticles(prev => prev.map(article => (
      article.link === link
        ? { ...article, view_count: viewCount }
        : article
    )))
  }, [])

  const handleArticleOpen = useCallback((article) => {
    if (!article?.link) return article?.view_count || 0
    const optimisticCount = Number(article.view_count || 0) + 1
    applyArticleViewCount(article.link, optimisticCount)
    api.recordNewsView(article.link)
      .then((data) => {
        if (typeof data.view_count === 'number') {
          applyArticleViewCount(article.link, data.view_count)
        }
      })
      .catch(() => {})
    return optimisticCount
  }, [applyArticleViewCount])

  // Load news (public)
  useEffect(() => {
    api.getNews().then(d => {
      setArticles(d.articles || [])
      setNewsLastUpdated(d.last_updated)
    })
    api.listAnnouncements({ limit: 2 }).then(d => setAnnouncements(d.items || [])).catch(() => {})
    api.listJobs({ limit: 12 }).then(d => setJobs(d.items || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab !== '首页') return
    api.listAnnouncements({ limit: 2 }).then(d => setAnnouncements(d.items || [])).catch(() => {})
  }, [activeTab])

  // If user logs out while on a protected tab, switch to news
  useEffect(() => {
    if (!user && activeTab === '管理') {
      setActiveTab('华人关注')
    }
    if (!user && activeTab === '个人资料') {
      setActiveTab('首页')
    }
    if (user && !user.is_admin && activeTab === '管理') {
      setActiveTab('首页')
    }
  }, [user, activeTab])

  useEffect(() => {
    const handler = (e) => setLegalPage(e.detail || 'privacy')
    window.addEventListener('open-legal', handler)
    return () => window.removeEventListener('open-legal', handler)
  }, [])

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

  const loadJobs = useCallback(async () => {
    const d = await api.listJobs({ limit: 12 })
    setJobs(d.items || [])
  }, [])

  // Build category list with counts
  const categories = useMemo(() => {
    const categoryMap = {}
    for (const a of articles) {
      categoryMap[a.category] = (categoryMap[a.category] || 0) + 1
    }
    return Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [articles])

  const filteredArticles = useMemo(() => (
    activeCategory === 'All'
      ? articles
      : articles.filter(a => a.category === activeCategory)
  ), [articles, activeCategory])

  // Chinese-interest articles: tagged by LLM/keywords, or from relevant categories
  const CN_RELEVANT_CATEGORIES = useMemo(() => new Set(['Sociedade', 'Economia', 'Internacional']), [])
  const cnArticles = useMemo(() => {
    const relevant = articles.filter(a =>
      (a.tags_zh && a.tags_zh.trim() !== '') || CN_RELEVANT_CATEGORIES.has(a.category)
    )
    return relevant.sort((a, b) => {
      const aScore = (a.tags_zh || '').split(',').filter(t => t.trim()).length
      const bScore = (b.tags_zh || '').split(',').filter(t => t.trim()).length
      if (aScore !== bScore) return bScore - aScore
      return (b.published || '').localeCompare(a.published || '')
    })
  }, [articles, CN_RELEVANT_CATEGORIES])

  const cnTags = useMemo(() => {
    const cnTagMap = {}
    for (const a of cnArticles) {
      for (const tag of (a.tags_zh || '').split(',').map(t => t.trim()).filter(Boolean)) {
        cnTagMap[tag] = (cnTagMap[tag] || 0) + 1
      }
    }
    return Object.entries(cnTagMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [cnArticles])

  const cnTagFiltered = useMemo(() => (
    activeCnTag === 'All'
      ? cnArticles
      : cnArticles.filter(a => (a.tags_zh || '').split(',').map(t => t.trim()).includes(activeCnTag))
  ), [cnArticles, activeCnTag])

  const cnCategories = useMemo(() => {
    const cnCategoryMap = {}
    for (const a of cnTagFiltered) {
      cnCategoryMap[a.category] = (cnCategoryMap[a.category] || 0) + 1
    }
    return Object.entries(cnCategoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [cnTagFiltered])

  const filteredCnArticles = useMemo(() => (
    activeCategory === 'All'
      ? cnTagFiltered
      : cnTagFiltered.filter(a => a.category === activeCategory)
  ), [cnTagFiltered, activeCategory])

  // Available tabs based on auth (招聘 is public)
  const baseTabs = ['首页', '华人关注', '葡萄牙新闻', '招聘', '房产', '二手', '社区', 'AI 助手']
  const tabs = user
    ? [...baseTabs, ...(user.is_admin ? ['管理'] : [])]
    : baseTabs

  const mobileTabs = user
    ? [
        { label: '首页',    icon: 'home',          tab: '首页' },
        { label: '华人',    icon: 'diversity_3',   tab: '华人关注' },
        { label: '新闻',    icon: 'newspaper',     tab: '葡萄牙新闻' },
        { label: '招聘',    icon: 'work',          tab: '招聘' },
        { label: '房产',    icon: 'home_work',     tab: '房产' },
        { label: '二手',    icon: 'shopping_bag',  tab: '二手' },
        { label: '社区',    icon: 'groups',        tab: '社区' },
        { label: 'AI',      icon: 'smart_toy',     tab: 'AI 助手' },
        ...(user.is_admin ? [{ label: '管理', icon: 'admin_panel_settings', tab: '管理' }] : []),
      ]
    : [
        { label: '首页',    icon: 'home',          tab: '首页' },
        { label: '华人',    icon: 'diversity_3',   tab: '华人关注' },
        { label: '新闻',    icon: 'newspaper',     tab: '葡萄牙新闻' },
        { label: '招聘',    icon: 'work',          tab: '招聘' },
        { label: '房产',    icon: 'home_work',     tab: '房产' },
        { label: '二手',    icon: 'shopping_bag',  tab: '二手' },
        { label: '社区',    icon: 'groups',        tab: '社区' },
        { label: 'AI',      icon: 'smart_toy',     tab: 'AI 助手' },
      ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-accent">
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 32 }}>progress_activity</span>
      </div>
    )
  }

  const isNewsTab = (tab) => tab === '华人关注' || tab === '葡萄牙新闻'

  const handleTabChange = (tab) => {
    if (newsTabTimerRef.current) {
      clearTimeout(newsTabTimerRef.current)
      newsTabTimerRef.current = null
    }

    if (isNewsTab(tab) && tab !== activeTab) {
      setNewsTabLoading(tab)
      newsTabTimerRef.current = setTimeout(() => {
        setNewsTabLoading(null)
        newsTabTimerRef.current = null
      }, 140)
    } else {
      setNewsTabLoading(null)
    }

    startTransition(() => {
      setActiveTab(tab)
      setActiveCategory('All')
      setActiveCnTag('All')
      setJobsIndustry('All')
      setReDealType('All')
      setReRooms('All')
      setShCategory('All')
      setShCondition('All')
    })
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

  const showNewsSkeleton = newsTabLoading === activeTab && isNewsTab(activeTab)

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
        fullWidth={activeTab === '首页' || activeTab === '管理' || activeTab === 'AI 助手' || activeTab === '个人资料'}
      >
        {activeTab === '首页' && (
          <HomePage
            user={user}
            articles={articles}
            announcements={announcements}
            cnArticles={cnArticles}
            jobs={jobs}
            newsLastUpdated={newsLastUpdated}
            onTabChange={handleTabChange}
            onLoginClick={() => setShowLogin(true)}
            onArticleOpen={handleArticleOpen}
          />
        )}
        {activeTab === '葡萄牙新闻' && (
          showNewsSkeleton ? (
            <NewsTabSkeleton variant="portugal" />
          ) : (
            <NewsTab
              key={`portugal-${activeCategory}`}
              articles={filteredArticles}
              layout="portugal"
              isAdmin={user?.is_admin}
              onArticleOpen={handleArticleOpen}
            />
          )
        )}
        {activeTab === '华人关注' && (
          showNewsSkeleton ? (
            <NewsTabSkeleton variant="china" />
          ) : (
            <NewsTab
              key={`china-${activeCnTag}-${activeCategory}`}
              articles={filteredCnArticles}
              tabTitle="华人关注"
              tabSubtitle="与在葡华人相关的新闻精选。"
              emptyHint="获取葡萄牙新闻"
              layout="china"
              isAdmin={user?.is_admin}
              onArticleOpen={handleArticleOpen}
            />
          )
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
        {activeTab === '社区' && (
          <CommunityTab
            onLoginRequired={() => setShowLogin(true)}
          />
        )}
        {activeTab === 'AI 助手' && (
          <AIAssistantTab user={user} onLoginRequired={() => setShowLogin(true)} />
        )}
        {activeTab === '个人资料' && user && (
          <ProfilePage
            user={user}
            onBack={() => handleTabChange('首页')}
          />
        )}
        {activeTab === '管理' && user?.is_admin && (
          <AdminModerationTab />
        )}
      </AppShell>
      <CookieConsent />
      {legalPage && <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />}
    </>
  )
}
