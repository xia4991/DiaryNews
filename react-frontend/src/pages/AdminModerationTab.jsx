import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'

const KIND_ZH = { job: '招聘', realestate: '房产', secondhand: '二手' }
const KIND_COLORS = { job: '#2E7D5A', realestate: '#2B6CB0', secondhand: '#8B5CF6' }
const STATUS_ZH = { active: '在线', hidden: '隐藏', removed: '删除', expired: '过期' }
const STATUS_COLORS = { active: '#10B981', hidden: '#F59E0B', removed: '#EF4444', expired: '#6B7280' }

const LOG_TYPE_META = {
  news_fetch: { label: '新闻抓取', color: '#2B6CB0', icon: 'newspaper' },
  user_login: { label: '用户', color: '#10B981', icon: 'person' },
  brief_generate: { label: '简报', color: '#8B5CF6', icon: 'summarize' },
  listing_moderate: { label: '管理操作', color: '#F59E0B', icon: 'shield' },
}

const LOG_FILTERS = [
  { key: null, label: '全部' },
  { key: 'news_fetch', label: '新闻抓取' },
  { key: 'user_login', label: '用户' },
  { key: 'brief_generate', label: '简报' },
  { key: 'listing_moderate', label: '管理操作' },
]

function timeAgo(isoStr) {
  if (!isoStr) return ''
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

export default function AdminModerationTab() {
  const [tab, setTab] = useState('reports')
  const [reports, setReports] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [r, l] = await Promise.all([
        api.listReports({ limit: 50 }),
        api.listRecentListings({ limit: 20 }),
      ])
      setReports(r.items || [])
      setListings(l.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleStatus = async (listingId, status) => {
    await api.setListingStatus(listingId, status)
    await loadData()
  }

  const unresolvedCount = reports.length

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden rounded-[30px] border-[#E6D6D6] bg-[linear-gradient(135deg,#fcf5f5_0%,#f8eeee_100%)] p-0 shadow-[0_24px_56px_rgba(220,80,80,0.08)]">
        <div className="px-6 py-6 sm:px-7 sm:py-7">
          <Badge color="#DC5050">Admin</Badge>
          <h1
            className="mt-4 text-3xl font-black tracking-tight text-text sm:text-4xl"
            style={{ fontFamily: 'var(--font-headline)' }}
          >
            内容管理
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-[15px]">
            审核用户举报和管理平台上的信息发布。
          </p>

          <div className="mt-6 flex gap-2">
            <Button
              variant={tab === 'reports' ? 'primary' : 'ghost'}
              size="sm"
              icon="flag"
              onClick={() => setTab('reports')}
            >
              举报 {unresolvedCount > 0 && `(${unresolvedCount})`}
            </Button>
            <Button
              variant={tab === 'recent' ? 'primary' : 'ghost'}
              size="sm"
              icon="list"
              onClick={() => setTab('recent')}
            >
              最近发布
            </Button>
            <Button
              variant={tab === 'logs' ? 'primary' : 'ghost'}
              size="sm"
              icon="history"
              onClick={() => setTab('logs')}
            >
              系统日志
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 28 }}>progress_activity</span>
        </div>
      ) : tab === 'reports' ? (
        <ReportsSection reports={reports} onAction={handleStatus} />
      ) : tab === 'recent' ? (
        <RecentListingsSection listings={listings} onAction={handleStatus} />
      ) : (
        <LogsSection />
      )}
    </div>
  )
}

