import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

const KIND_ZH = { job: '招聘', realestate: '房产', secondhand: '二手' }
const KIND_COLORS = { job: '#2E7D5A', realestate: '#2B6CB0', secondhand: '#8B5CF6' }
const STATUS_ZH = { active: '在线', hidden: '隐藏', removed: '删除', expired: '过期' }
const STATUS_COLORS = { active: '#10B981', hidden: '#F59E0B', removed: '#EF4444', expired: '#6B7280' }

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
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 28 }}>progress_activity</span>
        </div>
      ) : tab === 'reports' ? (
        <ReportsSection reports={reports} onAction={handleStatus} />
      ) : (
        <RecentListingsSection listings={listings} onAction={handleStatus} />
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
          <Card key={l.id} className="rounded-2xl">
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
                </div>
                <p className="mt-2 font-bold text-text">{l.title}</p>
                <p className="mt-1 text-xs text-text-subtle">
                  {l.created_at?.slice(0, 10)} · {l.location || '无地点'} · ID: {l.id}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
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
    </div>
  )
}
