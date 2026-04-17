import { INDUSTRY_ZH, INDUSTRY_ICONS, INDUSTRY_COLORS } from '../../constants/industries'

export default function JobCard({ job, onClick }) {
  const color = INDUSTRY_COLORS[job.industry] || INDUSTRY_COLORS.Other
  return (
    <div
      onClick={onClick}
      className="rounded-xl flex flex-col gap-2.5 p-4 cursor-pointer transition-all hover:brightness-110"
      style={{ background: '#131b2e', outline: '1px solid rgba(70,69,84,0.15)' }}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
          <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{INDUSTRY_ICONS[job.industry]}</span>
          {INDUSTRY_ZH[job.industry] || job.industry}
        </span>
        {job.status === 'expired' && (
          <span className="text-xs font-bold text-on-surface-variant opacity-60">已过期</span>
        )}
      </div>

      <h3 className="text-sm font-bold leading-snug line-clamp-2">{job.title}</h3>

      {job.salary_range && (
        <div className="flex items-center gap-1 text-xs" style={{ color: '#44e2cd' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>
          <span className="font-bold">{job.salary_range}</span>
        </div>
      )}

      {job.location && (
        <div className="flex items-center gap-1 text-xs text-on-surface-variant">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
          <span>{job.location}</span>
        </div>
      )}

      <span className="text-xs text-on-surface-variant mt-auto opacity-60">
        {job.created_at?.slice(0, 10)}
      </span>
    </div>
  )
}
