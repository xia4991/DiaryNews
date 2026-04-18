import SidebarShell from '../SidebarShell'
import { CATEGORY_ZH, CATEGORY_COLORS, CONDITION_ZH, CONDITION_COLORS } from '../../constants/secondhand'

export default function SecondHandSidebar({ counts, activeCategory, onCategoryChange, activeCondition, onConditionChange }) {
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0)
  const categories = [
    { key: 'All', label: '全部', count: allCount },
    ...Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, label: CATEGORY_ZH[key] || key, count })),
  ]

  const conditions = [
    { key: 'All', label: '不限' },
    { key: 'new', label: CONDITION_ZH.new },
    { key: 'like_new', label: CONDITION_ZH.like_new },
    { key: 'good', label: CONDITION_ZH.good },
    { key: 'fair', label: CONDITION_ZH.fair },
  ]

  return (
    <SidebarShell title="二手市场">
      <div className="flex flex-col gap-1">
        {categories.map(c => {
          const active = activeCategory === c.key
          const color = c.key === 'All' ? '#5E6478' : (CATEGORY_COLORS[c.key] || '#5E6478')
          return (
            <button
              key={c.key}
              onClick={() => onCategoryChange(c.key)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                active ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:bg-bg-subtle hover:text-text'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: active ? color : 'transparent', border: `1.5px solid ${color}` }}
                />
                {c.label}
              </span>
              <span>{c.count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-subtle">成色</p>
        <div className="flex flex-col gap-1">
          {conditions.map(c => {
            const active = activeCondition === c.key
            return (
              <button
                key={c.key}
                onClick={() => onConditionChange(c.key)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  active ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:bg-bg-subtle hover:text-text'
                }`}
              >
                {c.key !== 'All' && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: active ? CONDITION_COLORS[c.key] : 'transparent', border: `1.5px solid ${CONDITION_COLORS[c.key]}` }}
                  />
                )}
                {c.label}
              </button>
            )
          })}
        </div>
      </div>
    </SidebarShell>
  )
}
