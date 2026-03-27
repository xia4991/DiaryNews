import { useState } from 'react'
import { api } from '../../api'
import SummaryText from '../SummaryText'

export default function VideoFeedItem({ video, onCaptionUpdate }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const pub = video.published?.slice(0, 10)
  const caption = video.caption
  const attempted = 'caption' in video

  const handleGetCaption = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.getCaption(video.video_id)
      onCaptionUpdate(video.video_id, res.caption)
    } catch (err) {
      setError(err.response?.data?.detail || 'Request failed. Check server logs.')
    } finally {
      setLoading(false)
    }
  }

  const handleClearCaption = async () => {
    await api.clearCaption(video.video_id)
    onCaptionUpdate(video.video_id, undefined)
  }

  return (
    <div className="rounded-xl overflow-hidden flex flex-col lg:flex-row"
      style={{ background: '#131b2e', outline: '1px solid rgba(70,69,84,0.15)' }}>

      {/* Thumbnail */}
      <a href={video.link} target="_blank" rel="noopener noreferrer"
        className="lg:w-1/3 aspect-video relative group shrink-0 block overflow-hidden">
        <img src={video.thumbnail} alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
          <span className="material-symbols-outlined text-white text-4xl opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ fontVariationSettings: "'FILL' 1" }}>play_circle</span>
        </div>
      </a>

      {/* Content */}
      <div className="p-4 flex-grow flex flex-col gap-2">

        {/* Title */}
        <a href={video.link} target="_blank" rel="noopener noreferrer"
          className="text-sm font-bold leading-snug hover:text-secondary transition-colors">
          {video.title}
        </a>

        {/* AI Summary */}
        {caption?.summary ? (
          <div className="rounded-lg px-3 py-2"
            style={{ background: 'rgba(68,226,205,0.05)', borderLeft: '3px solid rgba(68,226,205,0.4)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              <span className="text-xs font-bold text-secondary uppercase tracking-widest">AI Summary</span>
              <button onClick={handleClearCaption}
                className="ml-auto text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>refresh</span>
              </button>
            </div>
            <SummaryText text={caption.summary} />
          </div>
        ) : attempted && caption === null ? (
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error" style={{ fontSize: 14 }}>subtitles_off</span>
            <span className="text-xs text-on-surface-variant">Captions unavailable</span>
            <button onClick={handleClearCaption}
              className="text-xs text-secondary font-bold hover:underline ml-1">Retry</button>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <button onClick={handleGetCaption} disabled={loading}
              className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #c2c1ff, #5e5ce6)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>{loading ? 'hourglass_empty' : 'auto_awesome'}</span>
              {loading ? 'Generating…' : 'Generate Summary'}
            </button>
            {error && (
              <span className="text-xs flex items-center gap-1" style={{ color: '#ffb4ab' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>error</span>
                {error}
              </span>
            )}
          </div>
        )}

        {/* Channel + date */}
        <div className="flex items-center gap-2 mt-auto pt-1">
          <div className="h-4 w-4 rounded flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            {video.channel_name?.[0]}
          </div>
          <span className="text-xs font-semibold text-on-surface-variant">{video.channel_name}</span>
          <span className="text-on-surface-variant text-xs">· {pub}</span>
        </div>
      </div>
    </div>
  )
}
