import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import Card from '../ui/Card'
import Button from '../ui/Button'

const RANGES = [
  { days: 1, label: '今天' },
  { days: 7, label: '7 天' },
  { days: 30, label: '30 天' },
  { days: 90, label: '90 天' },
]
const EVENT_ZH = {
  pageview: '进站',
  tab: '切换栏目',
  article_open: '打开文章',
  outbound: '外链点击',
}
const DEVICE_ZH = { mobile: '手机', desktop: '电脑', tablet: '平板', unknown: '未知' }
const EVENTS_PAGE_SIZE = 50
const INPUT_CLASS =
  'bg-surface border border-border-strong rounded-lg px-3 py-1.5 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent'

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['zh-CN'], { type: 'region' })
  } catch {
    return null
  }
})()

function countryName(code) {
  if (!code) return ''
  try {
    return regionNames?.of(code) || code
  } catch {
    return code
  }
}

function formatTime(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso || ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatNumber(n) {
  return Number(n || 0).toLocaleString('zh-CN')
}

function shortDate(iso) {
  return iso ? `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}` : ''
}

function SectionTitle({ children, hint }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h3 className="text-[15px] font-bold text-text" style={{ fontFamily: 'var(--font-headline)' }}>{children}</h3>
      {hint && <span className="text-[12px] text-text-subtle">{hint}</span>}
    </div>
  )
}

function Metric({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <div className="text-[12px] text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-black tabular-nums text-text" style={{ fontFamily: 'var(--font-headline)' }}>
        {formatNumber(value)}
      </div>
      {sub && <div className="mt-0.5 text-[12px] text-text-subtle">{sub}</div>}
    </div>
  )
}

