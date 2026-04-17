import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { INDUSTRY_ZH, INDUSTRY_ICONS } from '../../constants/industries'
import { INDUSTRY_COLORS } from '../../constants/colors'

export default function JobCard({ job, onClick }) {
  const color = INDUSTRY_COLORS[job.industry] || INDUSTRY_COLORS.Other
  return (
    <Card interactive padding="md" onClick={onClick} className="flex flex-col gap-2.5 group">
      <div className="flex items-center justify-between">
        <Badge color={color} icon={INDUSTRY_ICONS[job.industry]}>
          {INDUSTRY_ZH[job.industry] || job.industry}
        </Badge>
        {job.status === 'expired' && (
          <Badge variant="pill" color="#8A90A3">已过期</Badge>
        )}
      </div>

      <h3
        className="text-[15px] font-bold text-text leading-snug line-clamp-2 group-hover:text-accent transition-colors"
        style={{ fontFamily: 'var(--font-headline)' }}
      >
        {job.title}
      </h3>

      {job.salary_range && (
        <div className="flex items-center gap-1 text-xs text-success">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>payments</span>
          <span className="font-semibold">{job.salary_range}</span>
        </div>
      )}

      {job.location && (
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
          <span>{job.location}</span>
        </div>
      )}

      <span className="text-[11px] text-text-subtle mt-auto tabular-nums">
        {job.created_at?.slice(0, 10)}
      </span>
    </Card>
  )
}
