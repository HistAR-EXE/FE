export const CU_CHI_VIDEO_IDS = ['tunnel-digging', 'liberation-gate', 'communication-station', 'guerrilla-house', 'women-house', 'war-artifacts', 'ho-chi-minh-space'] as const
export const VIDEO_XP = 30
export const MAX_VIDEO_XP = CU_CHI_VIDEO_IDS.length * VIDEO_XP
export function formatVideoTime(seconds: number): string {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}
export function videoCompletionCount(keys: string[]): number {
  const unique = new Set(keys)
  return CU_CHI_VIDEO_IDS.filter(id => unique.has(`video:${id}`)).length
}
export function videoRewardTotal(keys: string[]): number { return videoCompletionCount(keys) * VIDEO_XP }
export function canSeekVideo(position: number, watched: number, completed: boolean): boolean {
  return Number.isFinite(position) && position >= 0 && (completed || position <= watched + 0.75)
}
