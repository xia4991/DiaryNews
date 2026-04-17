import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import JobCard from '../components/listings/JobCard'
import JobDetailModal from '../components/listings/JobDetailModal'
import JobFormModal from '../components/listings/JobFormModal'

export default function JobsTab({ activeIndustry, onCountsChange, onLoginRequired }) {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)    // detail modal
  const [formMode, setFormMode] = useState(null)    // 'new' | { job } | null

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.listJobs({ limit: 100 })
      setJobs(d.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!onCountsChange) return
    const counts = {}
    for (const j of jobs) counts[j.industry] = (counts[j.industry] || 0) + 1
    onCountsChange(counts)
  }, [jobs, onCountsChange])

  const filtered = activeIndustry === 'All'
    ? jobs
    : jobs.filter(j => j.industry === activeIndustry)

  const handleCreateClick = () => {
    if (!user) { onLoginRequired?.(); return }
    setFormMode('new')
  }

  const handleSave = async (payload) => {
    if (formMode === 'new') {
      const created = await api.createJob(payload)
      setJobs(prev => [created, ...prev])
    } else {
      const updated = await api.updateJob(formMode.job.id, payload)
      setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
      if (selected?.id === updated.id) setSelected(updated)
    }
  }

  const handleDelete = async () => {
    const id = selected.id
    await api.deleteJob(id)
    setJobs(prev => prev.filter(j => j.id !== id))
    setSelected(null)
  }

  const canManage = (job) =>
    Boolean(user && (user.id === job.owner_id || user.is_admin))

  return (
    <div className="pt-6">
      {selected && (
        <JobDetailModal
          job={selected}
          canManage={canManage(selected)}
          onEdit={() => { setFormMode({ job: selected }); setSelected(null) }}
          onDelete={handleDelete}
          onClose={() => setSelected(null)}
        />
      )}

      {formMode && (
        <JobFormModal
          job={formMode === 'new' ? null : formMode.job}
          onSave={handleSave}
          onClose={() => setFormMode(null)}
        />
      )}

      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-bold font-headline">招聘信息</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">在葡华人社区招聘与求职</p>
        </div>
        <button onClick={handleCreateClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 shrink-0"
          style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
          发布招聘
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: 28 }}>hourglass_empty</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4 }}>work_off</span>
          <p className="text-sm">{jobs.length === 0 ? '还没有招聘信息，来发布第一条吧！' : '该行业暂无招聘'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} onClick={() => setSelected(job)} />
          ))}
        </div>
      )}
    </div>
  )
}
