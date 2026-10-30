import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { XUA_NAY, XUA_NAY_PHOTO_CREDIT, type XuaNaySpotId } from '../time-portal/xuaNay/xuaNayData'

export type CallIllustration = { src: string; alt: string; caption: string; credit: string }

// Identified present-day photos from Xưa & Nay only. Generated cc-*.png diagrams
// and generic keyword/default images must never be substituted for evidence.
const TOPICS: { spot: XuaNaySpotId; phrases: string[] }[] = [
  { spot: 'bep-hoang-cam', phrases: ['bep hoang cam'] },
  { spot: 'mieng-ham', phrases: ['mieng ham', 'nap ham'] },
  { spot: 'phong-hop', phrases: ['phong hop duoi long dat', 'phong hop ngam', 'phong hop'] },
  { spot: 'thong-hoi', phrases: ['lo thong hoi', 'u moi thong hoi'] },
]
const PHOTOS: CallIllustration[] = TOPICS.map(({ spot }) => ({
  src: XUA_NAY[spot].nay.src,
  alt: `Ảnh hiện trạng ${XUA_NAY[spot].name.toLocaleLowerCase('vi')} tại Củ Chi`,
  caption: `${XUA_NAY[spot].name} · Hiện trạng tại khu di tích`,
  credit: XUA_NAY_PHOTO_CREDIT,
}))
function normalized(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
function containsPhrase(text: string, phrase: string): boolean {
  return ` ${text} `.includes(` ${phrase} `)
}
export function callIllustrationForSrc(src: string): CallIllustration | undefined {
  return PHOTOS.find(photo => photo.src === src)
}
/** No image is safer than a plausible but unrelated illustration. */
export function imagesForReply(reply: string, context?: { question: string; locationId?: string | null }): string[] {
  if (!context || context.locationId !== CU_CHI_LOCATION_ID) return []
  const question = normalized(context.question)
  const answer = normalized(reply)
  if (/khong (can|hien thi|dung|dua|cho).*?(anh|hinh)|dung.*?(anh|hinh)/.test(question)) return []
  if (/\b(tab|tinh nang|huy hieu|nhiem vu|bao tang|premium|cong thoi gian|1948|1968|1975)\b/.test(question)) return []
  if (/chua (co|du) (thong tin|tu lieu)|khong (co|du) tu lieu|khong the xac (minh|dinh)|chua xac minh/.test(answer)) return []
  const matches = TOPICS.filter(topic => topic.phrases.some(phrase => containsPhrase(question, phrase))
    && topic.phrases.some(phrase => containsPhrase(answer, phrase)))
  if (matches.length !== 1) return []
  return [XUA_NAY[matches[0].spot].nay.src]
}