// Daily page views as thin single-hue bars; hover/focus a day for its full breakdown.
function DailyChart({ daily }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...daily.map((d) => d.page_views))
  const labelEvery = daily.length > 31 ? 14 : daily.length > 14 ? 5 : 1
  const shown = active != null ? daily[active] : null

  return (
    <div>
      <div className="mb-2 h-10 text-[12px] leading-5 text-text-muted" aria-live="polite">
        {shown ? (
          <>
            <span className="font-semibold text-text">{shown.date}</span>
            {' · '}访问量 <b className="tabular-nums text-text">{shown.page_views}</b>
            {' · '}独立 IP <b className="tabular-nums text-text">{shown.unique_ips}</b>
            {' · '}访客 <b className="tabular-nums text-text">{shown.unique_visitors}</b>
            {' · '}打开文章 <b className="tabular-nums text-text">{shown.article_opens}</b>
          </>
        ) : (
          <span>鼠标移到柱子上查看当天明细</span>
        )}
      </div>
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span className="pointer-events-none absolute right-0 -top-4 text-[11px] tabular-nums text-text-subtle">{max}</span>
        <div className="flex h-40 items-end gap-[2px] border-b border-border-strong" onMouseLeave={() => setActive(null)}>
          {daily.map((d, i) => (
            <button
              key={d.date}
              type="button"
              aria-label={`${d.date} 访问量 ${d.page_views}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="group flex h-full min-w-0 flex-1 items-end focus:outline-none"
            >
              <span
                className={`mx-auto block w-full max-w-9 rounded-t-[4px] transition-colors ${
                  active === i ? 'bg-accent-hover' : 'bg-accent'
                } ${d.page_views === 0 ? 'opacity-0' : ''}`}
                style={{ height: `${(d.page_views / max) * 100}%`, minHeight: d.page_views ? 2 : 0 }}
              />
            </button>
          ))}
        </div>
        <div className="mt-1 flex gap-[2px]">
          {daily.map((d, i) => (
            <span key={d.date} className="min-w-0 flex-1 text-center text-[10px] tabular-nums text-text-subtle">
              {i % labelEvery === 0 || i === daily.length - 1 ? shortDate(d.date) : ''}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-[12px] text-text-muted">
        <summary className="cursor-pointer select-none">按天查看表格</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-text-subtle">
              <tr><th className="py-1 pr-3 font-medium">日期</th><th className="pr-3 font-medium">访问量</th><th className="pr-3 font-medium">独立 IP</th><th className="pr-3 font-medium">访客</th><th className="font-medium">打开文章</th></tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.date} className="border-t border-border text-text">
                  <td className="py-1 pr-3">{d.date}</td><td className="pr-3">{d.page_views}</td><td className="pr-3">{d.unique_ips}</td><td className="pr-3">{d.unique_visitors}</td><td>{d.article_opens}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}

// Ranked list with a thin magnitude bar under each label.
function RankList({ title, hint, rows, empty = '暂无数据' }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <Card padding="md">
      <SectionTitle hint={hint}>{title}</SectionTitle>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-[13px] text-text-subtle">{empty}</p>
      ) : (
        <ol className="grid gap-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate text-text" title={r.title || r.label}>
                  {r.href ? (
                    <a href={r.href} target="_blank" rel="noopener noreferrer" className="hover:text-accent">{r.label}</a>
                  ) : r.label}
                  {r.meta && <span className="ml-1.5 text-[11px] text-text-subtle">{r.meta}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-text-muted">
                  {formatNumber(r.value)}
                  {r.secondary != null && <span className="ml-1 text-[11px] text-text-subtle">/ {r.secondary} IP</span>}
                </span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-bg-subtle">
                <div className="h-1 rounded-full bg-accent" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function UserLabel({ user }) {
  if (!user) return <span className="text-text-subtle">访客</span>
  return <span className="text-text" title={user.email}>{user.name || user.email}</span>
}

function TopIpsTable({ rows, onPick }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 pt-4">
        <SectionTitle hint="点 IP 查看它的访问明细">访问最多的 IP</SectionTitle>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-[13px] text-text-subtle">暂无数据</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-bg-subtle text-[12px] text-text-muted">
              <tr>
                <th className="px-5 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">地区</th>
                <th className="px-3 py-2 font-medium">设备</th>
                <th className="px-3 py-2 text-right font-medium">事件</th>
                <th className="px-3 py-2 text-right font-medium">页面</th>
                <th className="px-3 py-2 text-right font-medium">文章</th>
                <th className="px-3 py-2 font-medium">账号</th>
                <th className="px-5 py-2 font-medium">最近访问</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ip} className="border-t border-border">
                  <td className="px-5 py-2">
                    <button type="button" onClick={() => onPick(r.ip)} className="font-mono text-[12px] text-accent hover:underline">
                      {r.ip}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-text-muted">{countryName(r.country) || '—'}</td>
                  <td className="px-3 py-2 text-text-muted">{DEVICE_ZH[r.device] || r.device || '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.events}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.page_views}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.article_opens}</td>
                  <td className="px-3 py-2">
                    {r.users.length ? r.users.map((u) => <div key={u.email}><UserLabel user={u} /></div>) : <UserLabel />}
                  </td>
                  <td className="px-5 py-2 tabular-nums text-text-muted">{formatTime(r.last_seen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// Remembers which request a response belongs to, so "loading" is derived (response
// key !== current key) instead of being toggled inside the effect.
function useKeyedFetch(params, fetcher, empty) {
  const key = JSON.stringify(params)
  const [result, setResult] = useState({ key: null, data: empty, error: '' })

  useEffect(() => {
    let cancelled = false
    fetcher(JSON.parse(key))
      .then((data) => { if (!cancelled) setResult({ key, data, error: '' }) })
      .catch((err) => {
        if (!cancelled) setResult({ key, data: empty, error: err.response?.data?.detail || '加载失败' })
      })
    return () => { cancelled = true }
  }, [key, fetcher, empty])

  return { data: result.data, error: result.error, loading: result.key !== key }
}

const EMPTY_EVENTS = { items: [], total: 0 }

function EventLog({ ipFilter, onIpFilter, includeAdmin, includeBots }) {
  const [eventType, setEventType] = useState('')
  // Page is remembered per filter combination, so changing a filter starts at page 1.
  const filterKey = `${ipFilter}|${eventType}|${includeAdmin}|${includeBots}`
  const [pageState, setPageState] = useState({ filterKey, page: 0 })
  const page = pageState.filterKey === filterKey ? pageState.page : 0
  const setPage = (next) => setPageState({ filterKey, page: next })

  const { data, loading } = useKeyedFetch(
    {
      limit: EVENTS_PAGE_SIZE,
      offset: page * EVENTS_PAGE_SIZE,
      ip: ipFilter || undefined,
      event_type: eventType || undefined,
      include_admin: includeAdmin,
      include_bots: includeBots,
    },
    api.listAnalyticsEvents,
    EMPTY_EVENTS,
  )

  const pages = Math.max(1, Math.ceil(data.total / EVENTS_PAGE_SIZE))

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3">
        <h3 className="mr-auto text-[15px] font-bold text-text" style={{ fontFamily: 'var(--font-headline)' }}>
          访问明细 <span className="ml-1 text-[12px] font-normal text-text-subtle">保留期内共 {formatNumber(data.total)} 条，最新在前</span>
        </h3>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); onIpFilter(String(new FormData(e.currentTarget).get('ip') || '').trim()) }}
        >
          {/* Keyed on the active filter so clicking an IP elsewhere refills the box. */}
          <input
            key={ipFilter}
            name="ip"
            defaultValue={ipFilter}
            placeholder="按 IP 筛选"
            aria-label="按 IP 筛选"
            className={`${INPUT_CLASS} w-40`}
          />
          {ipFilter && (
            <Button variant="ghost" size="sm" onClick={() => onIpFilter('')}>清除</Button>
          )}
        </form>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          aria-label="事件类型"
          className={INPUT_CLASS}
        >
          <option value="">全部类型</option>
          {Object.entries(EVENT_ZH).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-[13px]">
          <thead className="bg-bg-subtle text-[12px] text-text-muted">
            <tr>
              <th className="px-5 py-2 font-medium">时间</th>
              <th className="px-3 py-2 font-medium">类型</th>
              <th className="px-3 py-2 font-medium">IP</th>
              <th className="px-3 py-2 font-medium">地区 / 设备</th>
              <th className="px-3 py-2 font-medium">栏目</th>
              <th className="px-3 py-2 font-medium">内容 / 来源</th>
              <th className="px-5 py-2 font-medium">账号</th>
            </tr>
          </thead>
          <tbody className={loading ? 'opacity-50' : ''}>
            {data.items.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-text-subtle">暂无访问记录</td></tr>
            )}
            {data.items.map((e) => {
              const content = e.event_type === 'pageview'
                ? (e.referrer ? `来自 ${e.referrer}` : '直接访问')
                : (e.title || e.target)
              return (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-5 py-2 tabular-nums text-text-muted">{formatTime(e.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    {EVENT_ZH[e.event_type] || e.event_type}
                    {e.is_bot ? <span className="ml-1 text-[11px] text-text-subtle">(爬虫)</span> : null}
                    {e.is_admin ? <span className="ml-1 text-[11px] text-text-subtle">(管理员)</span> : null}
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" onClick={() => onIpFilter(e.ip)} className="font-mono text-[12px] text-accent hover:underline">
                      {e.ip}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-muted" title={e.user_agent}>
                    {[countryName(e.country), DEVICE_ZH[e.device] || e.device].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-text-muted">{e.page || '—'}</td>
                  <td className="max-w-[320px] px-3 py-2">
                    {e.target && /^https?:\/\//i.test(e.target) ? (
                      <a href={e.target} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-text hover:text-accent" title={e.target}>
                        {content}
                      </a>
                    ) : (
                      <span className="line-clamp-2 text-text-muted" title={content}>{content}</span>
                    )}
                  </td>
                  <td className="px-5 py-2"><UserLabel user={e.user} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 text-[12px] text-text-muted">
          <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="tabular-nums">{page + 1} / {pages}</span>
          <Button variant="ghost" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      )}
    </Card>
  )
}

export default function AnalyticsSection() {
  const [days, setDays] = useState(7)
  const [includeAdmin, setIncludeAdmin] = useState(false)
  const [includeBots, setIncludeBots] = useState(false)
  const [ipFilter, setIpFilter] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // `refresh` only changes the key to force a refetch; the API ignores unknown params.
  const { data: summary, loading, error } = useKeyedFetch(
    { days, include_admin: includeAdmin, include_bots: includeBots, refresh: refreshKey },
    api.getAnalyticsSummary,
    null,
  )

  const lists = useMemo(() => {
    if (!summary) return null
    return {
      pages: summary.top_pages.map((p) => ({ key: p.page, label: p.page, value: p.views, secondary: p.unique_ips })),
      articles: summary.top_articles.map((a) => ({
        key: a.link, label: a.title, href: a.link, meta: a.source, value: a.opens, secondary: a.unique_ips,
      })),
      referrers: summary.top_referrers.map((r) => ({ key: r.source, label: r.source, value: r.visits })),
      outbound: summary.top_outbound.map((o) => ({ key: o.url, label: o.title || o.url, title: o.url, href: o.url, value: o.clicks })),
      devices: summary.devices.map((d) => ({ key: d.device, label: DEVICE_ZH[d.device] || d.device, value: d.visitors })),
      countries: summary.countries.map((c) => ({ key: c.country, label: countryName(c.country), value: c.visitors })),
    }
  }, [summary])

  const pickIp = (ip) => {
    setIpFilter(ip)
    requestAnimationFrame(() => document.getElementById('analytics-event-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const totals = summary?.totals
  const today = summary?.today
  const sub = (key) => (days > 1 && today ? `今天 ${formatNumber(today[key])}` : null)

  return (
    // grid-cols-1 = minmax(0,1fr): lets the wide tables scroll inside their cards
    // instead of stretching the page on phones.
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <Card padding="md">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border-strong p-0.5" role="group" aria-label="时间范围">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                aria-pressed={days === r.days}
                onClick={() => setDays(r.days)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  days === r.days ? 'bg-accent text-text-onaccent' : 'text-text-muted hover:bg-bg-subtle'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <label className="ml-1 inline-flex items-center gap-1.5 text-[13px] text-text-muted">
            <input type="checkbox" checked={includeAdmin} onChange={(e) => setIncludeAdmin(e.target.checked)} />
            包含管理员
          </label>
          <label className="inline-flex items-center gap-1.5 text-[13px] text-text-muted">
            <input type="checkbox" checked={includeBots} onChange={(e) => setIncludeBots(e.target.checked)} />
            包含爬虫
          </label>
          <Button variant="ghost" size="sm" icon="refresh" className="ml-auto" loading={loading} onClick={() => setRefreshKey((k) => k + 1)}>
            刷新
          </Button>
        </div>
        <p className="mt-2 text-[12px] leading-5 text-text-subtle">
          按葡萄牙时间统计。访问量 = 进站 + 切换栏目；访客按浏览器会话区分（同一 IP 下的不同人会分开算）。数据保留 90 天。
        </p>
      </Card>

      {error && <p className="text-sm text-danger">{error}</p>}

      {summary && totals && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Metric label="访问量" value={totals.page_views} sub={sub('page_views')} />
            <Metric label="独立 IP" value={totals.unique_ips} sub={sub('unique_ips')} />
            <Metric label="访客" value={totals.unique_visitors} sub={sub('unique_visitors')} />
            <Metric label="打开文章" value={totals.article_opens} sub={sub('article_opens')} />
            <Metric label="外链点击" value={totals.outbound_clicks} sub={sub('outbound_clicks')} />
            <Metric label="登录用户" value={totals.logged_in_users} sub={sub('logged_in_users')} />
          </div>

          {days > 1 && (
            <Card padding="md">
              <SectionTitle hint={`最近 ${days} 天`}>每日访问量</SectionTitle>
              <DailyChart daily={summary.daily} />
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RankList title="热门栏目" hint="访问量 / 独立 IP" rows={lists.pages} />
            <RankList title="热门文章" hint="打开次数 / 独立 IP" rows={lists.articles} />
            <RankList title="访问来源" hint="进站次数" rows={lists.referrers} />
            <RankList title="外链点击" hint="阅读原文、推广链接" rows={lists.outbound} empty="还没有人点外部链接" />
            <RankList title="设备" hint="访客数" rows={lists.devices} />
            <RankList title="国家 / 地区" hint="访客数（来自 Cloudflare）" rows={lists.countries} empty="本地访问没有地区信息" />
          </div>

          <TopIpsTable rows={summary.top_ips} onPick={pickIp} />
        </>
      )}

      <div id="analytics-event-log" className="scroll-mt-4">
        <EventLog
          key={refreshKey}
          ipFilter={ipFilter}
          onIpFilter={setIpFilter}
          includeAdmin={includeAdmin}
          includeBots={includeBots}
        />
      </div>
    </div>
  )
}
