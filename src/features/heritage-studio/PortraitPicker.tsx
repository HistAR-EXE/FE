import { useEffect, useRef, useState } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'

type PortraitPickerProps = {
  file: File | null
  cameraLocked?: boolean
  onChange: (file: File | null) => void
}

export function PortraitPicker({ file, cameraLocked = false, onChange }: PortraitPickerProps) {
  const libraryInput = useRef<HTMLInputElement>(null)
  const [cameraDevice, setCameraDevice] = useState(false)
  const [mobilePointer, setMobilePointer] = useState(false)
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  useEffect(() => {
    const query = window.matchMedia('(hover: none) and (pointer: coarse)')
    const refresh = () => { setMobilePointer(query.matches); setCameraDevice(Boolean(navigator.mediaDevices?.getUserMedia)) }
    refresh()
    query.addEventListener('change', refresh)
    return () => query.removeEventListener('change', refresh)
  }, [])
  useEffect(() => {
    if (!file) { setThumbnail(null); return }
    const url = URL.createObjectURL(file)
    setThumbnail(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const accept = (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0] ?? null)
  return (
    <div className="grid min-w-0 gap-sm" data-testid="portrait-picker">
      <div className={`grid min-w-0 gap-sm ${mobilePointer ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {mobilePointer && <label className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-2 py-2 text-center text-sm font-bold ${cameraLocked || !cameraDevice ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-secondary'}`}>
          <MaterialIcon name="photo_camera" className="text-base" />
          Chụp ảnh
          <input type="file" accept="image/*" capture="user" onChange={accept} disabled={cameraLocked || !cameraDevice} className="sr-only" />
        </label>}
        <label className="flex min-h-11 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container px-2 py-2 text-center text-sm font-bold hover:border-secondary">
          <MaterialIcon name="upload" className="text-base" />
          <span className="min-w-0 break-words">Chọn ảnh từ thư viện</span>
          <input ref={libraryInput} type="file" accept="image/*" onChange={accept} className="sr-only" />
        </label>
      </div>
      {file && <div className="flex min-w-0 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm" role="status">
        {thumbnail && <img src={thumbnail} alt="Ảnh chân dung đã chọn" className="h-12 w-12 shrink-0 rounded-md object-cover" />}
        <span className="min-w-0 flex-1 truncate">{file.name}</span>
        <button type="button" className="shrink-0 text-secondary" onClick={() => libraryInput.current?.click()}>Đổi ảnh</button>
      </div>}
    </div>
  )
}
