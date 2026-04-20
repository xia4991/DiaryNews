import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import SecondHandCard from '../components/listings/SecondHandCard'
import SecondHandDetailModal from '../components/listings/SecondHandDetailModal'
import SecondHandFormModal from '../components/listings/SecondHandFormModal'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import AdminBadge from '../components/ui/AdminBadge'
import { CATEGORY_ZH, CATEGORY_COLORS, CATEGORY_ICONS, CONDITION_ZH, CONDITION_COLORS, formatPrice } from '../constants/secondhand'

export default function SecondHandTab({ activeCategory, activeCondition, onCountsChange, onLoginRequired }) {
  const { user } = useAuth()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [formMode, setFormMode] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.listSecondHand({ limit: 100 })
      setListings(d.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!onCountsChange) return
    const counts = {}
    for (const l of listings) counts[l.category] = (counts[l.category] || 0) + 1
    onCountsChange(counts)
  }, [listings, onCountsChange])

  let filtered = listings
  if (activeCategory && activeCategory !== 'All') {
    filtered = filtered.filter(l => l.category === activeCategory)
  }
  if (activeCondition && activeCondition !== 'All') {
    filtered = filtered.filter(l => l.condition === activeCondition)
  }

  const featured = filtered.slice(0, 3)
  const browse = filtered.slice(3)
  const activeCount = listings.filter(l => l.status === 'active').length
  const newest = listings[0] || null

  const handleCreateClick = () => {
    if (!user) { onLoginRequired?.(); return }
    setFormMode('new')
  }

  const handleSave = async (payload) => {
    if (formMode === 'new') {
      const created = await api.createSecondHand(payload)
      setListings(prev => [created, ...prev])
    } else {
      const updated = await api.updateSecondHand(formMode.listing.id, payload)
      setListings(prev => prev.map(l => l.id === updated.id ? updated : l))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }

  const handleDelete = async () => {
    const id = selected.id
    await api.deleteSecondHand(id)
    setListings(prev => prev.filter(l => l.id !== id))
    setSelected(null)
  }

  const canManage = (listing) =>
    Boolean(user && (user.id === listing.owner_id || user.is_admin))

  const categorySummary = Object.entries(
    listings.reduce((acc, l) => { acc[l.category] = (acc[l.category] || 0) + 1; return acc }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <>
      {selected && (
        <SecondHandDetailModal
          listing={selected}
          canManage={canManage(selected)}
          isAdmin={user?.is_admin}
          onEdit={() => { setFormMode({ listing: selected }); setSelected(null) }}
          onDelete={handleDelete}
          onStatusChange={(updated) => { setListings(prev => prev.map(l => l.id === updated.id ? updated : l)); setSelected(updated) }}
          onClose={() => setSelected(null)}
        />
      )}

      {formMode && (
        <SecondHandFormModal
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
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-muted">
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>shopping_bag</span>
          <p className="text-sm">
            {listings.length === 0 ? '还没有二手信息，来发布第一条吧！' : '该筛选条件下暂无商品'}
          </p>
          <Button variant="primary" icon="add" onClick={handleCreateClick}>
            发布二手
          </Button>
        </div>
      ) : (
        <div className="grid gap-6">
          <Card className="overflow-hidden rounded-[30px] border-[#E0D6E6] bg-[linear-gradient(135deg,#f8f5fc_0%,#f0eaf8_100%)] p-0 shadow-[0_24px_56px_rgba(139,92,246,0.10)]">
            <div className="grid gap-6 px-6 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_340px]">
              <div className="min-w-0">
                <Badge color="#8B5CF6">Second Hand</Badge>
                <h1
                  className="mt-4 text-3xl font-black tracking-tight text-text sm:text-4xl"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  二手市场
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-[15px]">
                  在葡华人社区的二手物品交易。闲置物品找个新主人，也能淘到实惠好货。
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="primary" icon="add" onClick={handleCreateClick}>
                    发布二手
                  </Button>
                  {!user && (
                    <Button variant="ghost" icon="login" onClick={handleCreateClick}>
                      登录后发布
                    </Button>
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">在线商品</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                      {activeCount}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">仍在出售中的二手商品。</p>
                  </Card>
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">当前筛选</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                      {activeCategory === 'All' ? '全部' : CATEGORY_ZH[activeCategory] || activeCategory}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">这一分类下共 {filtered.length} 条。</p>
                  </Card>
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">最新发布</p>
                    {newest?.owner_is_admin ? <div className="mt-2"><AdminBadge compact /></div> : null}
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-text">
                      {newest?.title || '等待第一条商品'}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">
                      发布者：{newest?.owner_name || '社区用户'}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">{newest?.created_at?.slice(0, 10) || '暂无日期'}</p>
                  </Card>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/80 bg-white/86 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">热门分类</p>
                  <div className="mt-4 grid gap-3">
                    {categorySummary.length > 0 ? categorySummary.map(([cat, count]) => (
                      <div key={cat} className="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ background: `${CATEGORY_COLORS[cat]}18`, color: CATEGORY_COLORS[cat] }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              {CATEGORY_ICONS[cat]}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-text">{CATEGORY_ZH[cat]}</span>
                        </div>
                        <span className="text-sm font-black text-text">{count}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-text-muted">暂无分类数据。</p>
                    )}
                  </div>
                </div>

                {newest && (
                  <div className="rounded-[24px] border border-white/80 bg-white/86 px-5 py-5">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">最新发布</p>
                    <button
                      onClick={() => setSelected(newest)}
                      className="mt-3 w-full rounded-2xl border border-border bg-surface-muted px-4 py-4 text-left transition-colors hover:bg-surface"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-subtle">
                        <span>{CATEGORY_ZH[newest.category]} · {CONDITION_ZH[newest.condition]} · {newest.created_at?.slice(0, 10)}</span>
                        {newest.owner_is_admin ? <AdminBadge compact /> : null}
                      </div>
                      <p className="mt-2 font-bold text-text">{newest.title}</p>
                      <p className="mt-1 text-lg font-black text-accent" style={{ fontFamily: 'var(--font-headline)' }}>
                        {formatPrice(newest.price_cents)}
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
                <Badge color="#8B5CF6">商品列表</Badge>
                <h2
                  className="mt-3 text-2xl font-black tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {featured.length > 0 ? '精选商品' : '全部商品'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map(l => (
                <SecondHandCard key={l.id} listing={l} onClick={() => setSelected(l)} />
              ))}
            </div>

            {browse.length > 0 && (
              <>
                <div className="mb-5 mt-8">
                  <Badge color="#5E6478">全部浏览</Badge>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                    更多商品
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {browse.map(l => (
                    <SecondHandCard key={l.id} listing={l} onClick={() => setSelected(l)} />
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
