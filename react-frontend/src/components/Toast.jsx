import { useEffect } from 'react'

export default function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [message, onDismiss])

  if (!message) return null

  return (
    <div className="fixed top-14 left-1/2 z-[9999] -translate-x-1/2 w-full max-w-lg px-4 pointer-events-none">
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-2xl pointer-events-auto"
        style={{ background: '#2d1b1b', border: '1px solid rgba(255,100,80,0.5)' }}>
        <span className="material-symbols-outlined shrink-0 mt-0.5" style={{ fontSize: 18, color: '#ff6b6b' }}>
          error
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold mb-0.5" style={{ color: '#ff6b6b' }}>Error</p>
          <p className="text-xs leading-relaxed break-words" style={{ color: '#ffb4ab' }}>{message}</p>
        </div>
        <button onClick={onDismiss} className="shrink-0 text-on-surface-variant hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>
    </div>
  )
}
