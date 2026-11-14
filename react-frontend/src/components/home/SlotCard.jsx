import { useState } from 'react'
import Card from '../ui/Card'
import { api } from '../../api'

function SlotImage({ src, className }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) return null
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`bg-bg-subtle object-cover ${className}`}
    />
  )
}

/**
 * One admin-managed home-page slot (notice or promo). `layout="row"` puts the image
 * beside the text from the sm breakpoint up (banner / feed); `layout="stack"` puts it
 * on top (sidebar). Promos always carry a visible “推广” mark.
 */
export default function SlotCard({ slot, layout = 'row' }) {
  const isPromo = slot.kind === 'promo'
  const row = layout === 'row'
  const link = /^https?:\/\//i.test(slot.link_url || '') ? slot.link_url : ''
  const rel = isPromo ? 'noopener sponsored' : 'noopener noreferrer'
  const trackClick = () => api.track('outbound', { target: link, title: `${isPromo ? '推广' : '公告'}：${slot.title}` })

  return (
    <Card padding="none" className={`overflow-hidden ${row ? 'sm:flex' : ''}`}>
      <SlotImage
        src={slot.image_url}
        className={row ? 'aspect-[16/9] w-full sm:aspect-auto sm:w-56 sm:shrink-0' : 'aspect-[16/9] w-full'}
      />
      <div className="min-w-0 flex-1 px-4 py-3 sm:px-5">
        <h3 className="text-[15px] font-bold leading-6 text-text">
          {isPromo && (
            <span className="mr-1.5 rounded border border-border-strong px-1 py-px align-middle text-[11px] font-medium text-text-subtle">
              推广
            </span>
          )}
          {link ? (
            <a href={link} target="_blank" rel={rel} onClick={trackClick} className="transition-colors hover:text-accent">
              {slot.title}
            </a>
          ) : slot.title}
        </h3>
        <p className="mt-1 whitespace-pre-line text-[13px] leading-6 text-text-muted">{slot.content}</p>
        {link && (
          <a
            href={link}
            target="_blank"
            rel={rel}
            onClick={trackClick}
            className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-accent transition-colors hover:text-accent-hover"
          >
            {slot.link_label || '了解详情'}
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
          </a>
        )}
      </div>
    </Card>
  )
}
