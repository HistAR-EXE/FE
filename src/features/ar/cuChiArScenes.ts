import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import type { ARSceneConfig, CuChiSceneSlug } from './types'

export const AR_ENABLED_LOCATION_IDS = new Set([CU_CHI_LOCATION_ID])

export const CU_CHI_AR_SCENES: ARSceneConfig[] = [
  {
    slug: 'cua-ham',
    sceneId: '50000001-0000-4000-8000-000000000001',
    name: 'Cửa hầm địa đạo',
    unlockKey: 'photo:cua-ham',
    previewImage: '/media/cu-chi/scenes/cua-ham-2026.jpg',
    mindTarget: '/ar/cu-chi/targets/cua-ham.mind',
    modelScale: 1,
    modelPosition: [0, -0.05, 0.15],
    modelRotation: [0, 0, 0],
    panoramaId: '22222222-2222-2222-2222-222222222222',
  },
  {
    slug: 'bep-hoang-cam',
    sceneId: '50000001-0000-4000-8000-000000000002',
    name: 'Bếp Hoàng Cầm',
    unlockKey: 'hotspot:kitchen',
    previewImage: '/media/cu-chi/scenes/bep-hoang-cam-2026.jpg',
    mindTarget: '/ar/cu-chi/targets/bep-hoang-cam.mind',
    modelScale: 1,
    modelPosition: [0, -0.08, 0.12],
    modelRotation: [0, 0.2, 0],
    panoramaId: '22222222-2222-2222-2222-222222222221',
  },
  {
    slug: 'phong-hop',
    sceneId: '50000001-0000-4000-8000-000000000003',
    name: 'Phòng họp dưới lòng đất',
    unlockKey: 'scene:22222222-2222-2222-2222-222222222223',
    previewImage: '/media/cu-chi/scenes/phong-hop-2026.jpg',
    mindTarget: '/ar/cu-chi/targets/phong-hop.mind',
    modelScale: 1,
    modelPosition: [0, -0.06, 0.1],
    modelRotation: [0, -0.15, 0],
    panoramaId: '22222222-2222-2222-2222-222222222223',
  },
  {
    slug: 'thong-gio',
    sceneId: '50000001-0000-4000-8000-000000000004',
    name: 'Hệ thống thông gió',
    unlockKey: 'hotspot:vent',
    previewImage: '/media/cu-chi/scenes/thong-gio-2026.jpg',
    mindTarget: '/ar/cu-chi/targets/thong-gio.mind',
    modelScale: 1,
    modelPosition: [0, 0.02, 0.14],
    modelRotation: [0.1, 0, 0],
  },
  {
    slug: 'gieng',
    sceneId: '50000001-0000-4000-8000-000000000005',
    name: 'Giếng nước trong địa đạo',
    unlockKey: 'photo:gieng',
    previewImage: '/media/cu-chi/scenes/gieng-2026.jpg',
    mindTarget: '/ar/cu-chi/targets/gieng.mind',
    modelScale: 1,
    modelPosition: [0, -0.1, 0.08],
    modelRotation: [0, 0, 0],
  },
]

const slugSet = new Set(CU_CHI_AR_SCENES.map((s) => s.slug))

export function isCuChiSceneSlug(value: string | null | undefined): value is CuChiSceneSlug {
  return !!value && slugSet.has(value as CuChiSceneSlug)
}

export function getArSceneBySlug(slug: CuChiSceneSlug): ARSceneConfig {
  return CU_CHI_AR_SCENES.find((s) => s.slug === slug) ?? CU_CHI_AR_SCENES[0]
}

export function getArSceneBySceneId(sceneId: string): ARSceneConfig | undefined {
  return CU_CHI_AR_SCENES.find((s) => s.sceneId === sceneId)
}

export function getArSceneByUnlockKey(unlockKey: string): ARSceneConfig | undefined {
  return CU_CHI_AR_SCENES.find((s) => s.unlockKey === unlockKey)
}

export function getArSceneByPanoramaId(panoramaId: string): ARSceneConfig | undefined {
  return CU_CHI_AR_SCENES.find((s) => s.panoramaId === panoramaId)
}
