import { useState } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import PhotoCarousel from './PhotoCarousel'
import AdminActions from './AdminActions'
import { DEAL_TYPE_ZH, DEAL_TYPE_COLORS, formatPrice } from '../../constants/realestate'

export default function RealEstateDetailModal({ listing, canManage, isAdmin, onEdit, onDelete, onStatusChange, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const color = DEAL_TYPE_COLORS[listing.deal_type] || '#5E6478'

  const contactLinks = [
    listing.contact_phone && {
      icon: 'call', label: listing.contact_phone,
      href: `tel:${listing.contact_phone.replace(/\s+/g, '')}`,
    },
    listing.contact_whatsapp && {
      icon: 'chat', label: `WhatsApp: ${listing.contact_whatsapp}`,
      href: `https://wa.me/${listing.contact_whatsapp.replace(/[^\d+]/g, '')}`,
      external: true,
    },
    listing.contact_email && {
      icon: 'mail', label: listing.contact_email,
      href: `mailto:${listing.contact_email}`,
    },
  ].filter(Boolean)

  const details = [
    listing.rooms != null && { icon: 'bed', label: `${listing.rooms} 房间` },
    listing.bathrooms != null && { icon: 'bathtub', label: `${listing.bathrooms} 卫生间` },
    listing.area_m2 != null && { icon: 'square_foot', label: `${listing.area_m2} m²` },
    listing.furnished && { icon: 'chair', label: '带家具' },
  ].filter(Boolean)

  return (
    <Modal onClose={onClose} size="xl" hideClose>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge color={color}>{DEAL_TYPE_ZH[listing.deal_type]}</Badge>
              <span className="text-xs text-text-subtle">{listing.created_at?.slice(0, 10)}</span>
            </div>
            <h2
              className="text-lg font-bold text-text leading-snug"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {listing.title}
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

        <div
          className="rounded-xl px-4 py-3 text-2xl font-black tracking-tight text-white"
          style={{ background: color, fontFamily: 'var(--font-headline)' }}
        >
          {formatPrice(listing.price_cents, listing.deal_type)}
        </div>

        {listing.images?.length > 0 && (
          <PhotoCarousel images={listing.images} />
        )}

        {details.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {details.map((d) => (
              <div key={d.icon} className="flex items-center gap-1.5 rounded-lg bg-surface-muted px-3 py-2 text-sm text-text">
                <span className="material-symbols-outlined text-text-muted" style={{ fontSize: 16 }}>{d.icon}</span>
                {d.label}
              </div>
            ))}
          </div>
        )}

        {listing.location && (
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
            {listing.location}
          </div>
        )}

        {listing.description && (
          <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {listing.description}
          </div>
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

        {canManage && (
          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            {!confirmDelete ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>删除</Button>
                <Button variant="primary" size="sm" icon="edit" onClick={onEdit}>编辑</Button>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs text-text-muted flex-1">确认删除这条房产信息？</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>取消</Button>
                <Button variant="danger" size="sm" onClick={onDelete}>删除</Button>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <AdminActions listingId={listing.id} currentStatus={listing.status} onStatusChange={onStatusChange} />
        )}
      </div>
    </Modal>
  )
}
