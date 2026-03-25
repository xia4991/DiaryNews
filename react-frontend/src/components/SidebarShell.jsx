export const navItemClass = active =>
  `flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left ${
    active
      ? 'bg-secondary/10 text-secondary'
      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
  }`

export const sectionLabel = text => (
  <div className="px-2 pt-3 pb-1">
    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-50">{text}</span>
  </div>
)

export default function SidebarShell({ title, lastUpdated, children }) {
  return (
    <aside className="hidden lg:flex h-screen w-52 fixed left-0 top-0 pt-14 flex-col gap-0.5 p-3 font-label text-xs font-medium"
      style={{ background: 'rgba(13,19,46,0.6)', backdropFilter: 'blur(16px)' }}>

      <div className="mb-3 px-2 pt-2">
        <h3 className="text-xs font-bold text-primary font-headline uppercase tracking-widest">{title}</h3>
        {lastUpdated && (
          <p className="text-on-surface-variant text-xs mt-0.5">{lastUpdated.slice(0, 16).replace('T', ' ')}</p>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar flex-1">
        {children}
      </nav>
    </aside>
  )
}
