import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import JobCard from '../components/listings/JobCard'
import JobDetailModal from '../components/listings/JobDetailModal'
import JobFormModal from '../components/listings/JobFormModal'
import SectionHeader from '../components/ui/SectionHeader'
import Button from '../components/ui/Button'

export default function JobsTab({ activeIndustry, onCountsChange, onLoginRequired }) {
  const { user } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [formMode, setFormMode] = useState(null)

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
    <>
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

      <SectionHeader
        title="招聘信息"
        subtitle="在葡华人社区招聘与求职"
        action={
          <Button variant="primary" icon="add" onClick={handleCreateClick}>
            发布招聘
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span
            className="material-symbols-outlined animate-spin text-accent"
            style={{ fontSize: 28 }}
          >
            progress_activity
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <span className="material-symbols-outlined text-text-subtle" style={{ fontSize: 40 }}>work_off</span>
          <p className="text-sm">
            {jobs.length === 0 ? '还没有招聘信息，来发布第一条吧！' : '该行业暂无招聘'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} onClick={() => setSelected(job)} />
          ))}
        </div>
      )}
    </>
  )
}
