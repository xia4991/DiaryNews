const VARIANTS = {
  primary:
    'bg-accent text-text-onaccent hover:bg-accent-hover disabled:bg-bg-subtle disabled:text-text-subtle',
  ghost:
    'bg-transparent text-text border border-border-strong hover:bg-bg-subtle disabled:text-text-subtle disabled:border-border',
  danger:
    'bg-danger text-text-onaccent hover:brightness-95 disabled:bg-bg-subtle disabled:text-text-subtle',
  subtle:
    'bg-bg-subtle text-text hover:bg-border disabled:text-text-subtle',
}

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5 gap-1',
  md: 'text-sm px-3.5 py-2 gap-1.5',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors active:scale-[0.98] disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim()}
      {...rest}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>
          progress_activity
        </span>
      ) : (
        icon && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
      )}
      {children}
    </button>
  )
}
