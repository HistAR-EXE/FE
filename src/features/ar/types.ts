export type ARMode = 'sim' | 'webcam' | 'live'

export type CuChiSceneSlug =
  | 'cua-ham'
  | 'bep-hoang-cam'
  | 'phong-hop'
  | 'thong-gio'
  | 'gieng'

export type EraValue = 1948 | 1968 | 2026

export type ARSceneConfig = {
  slug: CuChiSceneSlug
  sceneId: string
  name: string
  unlockKey: string
  previewImage: string
  mindTarget?: string
  modelScale: number
  modelPosition: [number, number, number]
  modelRotation: [number, number, number]
  /** Optional panorama id for Tour 360 deep link */
  panoramaId?: string
}

export type ARTrackingState = 'idle' | 'scanning' | 'found' | 'lost'
