import SidebarShell, { navItemClass, sectionLabel } from './SidebarShell'

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
    <SidebarShell title="Categories" lastUpdated={lastUpdated}>
      <button onClick={() => onCategoryChange('All')} className={navItemClass(activeCategory === 'All')}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>
        <span>All Stories</span>
      </button>

      {categories.length > 0 && sectionLabel('Topics')}

      {categories.map(cat => (
        <button key={cat.name} onClick={() => onCategoryChange(cat.name)}
          className={navItemClass(activeCategory === cat.name)}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{CATEGORY_ICONS[cat.name] || 'label'}</span>
          <span className="flex-1">{cat.name}</span>
          <span className="text-on-surface-variant opacity-60">{cat.count}</span>
        </button>
      ))}
    </SidebarShell>
  )
}
