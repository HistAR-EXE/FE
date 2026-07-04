import { getData, httpClient } from '../../shared/api/httpClient'

export type DiscoveryBindingDto = {
  unlockKey: string
  recordKey: string
  engagement: string
  hrefTemplate: string
  sortOrder: number
  artifactId: string | null
  xpBonus: number
  questStepId: string | null
}

export const discoveryBindingsApi = {
  byLocation: (locationId: string) =>
    getData<DiscoveryBindingDto[]>(httpClient.get(`/api/discovery-bindings/by-location/${locationId}`)),
}
