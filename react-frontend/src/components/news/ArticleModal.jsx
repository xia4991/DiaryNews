import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import SummaryText from '../SummaryText'
import { CATEGORY_ZH } from '../../constants/categories'
import { categoryColor, TAG_COLOR } from '../../constants/colors'

function formatViews(value) {
  return `${Number(value || 0)} 次`
}

export default function ArticleModal({ article, onClose, onBack }) {
  if (!article) return null
  const pub = article.published?.slice(0, 16).replace('T', ' ')
  const tags = article.tags_zh
    ? article.tags_zh.split(',').map(t => t.trim()).filter(Boolean)
    : []
  const summaryText = article.summary_zh || article.ai_summary || article.summary
  // Modal prefers the fuller content_zh; falls back only when no summary exists.
  const bodyText = article.content_zh || (!summaryText ? article.summary : '')
  const originalText = article.scraped_content || article.summary || ''

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
        <div className="relative rounded-[24px] border border-[#E4D9C9] bg-[linear-gradient(135deg,#faf7f0_0%,#f4efe5_100%)] px-4 pb-10 pt-4 sm:rounded-[26px] sm:px-6 sm:pb-11 sm:pt-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge color={categoryColor(article.category)}>
              {CATEGORY_ZH[article.category] || article.category}
            </Badge>
            {tags.map(tag => (
              <Badge key={tag} color={TAG_COLOR}>{tag}</Badge>
            ))}
          </div>

          <div className="min-w-0">
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

          <div className="absolute bottom-3 right-3 max-w-[calc(100%-1.5rem)] rounded-full border border-white/75 bg-white/68 px-2.5 py-1 text-[10px] font-semibold leading-4 text-text-subtle sm:bottom-4 sm:right-5 sm:px-3 sm:text-[11px]">
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5">
              <span className="max-w-[120px] truncate sm:max-w-[180px]">
                {article.source || '未标注'}
              </span>
              <span>-</span>
              <span>{pub || '暂无时间'}</span>
              <span>-</span>
              <span>{formatViews(article.view_count)}</span>
            </div>
          </div>
        </div>

        {summaryText && (
          <section>
            <div className="rounded-[22px] border border-[rgba(43,108,176,0.12)] bg-[#F4F8FC] px-4 py-4 sm:rounded-[24px] sm:px-6 sm:py-5">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="material-symbols-outlined text-[#2B6CB0]"
                  style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}
                >
                  subject
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#2B6CB0]">
                  摘要
                </span>
              </div>
              <div className="[&_div]:text-[15px] [&_div]:leading-7 sm:[&_div]:text-[16px] sm:[&_div]:leading-8 [&_p]:text-text">
                <SummaryText text={summaryText} />
              </div>
            </div>
          </section>
        )}

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
                  中文内容
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
