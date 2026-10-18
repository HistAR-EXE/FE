import type { HTMLAttributes } from 'react'

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  /** Predefined shape */
  variant?: 'text' | 'circle' | 'rect'
  /** Width — CSS value or Tailwind class */
  width?: string
  /** Height — CSS value or Tailwind class */
  height?: string
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const base = 'animate-pulse bg-neutral-200 dark:bg-neutral-300'

  const variantClasses: Record<string, string> = {
    text: 'h-4 rounded-md',
    circle: 'rounded-full',
    rect: 'rounded-xl',
  }

  const sizeStyle = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    ...style,
  }

  return (
    <div
      className={`${base} ${variantClasses[variant]} ${className}`}
      style={sizeStyle}
      aria-hidden="true"
      {...props}
    />
  )
}

/** A skeleton card mimicking the Card component's shape */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-neutral-0 dark:bg-neutral-100 rounded-2xl border border-neutral-200 shadow-sm p-md space-y-sm ${className}`}
      aria-hidden="true"
    >
      <Skeleton variant="rect" className="w-full h-32" />
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
    </div>
  )
}
