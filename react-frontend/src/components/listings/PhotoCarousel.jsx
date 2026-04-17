import { useState } from 'react'

export default function PhotoCarousel({ images = [] }) {
  const [index, setIndex] = useState(0)
  const [expanded, setExpanded] = useState(false)

  if (!images.length) return null

  const current = images[index]
  const hasPrev = index > 0
  const hasNext = index < images.length - 1

  const ArrowButton = ({ direction, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors"
      style={{ [direction === 'prev' ? 'left' : 'right']: 8 }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        {direction === 'prev' ? 'chevron_left' : 'chevron_right'}
      </span>
    </button>
  )

  return (
    <>
      <div className="relative overflow-hidden rounded-xl bg-surface-muted">
        <div
          className="cursor-pointer"
          onClick={() => setExpanded(true)}
        >
          <img
            src={current.url || current.thumb_url}
            alt=""
            className="w-full aspect-[4/3] object-cover"
          />
        </div>

        {hasPrev && <ArrowButton direction="prev" onClick={() => setIndex(i => i - 1)} />}
        {hasNext && <ArrowButton direction="next" onClick={() => setIndex(i => i + 1)} />}

        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 24 }}>close</span>
          </button>

          <img
            src={current.url}
            alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {hasPrev && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIndex(i => i - 1) }}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>chevron_left</span>
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setIndex(i => i + 1) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>chevron_right</span>
            </button>
          )}
        </div>
      )}
    </>
  )
}
