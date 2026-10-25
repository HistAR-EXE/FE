export type HeritageRoleVariant = 'nam' | 'nu'
export type HeritageReleaseStage = 'gate-a' | 'gate-b' | 'gate-c'
export type HeritageStationCode = `ST0${1 | 2 | 3 | 4 | 5 | 6}`

export interface HeritageCanvasSize {
  readonly width: number
  readonly height: number
}

export interface HeritageFaceAnchor {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface HeritageCompositorCalibration {
  readonly canvasSize: HeritageCanvasSize
  readonly faceAnchor: HeritageFaceAnchor
  readonly faceRotationDeg: number
  readonly faceFeather: number
}

interface HeritageFigureReference {
  readonly outfit: 'civilian' | 'guerrilla' | 'nurse'
  readonly pose: 'aim' | 'carry' | 'hammer' | 'stand'
  readonly prop?: 'crate' | 'hammer' | 'paper' | 'rifle'
}

interface HeritageChamberSource<
  Station extends HeritageStationCode,
  TargetKey extends string,
  ChamberKind extends 'clinic' | 'factory' | 'firing' | 'meeting' | 'store',
  ChamberTitle extends string,
  FloorLabel extends 'Tầng 1' | 'Tầng 2' | 'Tầng 3',
> {
  readonly stationCode: Station
  readonly targetKey: TargetKey
  readonly targetKind: 'chamber'
  readonly chamberKind: ChamberKind
  readonly chamberTitle: ChamberTitle
  readonly floorLabel: FloorLabel
}

export interface Heritage3dSourceByStation {
  readonly ST01: HeritageChamberSource<'ST01', 'ST01_MEETING', 'meeting', 'Phòng họp chỉ huy', 'Tầng 2'> & {
    readonly figure: HeritageFigureReference & {
      readonly outfit: 'guerrilla'
      readonly pose: 'stand'
      readonly prop: 'paper'
    }
  }
  readonly ST02: HeritageChamberSource<'ST02', 'ST02_STORE', 'store', 'Kho vũ khí – lương thực', 'Tầng 3'> & {
    readonly figure: HeritageFigureReference & {
      readonly outfit: 'guerrilla'
      readonly pose: 'carry'
      readonly prop: 'crate'
    }
  }
  readonly ST03: {
    readonly stationCode: 'ST03'
    readonly targetKey: 'ST03_WELL_VENT'
    readonly targetKind: 'callouts'
    readonly calloutTitles: readonly ['Ống thông hơi', 'Giếng nước']
  }
  readonly ST04: HeritageChamberSource<'ST04', 'ST04_CLINIC', 'clinic', 'Trạm quân y', 'Tầng 2'> & {
    readonly figure: HeritageFigureReference & {
      readonly outfit: 'nurse'
      readonly pose: 'stand'
    }
  }
  readonly ST05: HeritageChamberSource<'ST05', 'ST05_FACTORY', 'factory', 'Xưởng vũ khí', 'Tầng 2'> & {
    readonly figures: readonly [
      HeritageFigureReference & {
        readonly outfit: 'guerrilla'
        readonly pose: 'hammer'
        readonly prop: 'hammer'
      },
      HeritageFigureReference & {
        readonly outfit: 'civilian'
        readonly pose: 'hammer'
        readonly prop: 'hammer'
      },
    ]
  }
  readonly ST06: HeritageChamberSource<'ST06', 'ST06_FIRING', 'firing', 'Ụ chiến đấu', 'Tầng 1'> & {
    readonly figure: HeritageFigureReference & {
      readonly outfit: 'guerrilla'
      readonly pose: 'aim'
      readonly prop: 'rifle'
    }
  }
}

export type Heritage3dSource = Heritage3dSourceByStation[HeritageStationCode]

export interface PendingHeritageReview {
  readonly status: 'pending_historical_review'
  readonly reviewer: null
  readonly reviewedAt: null
  readonly note: string
}

export interface ApprovedHeritageReview {
  readonly status: 'approved'
  readonly reviewer: string
  readonly reviewedAt: string
  readonly note: string
}

interface HeritageImageAsset {
  readonly url: `/images/photo-roles/cu-chi/st0${1 | 2 | 3 | 4 | 5 | 6}/${string}.webp`
  readonly width: number
  readonly height: number
}

export interface HeritagePublishedAssets {
  readonly background: HeritageImageAsset
  readonly overlay: HeritageImageAsset & { readonly hasAlpha: true }
}

interface HeritageRoleTemplateBase<Station extends HeritageStationCode> {
  readonly id: string
  readonly siteCode: 'cu-chi'
  readonly stationCode: Station
  readonly stationName: string
  readonly title: string
  readonly roleVariant: HeritageRoleVariant
  readonly actionKey: string
  readonly actionLabel: string
  readonly era: 1968
  readonly calibration: HeritageCompositorCalibration
  readonly source3d: Heritage3dSourceByStation[Station]
  readonly releaseStage: HeritageReleaseStage
}

type HeritagePublicationState =
  | {
      readonly published: false
      readonly assets: null
      readonly review: PendingHeritageReview
    }
  | {
      readonly published: true
      readonly assets: HeritagePublishedAssets
      readonly review: ApprovedHeritageReview
    }

export type HeritageRoleTemplateFor<Station extends HeritageStationCode> =
  HeritageRoleTemplateBase<Station> & HeritagePublicationState

export type HeritageRoleTemplate = {
  [Station in HeritageStationCode]: HeritageRoleTemplateFor<Station>
}[HeritageStationCode]

export type PublishedHeritageRoleTemplate = Extract<HeritageRoleTemplate, { published: true }>
