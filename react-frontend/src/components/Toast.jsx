import { useEffect } from 'react'

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="fixed top-16 left-1/2 z-[9999] -translate-x-1/2 w-full max-w-lg px-4 pointer-events-none">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-modal pointer-events-auto bg-surface border border-danger">
        <span className="material-symbols-outlined shrink-0 mt-0.5 text-danger" style={{ fontSize: 18 }}>
          error
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold mb-0.5 text-danger">Error</p>
          <p className="text-xs leading-relaxed break-words text-text-muted">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 text-text-subtle hover:text-text transition-colors"
          aria-label="Dismiss"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>
    </div>
  )
}
