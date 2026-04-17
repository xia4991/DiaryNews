import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth'
import ProfileModal from './ProfileModal'

export default function Header({ activeTab, tabs, onTabChange, onFetchNews, onFetchVideos, fetching, user, onLoginClick }) {
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

  return (
    <header className="fixed top-0 w-full z-50 h-12 flex justify-between items-center px-4 lg:px-6"
      style={{ background: 'rgba(11,19,38,0.8)', backdropFilter: 'blur(20px)', boxShadow: '0 16px 40px rgba(218,226,253,0.03)' }}>

      <div className="flex items-center gap-6">
        <span className="text-base font-bold tracking-tighter text-primary font-headline">DiaryNews</span>
        <nav className="hidden md:flex items-center gap-6">
          {tabs.map(tab => (
            <button key={tab} onClick={() => onTabChange(tab)}
              className={`text-sm font-bold pb-0.5 transition-colors ${
                activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: 'rgba(45,52,73,0.5)' }}>
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>search</span>
          <input className="bg-transparent border-none outline-none text-xs text-on-surface w-28 lg:w-36 placeholder-on-surface-variant"
            placeholder="搜索..." />
        </div>

        {user?.is_admin && activeTab !== 'Ideas' && activeTab !== '招聘' && (
          <button onClick={(activeTab === '葡萄牙新闻' || activeTab === '华人关注') ? onFetchNews : onFetchVideos}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-on-primary transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{fetching ? 'hourglass_empty' : 'refresh'}</span>
            <span className="hidden sm:inline">{fetching ? '加载中…' : `获取${activeTab}`}</span>
          </button>
        )}

        {user ? (
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(v => !v)}
              className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-white/5 transition-colors">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(45,52,73,0.8)', color: '#dae2fd' }}>
                  {(user.name || '?').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden lg:inline text-xs text-on-surface-variant">{user.name}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 min-w-[160px] rounded-lg overflow-hidden py-1"
                style={{ background: '#131b2e', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
                <button onClick={() => { setMenuOpen(false); setProfileOpen(true) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center gap-2"
                  style={{ color: '#dae2fd' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
                  个人资料
                </button>
                <button onClick={() => { setMenuOpen(false); logout() }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-white/5 flex items-center gap-2"
                  style={{ color: '#dae2fd' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
                  退出
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={onLoginClick}
            className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95"
            style={{ background: 'rgba(45,52,73,0.5)', color: '#dae2fd' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>login</span>
            <span>登录</span>
          </button>
        )}
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </header>
  )
}
