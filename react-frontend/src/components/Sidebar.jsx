import SidebarShell from './SidebarShell'
import { navItemClass, navCountClass, sectionLabel } from './sidebarShellStyles.jsx'
import { CATEGORY_ZH, CATEGORY_ICONS } from '../constants/categories'

export default function Sidebar({ categories, activeCategory, onCategoryChange, lastUpdated }) {
  return (
    <SidebarShell title="分类" lastUpdated={lastUpdated}>
      <button onClick={() => onCategoryChange('All')} className={navItemClass(activeCategory === 'All')}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>
        <span className="flex-1">全部</span>
      </button>

      {categories.length > 0 && sectionLabel('主题')}

      {categories.map(cat => (
        <button key={cat.name} onClick={() => onCategoryChange(cat.name)}
          className={navItemClass(activeCategory === cat.name)}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{CATEGORY_ICONS[cat.name] || 'label'}</span>
          <span className="flex-1">{CATEGORY_ZH[cat.name] || cat.name}</span>
          <span className={navCountClass}>{cat.count}</span>
        </button>
      ))}
    </SidebarShell>
  )
}
