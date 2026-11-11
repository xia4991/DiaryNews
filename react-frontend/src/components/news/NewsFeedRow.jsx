import { memo, useState } from 'react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import StoryGroupBadge from './StoryGroupBadge'
import { CATEGORY_ZH } from '../../constants/categories'
import { categoryColor, TAG_COLOR } from '../../constants/colors'

// Short translated bodies read better in full than the one-line summary.
const INLINE_BODY_MAX_CHARS = 240

function rowText(article) {
  const content = (article.content_zh || '').trim()
  if (content && content.length <= INLINE_BODY_MAX_CHARS) return content
  return article.summary_zh || content || article.ai_summary || article.summary || ''
}

function formatTime(published) {
  const timestamp = Date.parse(published || '')
  if (Number.isNaN(timestamp)) return ''
  const date = new Date(timestamp)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function Thumbnail({ src, lead }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={
        lead
          ? 'aspect-[16/9] w-full rounded-xl object-cover sm:aspect-auto sm:h-44 sm:w-72 sm:shrink-0'
          : 'h-[72px] w-24 shrink-0 rounded-lg object-cover sm:h-24 sm:w-36'
      }
    />
  )
}

/**
 * One article as a wide, scannable row: tags, headline, a few lines of Chinese text,
 * meta line, and a thumbnail. `lead` enlarges it for the top story; `showDate` adds the
 * date to the meta line when the list is not grouped by day.
 */
function NewsFeedRow({ article, onClick, lead = false, showDate = false }) {
  const tags = (article.tags_zh || '').split(',').map((tag) => tag.trim()).filter(Boolean)
  const translated = Boolean(article.title_zh)
  const time = formatTime(article.published)
  const text = rowText(article)

  return (
    <Card
      as="article"
      interactive
      padding="none"
      onClick={() => onClick(article)}
      className={`group flex gap-4 p-4 sm:p-5 ${lead ? 'flex-col sm:flex-row-reverse' : ''}`}
    >
      {lead && <Thumbnail src={article.image_url} lead />}

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {lead && <Badge variant="pill" color="#9D3D33" icon="star">头条</Badge>}
          {tags.map((tag) => (
            <Badge key={tag} color={TAG_COLOR}>{tag}</Badge>
          ))}
          <Badge color={categoryColor(article.category)}>
            {CATEGORY_ZH[article.category] || article.category}
          </Badge>
          {!translated && <Badge variant="pill" color="#5E6478">未翻译</Badge>}
        </div>

        <h3
          className={`font-bold leading-snug text-text transition-colors group-hover:text-accent ${
            lead ? 'text-[1.25rem] sm:text-[1.45rem]' : 'line-clamp-2 text-[16px] sm:text-[17px]'
          }`}
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {article.title_zh || article.title}
        </h3>

        {text && (
          <p className={`mt-2 text-[14px] leading-6 text-text-muted ${lead ? 'line-clamp-5' : 'line-clamp-4'}`}>
            {text}
          </p>
        )}

        {article.relevance_reason && (
          <p className="mt-2 flex items-start gap-1 text-[12px] leading-5 text-accent">
            <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14, marginTop: 2 }}>push_pin</span>
            <span className="line-clamp-2">{article.relevance_reason}</span>
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-subtle">
          <span className="font-semibold text-text-muted">{article.source}</span>
          {showDate && <span className="tabular-nums">{article.published?.slice(0, 10)}</span>}
          {time && <span className="tabular-nums">{time}</span>}
          <span className="inline-flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
            {Number(article.view_count || 0)}
          </span>
          <StoryGroupBadge size={article.story_group_size} />
        </div>
      </div>

      {!lead && <Thumbnail src={article.image_url} />}
    </Card>
  )
}

export default memo(NewsFeedRow)
