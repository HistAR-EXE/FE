import type {
  Heritage3dSource,
  HeritageReleaseStage,
  HeritageRoleTemplate,
  HeritageRoleVariant,
} from './types.ts'

const CANVAS_SIZE = { width: 1080, height: 1920 } as const
const PENDING_REVIEW = {
  status: 'pending',
  reviewer: null,
  reviewedAt: null,
  note: 'Chờ art direction, tài sản ảnh phân lớp thật và phản biện lịch sử độc lập.',
} as const

interface RoleSeed {
  stationCode: HeritageRoleTemplate['stationCode']
  stationName: string
  roleSlug: string
  title: string
  actionKey: string
  actionLabel: string
  source3d: Heritage3dSource
  releaseStage: HeritageReleaseStage
  faceAnchor: HeritageRoleTemplate['faceAnchor']
  faceRotationDeg: number
}

const ROLE_SEEDS: readonly RoleSeed[] = [
  {
    stationCode: 'ST01',
    stationName: 'Phòng họp',
    roleSlug: 'can-bo-lien-lac',
    title: 'Cán bộ liên lạc',
    actionKey: 'relay-documents',
    actionLabel: 'Chuyển tài liệu hoặc lắng nghe cuộc họp',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST01_MEETING',
      floorLabel: 'Tầng 2',
      outfit: 'guerrilla',
      pose: 'stand',
      prop: 'paper',
    },
    releaseStage: 'gate-a',
    faceAnchor: { x: 0.34, y: 0.12, width: 0.32, height: 0.25 },
    faceRotationDeg: -2,
  },
  {
    stationCode: 'ST02',
    stationName: 'Kho ngầm',
    roleSlug: 'can-bo-hau-can',
    title: 'Cán bộ hậu cần',
    actionKey: 'manage-supplies',
    actionLabel: 'Kiểm đếm, sắp xếp lương thực và vật dụng',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST02_STORE',
      floorLabel: 'Tầng 3',
      outfit: 'civilian',
      pose: 'carry',
      prop: 'crate',
    },
    releaseStage: 'gate-b',
    faceAnchor: { x: 0.36, y: 0.13, width: 0.3, height: 0.24 },
    faceRotationDeg: 3,
  },
  {
    stationCode: 'ST03',
    stationName: 'Giếng hầm & thông gió',
    roleSlug: 'bao-dam-nuoc-thong-khi',
    title: 'Người bảo đảm nước và thông khí',
    actionKey: 'maintain-water-air',
    actionLabel: 'Lấy nước hoặc ngụy trang lỗ thông hơi',
    source3d: {
      targetKind: 'callout',
      targetKey: 'ST03_WELL_VENT',
      floorLabel: 'Liên tầng',
      outfit: 'civilian',
      pose: 'stand',
    },
    releaseStage: 'gate-b',
    faceAnchor: { x: 0.35, y: 0.14, width: 0.31, height: 0.24 },
    faceRotationDeg: -4,
  },
  {
    stationCode: 'ST04',
    stationName: 'Quân y',
    roleSlug: 'can-bo-quan-y',
    title: 'Cán bộ quân y',
    actionKey: 'provide-medical-care',
    actionLabel: 'Băng bó, chuẩn bị dụng cụ hoặc chăm sóc thương binh',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST04_CLINIC',
      floorLabel: 'Tầng 2',
      outfit: 'nurse',
      pose: 'stand',
    },
    releaseStage: 'gate-c',
    faceAnchor: { x: 0.37, y: 0.12, width: 0.29, height: 0.23 },
    faceRotationDeg: 2,
  },
  {
    stationCode: 'ST05',
    stationName: 'Xưởng vũ khí',
    roleSlug: 'tho-quan-gioi',
    title: 'Thợ quân giới',
    actionKey: 'repair-tools',
    actionLabel: 'Sửa chữa, gia công hoặc kiểm tra dụng cụ',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST05_FACTORY',
      floorLabel: 'Tầng 2',
      outfit: 'civilian',
      pose: 'hammer',
      prop: 'hammer',
    },
    releaseStage: 'gate-c',
    faceAnchor: { x: 0.34, y: 0.13, width: 0.31, height: 0.24 },
    faceRotationDeg: -3,
  },
  {
    stationCode: 'ST06',
    stationName: 'Hầm phòng thủ',
    roleSlug: 'du-kich-truc-gac',
    title: 'Du kích trực gác',
    actionKey: 'stand-watch',
    actionLabel: 'Quan sát qua lỗ châu mai hoặc truyền tín hiệu cảnh giới',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST06_FIRING',
      floorLabel: 'Tầng 1',
      outfit: 'guerrilla',
      pose: 'aim',
      prop: 'rifle',
    },
    releaseStage: 'gate-c',
    faceAnchor: { x: 0.36, y: 0.11, width: 0.3, height: 0.24 },
    faceRotationDeg: 4,
  },
] as const

function createTemplate(seed: RoleSeed, roleVariant: HeritageRoleVariant): HeritageRoleTemplate {
  const stationPath = seed.stationCode.toLowerCase()
  const assetStem = `${seed.roleSlug}-${roleVariant}-1968`

  return {
    id: `${seed.stationCode.toLowerCase()}-${seed.roleSlug}-${roleVariant}`,
    siteCode: 'cu-chi',
    stationCode: seed.stationCode,
    stationName: seed.stationName,
    title: seed.title,
    roleVariant,
    actionKey: seed.actionKey,
    actionLabel: seed.actionLabel,
    era: 1968,
    backgroundUrl: `/images/photo-roles/cu-chi/${stationPath}/${assetStem}-bg.webp`,
    overlayUrl: `/images/photo-roles/cu-chi/${stationPath}/${assetStem}-overlay.webp`,
    canvasSize: CANVAS_SIZE,
    faceAnchor: seed.faceAnchor,
    faceRotationDeg: seed.faceRotationDeg,
    faceFeather: 0.16,
    source3d: seed.source3d,
    releaseStage: seed.releaseStage,
    published: false,
    review: PENDING_REVIEW,
  }
}

export const heritageRoleTemplates: readonly HeritageRoleTemplate[] = ROLE_SEEDS.flatMap((seed) => [
  createTemplate(seed, 'nam'),
  createTemplate(seed, 'nu'),
])

export function getPublishedRoleTemplates(
  siteCode: string,
  stationCode?: string,
): HeritageRoleTemplate[] {
  return heritageRoleTemplates.filter(
    (template) =>
      template.published &&
      template.siteCode === siteCode &&
      (stationCode === undefined || template.stationCode === stationCode),
  )
}
