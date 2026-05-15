import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import SummaryText from '../SummaryText'
import { CATEGORY_ZH } from '../../constants/categories'
import { categoryColor, TAG_COLOR } from '../../constants/colors'

function estimateReadMinutes(text) {
  const plain = (text || '').replace(/\s+/g, '')
  if (!plain) return null
  return Math.max(1, Math.round(plain.length / 700))
}

function formatViews(value) {
  return `${Number(value || 0)} 次`
}

export default function ArticleModal({ article, onClose, onBack }) {
  if (!article) return null
  const pub = article.published?.slice(0, 16).replace('T', ' ')
  const tags = article.tags_zh
    ? article.tags_zh.split(',').map(t => t.trim()).filter(Boolean)
    : []
  // Modal prefers the fuller content_zh; falls back to summary_zh, then legacy fields.
  const bodyText = article.content_zh || article.summary_zh || article.ai_summary || article.summary
  const originalText = article.scraped_content || article.summary || ''
  const readMinutes = estimateReadMinutes(originalText || bodyText)

  return (
    <Modal
      onClose={onClose}
      size="xl"
      className="max-w-4xl rounded-[28px]"
      headerLeading={onBack ? (
        <Button variant="ghost" size="sm" icon="arrow_back" onClick={onBack}>
          返回每日回顾
        </Button>
      ) : null}
    >
      <div className="flex flex-col gap-7">
        <div className="rounded-[24px] border border-[#E4D9C9] bg-[linear-gradient(135deg,#faf7f0_0%,#f4efe5_100%)] px-4 py-4 sm:rounded-[26px] sm:px-6 sm:py-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge color={categoryColor(article.category)}>
              {CATEGORY_ZH[article.category] || article.category}
            </Badge>
            {tags.map(tag => (
              <Badge key={tag} color={TAG_COLOR}>{tag}</Badge>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_210px] lg:items-start">
            <div>
              <h2
                className="text-[1.45rem] font-black leading-[1.22] text-text sm:text-[2.15rem]"
                style={{ fontFamily: 'var(--font-headline)' }}
              >
                {article.title_zh || article.title}
              </h2>

              {article.title_zh && (
                <p className="mt-3 text-[14px] leading-6 text-text-subtle sm:mt-4 sm:text-[15px] sm:leading-7" lang="pt-PT">
                  {article.title}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-2 lg:gap-3">
              <div className="rounded-2xl border border-white/75 bg-white/72 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle">来源</p>
                <p className="mt-2 text-sm font-semibold text-text">{article.source || '未标注'}</p>
              </div>
              <div className="rounded-2xl border border-white/75 bg-white/72 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle">发布时间</p>
                <p className="mt-2 text-sm font-semibold text-text">{pub || '暂无时间'}</p>
              </div>
              <div className="rounded-2xl border border-white/75 bg-white/72 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle">阅读</p>
                <p className="mt-2 text-sm font-semibold text-text">{readMinutes ? `${readMinutes} 分钟` : '短文'}</p>
              </div>
              <div className="rounded-2xl border border-white/75 bg-white/72 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-subtle">阅读量</p>
                <p className="mt-2 text-sm font-semibold text-text">{formatViews(article.view_count)}</p>
              </div>
            </div>
          </div>
        </div>

        {bodyText && (
          <section>
            <div className="rounded-[22px] border border-[rgba(157,61,51,0.10)] bg-accent-subtle/72 px-4 py-4 sm:rounded-[24px] sm:px-6 sm:py-6">
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="material-symbols-outlined text-accent"
                  style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                >
                  auto_awesome
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  {article.content_zh ? '中文内容' : '中文摘要'}
                </span>
              </div>
              <p className="mb-4 text-sm leading-7 text-text-muted">
                先快速看中文整理，再往下阅读原文细节。
              </p>
              <div className="[&_div]:text-[15px] [&_div]:leading-7 sm:[&_div]:text-[16px] sm:[&_div]:leading-8 [&_p]:text-text">
                <SummaryText text={bodyText} />
              </div>
            </div>
          </section>
        )}

        {originalText && (
          <section className="border-t border-[#E4D9C9] pt-7">
            <div className="rounded-[22px] border border-[#E3DDD3] bg-white/82 px-4 py-4 sm:rounded-[24px] sm:px-6 sm:py-6">
              <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 18 }}>
                    article
                  </span>
                  <span className="text-sm font-black uppercase tracking-[0.18em] text-text">
                    原文
                  </span>
                </div>
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-text transition-colors hover:border-border-strong hover:bg-bg-subtle sm:w-auto sm:justify-center sm:py-1.5"
                >
                  查看原文链接
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                </a>
              </div>
              <p className="mb-4 text-sm leading-7 text-text-muted">
                保留原始正文，方便对照语气、细节和上下文。
              </p>
              <div
                className="whitespace-pre-wrap text-[14px] leading-7 text-text sm:text-[15px] sm:leading-8"
                lang="pt-PT"
              >
                {originalText}
              </div>
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}
