import { useEffect } from 'react'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-2xl',
}

export default function Modal({
  onClose,
  title,
  subtitle,
  size = 'md',
  hideClose = false,
  footer,
  children,
  className = '',
}) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(26,32,54,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${SIZES[size]} max-h-[calc(100vh-2rem)] flex flex-col bg-surface rounded-xl shadow-modal ${className}`.trim()}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0">
            <div className="min-w-0">
              {title && <h2 className="text-lg font-bold text-text truncate">{title}</h2>}
              {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-text-muted hover:text-text p-1 -mr-1 -mt-1 rounded hover:bg-bg-subtle transition-colors"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            )}
          </div>
        )}
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-border bg-surface-muted rounded-b-xl flex justify-end gap-2 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
