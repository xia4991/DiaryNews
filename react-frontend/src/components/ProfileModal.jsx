import { useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'

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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <form onSubmit={handleSave}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: '#131b2e', color: '#dae2fd', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">个人资料</h2>
          <button type="button" onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {user?.email && (
          <div className="text-xs text-on-surface-variant">
            邮箱：{user.email}
          </div>
        )}

        <div>
          <label className="block text-xs mb-1 text-on-surface-variant">昵称</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
            style={{ background: 'rgba(45,52,73,0.5)', color: '#dae2fd' }}
            placeholder="您的显示名" />
        </div>

        <div>
          <label className="block text-xs mb-1 text-on-surface-variant">联系电话（可选）</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
            style={{ background: 'rgba(45,52,73,0.5)', color: '#dae2fd' }}
            placeholder="+351 912 345 678" />
          <p className="text-[11px] text-on-surface-variant mt-1">
            发布招聘/房源等信息时将作为联系方式展示
          </p>
        </div>

        {error && <p className="text-xs" style={{ color: '#ff6b6b' }}>{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(45,52,73,0.5)', color: '#dae2fd' }}>
            取消
          </button>
          <button type="submit" disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-on-primary disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </div>
  )
}
