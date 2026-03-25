import SidebarShell, { navItemClass, sectionLabel } from '../SidebarShell'

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
  const videosByChannel = {}
  for (const v of videos) {
    videosByChannel[v.channel_id] = (videosByChannel[v.channel_id] || 0) + 1
  }

  const videosByCategory = {}
  for (const ch of channels) {
    videosByCategory[ch.category] = (videosByCategory[ch.category] || 0) + (videosByChannel[ch.channel_id] || 0)
  }
  const categories = Object.entries(videosByCategory)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const isActive = (kind, value) => activeFilter.kind === kind && activeFilter.value === value

  return (
    <SidebarShell title="YouTube" lastUpdated={lastUpdated}>
      <button onClick={() => onFilterChange({ kind: 'all', value: '' })}
        className={navItemClass(activeFilter.kind === 'all')}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>video_library</span>
        <span className="flex-1">All Videos</span>
        <span className="text-on-surface-variant opacity-60">{videos.length}</span>
      </button>

      {channels.length > 0 && (
        <>
          {sectionLabel('Channels')}
          {channels.map(ch => (
            <button key={ch.handle} onClick={() => onFilterChange({ kind: 'channel', value: ch.channel_id })}
              className={navItemClass(isActive('channel', ch.channel_id))}>
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

      {categories.length > 0 && (
        <>
          {sectionLabel('Categories')}
          {categories.map(({ name, count }) => (
            <button key={name} onClick={() => onFilterChange({ kind: 'category', value: name })}
              className={navItemClass(isActive('category', name))}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{CATEGORY_ICONS[name] || 'label'}</span>
              <span className="flex-1">{name}</span>
              <span className="text-on-surface-variant opacity-60">{count}</span>
            </button>
          ))}
        </>
      )}
    </SidebarShell>
  )
}
