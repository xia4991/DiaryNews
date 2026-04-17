export const navItemClass = active =>
  `flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-sm ${
    active
      ? 'bg-accent-subtle text-accent font-semibold'
      : 'text-text-muted hover:text-text hover:bg-bg-subtle'
  }`

export const navCountClass = 'text-[11px] text-text-subtle tabular-nums'

export const sectionLabel = text => (
  <div className="px-2 pt-4 pb-1">
    <span className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.12em]">{text}</span>
  </div>
)

export default function SidebarShell({ title, lastUpdated, children }) {
  return (
    <aside className="hidden lg:flex h-screen w-52 fixed left-0 top-0 pt-16 flex-col gap-0.5 p-3 bg-surface border-r border-border">
      <div className="mb-3 px-2 pt-1">
        <h3
          className="text-xs font-bold text-accent uppercase tracking-[0.15em]"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {title}
        </h3>
        {lastUpdated && (
          <p className="text-[11px] text-text-subtle mt-0.5 tabular-nums">
            {lastUpdated.slice(0, 16).replace('T', ' ')}
          </p>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar flex-1">
        {children}
      </nav>
    </aside>
  )
}
