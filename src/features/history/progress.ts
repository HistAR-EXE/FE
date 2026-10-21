export function resumePosition(value: string | null, duration: number): number {
    const position = Number(value)
    return Number.isFinite(duration) && Number.isFinite(position) && position > 0 && position < duration - 5 ? position : 0
}
export function switchPosition(position: number, duration: number): number {
    return Number.isFinite(position) && Number.isFinite(duration) ? Math.min(Math.max(position, 0), Math.max(duration, 0)) : 0
}
