import Badge from '../ui/Badge'
import Card from '../ui/Card'
import AdminBadge from '../ui/AdminBadge'
import { DEAL_TYPE_ZH, DEAL_TYPE_COLORS, formatPrice } from '../../constants/realestate'

export default function RealEstateCard({ listing, onClick }) {
  const color = DEAL_TYPE_COLORS[listing.deal_type] || '#5E6478'
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
            <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 36 }}>home</span>
          </div>
        )}
        <span
          className="absolute top-3 left-3 rounded-lg px-2.5 py-1 text-sm font-black text-white shadow-sm"
          style={{ background: color }}
        >
          {formatPrice(listing.price_cents, listing.deal_type)}
        </span>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Badge color={color}>{DEAL_TYPE_ZH[listing.deal_type]}</Badge>
          {listing.owner_is_admin ? <AdminBadge compact /> : null}
          {listing.rooms != null && (
            <span className="text-xs text-text-muted">{listing.rooms}房</span>
          )}
          {listing.area_m2 != null && (
            <span className="text-xs text-text-muted">{listing.area_m2}m²</span>
          )}
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
