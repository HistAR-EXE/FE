import { images } from '../../assets/images'
import { isPlaceholderImage } from './isPlaceholderImage'

/** Curated /media paths from cu-chi-asset-manifest — SmartImage falls back to stitch URLs if missing. */
const ARTIFACT_MEDIA: Record<string, string> = {
  'hotspot:kitchen': '/media/cu-chi/scenes/bep-hoang-cam-2026.jpg',
  'hotspot:vent': '/media/cu-chi/scenes/thong-gio-2026.jpg',
  'scene:gieng': '/media/cu-chi/scenes/gieng-2026.jpg',
  'artifact:vu-khi': '/media/cu-chi/artifacts/che-tao-vu-khi.jpg',
  'artifact:tram-xa': '/media/cu-chi/artifacts/ham-giai-phau.jpg',
  'artifact:sung-dkz': '/media/cu-chi/artifacts/trung-bay-vu-khi.png',
  'artifact:khoai-mi': '/media/cu-chi/gallery/khoai-mi-1.jpg',
  'artifact:nguy-trang': '/media/cu-chi/gallery/nguy-trang-ham-1.jpg',
  'artifact:coi-xay-thoc': '/media/cu-chi/artifacts/coi-xay-thoc.jpg',
}

export function resolveLocationCoverFallback(name: string | undefined, index: number): string {
  const n = (name ?? '').toLowerCase()
  if (n.includes('nhà rồng') || n.includes('nha rong') || n.includes('bến')) return images.homeEventBg
  if (n.includes('thiên mụ') || n.includes('thien mu')) return images.exploreChuaThienMu
  if (n.includes('huế') || n.includes('hue') || n.includes('đại nội')) return images.exploreDaiNoi
  if (n.includes('văn miếu') || n.includes('van mieu')) return images.homeVanMieuCard
  if (n.includes('củ chi') || n.includes('cu chi') || n.includes('địa đạo')) return images.scanHistoryNgomon
  if (n.includes('hội an') || n.includes('hoi an')) return images.questBiAnChuaCau
  if (n.includes('hoa lư') || n.includes('hoa lu') || n.includes('kinh đô đầu')) return images.homeHueCard
  if (n.includes('nhà hồ') || n.includes('nha ho') || n.includes('tây đô') || n.includes('tay do')) return images.detailThangLongHero
  if (n.includes('hùng') || n.includes('hung') || n.includes('đất tổ')) return images.homeVanMieuCard
  if (n.includes('hoàng thành') || n.includes('hoang thanh')) return images.questDauAnHoangThanh
  return index % 2 === 0 ? images.exploreDaiNoi : images.exploreChuaThienMu
}

export function pickLocationCover(
  coverImage: string | undefined | null,
  locationName: string | undefined,
  index: number,
  broken?: boolean,
): string {
  const url = coverImage?.trim()
  if (broken || !url || isPlaceholderImage(url)) {
    return resolveLocationCoverFallback(locationName, index)
  }
  return url
}

export function resolveArtifactImageSrc(imageUrl: string | undefined | null, unlockKey: string): string | undefined {
  const url = imageUrl?.trim()
  if (url && !isPlaceholderImage(url)) return url
  return ARTIFACT_MEDIA[unlockKey]
}

export function resolveArtifactImageFallback(unlockKey: string): string {
  return ARTIFACT_MEDIA[unlockKey] ?? images.detailArtifact
}

export function pickQuestCover(
  questCover: string | undefined | null,
  locationCover: string | undefined | null,
  locationName: string | undefined,
  index: number,
  broken?: boolean,
): string {
  return pickLocationCover(questCover ?? locationCover, locationName, index, broken)
}
