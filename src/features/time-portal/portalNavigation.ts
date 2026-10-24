export type PortalMode = 'timeline' | 'xua-nay' | '3d'

export function resolveInitialPortalMode(view: string | null | undefined): PortalMode {
  if (view === '3d') return '3d'
  if (view === 'compare' || view === 'xua-nay') return 'xua-nay'
  return 'timeline'
}
