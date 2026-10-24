import type {
  ApprovedHeritageReview,
  Heritage3dSourceByStation,
  HeritageCompositorCalibration,
  HeritagePublishedAssets,
  HeritageReleaseStage,
  HeritageRoleTemplate,
  HeritageRoleVariant,
  HeritageStationCode,
  PendingHeritageReview,
  PublishedHeritageRoleTemplate,
} from './types.ts'

const CANVAS_SIZE = { width: 1080, height: 1920 } as const

type RoleVariantSeed = {
  readonly roleVariant: HeritageRoleVariant
  readonly calibration: HeritageCompositorCalibration
} &
  (
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
  )

interface RoleSeedFor<Station extends HeritageStationCode> {
  readonly stationCode: Station
  readonly stationName: string
  readonly roleSlug: string
  readonly title: string
  readonly actionKey: string
  readonly actionLabel: string
  readonly source3d: Heritage3dSourceByStation[Station]
  readonly releaseStage: HeritageReleaseStage
  readonly variants: readonly [RoleVariantSeed, RoleVariantSeed]
}

type RoleSeed = {
  [Station in HeritageStationCode]: RoleSeedFor<Station>
}[HeritageStationCode]

function draftVariant(
  roleVariant: HeritageRoleVariant,
  faceAnchor: HeritageCompositorCalibration['faceAnchor'],
  faceRotationDeg: number,
): RoleVariantSeed {
  return {
    roleVariant,
    assets: null,
    calibration: {
      canvasSize: CANVAS_SIZE,
      faceAnchor,
      faceRotationDeg,
      faceFeather: 0.16,
    },
    published: false,
    review: {
      status: 'pending_historical_review',
      reviewer: null,
      reviewedAt: null,
      note: `Chờ tài sản thật và duyệt độc lập cho biến thể ${roleVariant === 'nam' ? 'nam' : 'nữ'}.`,
    },
  }
}

