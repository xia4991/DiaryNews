import { useState } from 'react'
import Modal from '../ui/Modal'
import Field from '../ui/Field'
import Button from '../ui/Button'
import { JOB_INDUSTRIES, INDUSTRY_ZH } from '../../constants/industries'

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
    <Modal onClose={onClose} title={isEdit ? '编辑招聘' : '发布招聘'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="标题" required>
          <input
            id="job-title"
            autoFocus
            required
            value={form.title}
            onChange={set('title')}
            placeholder="例如 餐厅招聘服务员"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="行业" required>
            <select id="job-industry" value={form.industry} onChange={set('industry')}>
              {JOB_INDUSTRIES.map(i => <option key={i} value={i}>{INDUSTRY_ZH[i]}</option>)}
            </select>
          </Field>
          <Field label="地点">
            <input
              id="job-location"
              value={form.location}
              onChange={set('location')}
              placeholder="Lisboa, Porto…"
            />
          </Field>
        </div>

        <Field label="薪资">
          <input
            id="job-salary"
            value={form.salary_range}
            onChange={set('salary_range')}
            placeholder="例如 €1000-1200 / 月"
          />
        </Field>

        <Field label="详细描述">
          <textarea
            id="job-description"
            value={form.description}
            onChange={set('description')}
            rows={5}
            placeholder="岗位职责、工作时间、要求等"
            className="resize-none"
          />
        </Field>

        <div className="flex flex-col gap-2">
          <Field label="联系方式" required error={error}>
            <input
              id="job-phone"
              value={form.contact_phone}
              onChange={set('contact_phone')}
              placeholder="电话"
            />
          </Field>
          <input
            value={form.contact_whatsapp}
            onChange={set('contact_whatsapp')}
            placeholder="WhatsApp"
            className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent"
          />
          <input
            type="email"
            value={form.contact_email}
            onChange={set('contact_email')}
            placeholder="邮箱"
            className="w-full bg-surface border border-border-strong rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button
            type="submit"
            variant="primary"
            icon="save"
            loading={saving}
            disabled={!form.title.trim()}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
