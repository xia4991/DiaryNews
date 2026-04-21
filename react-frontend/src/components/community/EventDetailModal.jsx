import { useState } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import AdminBadge from '../ui/AdminBadge'

const EVENT_CATEGORY_ZH = {
  Meetup: '聚会',
  Family: '亲子',
  Talk: '讲座',
  JobFair: '招聘会',
  Business: '商业活动',
  Sports: '运动',
  Hobby: '兴趣小组',
  Dining: '同城聚餐',
  Other: '其他',
}

function formatDateTime(value) {
  if (!value) return '时间待定'
  return value.slice(0, 16).replace('T', ' ')
}

export default function EventDetailModal({ event, canManage, onEdit, onDelete, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const contactLinks = [
    event.contact_phone && {
      icon: 'call', label: event.contact_phone,
      href: `tel:${event.contact_phone.replace(/\s+/g, '')}`,
    },
    event.contact_whatsapp && {
      icon: 'chat', label: `WhatsApp: ${event.contact_whatsapp}`,
      href: `https://wa.me/${event.contact_whatsapp.replace(/[^\d+]/g, '')}`,
      external: true,
    },
    event.contact_email && {
      icon: 'mail', label: event.contact_email,
      href: `mailto:${event.contact_email}`,
    },
    event.signup_url && {
      icon: 'link', label: '报名链接',
      href: event.signup_url,
      external: true,
    },
  ].filter(Boolean)

  return (
    <Modal onClose={onClose} size="lg" hideClose>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge color="#2E7D5A">{EVENT_CATEGORY_ZH[event.category] || event.category}</Badge>
              <span className="text-xs text-text-subtle">{event.city || '城市待定'}</span>
              {event.owner_is_admin ? <AdminBadge compact /> : null}
            </div>
            <h2 className="text-lg font-bold text-text leading-snug" style={{ fontFamily: 'var(--font-headline)' }}>
              {event.title}
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">开始时间</p>
            <p className="mt-2 text-sm font-semibold text-text">{formatDateTime(event.start_at)}</p>
          </div>
          <div className="rounded-xl bg-surface-muted px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">费用</p>
            <p className="mt-2 text-sm font-semibold text-text">{event.is_free ? '免费' : (event.fee_text || '收费')}</p>
          </div>
        </div>

        <div className="rounded-xl bg-surface-muted px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">发布者</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text">{event.owner_name || '社区用户'}</p>
            {event.owner_is_admin ? <AdminBadge compact /> : null}
          </div>
        </div>

        {(event.venue || event.end_at) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {event.venue && (
              <div className="flex items-center gap-1.5 text-sm text-text-muted">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>location_on</span>
                {event.venue}
              </div>
            )}
            {event.end_at && (
              <div className="flex items-center gap-1.5 text-sm text-text-muted">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span>
                结束于 {formatDateTime(event.end_at)}
              </div>
            )}
          </div>
        )}

        {event.description && (
          <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {event.description}
          </div>
        )}

        {contactLinks.length > 0 && (
          <div className="flex flex-col gap-2 pt-3 border-t border-border">
            <div className="text-[10px] font-bold text-text-subtle uppercase tracking-widest">报名 / 联系方式</div>
            {contactLinks.map((item, index) => (
              <a
                key={index}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-text bg-surface-muted hover:bg-bg-subtle transition-colors"
              >
                <span className="material-symbols-outlined text-accent" style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
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
                <span className="text-xs text-text-muted flex-1">确认删除这场活动？</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>取消</Button>
                <Button variant="danger" size="sm" onClick={onDelete}>删除</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
