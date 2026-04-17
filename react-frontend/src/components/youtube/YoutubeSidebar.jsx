import SidebarShell from '../SidebarShell'
import { navItemClass, navCountClass, sectionLabel } from '../sidebarShellStyles.jsx'

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
        <span className={navCountClass}>{videos.length}</span>
      </button>

      {channels.length > 0 && (
        <>
          {sectionLabel('Channels')}
          {channels.map(ch => ch.channel_id ? (
            <button key={ch.handle} onClick={() => onFilterChange({ kind: 'channel', value: ch.channel_id })}
              className={navItemClass(isActive('channel', ch.channel_id))}>
              <div className="h-4 w-4 rounded flex items-center justify-center text-[10px] font-bold shrink-0 bg-bg-subtle text-text-muted">
                {ch.name?.[0]}
              </div>
              <span className="flex-1 truncate">{ch.name || ch.handle}</span>
              <span className={navCountClass}>{videosByChannel[ch.channel_id] || 0}</span>
            </button>
          ) : (
            <div key={ch.handle} className="flex items-center gap-2 px-2.5 py-1.5 text-text-subtle cursor-default">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>hourglass_empty</span>
              <span className="flex-1 truncate">{ch.handle}</span>
              <span style={{ fontSize: 10 }}>pending</span>
            </div>
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
              <span className={navCountClass}>{count}</span>
            </button>
          ))}
        </>
      )}
    </SidebarShell>
  )
}
