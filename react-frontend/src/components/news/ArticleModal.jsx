import { useState } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import StoryGroupBadge from './StoryGroupBadge'
import SummaryText from '../SummaryText'
import { CATEGORY_ZH } from '../../constants/categories'
import { categoryColor, TAG_COLOR } from '../../constants/colors'
import { useShowViewCounts } from '../../siteSettings'
import { api } from '../../api'

function formatPublished(published) {
  const timestamp = Date.parse(published || '')
  if (Number.isNaN(timestamp)) return (published || '').slice(0, 16).replace('T', ' ')
  const date = new Date(timestamp)
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function HeroImage({ src }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      src={src}
      alt=""
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="mt-6 aspect-[16/9] max-h-[320px] w-full rounded-2xl bg-bg-subtle object-cover"
    />
  )
}

// Prose sizing for SummaryText output (it renders a flex column of p / ul).
const PROSE = '[&>div]:gap-4 [&>div]:text-[16px] [&>div]:leading-8 [&>div]:text-text sm:[&>div]:text-[17px] sm:[&>div]:leading-[1.95]'

/**
 * Article reading view: headline, meta, image, then the Chinese text as plain prose.
 * The Portuguese original sits behind a toggle; the source link stays in the footer.
 */
export default function ArticleModal({ article, onClose, onBack }) {
  const [showOriginal, setShowOriginal] = useState(false)
  const showViews = useShowViewCounts()
  if (!article) return null

  const tags = (article.tags_zh || '').split(',').map((tag) => tag.trim()).filter(Boolean)
  const translated = Boolean(article.title_zh || article.content_zh)
  const body = (article.content_zh || '').trim()
  const summary = (article.summary_zh || article.ai_summary || '').trim()
  // The lede only earns its place when it adds something the body does not already say.
  const lede = summary && !(body && body.includes(summary.replace(/[。.]$/, ''))) ? summary : ''
  const originalText = (article.scraped_content || article.summary || '').trim()
  const published = formatPublished(article.published)

  return (
    <Modal
      onClose={onClose}
      size="xl"
      className="max-w-3xl rounded-[24px]"
      headerLeading={onBack ? (
        <Button variant="ghost" size="sm" icon="arrow_back" onClick={onBack}>
          返回每日回顾
        </Button>
      ) : null}
      footer={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 truncate text-xs text-text-subtle">
            来源：{article.source || '未标注'}
          </span>
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => api.track('outbound', { target: article.link, title: article.title_zh || article.title })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-text-onaccent transition-colors hover:bg-accent-hover"
          >
            阅读原文
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
          </a>
        </div>
      )}
    >
      <article className="mx-auto max-w-[680px] pb-4 sm:px-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {tags.map((tag) => (
            <Badge key={tag} color={TAG_COLOR}>{tag}</Badge>
          ))}
          <Badge color={categoryColor(article.category)}>
            {CATEGORY_ZH[article.category] || article.category}
          </Badge>
          <StoryGroupBadge size={article.story_group_size} />
        </div>

        <h2
          className="mt-3 text-[1.5rem] font-black leading-[1.3] tracking-tight text-text sm:text-[2rem]"
          style={{ fontFamily: 'var(--font-headline)' }}
          lang={article.title_zh ? undefined : 'pt-PT'}
        >
          {article.title_zh || article.title}
        </h2>

        {article.title_zh && (
          <p className="mt-2 text-[14px] leading-6 text-text-subtle" lang="pt-PT">
            {article.title}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-2.5 text-[13px] text-text-muted">
          <span className="font-semibold text-text">{article.source || '未标注'}</span>
          {article.author && <span className="max-w-[200px] truncate">{article.author}</span>}
          {published && <span className="tabular-nums">{published}</span>}
          {showViews && (
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 15 }}>visibility</span>
              {Number(article.view_count || 0)} 次阅读
            </span>
          )}
        </div>

        {article.story_group_size > 1 && article.story_group_sources?.length > 0 && (
          <p className="mt-3 text-[13px] leading-5 text-text-subtle">
            <span className="font-semibold text-text-muted">也被报道：</span>
            {article.story_group_sources.join(' · ')}
          </p>
        )}

        <HeroImage src={article.image_url} />

        {lede && (
          <p className="mt-6 border-l-[3px] border-accent pl-4 text-[17px] font-semibold leading-8 text-text sm:text-[18px]">
            {lede}
          </p>
        )}

        {article.relevance_reason && (
          <div className="mt-6 flex items-start gap-2 rounded-xl bg-[rgba(194,91,69,0.07)] px-4 py-3">
            <span
              className="material-symbols-outlined shrink-0"
              style={{ fontSize: 18, marginTop: 4, color: TAG_COLOR, fontVariationSettings: "'FILL' 1" }}
            >
              push_pin
            </span>
            <p className="text-[15px] leading-7 text-text">
              <span className="font-bold" style={{ color: TAG_COLOR }}>与华人相关：</span>
              {article.relevance_reason}
            </p>
          </div>
        )}

        {body ? (
          <div className={`mt-6 ${PROSE}`}>
            <SummaryText text={body} />
          </div>
        ) : !translated && (
          <p className="mt-6 rounded-xl bg-surface-muted px-4 py-3 text-sm leading-6 text-text-muted">
            这篇新闻还没有中文翻译，下面是葡语原文。
          </p>
        )}

        {originalText && (
          <section className="mt-8 border-t border-border pt-5">
            {translated ? (
              <button
                type="button"
                onClick={() => setShowOriginal((value) => !value)}
                aria-expanded={showOriginal}
                className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted transition-colors hover:text-text"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showOriginal ? 'expand_less' : 'expand_more'}
                </span>
                {showOriginal ? '收起葡语原文' : '对照葡语原文'}
              </button>
            ) : (
              <p className="text-sm font-semibold text-text-muted">葡语原文</p>
            )}
            {(showOriginal || !translated) && (
              <div
                className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-text-muted"
                lang="pt-PT"
              >
                {originalText}
              </div>
            )}
          </section>
        )}
      </article>
    </Modal>
  )
}
