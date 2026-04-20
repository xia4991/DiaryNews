import { HOT_WINDOW_OPTIONS } from '../../utils/newsHotness'

export default function HotWindowToggle({ value, onChange }) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-surface-muted p-1">
      {HOT_WINDOW_OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              active
                ? 'bg-white text-text shadow-[0_4px_14px_rgba(58,44,31,0.08)]'
                : 'text-text-subtle hover:text-text'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
