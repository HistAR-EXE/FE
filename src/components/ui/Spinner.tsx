import type { HTMLAttributes } from 'react'

type SpinnerSize = 'sm' | 'md' | 'lg'

type SpinnerProps = HTMLAttributes<HTMLDivElement> & {
  size?: SpinnerSize
  /** Accessible label for screen readers */
  label?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-3',
}

export function Spinner({
  size = 'md',
  label = 'Đang tải…',
  className = '',
  ...props
}: SpinnerProps) {
  return (
    <div role="status" className={`inline-flex items-center justify-center ${className}`} {...props}>
      <div
        className={`${sizeClasses[size]} rounded-full border-neutral-200 border-t-primary-500 animate-spin`}
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

/** Full-area centered spinner with optional message */
export function LoadingOverlay({
  message = 'Đang tải…',
  className = '',
}: {
  message?: string
  className?: string
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-sm py-xl text-neutral-500 dark:text-neutral-400 ${className}`}
      role="status"
    >
      <Spinner size="lg" label={message} />
      <p className="text-sm">{message}</p>
    </div>
  )
}
