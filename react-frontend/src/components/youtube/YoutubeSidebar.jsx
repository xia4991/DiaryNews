const CATEGORY_ICONS = {
  'Tecnologia':     'memory',
  'Desporto':       'sports_soccer',
  'Manga/Anime':    'auto_stories',
  'Entretenimento': 'theater_comedy',
  'Notícias':       'newspaper',
  'Ciência':        'science',
  'Educação':       'school',
  'Música':         'music_note',
  'Jogos':          'sports_esports',
  'Outros':         'label',
}

export default function YoutubeSidebar({ channels, videos, activeFilter, onFilterChange, lastUpdated }) {
  // Count videos per channel_id
  const videosByChannel = {}
  for (const v of videos) {
    videosByChannel[v.channel_id] = (videosByChannel[v.channel_id] || 0) + 1
  }

  // Count videos per category
  const videosByCategory = {}
  for (const ch of channels) {
    const count = videosByChannel[ch.channel_id] || 0
    videosByCategory[ch.category] = (videosByCategory[ch.category] || 0) + count
  }
  const categories = Object.entries(videosByCategory)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const isActive = (kind, value) => activeFilter.kind === kind && activeFilter.value === value

  return (
    <aside className="hidden lg:flex h-screen w-52 fixed left-0 top-0 pt-14 flex-col gap-0.5 p-3 font-label text-xs font-medium"
      style={{ background: 'rgba(13,19,46,0.6)', backdropFilter: 'blur(16px)' }}>

      <div className="mb-3 px-2 pt-2">
        <h3 className="text-xs font-bold text-primary font-headline uppercase tracking-widest">YouTube</h3>
        {lastUpdated && <p className="text-on-surface-variant text-xs mt-0.5">{lastUpdated.slice(0, 16).replace('T', ' ')}</p>}
      </div>

      <nav className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar flex-1">
        {/* All */}
        <button onClick={() => onFilterChange({ kind: 'all', value: '' })}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left ${
            activeFilter.kind === 'all' ? 'bg-secondary/10 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>video_library</span>
          <span className="flex-1">All Videos</span>
          <span className="text-on-surface-variant opacity-60">{videos.length}</span>
        </button>

        {/* Channels */}
        {channels.length > 0 && (
          <>
            <div className="px-2 pt-3 pb-1">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-50">Channels</span>
            </div>
            {channels.map(ch => (
              <button key={ch.handle} onClick={() => onFilterChange({ kind: 'channel', value: ch.channel_id })}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left ${
                  isActive('channel', ch.channel_id) ? 'bg-secondary/10 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}>
                <div className="h-4 w-4 rounded flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'rgba(255,255,255,0.08)' }}>
                  {ch.name?.[0]}
                </div>
                <span className="flex-1 truncate">{ch.name || ch.handle}</span>
                <span className="text-on-surface-variant opacity-60">{videosByChannel[ch.channel_id] || 0}</span>
              </button>
            ))}
          </>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <>
            <div className="px-2 pt-3 pb-1">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest opacity-50">Categories</span>
            </div>
            {categories.map(({ name, count }) => (
              <button key={name} onClick={() => onFilterChange({ kind: 'category', value: name })}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left ${
                  isActive('category', name) ? 'bg-secondary/10 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                }`}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{CATEGORY_ICONS[name] || 'label'}</span>
                <span className="flex-1">{name}</span>
                <span className="text-on-surface-variant opacity-60">{count}</span>
              </button>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
