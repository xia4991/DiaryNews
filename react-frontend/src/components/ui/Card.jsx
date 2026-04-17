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
  ...rest
}) {
  const base = 'bg-surface border border-border rounded-xl shadow-card'
  const hover = interactive
    ? 'transition-shadow transition-colors cursor-pointer hover:shadow-lift hover:bg-bg-subtle'
    : ''
  return createElement(
    tag,
    { className: `${base} ${PAD[padding]} ${hover} ${className}`.trim(), ...rest },
    children,
  )
}
