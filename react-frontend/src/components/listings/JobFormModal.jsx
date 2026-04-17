import { useState, useEffect } from 'react'
import { JOB_INDUSTRIES, INDUSTRY_ZH } from '../../constants/industries'

const inputClass =
  'rounded-lg px-3 py-2 text-sm bg-transparent border outline-none focus:border-secondary transition-colors'
const inputStyle = { borderColor: 'rgba(70,69,84,0.4)', color: '#dae2fd' }

export default function JobFormModal({ job, onSave, onClose }) {
  const isEdit = Boolean(job)
  const [form, setForm] = useState({
    title:            job?.title            ?? '',
    industry:         job?.industry         ?? 'Restaurant',
    location:         job?.location         ?? '',
    salary_range:     job?.salary_range     ?? '',
    description:      job?.description      ?? '',
    contact_phone:    job?.contact_phone    ?? '',
    contact_whatsapp: job?.contact_whatsapp ?? '',
    contact_email:    job?.contact_email    ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.title.trim()) return
    if (!form.contact_phone && !form.contact_whatsapp && !form.contact_email) {
      setError('请至少填写一项联系方式')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])
      )
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(6,14,32,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>

      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: '#131b2e', border: '1px solid rgba(70,69,84,0.2)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-sm font-bold font-headline">{isEdit ? '编辑招聘' : '发布招聘'}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 pb-5 overflow-y-auto">

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">标题 *</label>
            <input autoFocus required value={form.title} onChange={set('title')}
              placeholder="例如 餐厅招聘服务员" className={inputClass} style={inputStyle} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">行业 *</label>
              <select value={form.industry} onChange={set('industry')} className={inputClass} style={inputStyle}>
                {JOB_INDUSTRIES.map(i => <option key={i} value={i}>{INDUSTRY_ZH[i]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">地点</label>
              <input value={form.location} onChange={set('location')}
                placeholder="Lisboa, Porto…" className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">薪资</label>
            <input value={form.salary_range} onChange={set('salary_range')}
              placeholder="例如 €1000-1200 / 月" className={inputClass} style={inputStyle} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">详细描述</label>
            <textarea value={form.description} onChange={set('description')} rows={5}
              placeholder="岗位职责、工作时间、要求等" className={`${inputClass} resize-none`} style={inputStyle} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">联系方式 *</label>
            <input value={form.contact_phone} onChange={set('contact_phone')}
              placeholder="电话" className={inputClass} style={inputStyle} />
            <input value={form.contact_whatsapp} onChange={set('contact_whatsapp')}
              placeholder="WhatsApp" className={inputClass} style={inputStyle} />
            <input type="email" value={form.contact_email} onChange={set('contact_email')}
              placeholder="邮箱" className={inputClass} style={inputStyle} />
          </div>

          {error && (
            <div className="text-xs text-error" style={{ color: '#ff6b6b' }}>{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">
              取消
            </button>
            <button type="submit" disabled={saving || !form.title.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                {saving ? 'hourglass_empty' : 'save'}
              </span>
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
