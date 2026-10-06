type ShareProgressInput = {
    title: string
    stars: number
    collected: number
    total: number
    premiumCollected: number
    premiumTotal: number
}

export async function shareProgressCard(input: ShareProgressInput) {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1350
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#12141c'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fdb438'
    ctx.font = '700 42px sans-serif'
    ctx.fillText('HistAR', 80, 140)
    ctx.fillStyle = '#ffffff'
    ctx.font = '800 64px sans-serif'
    wrapText(ctx, input.title, 80, 260, 920, 78)
    const filled = Math.max(0, Math.min(3, input.stars))
    ctx.font = '700 54px sans-serif'
    ctx.fillStyle = '#fdb438'
    ctx.fillText(`${'★'.repeat(filled)}${'☆'.repeat(3 - filled)}`, 80, 620)
    ctx.fillStyle = '#d1d5db'
    ctx.font = '600 40px sans-serif'
    ctx.fillText(`Bộ sưu tập ${input.collected}/${input.total}`, 80, 760)
    if (input.premiumTotal > 0) {
        ctx.fillText(`Premium ${input.premiumCollected}/${input.premiumTotal}`, 80, 830)
    }
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) return
    const file = new File([blob], 'histar-tien-do.png', { type: 'image/png' })
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: input.title })
            return
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
        }
    }
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'histar-tien-do.png'
    link.click()
    URL.revokeObjectURL(url)
}

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
) {
    const words = text.split(' ')
    let line = ''
    let cursor = y
    words.forEach((word) => {
        const next = line ? `${line} ${word}` : word
        if (ctx.measureText(next).width > maxWidth && line) {
            ctx.fillText(line, x, cursor)
            line = word
            cursor += lineHeight
        } else {
            line = next
        }
    })
    if (line) ctx.fillText(line, x, cursor)
}