function ReportsSection({ reports, onAction }) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
        <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>verified</span>
        <p className="text-sm">没有待处理的举报。</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Badge color="#DC5050">待处理</Badge>
        <h2 className="text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
          举报列表
        </h2>
      </div>
      {reports.map(r => (
        <Card key={r.id} className="rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={KIND_COLORS[r.listing_kind] || '#6B7280'}>
                  {KIND_ZH[r.listing_kind] || r.listing_kind}
                </Badge>
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{ background: `${STATUS_COLORS[r.listing_status]}18`, color: STATUS_COLORS[r.listing_status] }}
                >
                  {STATUS_ZH[r.listing_status]}
                </span>
              </div>
              <p className="mt-2 font-bold text-text">{r.listing_title}</p>
              <p className="mt-1 text-xs text-text-muted">
                举报原因: <span className="text-text">{r.reason}</span>
              </p>
              <p className="mt-1 text-xs text-text-subtle">
                {r.created_at?.slice(0, 10)} · 信息ID: {r.listing_id}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => onAction(r.listing_id, 'active')}>
                保留
              </Button>
              <Button variant="subtle" size="sm" icon="visibility_off" onClick={() => onAction(r.listing_id, 'hidden')}>
                隐藏
              </Button>
              <Button variant="danger" size="sm" icon="delete" onClick={() => onAction(r.listing_id, 'removed')}>
                删除
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

function RecentListingsSection({ listings, onAction }) {
  const [detail, setDetail] = useState(null)
  const [loadingId, setLoadingId] = useState(null)

  const openDetail = async (id) => {
    setLoadingId(id)
    try {
      const data = await api.getAdminListing(id)
      setDetail(data)
    } finally {
      setLoadingId(null)
    }
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
        <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>inbox</span>
        <p className="text-sm">暂无信息发布。</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Badge color="#5E6478">全部</Badge>
        <h2 className="text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
          最近发布
        </h2>
      </div>
      {listings.map(l => {
        const statusColor = STATUS_COLORS[l.status] || '#6B7280'
        return (
          <Card
            key={l.id}
            className="rounded-2xl cursor-pointer transition-colors hover:ring-1 hover:ring-accent/30"
            onClick={() => openDetail(l.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color={KIND_COLORS[l.kind] || '#6B7280'}>
                    {KIND_ZH[l.kind] || l.kind}
                  </Badge>
                  <span
                    className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ background: `${statusColor}18`, color: statusColor }}
                  >
                    {STATUS_ZH[l.status]}
                  </span>
                  {loadingId === l.id && (
                    <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 14 }}>progress_activity</span>
                  )}
                </div>
                <p className="mt-2 font-bold text-text">{l.title}</p>
                <p className="mt-1 text-xs text-text-subtle">
                  {l.created_at?.slice(0, 10)} · {l.location || '无地点'} · ID: {l.id}
                </p>
              </div>
              <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                {l.status !== 'active' && (
                  <Button variant="ghost" size="sm" icon="check_circle" onClick={() => onAction(l.id, 'active')}>
                    恢复
                  </Button>
                )}
                {l.status !== 'hidden' && (
                  <Button variant="subtle" size="sm" icon="visibility_off" onClick={() => onAction(l.id, 'hidden')}>
                    隐藏
                  </Button>
                )}
                {l.status !== 'removed' && (
                  <Button variant="danger" size="sm" icon="delete" onClick={() => onAction(l.id, 'removed')}>
                    删除
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )
      })}

      {detail && <ListingDetailModal listing={detail} onClose={() => setDetail(null)} onAction={onAction} />}
    </div>
  )
}

const KIND_DETAIL_FIELDS = {
  job: (l) => [
    l.industry && { label: '行业', value: l.industry },
    l.salary_range && { label: '薪资', value: l.salary_range },
  ].filter(Boolean),
  realestate: (l) => [
    l.deal_type && { label: '类型', value: l.deal_type === 'rent' ? '出租' : '出售' },
    l.price_cents != null && { label: '价格', value: `€${(l.price_cents / 100).toLocaleString()}` },
    l.rooms != null && { label: '房间', value: `${l.rooms}` },
    l.bathrooms != null && { label: '卫浴', value: `${l.bathrooms}` },
    l.area_m2 != null && { label: '面积', value: `${l.area_m2} m²` },
    l.furnished && { label: '家具', value: '有' },
  ].filter(Boolean),
  secondhand: (l) => [
    l.category && { label: '分类', value: l.category },
    l.condition && { label: '状况', value: l.condition },
    l.price_cents != null && { label: '价格', value: `€${(l.price_cents / 100).toLocaleString()}` },
  ].filter(Boolean),
}

function ListingDetailModal({ listing, onClose, onAction }) {
  const l = listing
  const statusColor = STATUS_COLORS[l.status] || '#6B7280'
  const kindFields = (KIND_DETAIL_FIELDS[l.kind] || (() => []))(l)
  const images = l.images || []

  const contactLinks = [
    l.contact_phone && { icon: 'call', label: l.contact_phone, href: `tel:${l.contact_phone.replace(/\s+/g, '')}` },
    l.contact_whatsapp && { icon: 'chat', label: `WhatsApp: ${l.contact_whatsapp}`, href: `https://wa.me/${l.contact_whatsapp.replace(/[^\d+]/g, '')}`, external: true },
    l.contact_email && { icon: 'mail', label: l.contact_email, href: `mailto:${l.contact_email}` },
  ].filter(Boolean)

  const handleAction = async (status) => {
    await onAction(l.id, status)
    onClose()
  }

  return (
    <Modal onClose={onClose} size="lg" hideClose>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color={KIND_COLORS[l.kind] || '#6B7280'}>{KIND_ZH[l.kind] || l.kind}</Badge>
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: `${statusColor}18`, color: statusColor }}
              >
                {STATUS_ZH[l.status]}
              </span>
            </div>
            <h2 className="text-lg font-bold text-text leading-snug" style={{ fontFamily: 'var(--font-headline)' }}>
              {l.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text p-1 -mr-1 -mt-1 rounded hover:bg-bg-subtle transition-colors shrink-0"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-4 text-xs">
          {l.location && (
            <div className="flex items-center gap-1 text-text-muted">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
              <span>{l.location}</span>
            </div>
          )}
          <div className="flex items-center gap-1 text-text-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
            <span>{l.created_at?.slice(0, 10)}</span>
          </div>
          <span className="text-text-subtle">ID: {l.id}</span>
        </div>

        {kindFields.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {kindFields.map((f, i) => (
              <div key={i} className="rounded-lg px-3 py-1.5 text-xs" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <span className="text-text-subtle">{f.label}: </span>
                <span className="font-semibold text-text">{f.value}</span>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <img
                key={i}
                src={img.thumb_url || img.thumb_key}
                alt=""
                className="h-24 w-24 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        )}

        {l.description && (
          <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">{l.description}</div>
        )}

        {contactLinks.length > 0 && (
          <div className="flex flex-col gap-2 pt-3 border-t border-border">
            <div className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">联系方式</div>
            {contactLinks.map((c, i) => (
              <a
                key={i}
                href={c.href}
                target={c.external ? '_blank' : undefined}
                rel={c.external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text bg-surface-muted hover:bg-bg-subtle transition-colors"
              >
                <span className="material-symbols-outlined text-accent" style={{ fontSize: 16 }}>{c.icon}</span>
                <span>{c.label}</span>
              </a>
            ))}
          </div>
        )}

        {l.source_url && (
          <div className="pt-2 border-t border-border">
            <a
              href={l.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
              原始链接
            </a>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border">
          {l.status !== 'active' && (
            <Button variant="ghost" size="sm" icon="check_circle" onClick={() => handleAction('active')}>恢复</Button>
          )}
          {l.status !== 'hidden' && (
            <Button variant="subtle" size="sm" icon="visibility_off" onClick={() => handleAction('hidden')}>隐藏</Button>
          )}
          {l.status !== 'removed' && (
            <Button variant="danger" size="sm" icon="delete" onClick={() => handleAction('removed')}>删除</Button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function LogsSection() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState(null)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const loadLogs = useCallback(async (eventType, off) => {
    setLoading(true)
    try {
      const params = { limit, offset: off }
      if (eventType) params.event_type = eventType
      const data = await api.listAdminLogs(params)
      if (off === 0) {
        setLogs(data.items || [])
      } else {
        setLogs(prev => [...prev, ...(data.items || [])])
      }
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setOffset(0)
    loadLogs(filter, 0)
  }, [filter, loadLogs])

  const handleLoadMore = () => {
    const next = offset + limit
    setOffset(next)
    loadLogs(filter, next)
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge color="#5E6478">日志</Badge>
        <h2 className="text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
          系统日志
        </h2>
        <span className="text-xs text-text-muted ml-auto">共 {total} 条</span>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {LOG_FILTERS.map(f => (
          <button
            key={f.key ?? 'all'}
            onClick={() => setFilter(f.key)}
            className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
            style={{
              background: filter === f.key ? '#DC5050' : 'rgba(255,255,255,0.06)',
              color: filter === f.key ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 28 }}>progress_activity</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>receipt_long</span>
          <p className="text-sm">暂无日志记录。</p>
        </div>
      ) : (
        <>
          {logs.map(log => {
            const meta = LOG_TYPE_META[log.event_type] || { label: log.event_type, color: '#6B7280', icon: 'info' }
            const details = log.details || {}
            return (
              <Card key={log.id} className="rounded-2xl">
                <div className="flex items-start gap-3">
                  <span
                    className="material-symbols-outlined mt-0.5 shrink-0 rounded-lg p-1.5"
                    style={{ fontSize: 20, background: `${meta.color}18`, color: meta.color }}
                  >
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge color={meta.color}>{meta.label}</Badge>
                      <span className="text-[11px] text-text-subtle ml-auto shrink-0">{timeAgo(log.created_at)}</span>
                    </div>
                    <p className="mt-1.5 text-sm text-text">{log.message}</p>
                    {Object.keys(details).length > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {Object.entries(details).map(([k, v]) => (
                          <span
                            key={k}
                            className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}
                          >
                            {k}: {typeof v === 'boolean' ? (v ? '是' : '否') : v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
          {logs.length < total && (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="mx-auto rounded-full px-6 py-2 text-sm font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--color-text-muted)' }}
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
