import { useState } from 'react'
import './reviewPhotos.css'

export async function preparePhoto(file: File): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)
    throw new Error('Chọn ảnh JPG, PNG hoặc WebP dưới 10 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    for (const edge of [960, 720, 480]) {
      const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const data = canvas.toDataURL('image/jpeg', .72)
      if (data.length <= 180000) return data
    }
    throw new Error('Ảnh quá lớn sau khi thu nhỏ.')
  } finally { bitmap.close() }
}

export function ReviewPhotos({ photos = [], onRemove }: { photos?: string[]; onRemove?: (index: number) => void }) {
  const [selected, setSelected] = useState<number | null>(null)
  if (!photos.length) return null
  return <div className="review-photos">
    {photos.map((src, i) => <div key={i}>
      <button type="button" aria-label={'Xem ảnh ' + (i + 1)} onClick={() => setSelected(i)}><img loading="lazy" src={src} alt={'Ảnh góp ý ' + (i + 1)} /></button>
      {onRemove && <button type="button" className="review-photo-remove" aria-label={'Gỡ ảnh ' + (i + 1)} onClick={() => onRemove(i)}>×</button>}
    </div>)}
    {selected !== null && <dialog aria-label="Ảnh góp ý" ref={node => { if (node && !node.open) node.showModal() }} onClose={() => setSelected(null)}>
      <button type="button" autoFocus onClick={() => setSelected(null)}>Đóng</button>
      <img src={photos[selected]} alt={'Ảnh góp ý ' + (selected + 1)} />
    </dialog>}
  </div>
}
