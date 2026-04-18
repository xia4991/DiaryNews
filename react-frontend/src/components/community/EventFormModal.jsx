import Modal from '../ui/Modal'
import Field from '../ui/Field'
import Button from '../ui/Button'
import ContactFields from '../listings/ContactFields'
import { useState } from 'react'

const EVENT_CATEGORIES = [
  ['Meetup', '聚会'],
  ['Family', '亲子'],
  ['Talk', '讲座'],
  ['JobFair', '招聘会'],
  ['Business', '商业活动'],
  ['Sports', '运动'],
  ['Hobby', '兴趣小组'],
  ['Dining', '同城聚餐'],
  ['Other', '其他'],
]

export default function EventFormModal({ event, onSave, onClose }) {
  const isEdit = Boolean(event)
  const [form, setForm] = useState({
    title: event?.title ?? '',
    category: event?.category ?? 'Meetup',
    description: event?.description ?? '',
    city: event?.city ?? '',
    venue: event?.venue ?? '',
    start_at: event?.start_at?.slice(0, 16) ?? '',
    end_at: event?.end_at?.slice(0, 16) ?? '',
    is_free: event?.is_free ?? true,
    fee_text: event?.fee_text ?? '',
    contact_phone: event?.contact_phone ?? '',
    contact_whatsapp: event?.contact_whatsapp ?? '',
    contact_email: event?.contact_email ?? '',
    signup_url: event?.signup_url ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
  }
  const patch = (updates) => setForm((prev) => ({ ...prev, ...updates }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim() || !form.start_at) return
    if (!form.contact_phone && !form.contact_whatsapp && !form.contact_email && !form.signup_url) {
      setError('请至少填写一项联系方式或报名链接')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        city: form.city.trim(),
        venue: form.venue.trim(),
        fee_text: form.fee_text.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_whatsapp: form.contact_whatsapp.trim(),
        contact_email: form.contact_email.trim(),
        signup_url: form.signup_url.trim(),
        start_at: form.start_at ? new Date(form.start_at).toISOString() : '',
        end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      }
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title={isEdit ? '编辑活动' : '发布活动'} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="标题" required>
          <input
            id="event-title"
            autoFocus
            required
            value={form.title}
            onChange={set('title')}
            placeholder="例如 里斯本创业者周末聚会"
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="分类" required>
            <select id="event-category" value={form.category} onChange={set('category')}>
              {EVENT_CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="城市">
            <input
              id="event-city"
              value={form.city}
              onChange={set('city')}
              placeholder="Lisboa, Porto…"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="开始时间" required>
            <input
              id="event-start-at"
              type="datetime-local"
              required
              value={form.start_at}
              onChange={set('start_at')}
            />
          </Field>
          <Field label="结束时间">
            <input
              id="event-end-at"
              type="datetime-local"
              value={form.end_at}
              onChange={set('end_at')}
            />
          </Field>
        </div>

        <Field label="地点">
          <input
            id="event-venue"
            value={form.venue}
            onChange={set('venue')}
            placeholder="例如 Martim Moniz 附近咖啡馆"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-end">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text">
            <input
              type="checkbox"
              checked={form.is_free}
              onChange={set('is_free')}
            />
            免费活动
          </label>
          {!form.is_free && (
            <Field label="费用说明">
              <input
                id="event-fee-text"
                value={form.fee_text}
                onChange={set('fee_text')}
                placeholder="例如 €10 / 人"
              />
            </Field>
          )}
        </div>

        <Field label="详细描述">
          <textarea
            id="event-description"
            value={form.description}
            onChange={set('description')}
            rows={5}
            placeholder="介绍活动内容、适合谁参加、注意事项等"
            className="resize-none"
          />
        </Field>

        <Field label="报名链接" error={error && (!form.contact_phone && !form.contact_whatsapp && !form.contact_email) ? undefined : error}>
          <input
            id="event-signup-url"
            value={form.signup_url}
            onChange={set('signup_url')}
            placeholder="https://..."
          />
        </Field>

        <ContactFields
          values={form}
          onChange={(contact) => patch(contact)}
          error={!form.signup_url ? error : null}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button type="submit" variant="primary" icon="save" loading={saving} disabled={!form.title.trim() || !form.start_at}>
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
