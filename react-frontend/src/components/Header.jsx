import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth'
import Button from './ui/Button'
import ProfileModal from './ProfileModal'

export default function Header({ activeTab, tabs, onTabChange, onFetchNews, fetching, user, onLoginClick }) {
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const showFetchButton = user?.is_admin && (activeTab === '葡萄牙新闻' || activeTab === '华人关注')
  const fetchLabel = fetching ? '加载中' : `获取${activeTab}`

  return (
    <header
      className="fixed top-0 w-full z-40 h-14 flex items-center justify-between px-4 lg:px-6 bg-surface/90 backdrop-blur border-b border-border"
    >
      <div className="flex items-center gap-8 min-w-0">
        <button
          onClick={() => onTabChange('首页')}
          className="min-w-0 shrink-0 text-left"
        >
          <span
            className="block max-w-[220px] truncate text-base font-black tracking-tight text-text lg:max-w-none lg:text-lg"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            葡萄牙华人信息中心
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.18em] text-text-subtle lg:block">
            Portugal Chinese Hub
          </span>
        </button>
        <nav className="hidden md:flex items-center gap-6">
          {tabs.map(tab => {
            const active = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`relative text-sm font-semibold py-1 transition-colors ${
                  active ? 'text-text' : 'text-text-muted hover:text-text'
                }`}
              >
                {tab}
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 right-0 -bottom-[17px] h-[2px] bg-accent"
                  />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-bg-subtle">
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 16 }}>search</span>
          <input
            className="bg-transparent border-none outline-none text-xs text-text w-28 lg:w-40 placeholder:text-text-subtle"
            placeholder="搜索..."
          />
        </div>

        {showFetchButton && (
          <Button
            variant="primary"
            size="sm"
            icon={fetching ? undefined : 'refresh'}
            loading={fetching}
            onClick={onFetchNews}
          >
            <span className="hidden sm:inline">{fetchLabel}</span>
          </Button>
        )}

        {user ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-bg-subtle transition-colors"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-accent-subtle text-accent">
                  {(user.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden lg:inline text-xs font-medium text-text-muted">{user.name}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 min-w-[180px] rounded-lg overflow-hidden py-1 bg-surface border border-border shadow-modal">
                <button
                  onClick={() => { setMenuOpen(false); setProfileOpen(true) }}
                  className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg-subtle flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 18 }}>person</span>
                  个人资料
                </button>
                <button
                  onClick={() => { setMenuOpen(false); logout() }}
                  className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg-subtle flex items-center gap-2 transition-colors"
                >
                  <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 18 }}>logout</span>
                  退出
                </button>
              </div>
            )}
          </div>
        ) : (
          <Button variant="ghost" size="sm" icon="login" onClick={onLoginClick}>
            登录
          </Button>
        )}
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </header>
  )
}
