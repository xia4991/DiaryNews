import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Field from '../components/ui/Field'

const KIND_ZH = { job: '招聘', realestate: '房产', secondhand: '二手' }
const KIND_COLORS = { job: '#2E7D5A', realestate: '#2B6CB0', secondhand: '#8B5CF6' }
const STATUS_ZH = { active: '在线', hidden: '隐藏', removed: '删除', expired: '过期' }
const STATUS_COLORS = { active: '#10B981', hidden: '#F59E0B', removed: '#EF4444', expired: '#6B7280' }

const LOG_TYPE_META = {
  news_fetch: { label: '新闻抓取', color: '#2B6CB0', icon: 'newspaper' },
  user_login: { label: '用户', color: '#10B981', icon: 'person' },
  brief_generate: { label: '简报', color: '#8B5CF6', icon: 'summarize' },
  listing_moderate: { label: '管理操作', color: '#F59E0B', icon: 'shield' },
  announcement_manage: { label: '公告', color: '#9D3D33', icon: 'campaign' },
}

const LOG_FILTERS = [
  { key: null, label: '全部' },
  { key: 'news_fetch', label: '新闻抓取' },
  { key: 'user_login', label: '用户' },
  { key: 'brief_generate', label: '简报' },
  { key: 'listing_moderate', label: '管理操作' },
  { key: 'announcement_manage', label: '公告' },
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
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [r, l, a] = await Promise.all([
        api.listReports({ limit: 50 }),
        api.listRecentListings({ limit: 20 }),
        api.listAdminAnnouncements({ limit: 20 }),
      ])
      setReports(r.items || [])
      setListings(l.items || [])
      setAnnouncements(a.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleStatus = async (listingId, status) => {
    await api.setListingStatus(listingId, status)
    await loadData()
  }

  const handleCreateAnnouncement = async (payload) => {
    await api.createAdminAnnouncement(payload)
    await loadData()
  }

  const handleUpdateAnnouncement = async (announcementId, payload) => {
    await api.updateAdminAnnouncement(announcementId, payload)
    await loadData()
  }

  const handleDeleteAnnouncement = async (announcementId) => {
    await api.deleteAdminAnnouncement(announcementId)
    await loadData()
  }

  const unresolvedCount = reports.length
  const activeAnnouncementCount = useMemo(
    () => announcements.filter((item) => item.status === 'active').length,
    [announcements]
  )

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
              variant={tab === 'announcements' ? 'primary' : 'ghost'}
              size="sm"
              icon="campaign"
              onClick={() => setTab('announcements')}
            >
              公告 {activeAnnouncementCount > 0 && `(${activeAnnouncementCount})`}
            </Button>
            <Button
              variant={tab === 'logs' ? 'primary' : 'ghost'}
              size="sm"
              icon="history"
              onClick={() => setTab('logs')}
            >
              系统日志
            </Button>
            <Button
              variant={tab === 'crawler' ? 'primary' : 'ghost'}
              size="sm"
              icon="rss_feed"
              onClick={() => setTab('crawler')}
            >
              爬虫
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
      ) : tab === 'announcements' ? (
        <AnnouncementsSection
          announcements={announcements}
          onCreate={handleCreateAnnouncement}
          onUpdate={handleUpdateAnnouncement}
          onDelete={handleDeleteAnnouncement}
        />
      ) : tab === 'crawler' ? (
        <CrawlerSection />
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

function AnnouncementEditorModal({ announcement, onSave, onClose }) {
  const [title, setTitle] = useState(announcement?.title || '')
  const [content, setContent] = useState(announcement?.content || '')
  const [isPinned, setIsPinned] = useState(Boolean(announcement?.is_pinned))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextTitle = title.trim()
    const nextContent = content.trim()
    if (!nextTitle) {
      setError('标题不能为空')
      return
    }
    if (!nextContent) {
      setError('正文不能为空')
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave({
        title: nextTitle,
        content: nextContent,
        is_pinned: isPinned,
      })
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title={announcement ? '编辑公告' : '发布公告'} size="md">
      <form onSubmit={handleSubmit} className="grid gap-4">
        <Field label="标题" required error={!title.trim() && error ? error : ''}>
          <input
            id="announcement-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：平台持续开发中，欢迎反馈问题"
          />
        </Field>

        <Field label="正文" required error={title.trim() && !content.trim() && error ? error : ''}>
          <textarea
            id="announcement-content"
            rows={7}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="写下你希望首页公告栏展示的内容。"
            className="resize-none"
          />
        </Field>

        <label className="inline-flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="h-4 w-4 rounded border border-border-strong"
          />
          置顶这条公告
        </label>

        {error && title.trim() && content.trim() ? (
          <p className="text-sm text-danger">{error}</p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="primary" icon="save" loading={saving}>
            {saving ? '保存中…' : '保存公告'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function AnnouncementsSection({ announcements, onCreate, onUpdate, onDelete }) {
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [creating, setCreating] = useState(false)
  const [workingId, setWorkingId] = useState(null)

  const handleCreate = async (payload) => {
    await onCreate(payload)
  }

  const handleUpdate = async (announcementId, payload) => {
    await onUpdate(announcementId, payload)
  }

  const handleStatusChange = async (announcementId, status) => {
    setWorkingId(announcementId)
    try {
      await onUpdate(announcementId, { status })
    } finally {
      setWorkingId(null)
    }
  }

  const handleTogglePin = async (announcement) => {
    setWorkingId(announcement.id)
    try {
      await onUpdate(announcement.id, { is_pinned: !announcement.is_pinned })
    } finally {
      setWorkingId(null)
    }
  }

  const handleDelete = async (announcementId) => {
    setWorkingId(announcementId)
    try {
      await onDelete(announcementId)
    } finally {
      setWorkingId(null)
    }
  }

  return (
    <div className="grid gap-3">
      {creating && (
        <AnnouncementEditorModal
          onSave={handleCreate}
          onClose={() => setCreating(false)}
        />
      )}
      {editingAnnouncement && (
        <AnnouncementEditorModal
          announcement={editingAnnouncement}
          onSave={(payload) => handleUpdate(editingAnnouncement.id, payload)}
          onClose={() => setEditingAnnouncement(null)}
        />
      )}

      <div className="flex items-center gap-2">
        <Badge color="#9D3D33">公告</Badge>
        <h2 className="text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
          平台公告
        </h2>
        <Button variant="primary" size="sm" icon="add" onClick={() => setCreating(true)} className="ml-auto">
          发布公告
        </Button>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>campaign</span>
          <p className="text-sm">还没有平台公告，发布后就可以接到首页。</p>
        </div>
      ) : (
        announcements.map((announcement) => {
          const statusColor = STATUS_COLORS[announcement.status] || '#6B7280'
          const busy = workingId === announcement.id
          return (
            <Card key={announcement.id} className="rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color="#9D3D33">公告</Badge>
                    {announcement.is_pinned ? (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: '#9D3D3318', color: '#9D3D33' }}>
                        置顶
                      </span>
                    ) : null}
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: `${statusColor}18`, color: statusColor }}
                    >
                      {STATUS_ZH[announcement.status] || announcement.status}
                    </span>
                    {busy ? (
                      <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 14 }}>progress_activity</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-lg font-bold text-text">{announcement.title}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-text-muted">
                    {announcement.content}
                  </p>
                  <p className="mt-3 text-xs text-text-subtle">
                    {announcement.creator_name || '管理员'} · 更新于 {announcement.updated_at?.slice(0, 16).replace('T', ' ')} · {timeAgo(announcement.updated_at)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <Button variant="ghost" size="sm" icon="edit" onClick={() => setEditingAnnouncement(announcement)}>
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={announcement.is_pinned ? 'keep_off' : 'keep'}
                    onClick={() => handleTogglePin(announcement)}
                  >
                    {announcement.is_pinned ? '取消置顶' : '置顶'}
                  </Button>
                  {announcement.status !== 'active' ? (
                    <Button variant="subtle" size="sm" icon="check_circle" onClick={() => handleStatusChange(announcement.id, 'active')}>
                      发布
                    </Button>
                  ) : (
                    <Button variant="subtle" size="sm" icon="visibility_off" onClick={() => handleStatusChange(announcement.id, 'hidden')}>
                      隐藏
                    </Button>
                  )}
                  {announcement.status !== 'removed' ? (
                    <Button variant="danger" size="sm" icon="delete" onClick={() => handleDelete(announcement.id)}>
                      删除
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}

const SOURCE_STATUS_META = {
  ok:          { label: '正常',    color: '#10B981', icon: 'check_circle' },
  partial_ok:  { label: '部分正常', color: '#F59E0B', icon: 'warning' },
  empty:       { label: '空',      color: '#6B7280', icon: 'inbox' },
  http_error:  { label: 'HTTP 错误', color: '#EF4444', icon: 'wifi_off' },
  parse_error: { label: '解析错误',  color: '#F59E0B', icon: 'broken_image' },
}

function CrawlerSection() {
  const [data, setData] = useState({ sources: [], stats: null })
  const [recent, setRecent] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [toast, setToast] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [health, recentResp] = await Promise.all([
        api.getSourceHealth(),
        api.listRecentArticles({ limit: 20, ...(statusFilter ? { status: statusFilter } : {}) }),
      ])
      setData({ sources: health.sources || [], stats: health.stats })
      setRecent(recentResp.items || [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { reload() }, [reload])

  const handleFetch = async () => {
    setBusy('fetch')
    setToast(null)
    try {
      const r = await api.collectNews()
      setToast({ type: 'ok', msg: `抓取完成：新增 ${r.new_count} 条` })
      await reload()
    } catch (e) {
      if (e.response?.status === 409) {
        setToast({ type: 'err', msg: '已有抓取任务正在运行' })
      } else {
        setToast({ type: 'err', msg: e.response?.data?.detail || '抓取失败' })
      }
    } finally {
      setBusy(null)
    }
  }

  const handleEnrich = async () => {
    setBusy('enrich')
    setToast(null)
    try {
      const r = await api.enrichNews({ max_retry: 20 })
      setToast({ type: 'ok', msg: `翻译完成：处理 ${r.retried_count} 条，成功 ${r.done_count} 条` })
      await reload()
    } catch (e) {
      if (e.response?.status === 409) {
        setToast({ type: 'err', msg: '已有翻译任务正在运行' })
      } else {
        setToast({ type: 'err', msg: e.response?.data?.detail || '翻译失败' })
      }
    } finally {
      setBusy(null)
    }
  }

  const stats = data.stats || { total: 0, pending: 0, done: 0, failed: 0, by_source: [] }
  const sourcesByName = useMemo(() => {
    const map = new Map()
    for (const s of data.sources || []) map.set(s.source, s)
    return map
  }, [data.sources])

  return (
    <div className="grid gap-4">
      {/* Header + actions */}
      <Card className="rounded-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge color="#2B6CB0">爬虫</Badge>
          <h2 className="text-xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
            爬虫状态
          </h2>
          <div className="ml-auto flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" icon="refresh" onClick={reload} loading={loading}>
              刷新
            </Button>
            <Button variant="subtle" size="sm" icon="translate" onClick={handleEnrich} loading={busy === 'enrich'}>
              重试翻译
            </Button>
            <Button variant="primary" size="sm" icon="cloud_download" onClick={handleFetch} loading={busy === 'fetch'}>
              立即抓取
            </Button>
          </div>
        </div>
        {toast && (
          <div
            className="mt-3 rounded-lg px-3 py-2 text-xs"
            style={{
              background: toast.type === 'ok' ? '#10B98118' : '#EF444418',
              color: toast.type === 'ok' ? '#10B981' : '#EF4444',
            }}
          >
            {toast.msg}
          </div>
        )}
      </Card>

      {/* Stats summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="文章总数" value={stats.total} color="#5E6478" icon="article" />
        <StatTile label="待翻译" value={stats.pending} color="#F59E0B" icon="hourglass_top" />
        <StatTile label="已翻译" value={stats.done} color="#10B981" icon="check_circle" />
        <StatTile label="翻译失败" value={stats.failed} color="#EF4444" icon="error" />
      </div>

      {/* Per-source health */}
      <div className="grid gap-3">
        <div className="flex items-center gap-2">
          <Badge color="#5E6478">9 个源</Badge>
          <h3 className="text-base font-bold text-text">数据源健康</h3>
        </div>
        {loading && data.sources.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 24 }}>progress_activity</span>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(stats.by_source || []).map((src) => {
              const health = sourcesByName.get(src.source)
              return <SourceHealthCard key={src.source} src={src} health={health} />
            })}
            {/* Show sources that have health entries but no articles yet */}
            {(data.sources || [])
              .filter((h) => !(stats.by_source || []).some((s) => s.source === h.source))
              .map((h) => (
                <SourceHealthCard
                  key={h.source}
                  src={{ source: h.source, total: 0, done: 0, pending: 0, failed: 0, with_image: 0, with_author: 0 }}
                  health={h}
                />
              ))}
          </div>
        )}
      </div>

      {/* Recent articles */}
      <div className="grid gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge color="#8B5CF6">最近</Badge>
          <h3 className="text-base font-bold text-text">最近抓取的文章</h3>
          <div className="ml-auto flex gap-1.5 flex-wrap">
            {[
              { k: '', label: '全部' },
              { k: 'pending', label: '待翻译' },
              { k: 'done', label: '已翻译' },
              { k: 'failed', label: '失败' },
            ].map((f) => (
              <button
                key={f.k || 'all'}
                onClick={() => setStatusFilter(f.k)}
                className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                style={{
                  background: statusFilter === f.k ? '#DC5050' : 'rgba(255,255,255,0.06)',
                  color: statusFilter === f.k ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
            <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 32 }}>inbox</span>
            <p className="text-xs">没有匹配的文章。</p>
          </div>
        ) : (
          <div className="grid gap-2">
            {recent.map((a) => <RecentArticleRow key={a.link} article={a} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({ label, value, color, icon }) {
  return (
    <Card className="rounded-2xl">
      <div className="flex items-center gap-3">
        <span
          className="material-symbols-outlined rounded-lg p-2"
          style={{ fontSize: 22, background: `${color}18`, color }}
        >
          {icon}
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-text-muted">{label}</span>
          <span className="text-2xl font-black text-text" style={{ fontFamily: 'var(--font-headline)' }}>
            {value?.toLocaleString() ?? '—'}
          </span>
        </div>
      </div>
    </Card>
  )
}

function SourceHealthCard({ src, health }) {
  const status = health?.last_status || 'unknown'
  const meta = SOURCE_STATUS_META[status] || { label: status || '未知', color: '#6B7280', icon: 'help' }
  const failures = health?.consecutive_failures || 0
  const isAlarming = failures >= 3

  return (
    <Card
      className="rounded-2xl"
      style={{ borderColor: isAlarming ? '#EF4444' : undefined, borderWidth: isAlarming ? 1 : undefined }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-text truncate">{src.source}</span>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold inline-flex items-center gap-0.5"
              style={{ background: `${meta.color}18`, color: meta.color }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{meta.icon}</span>
              {meta.label}
            </span>
            {failures > 0 && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: '#EF444418', color: '#EF4444' }}
                title="连续失败次数"
              >
                ×{failures}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-text-subtle">
            {health?.last_fetched_at
              ? `${timeAgo(health.last_fetched_at)} · ${health.last_duration_ms || 0}ms`
              : '尚未抓取'}
          </p>
          {health?.last_error && (
            <p className="mt-1 text-[11px] text-danger truncate" title={health.last_error}>
              {health.last_error}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <Stat k="文章数" v={src.total} />
        <Stat k="待翻译" v={src.pending} highlight={src.pending > 0 ? '#F59E0B' : undefined} />
        <Stat k="带配图" v={`${src.with_image}/${src.total || 0}`} />
        <Stat k="总抓取" v={health?.total_fetches || 0} />
      </div>
    </Card>
  )
}

function Stat({ k, v, highlight }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
      <span className="text-text-subtle">{k}</span>
      <span className="font-semibold" style={{ color: highlight || 'var(--color-text)' }}>{v ?? 0}</span>
    </div>
  )
}

function RecentArticleRow({ article }) {
  const status = article.enrichment_status || 'pending'
  const statusColor = status === 'done' ? '#10B981' : status === 'failed' ? '#EF4444' : '#F59E0B'
  const statusLabel = status === 'done' ? '已译' : status === 'failed' ? '失败' : '待译'
  return (
    <Card className="rounded-2xl">
      <div className="flex items-start gap-3">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt=""
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div
            className="h-14 w-14 shrink-0 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 22 }}>image</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color="#5E6478">{article.source}</Badge>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ background: `${statusColor}18`, color: statusColor }}
            >
              {statusLabel}
            </span>
            {article.rss_category && (
              <span className="text-[10px] text-text-subtle">{article.rss_category}</span>
            )}
            <span className="text-[10px] text-text-subtle ml-auto">
              {article.fetched_at ? timeAgo(article.fetched_at) : ''}
            </span>
          </div>
          <p className="mt-1 text-sm text-text leading-snug line-clamp-2">{article.title}</p>
          {article.title_zh && (
            <p className="mt-0.5 text-xs text-text-muted line-clamp-1">{article.title_zh}</p>
          )}
          {article.enrichment_error && (
            <p className="mt-1 text-[11px] text-danger truncate" title={article.enrichment_error}>
              翻译错误：{article.enrichment_error}
            </p>
          )}
          <div className="mt-1.5 flex gap-3 text-[10px] text-text-subtle flex-wrap">
            {article.author && <span>作者: {article.author}</span>}
            {article.tags_zh && <span style={{ color: '#ffb74d' }}>{article.tags_zh}</span>}
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-0.5 text-accent hover:underline"
            >
              原文
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>open_in_new</span>
            </a>
          </div>
        </div>
      </div>
    </Card>
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