const ROLE_SEEDS = [
  {
    stationCode: 'ST01',
    stationName: 'Phòng họp',
    roleSlug: 'can-bo-lien-lac',
    title: 'Cán bộ liên lạc',
    actionKey: 'relay-documents',
    actionLabel: 'Chuyển tài liệu hoặc lắng nghe cuộc họp',
    source3d: {
      stationCode: 'ST01',
      targetKey: 'ST01_MEETING',
      targetKind: 'chamber',
      chamberKind: 'meeting',
      chamberTitle: 'Phòng họp chỉ huy',
      floorLabel: 'Tầng 2',
      figure: { outfit: 'guerrilla', pose: 'stand', prop: 'paper' },
    },
    releaseStage: 'gate-a',
    variants: [
      draftVariant('nam', { x: 0.34, y: 0.12, width: 0.32, height: 0.25 }, -2),
      draftVariant('nu', { x: 0.35, y: 0.12, width: 0.31, height: 0.25 }, 1),
    ],
  },
  {
    stationCode: 'ST02',
    stationName: 'Kho ngầm',
    roleSlug: 'can-bo-hau-can',
    title: 'Cán bộ hậu cần',
    actionKey: 'manage-supplies',
    actionLabel: 'Kiểm đếm, sắp xếp lương thực và vật dụng',
    source3d: {
      stationCode: 'ST02',
      targetKey: 'ST02_STORE',
      targetKind: 'chamber',
      chamberKind: 'store',
      chamberTitle: 'Kho vũ khí – lương thực',
      floorLabel: 'Tầng 3',
      figure: { outfit: 'guerrilla', pose: 'carry', prop: 'crate' },
    },
    releaseStage: 'gate-b',
    variants: [
      draftVariant('nam', { x: 0.36, y: 0.13, width: 0.3, height: 0.24 }, 3),
      draftVariant('nu', { x: 0.37, y: 0.13, width: 0.29, height: 0.24 }, -1),
    ],
  },
  {
    stationCode: 'ST03',
    stationName: 'Giếng hầm & thông gió',
    roleSlug: 'bao-dam-nuoc-thong-khi',
    title: 'Người bảo đảm nước và thông khí',
    actionKey: 'maintain-water-air',
    actionLabel: 'Lấy nước hoặc ngụy trang lỗ thông hơi',
    source3d: {
      stationCode: 'ST03',
      targetKey: 'ST03_WELL_VENT',
      targetKind: 'callouts',
      calloutTitles: ['Ống thông hơi', 'Giếng nước'],
    },
    releaseStage: 'gate-b',
    variants: [
      draftVariant('nam', { x: 0.35, y: 0.14, width: 0.31, height: 0.24 }, -4),
      draftVariant('nu', { x: 0.36, y: 0.14, width: 0.3, height: 0.24 }, 2),
    ],
  },
  {
    stationCode: 'ST04',
    stationName: 'Quân y',
    roleSlug: 'can-bo-quan-y',
    title: 'Cán bộ quân y',
    actionKey: 'provide-medical-care',
    actionLabel: 'Băng bó, chuẩn bị dụng cụ hoặc chăm sóc thương binh',
    source3d: {
      stationCode: 'ST04',
      targetKey: 'ST04_CLINIC',
      targetKind: 'chamber',
      chamberKind: 'clinic',
      chamberTitle: 'Trạm quân y',
      floorLabel: 'Tầng 2',
      figure: { outfit: 'nurse', pose: 'stand' },
    },
    releaseStage: 'gate-c',
    variants: [
      draftVariant('nam', { x: 0.37, y: 0.12, width: 0.29, height: 0.23 }, 2),
      draftVariant('nu', { x: 0.36, y: 0.12, width: 0.3, height: 0.23 }, -2),
    ],
  },
  {
    stationCode: 'ST05',
    stationName: 'Xưởng vũ khí',
    roleSlug: 'tho-quan-gioi',
    title: 'Thợ quân giới',
    actionKey: 'repair-tools',
    actionLabel: 'Sửa chữa, gia công hoặc kiểm tra dụng cụ',
    source3d: {
      stationCode: 'ST05',
      targetKey: 'ST05_FACTORY',
      targetKind: 'chamber',
      chamberKind: 'factory',
      chamberTitle: 'Xưởng vũ khí',
      floorLabel: 'Tầng 2',
      figures: [
        { outfit: 'guerrilla', pose: 'hammer', prop: 'hammer' },
        { outfit: 'civilian', pose: 'hammer', prop: 'hammer' },
      ],
    },
    releaseStage: 'gate-c',
    variants: [
      draftVariant('nam', { x: 0.34, y: 0.13, width: 0.31, height: 0.24 }, -3),
      draftVariant('nu', { x: 0.35, y: 0.13, width: 0.3, height: 0.24 }, 3),
    ],
  },
  {
    stationCode: 'ST06',
    stationName: 'Hầm phòng thủ',
    roleSlug: 'du-kich-truc-gac',
    title: 'Du kích trực gác',
    actionKey: 'stand-watch',
    actionLabel: 'Quan sát qua lỗ châu mai hoặc truyền tín hiệu cảnh giới',
    source3d: {
      stationCode: 'ST06',
      targetKey: 'ST06_FIRING',
      targetKind: 'chamber',
      chamberKind: 'firing',
      chamberTitle: 'Ụ chiến đấu',
      floorLabel: 'Tầng 1',
      figure: { outfit: 'guerrilla', pose: 'aim', prop: 'rifle' },
    },
    releaseStage: 'gate-c',
    variants: [
      draftVariant('nam', { x: 0.36, y: 0.11, width: 0.3, height: 0.24 }, 4),
      draftVariant('nu', { x: 0.35, y: 0.11, width: 0.31, height: 0.24 }, -1),
    ],
  },
] satisfies readonly RoleSeed[]

function createTemplate(seed: RoleSeed, variant: RoleVariantSeed): HeritageRoleTemplate {
  const template = {
    id: `${seed.stationCode.toLowerCase()}-${seed.roleSlug}-${variant.roleVariant}`,
    siteCode: 'cu-chi',
    stationCode: seed.stationCode,
    stationName: seed.stationName,
    title: seed.title,
    roleVariant: variant.roleVariant,
    actionKey: seed.actionKey,
    actionLabel: seed.actionLabel,
    era: 1968,
    calibration: variant.calibration,
    source3d: seed.source3d,
    releaseStage: seed.releaseStage,
    published: variant.published,
    assets: variant.assets,
    review: variant.review,
  }

  return template as HeritageRoleTemplate
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) {
      deepFreeze((value as Record<PropertyKey, unknown>)[key])
    }
    Object.freeze(value)
  }
  return value
}

export const heritageRoleTemplates: readonly HeritageRoleTemplate[] = deepFreeze(
  ROLE_SEEDS.flatMap((seed) => seed.variants.map((variant) => createTemplate(seed, variant))),
)

export function getPublishedRoleTemplates(
  siteCode: string,
  stationCode?: HeritageStationCode,
): readonly PublishedHeritageRoleTemplate[] {
  return deepFreeze(
    heritageRoleTemplates.filter(
      (template): template is PublishedHeritageRoleTemplate =>
        template.published &&
        template.siteCode === siteCode &&
        (stationCode === undefined || template.stationCode === stationCode),
    ),
  )
}
