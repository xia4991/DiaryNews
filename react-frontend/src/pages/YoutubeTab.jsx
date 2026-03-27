import { useState } from 'react'
import VideoFeedItem from '../components/youtube/VideoFeedItem'
import ChannelManager from '../components/youtube/ChannelManager'

export default function YoutubeTab({ channels, videos, fetchError, onChannelsUpdate, onCaptionUpdate, onError }) {
  const [showManager, setShowManager] = useState(!channels.length)

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold font-headline">Visual Intelligence</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded"
              style={{ background: 'rgba(255,99,99,0.1)', color: '#ff6363', border: '1px solid rgba(255,99,99,0.2)' }}>
              LIVE FEED
            </span>
          </div>
          {!videos.length && channels.length > 0 && (
            <p className="text-xs text-on-surface-variant mt-1">
              Click <strong className="text-on-surface">Fetch YouTube</strong> in the top bar to load videos.
            </p>
          )}
        </div>
        <button onClick={() => setShowManager(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: showManager ? 'rgba(68,226,205,0.1)' : 'rgba(45,52,73,0.5)',
                   color: showManager ? '#44e2cd' : '#c7c4d7' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>manage_accounts</span>
          Channels
        </button>
      </div>

      {showManager && (
        <div className="mb-5">
          <ChannelManager channels={channels} onUpdate={onChannelsUpdate} />
        </div>
      )}

      {fetchError && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs"
          style={{ background: 'rgba(255,180,171,0.08)', border: '1px solid rgba(255,180,171,0.2)', color: '#ffb4ab' }}>
          <span className="material-symbols-outlined shrink-0" style={{ fontSize: 14 }}>error</span>
          {fetchError}
        </div>
      )}

      {videos.length === 0 && !channels.length ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 36 }}>video_library</span>
          <p className="text-on-surface-variant text-sm">Add a channel above to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {videos.map(video => (
            <VideoFeedItem
              key={video.video_id}
              video={video}
              onCaptionUpdate={onCaptionUpdate}
              onError={onError}
            />
          ))}
        </div>
      )}
    </div>
  )
}
