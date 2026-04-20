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
  headerLeading,
  headerActions,
  footer,
  children,
  contentRef,
  initialScrollTop,
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

  useEffect(() => {
    if (contentRef && typeof contentRef !== 'function' && contentRef.current && typeof initialScrollTop === 'number') {
      contentRef.current.scrollTop = initialScrollTop
    }
  }, [contentRef, initialScrollTop])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4"
      style={{ background: 'rgba(26,32,54,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${SIZES[size]} max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col bg-surface rounded-[20px] sm:rounded-xl shadow-modal ${className}`.trim()}
      >
        {(title || !hideClose || headerLeading || headerActions) && (
          <div className="flex items-start justify-between px-4 pt-4 pb-3 sm:px-5 sm:pt-5 shrink-0">
            <div className="min-w-0 flex items-start gap-3">
              {headerLeading && <div className="shrink-0">{headerLeading}</div>}
              <div className="min-w-0">
                {title && <h2 className="text-lg font-bold text-text truncate">{title}</h2>}
                {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <div className="ml-4 flex items-center gap-2 shrink-0">
              {headerActions}
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
          </div>
        )}
        <div ref={contentRef} className="px-4 pb-4 overflow-y-auto sm:px-5 sm:pb-5">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-border bg-surface-muted rounded-b-[20px] sm:rounded-b-xl flex justify-end gap-2 shrink-0 sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
