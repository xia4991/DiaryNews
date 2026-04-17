export const navItemClass = (active) =>
  `flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-colors text-left text-sm ${
    active
      ? 'bg-accent-subtle text-accent font-semibold'
      : 'text-text-muted hover:text-text hover:bg-bg-subtle'
  }`

export const navCountClass = 'text-[11px] text-text-subtle tabular-nums'

export const sectionLabel = (text) => (
  <div className="px-2 pt-4 pb-1">
    <span className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.12em]">{text}</span>
  </div>
)
