import SidebarShell from '../SidebarShell'
import { DEAL_TYPE_ZH, DEAL_TYPE_COLORS } from '../../constants/realestate'

export default function RealEstateSidebar({ counts, activeDealType, onDealTypeChange, activeRooms, onRoomsChange }) {
  const types = [
    { key: 'All', label: '全部', count: Object.values(counts).reduce((a, b) => a + b, 0) },
    { key: 'sale', label: DEAL_TYPE_ZH.sale, count: counts.sale || 0 },
    { key: 'rent', label: DEAL_TYPE_ZH.rent, count: counts.rent || 0 },
  ]

  const rooms = [
    { key: 'All', label: '不限' },
    { key: '1', label: '1+ 房' },
    { key: '2', label: '2+ 房' },
    { key: '3', label: '3+ 房' },
    { key: '4', label: '4+ 房' },
  ]

  return (
    <SidebarShell title="房产">
      <div className="flex flex-col gap-1">
        {types.map(t => {
          const active = activeDealType === t.key
          const color = t.key === 'All' ? '#5E6478' : DEAL_TYPE_COLORS[t.key]
          return (
            <button
              key={t.key}
              onClick={() => onDealTypeChange(t.key)}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                active ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:bg-bg-subtle hover:text-text'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: active ? color : 'transparent', border: `1.5px solid ${color}` }}
                />
                {t.label}
              </span>
              <span>{t.count}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-subtle">房间数</p>
        <div className="flex flex-col gap-1">
          {rooms.map(r => {
            const active = activeRooms === r.key
            return (
              <button
                key={r.key}
                onClick={() => onRoomsChange(r.key)}
                className={`rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  active ? 'bg-accent-subtle text-accent' : 'text-text-muted hover:bg-bg-subtle hover:text-text'
                }`}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>
    </SidebarShell>
  )
}
