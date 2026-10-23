// src/features/gamification/questStepAction.ts
// Mỗi bước nhiệm vụ mở ra đâu trong app. Dùng chung cho trang Nhiệm vụ và trang chi tiết.

import { timePortalPath } from '../../shared/config/locationSlug'
import type { QuestV2Step } from './questsV2Api'
import { TRAM_XA_PANORAMA_ID } from './saBanFragment'

export type QuestStepAction =
    | { kind: 'link'; href: string; label: string; icon: string }
    /** Hiện vật xem ngay trong trang (khung xem hiện vật), ghi nhận sau vài giây. */
    | { kind: 'artifact'; label: string; icon: string }
    | { kind: 'premium'; label: string; icon: string; era: number | null }

const ICONS: Record<string, string> = {
    tour: '360',
    portal: 'history',
    artifact: 'museum',
    dialogue: 'forum',
    minigame: 'extension',
    xuanay: 'compare',
    station: 'qr_code_scanner',
    checkin: 'my_location',
    reveal: 'auto_awesome',
    briefing: 'menu_book',
}

export function questStepIcon(actionType: string): string {
    return ICONS[actionType] ?? 'flag'
}

export function questStepAction(
    step: QuestV2Step,
    ctx: { questId: string; locationId: string },
): QuestStepAction {
    const icon = questStepIcon(step.actionType)
    const label = (fallback: string) => step.actionLabel?.trim() || fallback

    if (step.state === 'PREMIUM_LOCKED') {
        return { kind: 'premium', label: 'Mở bằng Premium', icon: 'workspace_premium', era: step.portalEra }
    }
    if (step.minigameId) {
        return { kind: 'link', href: `/quests/${ctx.questId}/play/${step.minigameId}`, label: label('Chơi thử thách'), icon }
    }

    switch (step.actionType) {
        case 'artifact':
            return { kind: 'artifact', label: label('Xem hiện vật'), icon }
        case 'tour': {
            const params = new URLSearchParams({ questRecord: step.key })
            if (step.key === 'tour:sa-ban') {
                params.set('view', 'illustrated')
            } else if (step.key === 'tour:tram-xa') {
                params.set('panorama', TRAM_XA_PANORAMA_ID)
                params.set('view', 'panorama')
            } else if (step.key.startsWith('scene:')) {
                params.set('panorama', step.key.slice('scene:'.length))
            }
            return { kind: 'link', href: `/tour/360/${ctx.locationId}?${params}`, label: label('Vào tour 360°'), icon }
        }
        case 'portal': {
            const era = step.portalEra ?? (step.key.startsWith('era:') ? Number(step.key.slice(4)) : 2026)
            return { kind: 'link', href: timePortalPath(ctx.locationId, { era: String(era) }), label: label('Mở Cổng thời gian'), icon }
        }
        case 'xuanay': {
            const spot = step.key.startsWith('xuanay:') ? step.key.slice('xuanay:'.length) : ''
            const search: Record<string, string> = spot ? { view: 'xua-nay', spot } : { view: 'xua-nay' }
            return { kind: 'link', href: timePortalPath(ctx.locationId, search), label: label('Xem Xưa & Nay'), icon }
        }
        case 'dialogue': {
            // Chrono là trợ lý trò chuyện duy nhất; trang chat tự tìm id nhân vật.
            const params = new URLSearchParams({
                locationId: ctx.locationId,
                persona: 'chrono',
                questRecord: step.key,
                questId: ctx.questId,
                autoSend: '1',
            })
            if (step.chatPrompt) params.set('questPrompt', step.chatPrompt)
            return { kind: 'link', href: `/chat?${params}`, label: label('Hỏi Chrono'), icon }
        }
        case 'station':
            return { kind: 'link', href: `/scan?locationId=${ctx.locationId}`, label: label('Quét QR tại trạm'), icon }
        case 'checkin':
            return { kind: 'link', href: `/scan?locationId=${ctx.locationId}`, label: label('Check-in'), icon }
        default:
            return {
                kind: 'link',
                href: `/explore?${new URLSearchParams({ locationId: ctx.locationId, questRecord: step.key })}`,
                label: label('Mở'),
                icon,
            }
    }
}
