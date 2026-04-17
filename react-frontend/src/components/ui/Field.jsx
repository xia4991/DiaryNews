import { cloneElement } from 'react'

export default function Field({
  label,
  hint,
  error,
  required = false,
  children,
  className = '',
}) {
  const inputId = children?.props?.id
  const describedBy = [hint && `${inputId}-hint`, error && `${inputId}-err`]
    .filter(Boolean)
    .join(' ') || undefined

  const input = cloneElement(children, {
    'aria-invalid': !!error || undefined,
    'aria-describedby': describedBy,
    className: `${children.props.className || ''} w-full bg-surface border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-subtle ${error ? 'border-danger' : 'border-border-strong'} focus:outline-none focus:border-accent`.trim(),
  })

  return (
    <div className={`flex flex-col gap-1 ${className}`.trim()}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-text-muted">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {input}
      {hint && !error && (
        <p id={inputId && `${inputId}-hint`} className="text-[11px] text-text-subtle">{hint}</p>
      )}
      {error && (
        <p id={inputId && `${inputId}-err`} className="text-[11px] text-danger">{error}</p>
      )}
    </div>
  )
}
