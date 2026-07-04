import { getData, httpClient } from '../../shared/api/httpClient'
import type { Panorama } from '../panorama/api'

const MAX_PANORAMA_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validatePanoramaFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Chỉ chấp nhận JPEG, PNG hoặc WebP.'
  }
  if (file.size > MAX_PANORAMA_BYTES) {
    return 'Ảnh panorama tối đa 8MB.'
  }
  return null
}

export const panoramaAdminApi = {
  uploadPanorama: async (input: { locationId: string; title: string; file: File }) => {
    const formData = new FormData()
    formData.append('locationId', input.locationId)
    formData.append('title', input.title)
    formData.append('file', input.file)
    return getData<Panorama>(
      httpClient.post('/api/panoramas', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },

  replacePanoramaImage: async (panoramaId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return getData<Panorama>(
      httpClient.put(`/api/panoramas/${panoramaId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    )
  },
}
