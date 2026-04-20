import { useMemo, useRef } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { presentBriefSummary, presentBriefTitle } from './dailyBriefPresentation'

function formatDateLabel(value) {
  if (!value) return '未标注日期'
  return value
}

function normalizeText(value) {
  return (value || '')
    .toLowerCase()
    .replace(/[\s，。、《》“”"'':：；？！,.!?()[\]{}【】—\-_/|]/g, '')
}

export default function DailyBriefDetailModal({
  brief,
  relatedArticles,
  onSelectArticle,
  initialScrollTop = 0,
  onClose,
}) {
  const contentRef = useRef(null)
  const linkedArticles = useMemo(() => {
    const bullets = brief?.bullets || []
    const usedLinks = new Set()

    return bullets.map((item, index) => {
      const normalizedBullet = normalizeText(item)
      let bestMatch = null
      let bestScore = 0

      relatedArticles.forEach((article) => {
        if (!article?.link || usedLinks.has(article.link)) return

        const normalizedTitleZh = normalizeText(article.title_zh)
        const normalizedTitle = normalizeText(article.title)
        let score = 0

        if (normalizedTitleZh && normalizedBullet.includes(normalizedTitleZh)) {
          score = Math.max(score, 40 + normalizedTitleZh.length)
        }
        if (normalizedTitle && normalizedBullet.includes(normalizedTitle)) {
          score = Math.max(score, 30 + normalizedTitle.length)
        }
        if (normalizedTitleZh && normalizedTitleZh.includes(normalizedBullet)) {
          score = Math.max(score, 20 + normalizedBullet.length)
        }
        if (normalizedTitle && normalizedTitle.includes(normalizedBullet)) {
          score = Math.max(score, 10 + normalizedBullet.length)
        }

        if (score > bestScore) {
          bestScore = score
          bestMatch = article
        }
      })

      const fallbackArticle = relatedArticles[index]
      const match = bestMatch || (fallbackArticle && !usedLinks.has(fallbackArticle.link) ? fallbackArticle : null)
      if (match?.link) usedLinks.add(match.link)
      return match
    })
  }, [brief?.bullets, relatedArticles])

  if (!brief) return null

  return (
    <Modal
      onClose={onClose}
      size="xl"
      title={presentBriefTitle(brief)}
      subtitle={`${formatDateLabel(brief.brief_date)} · ${brief.article_count || relatedArticles.length || 0} 条关联新闻`}
      contentRef={contentRef}
      initialScrollTop={initialScrollTop}
      className="max-w-4xl rounded-[28px]"
    >
      <div className="space-y-6">
        <div className="rounded-[24px] border border-[#E4D9C9] bg-[linear-gradient(135deg,#faf7f0_0%,#f4efe5_100%)] px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={brief.brief_type === 'china' ? '#9D3D33' : '#2B6CB0'}>
              {brief.brief_type === 'china' ? '华人关注日报' : '葡萄牙新闻日报'}
            </Badge>
            <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">{brief.brief_date}</span>
          </div>
          <p className="mt-4 text-[15px] leading-8 text-text">{presentBriefSummary(brief)}</p>
        </div>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>format_list_bulleted</span>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">当天回顾</span>
          </div>
          <div className="grid gap-3">
            {(brief.bullets || []).map((item, index) => (
              linkedArticles[index] ? (
                <button
                  key={`${index}-${item}`}
                  onClick={() => onSelectArticle(linkedArticles[index], contentRef.current?.scrollTop || 0)}
                  className="rounded-2xl border border-border bg-surface-muted px-4 py-4 text-left text-sm leading-7 text-text transition-colors hover:bg-surface"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="mr-2 font-black text-accent">{index + 1}.</span>
                      {item}
                    </div>
                    <span className="material-symbols-outlined shrink-0 text-text-subtle" style={{ fontSize: 18 }}>
                      arrow_outward
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                    点击继续阅读 · {linkedArticles[index].source || '对应新闻'}
                  </p>
                </button>
              ) : (
                <div
                  key={`${index}-${item}`}
                  className="rounded-2xl border border-border bg-surface-muted px-4 py-4 text-sm leading-7 text-text"
                >
                  <span className="mr-2 font-black text-accent">{index + 1}.</span>
                  {item}
                </div>
              )
            ))}
          </div>
        </section>

        {relatedArticles.length > 0 && (
          <section className="border-t border-border pt-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">关联新闻</p>
                <h3 className="mt-2 text-lg font-black text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                  当天文章
                </h3>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {relatedArticles.map((article) => (
                <button
                  key={article.link}
                  onClick={() => onSelectArticle(article, contentRef.current?.scrollTop || 0)}
                  className="rounded-2xl border border-border bg-surface px-4 py-4 text-left transition-colors hover:bg-bg-subtle"
                >
                  <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                    {article.source} · {article.published?.slice(0, 10)}
                  </p>
                  <p className="mt-2 text-sm font-bold leading-6 text-text">
                    {article.title_zh || article.title}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </Modal>
  )
}
