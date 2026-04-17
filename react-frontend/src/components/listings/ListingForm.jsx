import { useState } from 'react'
import Modal from '../ui/Modal'
import Field from '../ui/Field'
import Button from '../ui/Button'
import ContactFields from './ContactFields'

export default function ListingForm({
  title: modalTitle,
  initial = {},
  onSave,
  onClose,
  children,
}) {
  const [form, setForm] = useState({
    title:            initial.title            ?? '',
    description:      initial.description      ?? '',
    location:         initial.location         ?? '',
    contact_phone:    initial.contact_phone    ?? '',
    contact_whatsapp: initial.contact_whatsapp ?? '',
    contact_email:    initial.contact_email    ?? '',
    ...initial,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const patch = (updates) => setForm(f => ({ ...f, ...updates }))

  const handleSubmit = async (e) => {
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
    <Modal onClose={onClose} title={modalTitle} size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="标题" required>
          <input
            id="listing-title"
            autoFocus
            required
            value={form.title}
            onChange={set('title')}
            placeholder="标题"
          />
        </Field>

        <Field label="地点">
          <input
            id="listing-location"
            value={form.location}
            onChange={set('location')}
            placeholder="Lisboa, Porto…"
          />
        </Field>

        {children?.({ form, set, patch })}

        <Field label="详细描述">
          <textarea
            id="listing-description"
            value={form.description}
            onChange={set('description')}
            rows={4}
            placeholder="详细信息"
            className="resize-none"
          />
        </Field>

        <ContactFields
          values={form}
          onChange={(contact) => patch(contact)}
          error={error}
        />

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
