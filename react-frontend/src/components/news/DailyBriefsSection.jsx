import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import {
  presentBriefSummary,
  presentBriefTitle,
  presentLeadBadge,
} from './dailyBriefPresentation'

function toneForType(type) {
  if (type === 'china') {
    return {
      accent: '#9D3D33',
      gradient: 'linear-gradient(135deg,#fff8ef_0%,#f5ead9_100%)',
      border: '#E2D2BF',
      label: '每日回顾',
    }
  }
  return {
    accent: '#2B6CB0',
    gradient: 'linear-gradient(135deg,#f7fbff_0%,#eef4fb_100%)',
    border: '#D8E2EF',
    label: 'Daily Brief',
  }
}

function formatDateLabel(value) {
  return value || '未标注日期'
}

export default function DailyBriefsSection({
  briefType,
  briefs,
  loading,
  isAdmin = false,
  onSelectBrief,
  onGenerateClick,
  compact = false,
}) {
  const tone = toneForType(briefType)
  const [leadBrief, ...history] = briefs

  if (loading) {
    return (
      <Card className="rounded-[28px] border-white/80 bg-white/92">
        <p className="text-sm text-text-muted">正在加载每日回顾…</p>
      </Card>
    )
  }

  if (!briefs.length) {
    if (!isAdmin) return null
    return (
      <Card className="rounded-[28px] border-dashed border-border-strong bg-surface-muted">
        <div className={`flex flex-col gap-4 ${compact ? '' : 'md:flex-row md:items-center md:justify-between'}`}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">每日回顾</p>
            <h2 className="mt-2 text-xl font-black text-text" style={{ fontFamily: 'var(--font-headline)' }}>
              还没有已生成的日报
            </h2>
            <p className="mt-2 text-sm leading-7 text-text-muted">
              当前页面还没有可展示的历史日报。你可以先选一个日期生成，生成后这里就会出现最近几天的回顾卡片。
            </p>
          </div>
          <Button icon="edit_calendar" onClick={onGenerateClick}>生成日报</Button>
        </div>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_46px_rgba(58,44,31,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge color={tone.accent}>{tone.label}</Badge>
          {isAdmin && (
            <Button variant="ghost" size="sm" icon="edit_calendar" onClick={onGenerateClick}>
              生成日报
            </Button>
          )}
        </div>
        <h2
          className="mt-3 text-xl font-black tracking-tight text-text"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          最近几天回顾
        </h2>

        <button
          onClick={() => onSelectBrief(leadBrief)}
          className="mt-4 block w-full rounded-2xl border border-border bg-surface-muted px-4 py-4 text-left transition-colors hover:bg-surface"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
              {formatDateLabel(leadBrief.brief_date)}
            </span>
            <span className="text-[11px] text-text-subtle">·</span>
            <span className="text-[11px] text-text-subtle">{leadBrief.article_count} 条新闻</span>
          </div>
          <p className="mt-2 text-sm font-bold leading-6 text-text">{presentBriefTitle(leadBrief)}</p>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-text-muted">{presentBriefSummary(leadBrief)}</p>
        </button>

        {history.length > 0 && (
          <div className="mt-4 grid gap-3">
            {history.slice(0, 4).map((brief) => (
              <button
                key={`${brief.brief_type}-${brief.brief_date}`}
                onClick={() => onSelectBrief(brief)}
                className="rounded-2xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-bg-subtle"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                    {formatDateLabel(brief.brief_date)}
                  </span>
                  <span className="text-[11px] text-text-subtle">·</span>
                  <span className="text-[11px] text-text-subtle">{brief.article_count} 条</span>
                </div>
                <p className="mt-1 text-sm font-bold leading-6 text-text">{presentBriefTitle(brief)}</p>
              </button>
            ))}
          </div>
        )}
      </Card>
    )
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Badge color={tone.accent}>{tone.label}</Badge>
          <h2
            className="mt-3 text-[1.75rem] font-black tracking-tight text-text"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            最近几天回顾
          </h2>
          <p className="mt-2 text-sm leading-7 text-text-muted">
            不用把历史新闻一条条翻回去，先看每天的回顾，再决定要不要展开当天原始新闻。
          </p>
        </div>
        {isAdmin && (
          <Button variant="ghost" size="sm" icon="edit_calendar" onClick={onGenerateClick}>
            生成日报
          </Button>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card
          className="rounded-[30px] p-0 shadow-[0_24px_56px_rgba(58,44,31,0.10)]"
          style={{ background: tone.gradient, borderColor: tone.border }}
        >
          <button
            onClick={() => onSelectBrief(leadBrief)}
            className="block w-full px-5 py-5 text-left sm:px-6 sm:py-6"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={tone.accent}>{presentLeadBadge(leadBrief.brief_date, briefType)}</Badge>
              <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                {formatDateLabel(leadBrief.brief_date)}
              </span>
            </div>
            <h3
              className="mt-4 text-[1.5rem] font-black leading-tight tracking-tight text-text sm:text-[1.9rem]"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {presentBriefTitle(leadBrief)}
            </h3>
            <p className="mt-4 line-clamp-4 text-sm leading-7 text-text-muted">
              {presentBriefSummary(leadBrief)}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold text-text-subtle">
              <span>{leadBrief.article_count} 条关联新闻</span>
              <span>{(leadBrief.bullets || []).length} 条回顾</span>
            </div>
          </button>
        </Card>

        <div className="grid gap-3">
          {history.map((brief) => (
            <button
              key={`${brief.brief_type}-${brief.brief_date}`}
              onClick={() => onSelectBrief(brief)}
              className="rounded-[24px] border border-border bg-white px-4 py-4 text-left shadow-card transition-colors hover:bg-bg-subtle"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                  {formatDateLabel(brief.brief_date)}
                </span>
                <span className="text-[11px] text-text-subtle">·</span>
                <span className="text-[11px] text-text-subtle">{brief.article_count} 条新闻</span>
              </div>
              <h4 className="mt-2 text-sm font-bold leading-6 text-text">{presentBriefTitle(brief)}</h4>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-text-muted">{presentBriefSummary(brief)}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
