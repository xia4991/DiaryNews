import Header from './Header'

export default function AppShell({
  activeTab,
  tabs,
  mobileTabs,
  onTabChange,
  onFetchNews,
  fetching,
  user,
  onLoginClick,
  sidebar,
  fullWidth = false,
  children,
}) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <Header
        activeTab={activeTab}
        tabs={tabs}
        onTabChange={onTabChange}
        onFetchNews={onFetchNews}
        fetching={fetching}
        user={user}
        onLoginClick={onLoginClick}
      />

      {sidebar}

      <main className={`pt-16 px-5 lg:px-8 pb-20 md:pb-12 ${fullWidth ? '' : 'lg:ml-52'}`}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 flex justify-around items-center bg-surface/95 backdrop-blur border-t border-border"
      >
        {mobileTabs.map(({ label, icon, tab }) => {
          const active = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`flex flex-col items-center gap-0.5 py-1 transition-colors ${
                active ? 'text-accent' : 'text-text-muted hover:text-text'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0", fontSize: 22 }}
              >
                {icon}
              </span>
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
