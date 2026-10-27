import Dexie, { type EntityTable } from 'dexie'
import type { FacePlacement } from '../features/heritage-studio/facePlacement'
import type { LowLightOptions } from './heritageImage'

export type HeritageStudioDraft = {
  contextKey: string
  file: File
  roleId: string
  siteCode: string
  stationCode?: string
  entrySource?: string
  placement: FacePlacement | null
  lowLight: LowLightOptions
  savedAt: number
}

type StoredDraft = HeritageStudioDraft & { id: string; ownerId: string }
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const db = new Dexie('histar-heritage-studio-drafts') as Dexie & { drafts: EntityTable<StoredDraft, 'id'> }
db.version(1).stores({ drafts: 'id, ownerId, savedAt' })

function draftId(ownerId: string, contextKey: string) {
  return `${ownerId}:${contextKey}`
}

export async function saveHeritageDraft(ownerId: string, draft: HeritageStudioDraft): Promise<void> {
  if (!ownerId) throw new Error('heritage_draft_owner_required')
  await db.drafts.put({ ...draft, id: draftId(ownerId, draft.contextKey), ownerId, savedAt: Date.now() })
}

export async function loadHeritageDraft(ownerId: string, contextKey: string): Promise<HeritageStudioDraft | null> {
  if (!ownerId) return null
  const item = await db.drafts.get(draftId(ownerId, contextKey))
  if (!item) return null
  if (Date.now() - item.savedAt > MAX_AGE_MS) {
    await db.drafts.delete(item.id)
    return null
  }
  return item
}

export async function clearHeritageDrafts(ownerId: string): Promise<void> {
  if (ownerId) await db.drafts.where('ownerId').equals(ownerId).delete()
}
