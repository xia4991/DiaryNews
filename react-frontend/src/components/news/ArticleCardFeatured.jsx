import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { CATEGORY_ZH } from '../../constants/categories'
import { categoryColor, TAG_COLOR } from '../../constants/colors'

function formatViews(value) {
  return `${Number(value || 0)} 次阅读`
}

export default function ArticleCardFeatured({ article, onClick }) {
  if (!article) return null
  const pub = article.published?.slice(0, 10)
  const tags = article.tags_zh
    ? article.tags_zh.split(',').map(t => t.trim()).filter(Boolean)
    : []

  return (
    <Card
      as="article"
      interactive
      padding="lg"
      onClick={() => onClick(article)}
      className="md:col-span-2 flex flex-col justify-between min-h-[14rem] group"
    >
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge color={categoryColor(article.category)}>
          {CATEGORY_ZH[article.category] || article.category}
        </Badge>
        {tags.map(tag => (
          <Badge key={tag} color={TAG_COLOR}>{tag}</Badge>
        ))}
        <span className="inline-flex items-center gap-1 text-[11px] text-text-subtle ml-auto tabular-nums">
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>schedule</span>
          {pub}
        </span>
      </div>

      <h2
        className="text-2xl sm:text-[28px] font-extrabold text-text tracking-tight leading-[1.2] line-clamp-2 mb-2 group-hover:text-accent transition-colors"
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {article.title_zh || article.title}
      </h2>

      <p className="text-sm text-text-muted line-clamp-2 max-w-2xl">
        {article.content_zh || article.ai_summary || article.summary}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold bg-accent-subtle text-accent">
            {article.source?.[0]}
          </div>
          <span className="text-xs font-semibold text-text-muted">{article.source}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-text-subtle">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
          {formatViews(article.view_count)}
        </span>
      </div>
    </Card>
  )
}
