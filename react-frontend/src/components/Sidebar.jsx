const CATEGORY_ICONS = {
  'Política':      'gavel',
  'Desporto':      'sports_soccer',
  'Economia':      'trending_up',
  'Saúde':         'health_and_safety',
  'Tecnologia':    'memory',
  'Internacional': 'public',
  'Cultura':       'theater_comedy',
  'Ambiente':      'eco',
  'Crime/Justiça': 'security',
  'Sociedade':     'groups',
  'Geral':         'newspaper',
}

export default function Sidebar({ categories, activeCategory, onCategoryChange, lastUpdated }) {
  return (
    <aside className="hidden lg:flex h-screen w-52 fixed left-0 top-0 pt-14 flex-col gap-0.5 p-3 font-label text-xs font-medium"
      style={{ background: 'rgba(13,19,46,0.6)', backdropFilter: 'blur(16px)' }}>

      <div className="mb-3 px-2 pt-2">
        <h3 className="text-xs font-bold text-primary font-headline uppercase tracking-widest">Categories</h3>
        {lastUpdated && <p className="text-on-surface-variant text-xs mt-0.5">{lastUpdated.slice(0, 16).replace('T', ' ')}</p>}
      </div>

      <nav className="flex flex-col gap-0.5 overflow-y-auto no-scrollbar flex-1">
        <button onClick={() => onCategoryChange('All')}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left ${
            activeCategory === 'All' ? 'bg-secondary/10 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>
          <span>All Stories</span>
        </button>

        {categories.map(cat => (
          <button key={cat.name} onClick={() => onCategoryChange(cat.name)}
            className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left ${
              activeCategory === cat.name ? 'bg-secondary/10 text-secondary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
            }`}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{CATEGORY_ICONS[cat.name] || 'label'}</span>
            <span className="flex-1">{cat.name}</span>
            <span className="text-on-surface-variant opacity-60">{cat.count}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
