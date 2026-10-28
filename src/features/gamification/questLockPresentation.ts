import type { QuestV2LockKey } from './questsV2Api'

/** Do not infer an embedded tour scene from an obsolete local panorama ID. */
export function questLockKeyLabel(item: QuestV2LockKey, index: number): string {
  const label = item.label?.trim()
  if (label && label !== item.key && !/^(scene|era|hotspot|artifact|photo):/i.test(label)) return label
  return `Điểm khám phá ${index + 1}`
}
