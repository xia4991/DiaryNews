import Card from '../ui/Card'
import SkeletonCard from '../ui/SkeletonCard'

export default function NewsTabSkeleton({ variant = 'portugal' }) {
  const accent = variant === 'china' ? '#9D3D33' : '#2B6CB0'

  return (
    <div className="grid gap-6 page-enter">
      <Card
        className="overflow-hidden rounded-[30px] p-0"
        style={{
          borderColor: `${accent}22`,
          background: variant === 'china'
            ? 'linear-gradient(135deg,#fff8ef 0%,#f5ead9 100%)'
            : 'linear-gradient(135deg,#f7fbff 0%,#eef4fb 100%)',
        }}
      >
        <div className="grid gap-6 px-6 py-6 sm:px-7 sm:py-7 xl:grid-cols-[minmax(0,1.15fr)_320px]">
          <div className="animate-pulse">
            <div className="h-3 w-28 rounded-full" style={{ background: `${accent}30` }} />
            <div className="mt-5 h-10 w-64 rounded bg-bg-subtle" />
            <div className="mt-3 h-4 w-[70%] rounded bg-bg-subtle" />
            <div className="mt-6 rounded-[24px] border border-white/75 bg-white/70 px-5 py-5">
              <div className="h-3 w-32 rounded bg-bg-subtle" />
              <div className="mt-4 h-8 w-[85%] rounded bg-bg-subtle" />
              <div className="mt-3 h-4 w-full rounded bg-bg-subtle" />
              <div className="mt-2 h-4 w-[92%] rounded bg-bg-subtle" />
              <div className="mt-2 h-4 w-[72%] rounded bg-bg-subtle" />
            </div>
          </div>

          <div className="grid gap-4">
            <SkeletonCard rows={2} />
            <SkeletonCard rows={3} />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SkeletonCard rows={3} />
        <SkeletonCard rows={3} />
        <SkeletonCard rows={3} />
      </div>
    </div>
  )
}
