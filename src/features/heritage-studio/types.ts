export type HeritageRoleVariant = 'nam' | 'nu'
export type HeritageReleaseStage = 'gate-a' | 'gate-b' | 'gate-c'

export interface HeritageCanvasSize {
  width: number
  height: number
}

export interface HeritageFaceAnchor {
  x: number
  y: number
  width: number
  height: number
}

export interface Heritage3dSource {
  targetKind: 'chamber' | 'callout'
  targetKey:
    | 'ST01_MEETING'
    | 'ST02_STORE'
    | 'ST03_WELL_VENT'
    | 'ST04_CLINIC'
    | 'ST05_FACTORY'
    | 'ST06_FIRING'
  floorLabel: 'Tầng 1' | 'Tầng 2' | 'Tầng 3' | 'Liên tầng'
  outfit: 'civilian' | 'guerrilla' | 'nurse'
  pose: 'aim' | 'carry' | 'hammer' | 'stand'
  prop?: 'crate' | 'hammer' | 'paper' | 'rifle'
}

export interface PendingHeritageReview {
  status: 'pending'
  reviewer: null
  reviewedAt: null
  note: string
}

export interface ApprovedHeritageReview {
  status: 'approved'
  reviewer: string
  reviewedAt: string
  note: string
}

interface HeritageRoleTemplateBase {
  id: string
  siteCode: string
  stationCode: `ST0${1 | 2 | 3 | 4 | 5 | 6}`
  stationName: string
  title: string
  roleVariant: HeritageRoleVariant
  actionKey: string
  actionLabel: string
  era: 1968
  backgroundUrl: string
  overlayUrl: string
  canvasSize: HeritageCanvasSize
  faceAnchor: HeritageFaceAnchor
  faceRotationDeg: number
  faceFeather: number
  source3d: Heritage3dSource
  releaseStage: HeritageReleaseStage
}

export type HeritageRoleTemplate = HeritageRoleTemplateBase &
  (
    | { published: false; review: PendingHeritageReview }
    | { published: true; review: ApprovedHeritageReview }
  )
