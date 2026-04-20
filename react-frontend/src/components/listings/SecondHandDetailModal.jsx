import { useState } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import AdminBadge from '../ui/AdminBadge'
import PhotoCarousel from './PhotoCarousel'
import AdminActions from './AdminActions'
import { CATEGORY_ZH, CATEGORY_COLORS, CONDITION_ZH, CONDITION_COLORS, formatPrice } from '../../constants/secondhand'

export default function SecondHandDetailModal({ listing, canManage, isAdmin, onEdit, onDelete, onStatusChange, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const catColor = CATEGORY_COLORS[listing.category] || '#6B7280'
  const condColor = CONDITION_COLORS[listing.condition] || '#6B7280'

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

  return (
    <Modal onClose={onClose} size="xl" hideClose>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge color={catColor}>{CATEGORY_ZH[listing.category]}</Badge>
              {listing.owner_is_admin ? <AdminBadge compact /> : null}
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: `${condColor}18`, color: condColor }}
              >
                {CONDITION_ZH[listing.condition]}
              </span>
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
          style={{ background: catColor, fontFamily: 'var(--font-headline)' }}
        >
          {formatPrice(listing.price_cents)}
        </div>

        {listing.images?.length > 0 && (
          <PhotoCarousel images={listing.images} />
        )}

        {listing.location && (
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
            {listing.location}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm text-text-muted">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
          <span>发布者：{listing.owner_name || '社区用户'}</span>
          {listing.owner_is_admin ? <AdminBadge compact /> : null}
        </div>

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
                <span className="text-xs text-text-muted flex-1">确认删除这条二手信息？</span>
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
