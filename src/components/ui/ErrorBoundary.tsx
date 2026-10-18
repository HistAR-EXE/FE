import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'

type ErrorBoundaryVariant = 'app' | 'section'

type ErrorBoundaryProps = {
  children: ReactNode
  variant?: ErrorBoundaryVariant
  /** Label shown in the fallback UI to help users report the issue */
  label?: string
  /** Custom fallback — replaces the default error UI entirely */
  fallback?: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
  error: Error | null
}

function reportToSentry(error: Error, info: ErrorInfo): void {
  void import('@sentry/react')
    .then((Sentry) => {
      Sentry.withScope((scope) => {
        scope.setExtra('componentStack', info.componentStack)
        Sentry.captureException(error)
      })
    })
    .catch(() => {
      /* @sentry/react not installed — skip */
    })
}

/** Full-page fallback when the entire app crashes */
function AppFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-900 grid place-items-center px-md">
      <div className="max-w-md w-full text-center space-y-md">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
          Đã xảy ra lỗi
        </h1>
        <p className="text-neutral-600 dark:text-neutral-300 text-sm">
          Ứng dụng gặp sự cố không mong muốn. Vui lòng thử tải lại trang.
        </p>
        {import.meta.env.DEV && error && (
          <pre className="text-left text-xs bg-neutral-100 dark:bg-neutral-800 text-red-600 dark:text-red-400 p-sm rounded-xl overflow-auto max-h-40 border border-neutral-200">
            {error.message}
          </pre>
        )}
        <div className="flex justify-center gap-sm">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Tải lại trang
          </Button>
          <Button variant="outline" onClick={onReset}>
            Thử lại
          </Button>
        </div>
      </div>
    </main>
  )
}

/** Inline fallback for a section/widget that crashed */
function SectionFallback({
  error,
  label,
  onReset,
}: {
  error: Error | null
  label?: string
  onReset: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-neutral-200 bg-neutral-0 dark:bg-neutral-100 p-md text-center space-y-sm"
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {label ? `Không thể hiển thị ${label}.` : 'Phần này gặp lỗi.'}
      </p>
      {import.meta.env.DEV && error && (
        <pre className="text-left text-xs bg-neutral-100 dark:bg-neutral-800 text-red-600 dark:text-red-400 p-sm rounded-xl overflow-auto max-h-24 border border-neutral-200">
          {error.message}
        </pre>
      )}
      <Button variant="outline" className="text-xs" onClick={onReset}>
        Thử lại
      </Button>
    </div>
  )
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportToSentry(error, info)
    if (import.meta.env.DEV) {
      console.error(`[ErrorBoundary${this.props.label ? `:${this.props.label}` : ''}]`, error, info.componentStack)
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    const variant = this.props.variant ?? 'section'

    if (variant === 'app') {
      return <AppFallback error={this.state.error} onReset={this.handleReset} />
    }

    return (
      <SectionFallback
        error={this.state.error}
        label={this.props.label}
        onReset={this.handleReset}
      />
    )
  }
}

/** Convenience wrapper — wraps the entire app */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary variant="app">{children}</ErrorBoundary>
}

/** Convenience wrapper — wraps a section/widget */
export function SectionErrorBoundary({
  children,
  label,
  fallback,
}: {
  children: ReactNode
  label?: string
  fallback?: ReactNode
}) {
  return (
    <ErrorBoundary variant="section" label={label} fallback={fallback}>
      {children}
    </ErrorBoundary>
  )
}
