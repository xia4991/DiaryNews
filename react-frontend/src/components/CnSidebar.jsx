import SidebarShell, { navItemClass, navCountClass, sectionLabel } from './SidebarShell'
import { CATEGORY_ZH, CATEGORY_ICONS } from '../constants/categories'

const TAG_ICONS = {
  '移民签证': 'flight',
  '房产租房': 'home',
  '法律法规': 'gavel',
  '工作就业': 'work',
  '教育留学': 'school',
  '税务财务': 'account_balance',
  '华人社区': 'diversity_3',
  '安全治安': 'shield',
  '医疗社保': 'local_hospital',
  '中葡关系': 'handshake',
}

export default function CnSidebar({
  cnTags, activeCnTag, onCnTagChange,
  categories, activeCategory, onCategoryChange,
  lastUpdated,
}) {
  return (
    <SidebarShell title="华人关注" lastUpdated={lastUpdated}>
      <button onClick={() => { onCnTagChange('All'); onCategoryChange('All') }}
        className={navItemClass(activeCnTag === 'All' && activeCategory === 'All')}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>trending_up</span>
        <span className="flex-1">全部</span>
      </button>

      {cnTags.length > 0 && sectionLabel('华人话题')}

      {cnTags.map(tag => (
        <button key={tag.name} onClick={() => onCnTagChange(tag.name)}
          className={navItemClass(activeCnTag === tag.name)}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{TAG_ICONS[tag.name] || 'label'}</span>
          <span className="flex-1">{tag.name}</span>
          <span className={navCountClass}>{tag.count}</span>
        </button>
      ))}

      {categories.length > 0 && sectionLabel('新闻分类')}

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
