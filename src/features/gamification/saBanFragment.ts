export const SA_BAN_QUEST_KEY = 'tour:sa-ban'
export const SA_BAN_FRAGMENT_CODE = 'SABAN-3T'
export const SA_BAN_FRAGMENT_PIN = { xPct: 36, yPct: 42 }

export const SA_BAN_QUIZ = {
    prompt: 'Tầng sâu nhất của địa đạo sâu bao nhiêu?',
    options: [
        { id: 'deep', label: '8–10 m, tối đa 12 m' },
        { id: 'mid', label: '15 m' },
        { id: 'far', label: '25–30 m' },
    ],
    correctId: 'deep',
}

export function messageHasSaBanCode(text: string): boolean {
    return text.toUpperCase().includes(SA_BAN_FRAGMENT_CODE)
}
