// src/features/collection/api.ts
import { getData, getListData, httpClient } from '../../shared/api/httpClient'

export type Artifact = {
  id: string
  locationId: string
  name: string
  imageUrl: string
  description: string
  story?: string | null
  unlockKey: string
  reliability: string
  sortOrder: number
  unlocked: boolean
  collectionName?: string | null
  rarity?: string | null
  sourceUrl?: string | null
  imageSource?: string | null
  imageLicense?: string | null
  factVerified?: boolean
}

export type MyArtifactsResponse = {
  items: Artifact[]
  collected: number
  total: number
  collectedPremium?: number
  totalPremium?: number
}

export const collectionApi = {
  catalog: (locationId: string) =>
    getListData<Artifact>(httpClient.get('/api/artifacts', { params: { locationId } })),
  mine: (locationId: string) =>
    getData<MyArtifactsResponse>(httpClient.get('/api/me/artifacts', { params: { locationId } })),
}
