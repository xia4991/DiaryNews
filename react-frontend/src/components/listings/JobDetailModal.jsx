import { useState } from 'react'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { INDUSTRY_ZH, INDUSTRY_ICONS } from '../../constants/industries'
import { INDUSTRY_COLORS } from '../../constants/colors'

export default function JobDetailModal({ job, canManage, onEdit, onDelete, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const color = INDUSTRY_COLORS[job.industry] || INDUSTRY_COLORS.Other

  const contactLinks = [
    job.contact_phone && {
      icon: 'call', label: job.contact_phone,
      href: `tel:${job.contact_phone.replace(/\s+/g, '')}`,
    },
    job.contact_whatsapp && {
      icon: 'chat', label: `WhatsApp: ${job.contact_whatsapp}`,
      href: `https://wa.me/${job.contact_whatsapp.replace(/[^\d+]/g, '')}`,
      external: true,
    },
    job.contact_email && {
      icon: 'mail', label: job.contact_email,
      href: `mailto:${job.contact_email}`,
    },
  ].filter(Boolean)

  return (
    <Modal onClose={onClose} size="lg" hideClose>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <Badge color={color} icon={INDUSTRY_ICONS[job.industry]}>
              {INDUSTRY_ZH[job.industry] || job.industry}
            </Badge>
            <h2
              className="text-lg font-bold text-text leading-snug"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              {job.title}
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
          {job.salary_range && (
            <div className="flex items-center gap-1 text-success">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>
              <span className="font-semibold">{job.salary_range}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1 text-text-muted">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
              <span>{job.location}</span>
            </div>
          )}
          {job.created_at && (
            <div className="flex items-center gap-1 text-text-subtle">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
              <span>{job.created_at.slice(0, 10)}</span>
            </div>
          )}
        </div>

        {job.description && (
          <div className="text-sm text-text leading-relaxed whitespace-pre-wrap">
            {job.description}
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
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
                  删除
                </Button>
                <Button variant="primary" size="sm" icon="edit" onClick={onEdit}>
                  编辑
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs text-text-muted flex-1">确认删除这条招聘？</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                  取消
                </Button>
                <Button variant="danger" size="sm" onClick={onDelete}>
                  删除
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
