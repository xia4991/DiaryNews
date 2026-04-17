import { useState, useEffect } from 'react'
import { INDUSTRY_ZH, INDUSTRY_ICONS, INDUSTRY_COLORS } from '../../constants/industries'

export default function JobDetailModal({ job, canManage, onEdit, onDelete, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(6,14,32,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>

      <div className="relative w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: '#131b2e', border: '1px solid rgba(70,69,84,0.2)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-start justify-between px-5 pt-5 pb-3 shrink-0 gap-3">
          <div className="flex flex-col gap-2 flex-1">
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit"
              style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{INDUSTRY_ICONS[job.industry]}</span>
              {INDUSTRY_ZH[job.industry] || job.industry}
            </span>
            <h2 className="text-base font-bold font-headline leading-snug">{job.title}</h2>
          </div>
          <button onClick={onClose}
            className="rounded-full p-1 text-on-surface-variant hover:text-on-surface transition-colors shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 pb-5 overflow-y-auto">
          <div className="flex flex-wrap gap-4 text-xs">
            {job.salary_range && (
              <div className="flex items-center gap-1" style={{ color: '#44e2cd' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>
                <span className="font-bold">{job.salary_range}</span>
              </div>
            )}
            {job.location && (
              <div className="flex items-center gap-1 text-on-surface-variant">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                <span>{job.location}</span>
              </div>
            )}
            {job.created_at && (
              <div className="flex items-center gap-1 text-on-surface-variant opacity-60">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                <span>{job.created_at.slice(0, 10)}</span>
              </div>
            )}
          </div>

          {job.description && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{job.description}</div>
          )}

          {contactLinks.length > 0 && (
            <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'rgba(70,69,84,0.3)' }}>
              <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest pt-2">联系方式</div>
              {contactLinks.map((c, i) => (
                <a key={i} href={c.href}
                  target={c.external ? '_blank' : undefined}
                  rel={c.external ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                  style={{ background: 'rgba(255,255,255,0.03)', color: '#dae2fd' }}>
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>{c.icon}</span>
                  <span>{c.label}</span>
                </a>
              ))}
            </div>
          )}

          {canManage && (
            <div className="flex justify-end gap-2 pt-3 border-t" style={{ borderColor: 'rgba(70,69,84,0.3)' }}>
              {!confirmDelete ? (
                <>
                  <button onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.08)' }}>
                    删除
                  </button>
                  <button onClick={onEdit}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                    编辑
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-on-surface-variant flex-1">确认删除这条招聘？</span>
                  <button onClick={() => setConfirmDelete(false)}
                    className="px-3 py-1 rounded-lg text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
                    取消
                  </button>
                  <button onClick={onDelete}
                    className="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                    style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.15)' }}>
                    删除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
