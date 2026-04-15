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

const CATEGORY_ZH = {
  'Política':      '政治',
  'Desporto':      '体育',
  'Economia':      '经济',
  'Saúde':         '健康',
  'Tecnologia':    '科技',
  'Internacional': '国际',
  'Cultura':       '文化',
  'Ambiente':      '环境',
  'Crime/Justiça': '法治',
  'Sociedade':     '社会',
  'Geral':         '综合',
}

export default function Sidebar({ categories, activeCategory, onCategoryChange, lastUpdated }) {
  return (
    <SidebarShell title="分类" lastUpdated={lastUpdated}>
      <button onClick={() => onCategoryChange('All')} className={navItemClass(activeCategory === 'All')}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>
        <span>全部</span>
      </button>

      {categories.length > 0 && sectionLabel('主题')}

      {categories.map(cat => (
        <button key={cat.name} onClick={() => onCategoryChange(cat.name)}
          className={navItemClass(activeCategory === cat.name)}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{CATEGORY_ICONS[cat.name] || 'label'}</span>
          <span className="flex-1">{CATEGORY_ZH[cat.name] || cat.name}</span>
          <span className="text-on-surface-variant opacity-60">{cat.count}</span>
        </button>
      ))}
    </SidebarShell>
  )
}
