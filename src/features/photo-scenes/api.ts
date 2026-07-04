// src/features/photo-scenes/api.ts
import { getListData, httpClient } from '../../shared/api/httpClient'

export type TimeLayer = {
  era: number
  imageUrl: string
  caption: string
}

export type PhotoScene = {
  id: string
  name: string
  sortOrder: number
  unlockKey?: string | null
  layers: TimeLayer[]
}

export const photoScenesApi = {
  byLocation: (locationId: string) =>
    getListData<PhotoScene>(httpClient.get(`/api/photo-scenes/by-location/${locationId}`)),
}
