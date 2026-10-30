import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/useAuth'
import { readStoredUser } from '../../shared/auth/session'
import { viralApi } from '../viral/api'
import { savedPhotoFile } from './photoFlow'

/** Private creation media is read through the owner-checked API, never storage URLs. */
export function useSavedCreationImage(ownerId: string, creationId: string) {
  const { user } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [value, setValue] = useState<{ key: string; url: string; blob: Blob | null; error: string }>({ key: '', url: '', blob: null, error: '' })
  const key = `${ownerId}:${creationId}:${attempt}`
  const authorized = user?.id === ownerId
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  useEffect(() => {
    if (!authorized || readStoredUser()?.id !== ownerId) return
    const request = new AbortController()
    let active = true, url = ''
    void viralApi.downloadCreationImage(creationId, request.signal).then(async blob => {
      const image = await savedPhotoFile(blob, 'square')
      if (!active || readStoredUser()?.id !== ownerId) return
      url = URL.createObjectURL(image)
      setValue({ key, url, blob: image, error: '' })
    }).catch(() => {
      if (active && readStoredUser()?.id === ownerId) setValue({ key, url: '', blob: null, error: 'Chưa tải được ảnh đã lưu. Hãy thử lại.' })
    })
    return () => { active = false; request.abort(); if (url) URL.revokeObjectURL(url) }
  }, [authorized, ownerId, creationId, key])
  return {
    url: authorized && value.key === key ? value.url : '',
    blob: authorized && value.key === key ? value.blob : null,
    error: authorized && value.key === key ? value.error : '',
    retry,
  }
}

