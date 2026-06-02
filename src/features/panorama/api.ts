import { getListData, httpClient } from '../../shared/api/httpClient'

export type Panorama = {
  id: string
  locationId: string
  imageUrl: string
  title: string
}

export type Hotspot = {
  id: string
  panoramaId: string
  yaw: number
  pitch: number
  type: 'info' | 'scene'
  contentRef: string
  label: string
}

export const panoramaApi = {
  byLocation: (locationId: string) =>
    getListData<Panorama>(httpClient.get(`/api/panoramas/by-location/${locationId}`)),
  hotspotsByPanorama: (panoramaId: string) =>
    getListData<Hotspot>(httpClient.get(`/api/hotspots/by-panorama/${panoramaId}`)),
}

