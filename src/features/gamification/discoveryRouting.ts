export {
  discoveryDeepLink,
  eraDiscoveryKey,
  recordDiscoveryEngagement,
  getDiscoveryBinding,
  resolveCanonicalDiscoveryKey,
  resolveSceneLinkNodeId,
  DISCOVERY_RECORDED_EVENT,
} from './discoveryLayer'

import { recordDiscoveryEngagement } from './discoveryLayer'

/** @deprecated Prefer recordDiscoveryEngagement with explicit locationId. */
export function recordDiscovery(
  unlockKey: string | undefined | null,
  options?: { locationId?: string; onError?: (error: unknown) => void },
): void {
  if (!unlockKey) return
  if (!options?.locationId) {
    console.warn('[recordDiscovery] locationId is required; discovery not recorded for', unlockKey)
    return
  }
  void recordDiscoveryEngagement({
    recordKey: unlockKey,
    locationId: options.locationId,
    onError: options?.onError,
  })
}
