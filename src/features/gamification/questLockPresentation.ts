import { CU_CHI_ILLUSTRATED_PIN_BY_ID } from '../panorama/cuChiIllustratedMapPins'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import type { QuestV2LockKey } from './questsV2Api'

/** The API may return a raw unlock key when the discovery-point seed is absent. */
export function questLockKeyLabel(item: QuestV2LockKey, locationId: string, index: number): string {
  const sceneId = item.key.startsWith('scene:') ? item.key.slice('scene:'.length) : null
  if (sceneId && locationId === CU_CHI_LOCATION_ID) {
    const scene = CU_CHI_ILLUSTRATED_PIN_BY_ID[sceneId]
    if (scene) return scene.label
  }
  const label = item.label?.trim()
  if (label && label !== item.key && !/^(scene|era|hotspot|artifact|photo):/i.test(label)) return label
  return `Điểm khám phá ${index + 1}`
}
