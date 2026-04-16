import { CATEGORY_ZH, CATEGORY_COLORS } from '../../constants/categories'

export default function ArticleCard({ article, onClick }) {
  const pub = article.published?.slice(0, 10)
  const color = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.default

  return (
    <article onClick={() => onClick(article)}
      className="rounded-xl p-4 flex flex-col cursor-pointer group transition-all"
      style={{ background: '#131b2e', outline: '1px solid rgba(70,69,84,0.15)' }}
      onMouseEnter={e => e.currentTarget.style.background = '#1a2236'}
      onMouseLeave={e => e.currentTarget.style.background = '#131b2e'}>

      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
          style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
          {CATEGORY_ZH[article.category] || article.category}
        </span>
        {article.tags_zh && article.tags_zh.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
          <span key={tag} className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,183,77,0.08)', color: '#ffb74d', border: '1px solid rgba(255,183,77,0.2)' }}>
            {tag}
          </span>
        ))}
        <span className="text-xs text-on-surface-variant ml-auto">{pub}</span>
      </div>

      <h3 className="text-sm font-bold mb-2 leading-snug group-hover:text-secondary transition-colors line-clamp-2">
        {article.title_zh || article.title}
      </h3>

      <p className="text-on-surface-variant text-xs line-clamp-2 mb-3 flex-1">
        {article.content_zh || article.ai_summary || article.summary}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">{article.source}</span>
        <span className="text-secondary text-xs font-bold tracking-wider">阅读 →</span>
      </div>
    </article>
  )
}
