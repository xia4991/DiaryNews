import { useEffect, useState } from 'react'
import { api } from '../../api'
import Card from '../ui/Card'

const DATE_ROWS = 3
const DAY_MS = 24 * 60 * 60 * 1000

const pad = (value) => String(value).padStart(2, '0')

function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// Calendar-day difference between two YYYY-MM-DD keys (DST-safe: both parsed as UTC midnights).
function dayDiff(fromKey, toKey) {
  const toUtc = (key) => {
    const [y, m, d] = key.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / DAY_MS)
}

function formatDay(key, todayKey) {
  const [y, m, d] = key.split('-').map(Number)
  const sameYear = key.slice(0, 4) === todayKey.slice(0, 4)
  return sameYear ? `${m}月${d}日` : `${y}年${m}月${d}日`
}

function countdownLabel(diff) {
  if (diff < 0) return '已过'
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  return `还有 ${diff} 天`
}

function formatUpdated(iso) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/** Upcoming dates first; if there are fewer than DATE_ROWS, fill in with the latest past ones. */
function pickDates(dates, todayKey) {
  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = sorted.filter((d) => d.date >= todayKey)
  const past = sorted.filter((d) => d.date < todayKey)
  const shown = upcoming.slice(0, DATE_ROWS)
  const fill = DATE_ROWS - shown.length
  const rows = [...(fill > 0 ? past.slice(-fill) : []), ...shown]
  const nextKey = upcoming[0] ? `${upcoming[0].date}|${upcoming[0].label}` : ''
  return rows.map((d) => {
    const diff = dayDiff(todayKey, d.date)
    return { ...d, diff, isNext: `${d.date}|${d.label}` === nextKey }
  })
}

function TopicCard({ topic, todayKey, onArticleOpen, wide = false, className = '' }) {
  const dates = pickDates(topic.dates || [], todayKey)
  const link = /^https?:\/\//i.test(topic.link_url || '') ? topic.link_url : ''
  const updated = formatUpdated(topic.updated_at)
  const hasFacts = dates.length > 0 || topic.points?.length > 0
  const split = wide && hasFacts && topic.news?.length > 0

  return (
    <Card as="article" padding="none" className={`flex min-w-0 flex-col ${className}`}>
      <header className="border-b border-border px-4 py-3 sm:px-5">
        <h3 className="text-[17px] font-bold leading-6 text-text">{topic.title}</h3>
        {topic.status_text && (
          <p className="mt-1.5 inline-block rounded-md bg-accent-subtle px-2 py-0.5 text-[13px] font-semibold leading-5 text-accent">
            {topic.status_text}
          </p>
        )}
      </header>

      {/* With one or two topics the cards are wide: dates + points left, news right. */}
      <div className={`grid flex-1 content-start gap-4 px-4 py-3.5 sm:px-5 ${split ? 'xl:grid-cols-2 xl:gap-6' : ''}`}>
        {hasFacts && (
        <div className="grid content-start gap-4">
        {dates.length > 0 && (
          <ul className="grid gap-1.5">
            {dates.map((d) => (
              <li
                key={`${d.date}-${d.label}`}
                className={`flex items-baseline gap-3 text-[13px] leading-5 ${d.diff < 0 ? 'text-text-subtle' : 'text-text'}`}
              >
                <time dateTime={d.date} className="min-w-[4.5rem] shrink-0 whitespace-nowrap font-semibold tabular-nums">
                  {formatDay(d.date, todayKey)}
                </time>
                <span className="min-w-0 flex-1">{d.label}</span>
                <span className={`shrink-0 text-xs tabular-nums ${d.isNext ? 'font-semibold text-accent' : 'text-text-subtle'}`}>
                  {countdownLabel(d.diff)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {topic.points?.length > 0 && (
          <ul className="grid list-disc gap-1 pl-4 text-[13px] leading-6 text-text-muted marker:text-text-subtle">
            {topic.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        )}
        </div>
        )}

        {topic.news?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-text-subtle">相关新闻</p>
            <ul className="mt-1 grid">
              {topic.news.map((article) => (
                <li key={article.link}>
                  <button
                    type="button"
                    onClick={() => onArticleOpen(article)}
                    className="w-full py-1 text-left text-[13px] leading-5 text-text transition-colors hover:text-accent"
                  >
                    {article.title_zh || article.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {(link || updated) && (
        <footer className="flex items-center gap-3 border-t border-border px-4 py-2.5 text-xs text-text-subtle sm:px-5">
          {updated && <span>更新于 {updated}</span>}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 font-semibold text-accent transition-colors hover:text-accent-hover"
            >
              {topic.link_label || '了解详情'}
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
            </a>
          )}
        </footer>
      )}
    </Card>
  )
}

const DESKTOP_COLS = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-2 lg:grid-cols-3' }

/**
 * Admin-maintained focus topics pinned to the top of the home page. From `md` up the
 * topics sit side by side; below that a tab row shows one at a time so the lead story
 * is not pushed far down. Renders nothing when there are no active topics.
 */
export default function FocusTopics({ onArticleOpen }) {
  const [topics, setTopics] = useState([])
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    let cancelled = false
    api.listFocusTopics()
      .then((data) => { if (!cancelled) setTopics(data?.items || []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (topics.length === 0) return null

  const todayKey = localDayKey()
  const current = topics.find((t) => t.id === activeId) || topics[0]
  const multiple = topics.length > 1

  return (
    <section aria-labelledby="focus-topics-heading" className="grid gap-3">
      <h2 id="focus-topics-heading" className="text-[15px] font-bold text-text">重点关注</h2>

      {multiple && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 md:hidden">
          {topics.map((topic) => {
            const selected = topic.id === current.id
            return (
              <button
                key={topic.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setActiveId(topic.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  selected
                    ? 'border-accent bg-accent text-text-onaccent'
                    : 'border-border-strong bg-surface text-text-muted hover:text-text'
                }`}
              >
                {topic.title}
              </button>
            )
          })}
        </div>
      )}

      <div className={`grid gap-4 ${DESKTOP_COLS[Math.min(topics.length, 3)]}`}>
        {topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            todayKey={todayKey}
            onArticleOpen={onArticleOpen}
            wide={topics.length <= 2}
            className={topic.id === current.id ? '' : 'hidden md:flex'}
          />
        ))}
      </div>
    </section>
  )
}
