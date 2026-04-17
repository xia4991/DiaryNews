import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import Modal from './ui/Modal'
import Field from './ui/Field'
import Button from './ui/Button'

export default function ProfileModal({ onClose }) {
  const { user, setUser } = useAuth()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('昵称不能为空'); return }
    setSaving(true)
    try {
      const updated = await api.updateMe({ name: name.trim(), phone: phone.trim() })
      setUser(updated)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="个人资料" size="md">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        {user?.email && (
          <div className="text-xs text-text-muted">
            邮箱：<span className="text-text">{user.email}</span>
          </div>
        )}

        <Field label="昵称" required error={!name.trim() && error ? error : ''}>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="您的显示名"
          />
        </Field>

        <Field
          label="联系电话（可选）"
          hint="发布招聘/房源等信息时将作为联系方式展示"
        >
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+351 912 345 678"
          />
        </Field>

        {error && name.trim() && <p className="text-[11px] text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
          <Button
            type="submit"
            variant="primary"
            icon="save"
            loading={saving}
          >
            {saving ? '保存中…' : '保存'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
