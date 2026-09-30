/** Optional Sentry bootstrap — no-op when VITE_SENTRY_DSN is unset. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn?.trim()) return
  // Lazy dynamic import keeps the bundle light when DSN is absent.
  void import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn: dsn.trim(),
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
      })
    })
    .catch(() => {
      /* @sentry/react not installed — skip */
    })
}
