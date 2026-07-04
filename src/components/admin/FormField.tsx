import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const inputClass =
  'w-full bg-surface-container-low border border-outline-variant rounded-lg px-sm py-xs text-on-surface focus:border-primary outline-none text-sm'

type FieldErrorProps = {
  error?: string
}

export function FieldError({ error }: FieldErrorProps) {
  if (!error) return null
  return <p className="text-xs text-error mt-0.5">{error}</p>
}

type FormFieldProps = {
  label: string
  error?: string
  children: ReactNode
  hint?: string
}

export function FormField({ label, error, children, hint }: FormFieldProps) {
  return (
    <label className="block space-y-0.5 mb-sm">
      <span className="text-xs text-on-surface-variant">{label}</span>
      {children}
      {hint && !error && <p className="text-xs text-on-surface-variant/70">{hint}</p>}
      <FieldError error={error} />
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const { error, className, ...rest } = props
  return (
    <input
      className={`${inputClass} ${error ? 'border-error' : ''} ${className ?? ''}`}
      {...rest}
    />
  )
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  const { error, className, ...rest } = props
  return (
    <textarea
      className={`${inputClass} resize-y min-h-[72px] ${error ? 'border-error' : ''} ${className ?? ''}`}
      {...rest}
    />
  )
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  const { error, className, children, ...rest } = props
  return (
    <select
      className={`${inputClass} ${error ? 'border-error' : ''} ${className ?? ''}`}
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
