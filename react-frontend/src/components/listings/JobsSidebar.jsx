import SidebarShell from '../SidebarShell'
import { navItemClass, navCountClass, sectionLabel } from '../sidebarShellStyles.jsx'
import { JOB_INDUSTRIES, INDUSTRY_ZH, INDUSTRY_ICONS } from '../../constants/industries'

export default function JobsSidebar({ counts, activeIndustry, onIndustryChange, lastUpdated }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <SidebarShell title="招聘" lastUpdated={lastUpdated}>
      <button onClick={() => onIndustryChange('All')} className={navItemClass(activeIndustry === 'All')}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>work</span>
        <span className="flex-1">全部</span>
        <span className={navCountClass}>{total}</span>
      </button>

      {sectionLabel('行业')}

      {JOB_INDUSTRIES.map(ind => (
        <button key={ind} onClick={() => onIndustryChange(ind)}
          className={navItemClass(activeIndustry === ind)}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{INDUSTRY_ICONS[ind]}</span>
          <span className="flex-1">{INDUSTRY_ZH[ind]}</span>
          <span className={navCountClass}>{counts[ind] || 0}</span>
        </button>
      ))}
    </SidebarShell>
  )
}
