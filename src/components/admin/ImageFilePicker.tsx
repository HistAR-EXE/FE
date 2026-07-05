import { useEffect, useId, useRef, useState } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'

type ImageFilePickerProps = {
  currentImageUrl?: string | null
  currentLabel?: string
  newLabel?: string
  accept?: string
  hint?: string
  required?: boolean
  onFileChange: (file: File | null) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ImageFilePicker({
  currentImageUrl,
  currentLabel = 'Ảnh hiện tại',
  newLabel = 'Ảnh mới',
  accept = 'image/jpeg,image/png,image/webp',
  hint = 'JPEG/PNG/WebP, tối đa 8MB',
  required = false,
  onFileChange,
}: ImageFilePickerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleChange = (next: File | null) => {
    setFile(next)
    onFileChange(next)
  }

  const showCurrent = currentImageUrl !== undefined

  return (
    <div className={showCurrent ? 'grid md:grid-cols-2 gap-md' : 'space-y-sm'}>
      {showCurrent && (
        <div className="space-y-2">
          <p className="text-xs text-on-surface-variant font-medium">{currentLabel}</p>
          <div className="aspect-video rounded-lg border border-outline-variant bg-surface-container-high overflow-hidden flex items-center justify-center">
            {currentImageUrl ? (
              <img src={currentImageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <p className="text-sm text-on-surface-variant px-md text-center">Chưa có ảnh</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-on-surface-variant font-medium">{newLabel}</p>
        <div className="aspect-video rounded-lg border border-dashed border-outline-variant bg-surface-container-high overflow-hidden flex items-center justify-center relative">
          {previewUrl ? (
            <img src={previewUrl} alt="Xem trước ảnh mới" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-on-surface-variant p-md text-center">
              <MaterialIcon name="upload" className="text-3xl opacity-60" />
              <span className="text-sm">Chưa chọn ảnh</span>
            </div>
          )}
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          required={required && !file}
          className="sr-only"
          onChange={(e) => handleChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 px-md py-sm text-sm rounded-lg border border-secondary text-secondary hover:bg-secondary/10 transition-colors"
        >
          <MaterialIcon name="folder_open" className="text-sm" />
          Chọn ảnh từ máy
        </button>
        {file && (
          <p className="text-xs text-on-surface-variant">
            {file.name} · {formatFileSize(file.size)}
          </p>
        )}
        {hint && <p className="text-xs text-on-surface-variant/70">{hint}</p>}
      </div>
    </div>
  )
}
