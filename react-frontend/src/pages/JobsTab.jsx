import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import JobCard from '../components/listings/JobCard'
import JobDetailModal from '../components/listings/JobDetailModal'
import JobFormModal from '../components/listings/JobFormModal'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { INDUSTRY_ZH, INDUSTRY_ICONS } from '../constants/industries'
import { INDUSTRY_COLORS } from '../constants/colors'

export default function JobsTab({ activeIndustry, onCountsChange, onLoginRequired, onJobsChanged }) {
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
  const featured = filtered.slice(0, 2)
  const browse = filtered.slice(2)
  const activeCount = jobs.filter(j => j.status === 'active').length
  const newestJob = jobs[0] || null

  const handleCreateClick = () => {
    if (!user) { onLoginRequired?.(); return }
    setFormMode('new')
  }

  const handleSave = async (payload) => {
    if (formMode === 'new') {
      const created = await api.createJob(payload)
      setJobs(prev => [created, ...prev])
      onJobsChanged?.()
    } else {
      const updated = await api.updateJob(formMode.job.id, payload)
      setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
      if (selected?.id === updated.id) setSelected(updated)
      onJobsChanged?.()
    }
  }

  const handleDelete = async () => {
    const id = selected.id
    await api.deleteJob(id)
    setJobs(prev => prev.filter(j => j.id !== id))
    setSelected(null)
    onJobsChanged?.()
  }

  const canManage = (job) =>
    Boolean(user && (user.id === job.owner_id || user.is_admin))

  const industrySummary = Object.entries(
    jobs.reduce((acc, job) => {
      acc[job.industry] = (acc[job.industry] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  return (
    <>
      {selected && (
        <JobDetailModal
          job={selected}
          canManage={canManage(selected)}
          isAdmin={user?.is_admin}
          onEdit={() => { setFormMode({ job: selected }); setSelected(null) }}
          onDelete={handleDelete}
          onStatusChange={(updated) => { setJobs(prev => prev.map(j => j.id === updated.id ? updated : j)); setSelected(updated) }}
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
        <div className="grid gap-6">
          <Card className="overflow-hidden rounded-[30px] border-[#D7E0D7] bg-[linear-gradient(135deg,#f5fbf6_0%,#edf5ef_100%)] p-0 shadow-[0_24px_56px_rgba(46,125,90,0.10)]">
            <div className="grid gap-6 px-6 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_340px]">
              <div className="min-w-0">
                <Badge color="#2E7D5A">Community Jobs</Badge>
                <h1
                  className="mt-4 text-3xl font-black tracking-tight text-text sm:text-4xl"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  招聘信息
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-text-muted sm:text-[15px]">
                  在葡华人社区招聘与求职。先看最新职位和热门行业，再进入完整列表筛选你要找的机会。
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="primary" icon="add" onClick={handleCreateClick}>
                    发布招聘
                  </Button>
                  {!user && (
                    <Button variant="ghost" icon="login" onClick={handleCreateClick}>
                      登录后发布
                    </Button>
                  )}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">公开职位</p>
                    <p className="mt-2 text-3xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                      {activeCount}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">仍在开放中的招聘机会。</p>
                  </Card>
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">当前筛选</p>
                    <p className="mt-2 text-2xl font-black tracking-tight text-text" style={{ fontFamily: 'var(--font-headline)' }}>
                      {activeIndustry === 'All' ? '全部' : INDUSTRY_ZH[activeIndustry] || activeIndustry}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">这一分类下共 {filtered.length} 条。</p>
                  </Card>
                  <Card className="rounded-[22px] border-white/80 bg-white/80 shadow-none">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">最新发布</p>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-text">
                      {newestJob?.title || '等待第一条职位'}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-text-muted">{newestJob?.created_at?.slice(0, 10) || '暂无日期'}</p>
                  </Card>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/80 bg-white/86 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">热门行业</p>
                  <div className="mt-4 grid gap-3">
                    {industrySummary.length > 0 ? industrySummary.map(([industry, count]) => (
                      <div key={industry} className="flex items-center justify-between rounded-2xl bg-surface-muted px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{ background: `${INDUSTRY_COLORS[industry] || INDUSTRY_COLORS.Other}18`, color: INDUSTRY_COLORS[industry] || INDUSTRY_COLORS.Other }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              {INDUSTRY_ICONS[industry]}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-text">{INDUSTRY_ZH[industry] || industry}</span>
                        </div>
                        <span className="text-sm font-black text-text">{count}</span>
                      </div>
                    )) : (
                      <p className="text-sm text-text-muted">暂无行业数据。</p>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/80 bg-white/86 px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-text-subtle">浏览提示</p>
                  <div className="mt-4 grid gap-3 text-sm leading-7 text-text-muted">
                    <p>先看精选职位，适合快速扫一眼当前最值得点开的岗位。</p>
                    <p>左侧行业筛选会继续保留，适合按餐饮、门店或司机等分类进入。</p>
                    <p>如果你要招人，直接点击发布招聘即可，不需要离开当前页面。</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
            <div>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <Badge color="#2E7D5A">精选职位</Badge>
                  <h2
                    className="mt-3 text-2xl font-black tracking-tight text-text"
                    style={{ fontFamily: 'var(--font-headline)' }}
                  >
                    先看这些机会
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {featured.map(job => (
                  <JobCard key={job.id} job={job} onClick={() => setSelected(job)} />
                ))}
              </div>

              {browse.length > 0 && (
                <>
                  <div className="mb-5 mt-8 flex items-end justify-between gap-4">
                    <div>
                      <Badge color="#2B6CB0">全部浏览</Badge>
                      <h2
                        className="mt-3 text-2xl font-black tracking-tight text-text"
                        style={{ fontFamily: 'var(--font-headline)' }}
                      >
                        更多职位
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {browse.map(job => (
                      <JobCard key={job.id} job={job} onClick={() => setSelected(job)} />
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="grid gap-5">
              <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_46px_rgba(58,44,31,0.08)]">
                <Badge color="#B8843C">快速入口</Badge>
                <h2
                  className="mt-3 text-xl font-black tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  现在可以做什么
                </h2>
                <div className="mt-4 grid gap-3">
                  {[
                    ['查看当前分类职位', null],
                    ['发布新的招聘信息', handleCreateClick],
                    ['点开职位查看联系方式', null],
                  ].map(([label, handler], index) => (
                    <button
                      key={`${index}-${label}`}
                      onClick={handler || undefined}
                      className={`flex items-center justify-between rounded-2xl border border-border px-4 py-4 text-left ${
                        handler ? 'bg-surface-muted transition-colors hover:bg-surface' : 'bg-surface-muted'
                      }`}
                    >
                      <span className="text-sm font-semibold text-text">{label}</span>
                      <span className="material-symbols-outlined text-accent" style={{ fontSize: 18 }}>
                        {handler ? 'arrow_outward' : 'visibility'}
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="rounded-[28px] border-white/80 bg-white/92 shadow-[0_20px_46px_rgba(58,44,31,0.08)]">
                <Badge color="#2E7D5A">市场动态</Badge>
                <h2
                  className="mt-3 text-xl font-black tracking-tight text-text"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  最新发布
                </h2>
                <div className="mt-4 grid gap-3">
                  {jobs.slice(0, 4).map((job) => (
                    <button
                      key={`latest-${job.id}`}
                      onClick={() => setSelected(job)}
                      className="rounded-2xl border border-border bg-surface-muted px-4 py-4 text-left transition-colors hover:bg-surface"
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] text-text-subtle">
                        {INDUSTRY_ZH[job.industry] || job.industry} · {job.created_at?.slice(0, 10)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-text">
                        {job.title}
                      </p>
                      <p className="mt-2 text-xs text-text-muted">
                        {job.location || '地点待补充'}{job.salary_range ? ` · ${job.salary_range}` : ''}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
