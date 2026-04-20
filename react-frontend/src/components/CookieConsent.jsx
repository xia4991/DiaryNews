import { useState, useEffect } from 'react'

const STORAGE_KEY = 'cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-[70] p-4 sm:p-6">
      <div
        className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl px-5 py-4 shadow-lg sm:flex-row sm:items-center sm:gap-4"
        style={{ background: '#1a2036', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex-1 text-sm leading-6 text-[#c8d0e8]">
          本平台使用 Cookie 和本地存储来维持登录状态和保存偏好设置。继续使用即表示你同意我们的
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: 'privacy' }))}
            className="ml-1 underline text-accent hover:text-accent/80"
          >
            隐私政策
          </button>
          。
        </div>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent/90"
        >
          我知道了
        </button>
      </div>
    </div>
  )
}
