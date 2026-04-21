export default function AdminBadge({ compact = false, className = '' }) {
  const sizeClasses = compact
    ? 'gap-1 px-2 py-0.5 text-[10px]'
    : 'gap-1.5 px-2.5 py-1 text-[11px]'

  return (
    <span
      className={`inline-flex items-center rounded-full border border-[#D8B6A3] bg-[#9D3D3312] font-bold tracking-[0.04em] text-[#8F3B31] ${sizeClasses} ${className}`.trim()}
    >
      <span className="material-symbols-outlined" style={{ fontSize: compact ? 12 : 14 }}>
        verified_user
      </span>
      管理员
    </span>
  )
}
