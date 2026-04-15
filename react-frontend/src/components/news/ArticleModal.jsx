import { useEffect } from 'react'
import SummaryText from '../SummaryText'

export default function ArticleModal({ article, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!article) return null
  const pub = article.published?.slice(0, 16).replace('T', ' ')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,14,32,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="relative w-full max-w-xl max-h-[80vh] overflow-y-auto rounded-xl p-6 flex flex-col gap-4"
        style={{ background: '#171f33', border: '1px solid rgba(70,69,84,0.2)' }}
        onClick={e => e.stopPropagation()}>

        <button onClick={onClose} className="absolute top-3 right-3 text-on-surface-variant hover:text-on-surface">
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-widest px-2 py-0.5 rounded-full uppercase"
              style={{ background: 'rgba(68,226,205,0.1)', color: '#44e2cd', border: '1px solid rgba(68,226,205,0.2)' }}>
              {article.category}
            </span>
            <span className="text-xs text-on-surface-variant">{article.source} · {pub}</span>
          </div>
          <h2 className="text-lg font-bold font-headline leading-snug">{article.title_zh || article.title}</h2>
          {article.title_zh && (
            <p className="text-xs text-on-surface-variant mt-1">{article.title}</p>
          )}
        </div>

        {(article.content_zh || article.ai_summary || article.summary) && (
          <div className="rounded-lg p-4"
            style={{ background: 'rgba(68,226,205,0.05)', borderLeft: '3px solid rgba(68,226,205,0.4)' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="text-xs font-bold text-secondary uppercase tracking-widest">
                {article.content_zh ? '中文内容' : 'AI Summary'}
              </span>
            </div>
            <SummaryText text={article.content_zh || article.ai_summary || article.summary} />
          </div>
        )}

        {article.scraped_content && (
          <details className="group">
            <summary className="cursor-pointer text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1 select-none">
              <span className="material-symbols-outlined transition-transform group-open:rotate-90" style={{ fontSize: 14 }}>chevron_right</span>
              原文 (Original)
            </summary>
            <div className="mt-3 text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
              {article.scraped_content}
            </div>
          </details>
        )}

        <a href={article.link} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-on-primary hover:brightness-110 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
          Read Original
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
        </a>
      </div>
    </div>
  )
}
