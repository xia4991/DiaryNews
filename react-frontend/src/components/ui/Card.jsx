import { createElement } from 'react'

const PAD = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
}

export default function Card({
  as: tag = 'div',
  interactive = false,
  padding = 'md',
  className = '',
  children,
  onClick,
  ...rest
}) {
  const base = 'bg-surface border border-border rounded-xl shadow-card'
  const hover = interactive
    ? 'transition-shadow transition-colors cursor-pointer hover:shadow-lift hover:bg-bg-subtle'
    : ''
  // When the card is a clickable surface, make it keyboard- and screen-reader-operable
  // (WCAG 2.1.1 / 4.1.2): expose it as a button and fire onClick on Enter/Space.
  const interactiveProps =
    interactive && onClick
      ? {
          role: 'button',
          tabIndex: 0,
          onClick,
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick(e)
            }
          },
        }
      : (onClick ? { onClick } : {})
  return createElement(
    tag,
    { className: `${base} ${PAD[padding]} ${hover} ${className}`.trim(), ...interactiveProps, ...rest },
    children,
  )
}
