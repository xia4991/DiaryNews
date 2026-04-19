export default function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end sm:gap-4 ${className}`.trim()}>
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
      {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
    </div>
  )
}
