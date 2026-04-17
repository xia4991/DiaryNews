/**
 * Kicker: small colored square + label text. The default — low chrome, editorial feel.
 * Pill: filled rounded-full background + text. Reserved for status chips ("已过期", "Admin").
 */

export default function Badge({
  color = '#5E6478',
  icon,
  children,
  variant = 'kicker',
  className = '',
}) {
  if (variant === 'pill') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${className}`.trim()}
        style={{ background: `${color}18`, color }}
      >
        {icon && <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{icon}</span>}
        {children}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${className}`.trim()}>
      <span
        aria-hidden
        className="inline-block rounded-sm"
        style={{ width: 8, height: 8, background: color }}
      />
      {icon && <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>{icon}</span>}
      <span style={{ color }}>{children}</span>
    </span>
  )
}
