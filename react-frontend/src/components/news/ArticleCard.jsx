import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { CATEGORY_ZH } from '../../constants/categories'
import { categoryColor, TAG_COLOR } from '../../constants/colors'

export default function ArticleCard({ article, onClick }) {
  const pub = article.published?.slice(0, 10)
  const tags = article.tags_zh
    ? article.tags_zh.split(',').map(t => t.trim()).filter(Boolean)
    : []

  return (
    <Card
      as="article"
      interactive
      padding="md"
      onClick={() => onClick(article)}
      className="flex flex-col group"
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <Badge color={categoryColor(article.category)}>
          {CATEGORY_ZH[article.category] || article.category}
        </Badge>
        {tags.map(tag => (
          <Badge key={tag} color={TAG_COLOR}>{tag}</Badge>
        ))}
        <span className="text-[11px] text-text-subtle ml-auto tabular-nums">{pub}</span>
      </div>

      <h3
        className="text-[15px] font-bold text-text leading-snug line-clamp-2 mb-2 group-hover:text-accent transition-colors"
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {article.title_zh || article.title}
      </h3>

      <p className="text-[13px] text-text-muted line-clamp-2 mb-3 flex-1">
        {article.content_zh || article.ai_summary || article.summary}
      </p>

      <div className="mt-auto flex items-center justify-between">
        <span className="text-[11px] text-text-subtle">{article.source}</span>
        <span className="text-[11px] font-semibold text-accent tracking-wider">阅读 →</span>
      </div>
    </Card>
  )
}
