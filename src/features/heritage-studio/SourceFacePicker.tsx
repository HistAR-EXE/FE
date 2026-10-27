import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { FaceCandidate } from './facePlacement'
import type { FaceGeometry } from './types'

function usePortraitUrl(file: File): string {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

function FaceThumbnail({ file, candidate, index, selected, onSelect }: { file: File; candidate: FaceGeometry; index: number; selected: boolean; onSelect: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let cancelled = false
    void createImageBitmap(file).then((bitmap) => {
      if (!cancelled && canvas.current) {
        const ctx = canvas.current.getContext('2d')
        const box = candidate.box
        ctx?.drawImage(bitmap, box.x * bitmap.width, box.y * bitmap.height, box.width * bitmap.width, box.height * bitmap.height, 0, 0, 96, 96)
      }
      bitmap.close()
    }).catch(() => undefined)
    return () => { cancelled = true }
  }, [candidate, file])
  return <button type="button" onClick={onSelect} aria-pressed={selected} aria-label={`Chọn khuôn mặt ${index + 1}`} className={`min-h-24 min-w-24 overflow-hidden rounded-xl border-2 ${selected ? 'border-[#f2c867]' : 'border-white/20'}`}>
    <canvas ref={canvas} width={96} height={96} className="aspect-square w-24" />
  </button>
}

export function FaceChoicePicker({ file, faces, selectedId, onSelect }: { file: File; faces: readonly FaceGeometry[]; selectedId?: string; onSelect: (id: string) => void }) {
  return <div className="grid min-w-0 gap-2"><p className="text-sm font-semibold">Chạm vào khuôn mặt cần ghép</p><div className="flex max-w-full gap-2 overflow-x-auto pb-1">
    {faces.map((face, index) => <FaceThumbnail key={face.id} file={file} candidate={face} index={index} selected={selectedId === face.id} onSelect={() => onSelect(face.id)} />)}
  </div></div>
}

export function SourceFacePicker({ file, initialCandidate, onConfirm }: { file: File; initialCandidate?: FaceCandidate | null; onConfirm: (candidate: FaceCandidate) => void }) {
  const url = usePortraitUrl(file)
  const [ratio, setRatio] = useState(0.75)
  const [center, setCenter] = useState(() => initialCandidate ? { x: initialCandidate.x + initialCandidate.width / 2, y: initialCandidate.y + initialCandidate.height / 2 } : { x: 0.5, y: 0.42 })
  const [width, setWidth] = useState(() => initialCandidate?.width ?? 0.3)
  const height = Math.min(0.75, width * 1.25)
  const position = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setCenter({ x: Math.min(1 - width / 2, Math.max(width / 2, (event.clientX - rect.left) / rect.width)), y: Math.min(1 - height / 2, Math.max(height / 2, (event.clientY - rect.top) / rect.height)) })
  }
  return <div className="grid min-w-0 gap-2" data-testid="manual-face-picker">
    <p className="text-sm">Không nhận được khuôn mặt. Chạm hoặc kéo vòng lên mặt trong ảnh nguồn.</p>
    <div className="relative mx-auto max-w-full touch-none overflow-hidden rounded-lg" style={{ aspectRatio: ratio, width: `min(100%, ${Math.min(320, 256 * ratio)}px)` }} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); position(event) }} onPointerMove={(event) => { if (event.buttons) position(event) }}>
      {url && <img src={url} alt="Ảnh nguồn để chọn vùng mặt" className="h-full w-full object-contain" draggable={false} onLoad={(event) => setRatio(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight)} />}
      <div className="pointer-events-none absolute rounded-[48%] border-2 border-[#f2c867] bg-[#f2c867]/10" style={{ left: `${(center.x - width / 2) * 100}%`, top: `${(center.y - height / 2) * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` }} />
    </div>
    <label className="grid gap-1 text-sm">Kích thước vùng mặt<input type="range" min="15" max="60" value={Math.round(width * 100)} onChange={(event) => setWidth(Number(event.target.value) / 100)} /></label>
    <button type="button" className="min-h-11 rounded-lg bg-[#d9ae58] px-4 font-bold text-black" onClick={() => onConfirm({ id: 'manual', x: center.x - width / 2, y: center.y - height / 2, width, height })}>Dùng vùng mặt này</button>
  </div>
}
