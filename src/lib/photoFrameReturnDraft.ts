import Dexie, { type EntityTable } from 'dexie'
import type { FacePlacement } from '../features/heritage-studio/facePlacement'
import type { LowLightOptions } from './heritageImage'

export type PhotoFrameReturnDraft = {
  file: File
  mode: 'original' | 'heritage'
  originalOptions?: { zoom: number; offsetX: number; offsetY: number; removeBackground: boolean }
  frameId: string
  variant: 'square' | 'story'
  lowLight: LowLightOptions
  roleId: string | null
  placement: FacePlacement | null
  savedAt: number
}

type StoredDraft = PhotoFrameReturnDraft & { id: string; ownerId: string }
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const db = new Dexie('histar-photo-frame-return-drafts') as Dexie & { drafts: EntityTable<StoredDraft, 'id'> }
db.version(1).stores({ drafts: 'id, ownerId, savedAt' })

function draftId(ownerId: string, creationId: string) {
  return `${ownerId}:${creationId}`
}

export async function savePhotoFrameReturnDraft(ownerId: string, creationId: string, draft: PhotoFrameReturnDraft): Promise<void> {
  if (!ownerId || !creationId) throw new Error('photo_frame_return_owner_required')
  await db.drafts.put({ ...draft, id: draftId(ownerId, creationId), ownerId, savedAt: Date.now() })
}

export async function loadPhotoFrameReturnDraft(ownerId: string, creationId: string): Promise<PhotoFrameReturnDraft | null> {
  if (!ownerId || !creationId) return null
  const item = await db.drafts.get(draftId(ownerId, creationId))
  if (!item) return null
  if (Date.now() - item.savedAt > MAX_AGE_MS) {
    await db.drafts.delete(item.id)
    return null
  }
  return item
}

export async function clearPhotoFrameReturnDrafts(ownerId: string): Promise<void> {
  if (ownerId) await db.drafts.where('ownerId').equals(ownerId).delete()
}
