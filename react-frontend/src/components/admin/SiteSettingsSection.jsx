import { useState } from 'react'
import Card from '../ui/Card'
import { useSiteSettings } from '../../siteSettings'

function SettingToggle({ title, description, checked, saving, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-bold text-text">{title}</p>
        <p className="mt-1 text-[13px] leading-6 text-text-muted">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={saving}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
          checked ? 'bg-accent' : 'bg-border-strong'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  )
}

export default function SiteSettingsSection() {
  const { settings, updateSettings } = useSiteSettings()
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  const save = async (name, value) => {
    setSaving(name)
    setError('')
    try {
      await updateSettings({ [name]: value })
    } catch (err) {
      setError(err.response?.data?.detail || '保存失败')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card padding="lg">
      <h2 className="text-lg font-bold text-text" style={{ fontFamily: 'var(--font-headline)' }}>
        站点设置
      </h2>
      <p className="mt-1 text-[13px] text-text-muted">修改后立即生效，所有访客刷新页面后看到新的设置。</p>

      <div className="mt-2 divide-y divide-border">
        <SettingToggle
          title="公开新闻阅读数"
          description={
            settings.view_counts_public
              ? '当前：所有访客都能看到新闻的“N 次阅读”和“按浏览”排序。'
              : '当前：只有管理员能看到新闻的“N 次阅读”和“按浏览”排序，普通用户看不到。'
          }
          checked={settings.view_counts_public}
          saving={saving === 'view_counts_public'}
          onChange={(value) => save('view_counts_public', value)}
        />
      </div>

      {error && <p className="mt-3 text-sm text-[#DC5050]">{error}</p>}
    </Card>
  )
}
