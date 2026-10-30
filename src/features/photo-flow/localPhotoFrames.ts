import docLap from '../../assets/photo-frames/cu-chi-doc-lap.png'
import ganDa from '../../assets/photo-frames/cu-chi-gan-da.png'
import anhDung from '../../assets/photo-frames/cu-chi-anh-dung.png'
import type { PhotoFrame } from '../viral/api'
import type { PhotoRect } from './originalPhotoGeometry'

export const LOCAL_PHOTO_FRAMES: readonly PhotoFrame[] = [
  { id: 'cuchi-frame-1', name: 'Độc lập tự do', imageUrl: docLap, era: 'Củ Chi', sortOrder: -3, requiresPremium: false },
  { id: 'cuchi-frame-2', name: 'Gan dạ tiến bước', imageUrl: ganDa, era: 'Củ Chi', sortOrder: -2, requiresPremium: false },
  { id: 'cuchi-frame-3', name: 'Gian khổ mà anh dũng', imageUrl: anhDung, era: 'Củ Chi', sortOrder: -1, requiresPremium: false },
]
export const isLocalPhotoFrame = (id: string | null | undefined) => LOCAL_PHOTO_FRAMES.some(frame => frame.id === id)
export function localPhotoWindow(url: string): PhotoRect | null {
  const index = LOCAL_PHOTO_FRAMES.findIndex(frame => frame.imageUrl === url)
  return index < 0 ? null : [{ x: 174, y: 215, width: 732, height: 559 }, { x: 193, y: 215, width: 692, height: 576 }, { x: 168, y: 215, width: 742, height: 676 }][index]
}
