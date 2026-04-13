import { useEffect } from 'react'
import SummaryText from '../SummaryText'

// Split raw transcript into readable paragraphs.
// Groups sentences (split by . ? ! 。？！) into ~3-sentence chunks.
// Falls back to fixed-char splits for unpunctuated text (e.g. raw Chinese).
function organizeTranscript(text) {
  if (!text) return []

  // Try sentence-boundary split
  const sentences = text
    .split(/(?<=[.?!。？！])\s+/)
    .map(s => s.trim())
    .filter(Boolean)

  if (sentences.length >= 3) {
    const paragraphs = []
    for (let i = 0; i < sentences.length; i += 3) {
      paragraphs.push(sentences.slice(i, i + 3).join(' '))
    }
    return paragraphs
  }

  // No sentence boundaries — split at word boundary every ~250 chars
  const words = text.split(/\s+/)
  const paragraphs = []
  let chunk = []
  let len = 0
  for (const word of words) {
    chunk.push(word)
    len += word.length + 1
    if (len >= 250) {
      paragraphs.push(chunk.join(' '))
      chunk = []
      len = 0
    }
  }
  if (chunk.length) paragraphs.push(chunk.join(' '))
  return paragraphs
}

const TIER_LABELS = { 1: 'Auto-captions', 2: 'Whisper API', 3: 'Whisper Local' }

export default function VideoModal({ video, onClose }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!video) return null

  const pub = video.published?.slice(0, 10)
  const caption = video.caption
  const paragraphs = organizeTranscript(caption?.text)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(6,14,32,0.88)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}>

      <div className="relative w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{ background: '#131b2e', border: '1px solid rgba(70,69,84,0.2)' }}
        onClick={e => e.stopPropagation()}>

        {/* Thumbnail header */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-t-2xl sm:rounded-t-2xl">
          <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #131b2e 0%, transparent 60%)' }} />
          <button onClick={onClose}
            className="absolute top-3 right-3 rounded-full p-1 text-white hover:text-on-surface transition-colors"
            style={{ background: 'rgba(0,0,0,0.5)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-5 p-5">

          {/* Title + meta */}
          <div>
            <h2 className="text-base font-bold font-headline leading-snug mb-2">{video.title}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="h-5 w-5 rounded flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'rgba(255,255,255,0.08)' }}>
                {video.channel_name?.[0]}
              </div>
              <span className="text-xs font-semibold text-on-surface-variant">{video.channel_name}</span>
              <span className="text-xs text-on-surface-variant">· {pub}</span>
              {caption?.tier && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: 'rgba(68,226,205,0.08)', color: '#44e2cd', border: '1px solid rgba(68,226,205,0.2)' }}>
                  {TIER_LABELS[caption.tier] ?? `Tier ${caption.tier}`}
                </span>
              )}
            </div>
          </div>

          {/* AI Summary */}
          {caption?.summary && (
            <div className="rounded-xl p-4"
              style={{ background: 'rgba(68,226,205,0.05)', borderLeft: '3px solid rgba(68,226,205,0.4)' }}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-secondary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="text-xs font-bold text-secondary uppercase tracking-widest">AI Summary</span>
              </div>
              <SummaryText text={caption.summary} />
            </div>
          )}

          {/* Organized caption */}
          {paragraphs.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 14 }}>format_align_left</span>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Organized Transcript</span>
              </div>
              <div className="flex flex-col gap-3">
                {paragraphs.map((para, i) => (
                  <p key={i} className="text-xs text-on-surface-variant leading-relaxed">{para}</p>
                ))}
              </div>
            </div>
          )}

          {/* Raw extracted caption */}
          {caption?.text && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1 select-none">
                <span className="material-symbols-outlined transition-transform group-open:rotate-90" style={{ fontSize: 14 }}>chevron_right</span>
                Raw Transcript
              </summary>
              <div className="mt-3 text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap opacity-70">
                {caption.text}
              </div>
            </details>
          )}

          {/* No caption yet */}
          {!caption && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 18 }}>subtitles</span>
              <span className="text-xs text-on-surface-variant">No transcript yet — generate a summary from the feed.</span>
            </div>
          )}

          {/* Watch on YouTube */}
          <a href={video.link} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #ff6b6b, #c2185b)', color: '#fff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_circle</span>
            Watch on YouTube
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
          </a>
        </div>
      </div>
    </div>
  )
}
