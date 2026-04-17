import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import RealEstateCard from '../components/listings/RealEstateCard'
import RealEstateDetailModal from '../components/listings/RealEstateDetailModal'
import RealEstateFormModal from '../components/listings/RealEstateFormModal'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { DEAL_TYPE_ZH, DEAL_TYPE_COLORS, formatPrice } from '../constants/realestate'

export default function RealEstateTab({ activeDealType, activeRooms, onCountsChange, onLoginRequired }) {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [formMode, setFormMode] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.listRealEstate({ limit: 100 })
      setListings(d.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!onCountsChange) return
    const counts = {}
    for (const l of listings) counts[l.deal_type] = (counts[l.deal_type] || 0) + 1
    onCountsChange(counts)
  }, [listings, onCountsChange])

  let filtered = listings
  if (activeDealType && activeDealType !== 'All') {
    filtered = filtered.filter(l => l.deal_type === activeDealType)
  }
  if (activeRooms && activeRooms !== 'All') {
    filtered = filtered.filter(l => l.rooms >= parseInt(activeRooms, 10))
  }

  const featured = filtered.slice(0, 2)
  const browse = filtered.slice(2)
  const activeCount = listings.filter(l => l.status === 'active').length
  const newest = listings[0] || null

  const handleCreateClick = () => {
    if (!user) { onLoginRequired?.(); return }
    setFormMode('new')
  }

  const handleSave = async (payload) => {
    if (formMode === 'new') {
      const created = await api.createRealEstate(payload)
      setListings(prev => [created, ...prev])
    } else {
      const updated = await api.updateRealEstate(formMode.listing.id, payload)
      setListings(prev => prev.map(l => l.id === updated.id ? updated : l))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }

  const handleDelete = async () => {
    const id = selected.id
    await api.deleteRealEstate(id)
    setListings(prev => prev.filter(l => l.id !== id))
    setSelected(null)
  }

  const canManage = (listing) =>
    Boolean(user && (user.id === listing.owner_id || user.is_admin))

  const dealSummary = Object.entries(
    listings.reduce((acc, l) => { acc[l.deal_type] = (acc[l.deal_type] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <>
      {selected && (
        <RealEstateDetailModal
          listing={selected}
          canManage={canManage(selected)}
          onEdit={() => { setFormMode({ listing: selected }); setSelected(null) }}
          onDelete={handleDelete}
          onClose={() => setSelected(null)}
        />
      )}

      {formMode && (
        <RealEstateFormModal
          listing={formMode === 'new' ? null : formMode.listing}
          onSave={handleSave}
          onClose={() => setFormMode(null)}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined animate-spin text-accent" style={{ fontSize: 28 }}>progress_activity</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>home_work</span>
          <p className="text-sm">
            {listings.length === 0 ? '还没有房产信息，来发布第一条吧！' : '该筛选条件下暂无房产'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          <Card className="overflow-hidden rounded-[30px] border-[#D2DAE6] bg-[linear-gradient(135deg,#f2f7fc_0%,#e8eff8_100%)] p-0 shadow-[0_24px_56px_rgba(43,108,176,0.10)]">
            <div className="grid gap-6 px-6 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_340px]">
              <div className="min-w-0">
                <Badge color="#2B6CB0">Real Estate</Badge>
                <h1
                  className="mt-4 text-3xl font-black tracking-tight text-text sm:text-4xl"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  房产信息
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-[15px]">
                  在葡华人社区的房屋出售与出租信息。先看最新房源，再进入完整列表筛选。
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="primary" icon="add" onClick={handleCreateClick}>
                    发布房产
                  </Button>
                  {!user && (
                    <Button variant="ghost" icon="login" onClick={handleCreateClick}>
                      登录后发布
                    </Button>
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">在线房源</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                      {activeCount}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">仍在开放中的房源信息。</p>
                  </Card>
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">当前筛选</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                      {activeDealType === 'All' ? '全部' : DEAL_TYPE_ZH[activeDealType] || activeDealType}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">这一分类下共 {filtered.length} 条。</p>
                  </Card>
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">最新发布</p>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-text">
                      {newest?.title || '等待第一条房源'}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">{newest?.created_at?.slice(0, 10) || '暂无日期'}</p>
                  </Card>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/80 bg-white/86 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">市场概览</p>
                  <div className="mt-4 grid gap-3">
                    {dealSummary.length > 0 ? dealSummary.map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ background: `${DEAL_TYPE_COLORS[type]}18`, color: DEAL_TYPE_COLORS[type] }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              {type === 'sale' ? 'sell' : 'key'}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-text">{DEAL_TYPE_ZH[type]}</span>
                        </div>
                        <span className="text-sm font-black text-text">{count}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-text-muted">暂无市场数据。</p>
                    )}
                  </div>
                </div>

                {newest && (
                  <div className="rounded-[24px] border border-white/80 bg-white/86 px-5 py-5">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">最新房源</p>
                    <button
                      onClick={() => setSelected(newest)}
                      className="mt-3 w-full rounded-2xl border border-border bg-surface-muted px-4 py-4 text-left transition-colors hover:bg-surface"
                    >
                      <p className="text-xs text-text-subtle">
                        {DEAL_TYPE_ZH[newest.deal_type]} · {newest.created_at?.slice(0, 10)}
                      </p>
                      <p className="mt-2 font-bold text-text">{newest.title}</p>
                      <p className="mt-1 text-lg font-black text-accent" style={{ fontFamily: 'var(--font-headline)' }}>
                        {formatPrice(newest.price_cents, newest.deal_type)}
                      </p>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          <div>
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <Badge color="#2B6CB0">房源列表</Badge>
                <h2
                  className="mt-3 text-2xl font-black tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {featured.length > 0 ? '精选房源' : '全部房源'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map(l => (
                <RealEstateCard key={l.id} listing={l} onClick={() => setSelected(l)} />
              ))}
            </div>

            {browse.length > 0 && (
              <>
                <div className="mb-5 mt-8">
                  <Badge color="#5E6478">全部浏览</Badge>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                    更多房源
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {browse.map(l => (
                    <RealEstateCard key={l.id} listing={l} onClick={() => setSelected(l)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
