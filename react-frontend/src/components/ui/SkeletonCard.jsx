import Card from './Card'

export default function SkeletonCard({ rows = 3 }) {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-3 animate-pulse">
        <div className="h-3 w-24 rounded bg-bg-subtle" />
        <div className="h-5 w-full rounded bg-bg-subtle" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-3 rounded bg-bg-subtle"
            style={{ width: `${90 - i * 15}%` }}
          />
        ))}
      </div>
    </Card>
  )
}
