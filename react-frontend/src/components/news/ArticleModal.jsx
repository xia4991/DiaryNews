import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import SummaryText from '../SummaryText'
import { CATEGORY_ZH } from '../../constants/categories'
import { categoryColor, TAG_COLOR } from '../../constants/colors'

export default function ArticleModal({ article, onClose }) {
  if (!article) return null
  const pub = article.published?.slice(0, 16).replace('T', ' ')
  const tags = article.tags_zh
    ? article.tags_zh.split(',').map(t => t.trim()).filter(Boolean)
    : []
  const bodyText = article.content_zh || article.ai_summary || article.summary

  return (
    <Modal onClose={onClose} size="lg">
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge color={categoryColor(article.category)}>
              {CATEGORY_ZH[article.category] || article.category}
            </Badge>
            {tags.map(tag => (
              <Badge key={tag} color={TAG_COLOR}>{tag}</Badge>
            ))}
            <span className="text-[11px] text-text-subtle ml-auto">
              {article.source} · {pub}
            </span>
          </div>
          <h2
            className="text-xl font-bold text-text leading-snug"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            {article.title_zh || article.title}
          </h2>
          {article.title_zh && (
            <p className="text-xs text-text-subtle mt-1" lang="pt-PT">{article.title}</p>
          )}
        </div>

        {bodyText && (
          <div className="rounded-lg p-4 bg-accent-subtle border-l-4 border-accent">
            <div className="flex items-center gap-1.5 mb-2">
              <span
                className="material-symbols-outlined text-accent"
                style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <span className="text-[10px] font-bold text-accent uppercase tracking-widest">
                {article.content_zh ? '中文内容' : 'AI Summary'}
              </span>
            </div>
            <SummaryText text={bodyText} />
          </div>
        )}

        {article.scraped_content && (
          <details className="group">
            <summary className="cursor-pointer text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1 select-none hover:text-text">
              <span
                className="material-symbols-outlined transition-transform group-open:rotate-90"
                style={{ fontSize: 14 }}
              >
                chevron_right
              </span>
              原文
            </summary>
            <div
              className="mt-3 text-xs text-text-muted leading-relaxed whitespace-pre-wrap"
              lang="pt-PT"
            >
              {article.scraped_content}
            </div>
          </details>
        )}

        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold bg-accent text-text-onaccent hover:bg-accent-hover transition-colors"
        >
          查看原文
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
        </a>
      </div>
    </Modal>
  )
}
