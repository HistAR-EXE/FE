import { useCallback, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { useToast } from '../../shared/ui/toast/useToast'

type DualPhotoExportProps = {
  leftImageUrl: string
  rightImageUrl: string
  leftLabel?: string
  rightLabel?: string
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('load failed'))
    img.src = url
  })
}

export function DualPhotoExport({ leftImageUrl, rightImageUrl, leftLabel = '1968', rightLabel = '2026' }: DualPhotoExportProps) {
  const [busy, setBusy] = useState(false)
  const { showToast } = useToast()

  const exportDual = useCallback(async () => {
    setBusy(true)
    try {
      const [left, right] = await Promise.all([loadImage(leftImageUrl), loadImage(rightImageUrl)])
      const w = 1080
      const h = 720
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas')

      ctx.fillStyle = '#12131b'
      ctx.fillRect(0, 0, w, h)
      ctx.drawImage(left, 0, 0, w / 2, h)
      ctx.drawImage(right, w / 2, 0, w / 2, h)

      ctx.fillStyle = 'rgba(18, 19, 27, 0.75)'
      ctx.fillRect(0, h - 48, w, 48)
      ctx.font = 'bold 20px system-ui'
      ctx.fillStyle = '#f2bf50'
      ctx.fillText(`TimeLens — ${leftLabel} | ${rightLabel}`, 24, h - 18)

      const link = document.createElement('a')
      link.download = `timelens-dual-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      showToast({ message: 'Đã tạo ảnh kép — kiểm tra thư mục tải về.', type: 'success' })
    } catch {
      showToast({
        message: 'Không ghép ảnh trên canvas (CORS). Thử tải từng ảnh riêng.',
        type: 'info',
      })
      window.open(leftImageUrl, '_blank')
      window.open(rightImageUrl, '_blank')
    } finally {
      setBusy(false)
    }
  }, [leftImageUrl, rightImageUrl, leftLabel, rightLabel, showToast])

  return (
    <button
      type="button"
      disabled={busy}
      onClick={exportDual}
      className="inline-flex items-center gap-1 px-4 py-2 rounded-full border border-secondary bg-secondary/10 text-secondary text-sm font-label-sm hover:bg-secondary/20 disabled:opacity-60"
    >
      <MaterialIcon name="photo_camera" className="text-base" />
      {busy ? 'Đang tạo...' : 'Ảnh kép xưa-nay'}
    </button>
  )
}
