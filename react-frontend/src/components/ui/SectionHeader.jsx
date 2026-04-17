export default function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-6 ${className}`.trim()}>
      <div className="min-w-0">
        <h1
          className="font-extrabold text-text tracking-tight text-2xl sm:text-3xl"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-text-muted mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
