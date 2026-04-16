import { useAuth } from '../auth'

export default function Header({ activeTab, tabs, onTabChange, onFetchNews, onFetchVideos, fetching, user, onLoginClick }) {
  const { logout } = useAuth()

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

        {user?.is_admin && activeTab !== 'Ideas' && (
          <button onClick={(activeTab === '葡萄牙新闻' || activeTab === '华人关注') ? onFetchNews : onFetchVideos}
            disabled={fetching}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-on-primary transition-all active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{fetching ? 'hourglass_empty' : 'refresh'}</span>
            <span className="hidden sm:inline">{fetching ? '加载中…' : `获取${activeTab}`}</span>
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-2">
            {user.avatar && (
              <img src={user.avatar} alt="" className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
            )}
            <span className="hidden lg:inline text-xs text-on-surface-variant">{user.name}</span>
            <button onClick={logout}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1">
              退出
            </button>
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
    </header>
  )
}
