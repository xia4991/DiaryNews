import { useState } from 'react'
import Button from '../ui/Button'
import { api } from '../../api'

const STATUS_ZH = { active: '在线', hidden: '隐藏', removed: '删除' }

export default function AdminActions({ listingId, currentStatus, onStatusChange }) {
  const [loading, setLoading] = useState(false)

  const handleAction = async (status) => {
    setLoading(true)
    try {
      const updated = await api.setListingStatus(listingId, status)
      onStatusChange?.(updated)
    } finally {
      setLoading(false)
    }
  }

  const actions = [
    currentStatus !== 'active' && { status: 'active', label: '恢复上线', icon: 'check_circle', variant: 'ghost' },
    currentStatus !== 'hidden' && { status: 'hidden', label: '隐藏', icon: 'visibility_off', variant: 'subtle' },
    currentStatus !== 'removed' && { status: 'removed', label: '删除', icon: 'delete', variant: 'danger' },
  ].filter(Boolean)

  return (
    <div className="flex items-center gap-2 pt-3 border-t border-border">
      <span className="text-[10px] font-bold text-text-subtle uppercase tracking-widest mr-auto">
        管理 · 当前: {STATUS_ZH[currentStatus] || currentStatus}
      </span>
      {actions.map(a => (
        <Button
          key={a.status}
          variant={a.variant}
          size="sm"
          icon={a.icon}
          disabled={loading}
          onClick={() => handleAction(a.status)}
        >
          {a.label}
        </Button>
      ))}
    </div>
  )
}
