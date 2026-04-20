import Badge from '../ui/Badge'
import Card from '../ui/Card'
import AdminBadge from '../ui/AdminBadge'
import { CATEGORY_ZH, CATEGORY_COLORS, CONDITION_ZH, CONDITION_COLORS, formatPrice } from '../../constants/secondhand'

export default function SecondHandCard({ listing, onClick }) {
  const catColor = CATEGORY_COLORS[listing.category] || '#6B7280'
  const condColor = CONDITION_COLORS[listing.condition] || '#6B7280'
  const thumb = listing.images?.[0]?.thumb_url

  return (
    <Card
      className="group cursor-pointer overflow-hidden rounded-2xl p-0 transition-all hover:-translate-y-0.5 hover:shadow-lift"
      onClick={onClick}
    >
      <div className="relative aspect-[4/3] bg-surface-muted">
        {thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 36 }}>shopping_bag</span>
          </div>
        )}
        <span
          className="absolute top-3 left-3 rounded-lg px-2.5 py-1 text-sm font-black text-white shadow-sm"
          style={{ background: catColor }}
        >
          {formatPrice(listing.price_cents)}
        </span>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Badge color={catColor}>{CATEGORY_ZH[listing.category]}</Badge>
          {listing.owner_is_admin ? <AdminBadge compact /> : null}
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-bold"
            style={{ background: `${condColor}18`, color: condColor }}
          >
            {CONDITION_ZH[listing.condition]}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-text">
          {listing.title}
        </h3>
        {listing.location && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
            {listing.location}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>person</span>
          <span>{listing.owner_name || '社区用户'}</span>
          {listing.owner_is_admin ? <AdminBadge compact /> : null}
        </div>
      </div>
    </Card>
  )
}
