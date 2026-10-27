import Dexie, { type EntityTable } from 'dexie'
import { httpClient } from '../shared/api/httpClient'

export type HeritageUploadMetadata = {
  frameId?: string | null
  variant: 'square' | 'story'
  kind: 'original' | 'heritage'
  siteCode?: string
  stationCode?: string
  roleId?: string
  era?: number
  source?: string
}

type PendingHeritageUpload = HeritageUploadMetadata & {
  id?: number
  ownerId: string
  file: Blob
  fileName: string
  createdAt: number
  attempts: number
}

const db = new Dexie('histar-heritage-uploads') as Dexie & { uploads: EntityTable<PendingHeritageUpload, 'id'> }
db.version(1).stores({ uploads: '++id, createdAt' })
db.version(2).stores({ uploads: '++id, ownerId, createdAt' }).upgrade(async (transaction) => {
  // Version 1 had no owner. Never replay an image whose owner cannot be proven.
  await transaction.table('uploads').clear()
})

export async function queueHeritageUpload(ownerId: string, file: Blob, metadata: HeritageUploadMetadata): Promise<void> {
  if (!ownerId) throw new Error('heritage_upload_owner_required')
  await db.uploads.add({ ...metadata, ownerId, file, fileName: file instanceof File ? file.name : 'heritage.jpg', createdAt: Date.now(), attempts: 0 })
}

export async function clearHeritageUploadsForUser(ownerId: string): Promise<void> {
  if (ownerId) await db.uploads.where('ownerId').equals(ownerId).delete()
}

export async function flushHeritageUploads(ownerId: string, activeOwnerId: () => string | null): Promise<number> {
  if (!ownerId || activeOwnerId() !== ownerId) return 0
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
  const pending = await db.uploads.where('ownerId').equals(ownerId).sortBy('createdAt')
  let sent = 0
  for (const item of pending) {
    if (activeOwnerId() !== ownerId || item.ownerId !== ownerId) break
    try {
      const form = new FormData()
      form.append('file', item.file, item.fileName)
      if (item.frameId) form.append('frameId', item.frameId)
      form.append('variant', item.variant)
      form.append('kind', item.kind)
      for (const key of ['siteCode', 'stationCode', 'roleId', 'source'] as const) if (item[key]) form.append(key, item[key]!)
      if (item.era) form.append('era', String(item.era))
      await httpClient.post('/api/user-creations', form, { headers: { 'Content-Type': undefined } })
      if (item.id !== undefined) await db.uploads.delete(item.id)
      sent += 1
    } catch {
      if (item.id !== undefined) await db.uploads.update(item.id, { attempts: item.attempts + 1 })
      break
    }
  }
  return sent
}
