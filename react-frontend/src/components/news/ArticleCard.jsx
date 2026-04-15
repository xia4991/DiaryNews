const CATEGORY_COLORS = {
  'Tecnologia':    { bg: 'rgba(194,193,255,0.08)', text: '#c2c1ff', border: 'rgba(194,193,255,0.2)' },
  'Internacional': { bg: 'rgba(164,201,255,0.08)', text: '#a4c9ff', border: 'rgba(164,201,255,0.2)' },
  'Política':      { bg: 'rgba(68,226,205,0.08)',  text: '#44e2cd', border: 'rgba(68,226,205,0.2)' },
  'Economia':      { bg: 'rgba(68,226,205,0.08)',  text: '#44e2cd', border: 'rgba(68,226,205,0.2)' },
  'Desporto':      { bg: 'rgba(194,193,255,0.08)', text: '#c2c1ff', border: 'rgba(194,193,255,0.2)' },
  'default':       { bg: 'rgba(145,143,160,0.08)', text: '#918fa0', border: 'rgba(145,143,160,0.2)' },
}

export default function ArticleCard({ article, onClick }) {
  const pub = article.published?.slice(0, 10)
  const color = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.default

  return (
    <article onClick={() => onClick(article)}
      className="rounded-xl p-4 flex flex-col cursor-pointer group transition-all"
      style={{ background: '#131b2e', outline: '1px solid rgba(70,69,84,0.15)' }}
      onMouseEnter={e => e.currentTarget.style.background = '#1a2236'}
      onMouseLeave={e => e.currentTarget.style.background = '#131b2e'}>

      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
          {article.category}
        </span>
        <span className="text-xs text-on-surface-variant">{pub}</span>
      </div>

      <h3 className="text-sm font-bold mb-2 leading-snug group-hover:text-secondary transition-colors line-clamp-2">
        {article.title_zh || article.title}
      </h3>

      <p className="text-on-surface-variant text-xs line-clamp-2 mb-3 flex-1">
        {article.content_zh || article.ai_summary || article.summary}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">{article.source}</span>
        <span className="text-secondary text-xs font-bold uppercase tracking-wider">Read →</span>
      </div>
    </article>
  )
}
