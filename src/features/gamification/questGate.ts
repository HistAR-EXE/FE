import type { Quest } from './api'

export function questBlockedByEarlier(quest: Quest, quests: Quest[], completedIds: Set<string>) {
    if (quest.unlockDiscoveryKeys) return false
    const order = quest.requiredOrder ?? 0
    if (order <= 0) return false
    return quests.some((other) =>
        other.id !== quest.id
        && !other.unlockDiscoveryKeys
        && (other.requiredOrder ?? 0) > 0
        && (other.requiredOrder ?? 0) < order
        && !completedIds.has(other.id),
    )
}

export function questMissingTourKeys(quest: Quest, keys: string[]) {
    if (!quest.unlockDiscoveryKeys) return false
    const need = quest.unlockDiscoveryKeys.split(',').map((key) => key.trim()).filter(Boolean)
    return need.some((key) => !keys.includes(key))
}
