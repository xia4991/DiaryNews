import Header from './Header'
import Footer from './Footer'

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

      <main className={`pt-16 px-4 sm:px-5 lg:px-8 pb-20 md:pb-14 ${fullWidth ? '' : 'lg:ml-52'}`}>
        {children}
      </main>

      <div className={`${fullWidth ? '' : 'lg:ml-52'} mt-6 md:mt-10`}>
        <Footer onTabChange={onTabChange} />
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-surface/95 backdrop-blur"
      >
        <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mobileTabs.map(({ label, icon, tab }) => {
            const active = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className={`flex min-w-[62px] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-2 py-1.5 transition-colors ${
                  active ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:text-text'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0", fontSize: 21 }}
                >
                  {icon}
                </span>
                <span className="text-[10px] font-semibold leading-none">{label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
