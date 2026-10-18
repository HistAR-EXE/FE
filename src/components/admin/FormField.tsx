import { cloneElement, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant rounded-lg px-sm py-xs text-on-surface focus:border-primary outline-none text-sm'

type FieldErrorProps = {
  error?: string
  id?: string
}

export function FieldError({ error, id }: FieldErrorProps) {
  if (!error) return null
  return <p id={id} role="alert" className="text-xs text-error mt-0.5">{error}</p>
}

type FormFieldProps = {
  label: string
  error?: string
  children: ReactNode
  hint?: string
}

export function FormField({ label, error, children, hint }: FormFieldProps) {
  const errorId = useId()
  const hintId = useId()
  const childDescribedBy = isValidElement(children)
    ? (children as ReactElement<Record<string, unknown>>).props['aria-describedby'] as string | undefined
    : undefined
  const describedBy = [childDescribedBy, hint ? hintId : undefined, error ? errorId : undefined].filter(Boolean).join(' ') || undefined
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children
  return (
    <label className="block space-y-0.5 mb-sm">
      <span className="text-xs text-on-surface-variant">{label}</span>
      {control}
      {hint && <p id={hintId} className="text-xs text-on-surface-variant/70">{hint}</p>}
      <FieldError error={error} id={errorId} />
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const { error, className, 'aria-describedby': describedBy, ...rest } = props
  return (
    <input
      className={`${inputClass} ${error ? 'border-error' : ''} ${className ?? ''}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      {...rest}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  const { error, className, 'aria-describedby': describedBy, ...rest } = props
  return (
    <textarea
      className={`${inputClass} resize-y min-h-[72px] ${error ? 'border-error' : ''} ${className ?? ''}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      {...rest}
    />
  )
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  const { error, className, children, 'aria-describedby': describedBy, ...rest } = props
  return (
    <select
      className={`${inputClass} ${error ? 'border-error' : ''} ${className ?? ''}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy}
      {...rest}
    >
      {children}
    </select>
  )
}

export function CheckboxInput({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer mb-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-outline-variant"
      />
      {label}
    </label>
  )
}
