import { getData, getListData, getPageData, httpClient } from '../../shared/api/httpClient'

export type Location = {
  id: string
  name: string
  description: string
  latitude: number
  longitude: number
  city: string
  coverImage: string
  rating?: number
  distanceKm?: number
  isArAvailable?: boolean
  createdAt: string
}

export type Character = {
  id: string
  locationId: string
  name: string
  era: string
  portraitUrl: string
}

export type PhotoPair = {
  id: string
  locationId: string
  historicalImage: string
  currentImage: string
  year: number
  caption: string
  sortOrder: number
}

export const locationsApi = {
  list: (params?: {
    page?: number
    size?: number
    sort?: string
    city?: string
    search?: string
    nearLat?: number
    nearLng?: number
    maxDistanceKm?: number
    tags?: string
  }) => getListData<Location>(httpClient.get('/api/locations', { params })),
  listPage: (params?: {
    page?: number
    size?: number
    sort?: string
    city?: string
    search?: string
    nearLat?: number
    nearLng?: number
    maxDistanceKm?: number
    tags?: string
  }) => getPageData<Location>(httpClient.get('/api/locations', { params })),
  getById: (id: string) => getData<Location>(httpClient.get(`/api/locations/${id}`)),
  getCharacters: (locationId: string) =>
    getListData<Character>(httpClient.get(`/api/characters/by-location/${locationId}`)),
  getPhotoPairs: (locationId: string) =>
    getListData<PhotoPair>(httpClient.get(`/api/photo-pairs/by-location/${locationId}`)),
}

