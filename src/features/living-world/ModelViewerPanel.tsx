import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { layerCaptions, modelMedia, updateModelView } from './worldModelMedia'
import type { ModelLayer, ModelView, ModelViewAction } from './worldModelMedia'

type Props = {
  view: ModelView
  exploded: boolean
  onView: (view: ModelView) => void
  onExploded: (exploded: boolean) => void
  onClose: () => void
}

const layers: ModelLayer[] = ['ALL', 'SURFACE', 'L1', 'L2', 'L3']

export function ModelViewerPanel({ view, exploded, onView, onExploded, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const item = modelMedia[0]
  const caption = layerCaptions[view.layer]
  const update = (action: ModelViewAction) => onView(updateModelView(view, action))

  useEffect(() => { closeRef.current?.focus({preventScroll:true}) }, [])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const dialog = dialogRef.current
    const controls = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), summary, [href], [tabindex="0"]')
    if (!dialog || !controls?.length) return
    const first = controls[0], last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    } else if (!dialog.contains(document.activeElement)) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    }
    event.stopPropagation()
  }

  return <div ref={dialogRef} role="dialog" aria-label="Quan sát sa bàn" aria-modal={true} className="lw-model-viewer" onKeyDown={handleKeyDown}>
    <section className="lw-model-panel">
      <h2>{item.title}</h2>
      <p>Sa bàn giảng dạy theo chủ đề. Chọn lớp để đọc cấu trúc tương đối.</p>
      <div className="lw-model-layers" role="group" aria-label="Chọn lớp sa bàn">
        {layers.map(layer => <button type="button" key={layer} aria-pressed={view.layer === layer} onClick={() => update({ type: 'LAYER', layer })}>{layerCaptions[layer].label}</button>)}
      </div>
      <div className="lw-model-caption" role="status" aria-live="polite" aria-atomic="true">
        <h3>{caption.label}</h3>
        <p>{caption.description}</p>
      </div>
      {view.diagram && <figure className="lw-model-diagram" aria-label="Sơ đồ các lớp">
        <svg viewBox="0 0 400 250" role="img" aria-label="Sơ đồ quy ước mặt đất và ba lớp ngầm">
          <desc>Các dải ngang và nét nối biểu diễn mối liên hệ trong mô hình chủ đề. Không theo tỷ lệ, không chỉ vị trí phòng hoặc độ sâu khảo cổ.</desc>
          {(['SURFACE', 'L1', 'L2', 'L3'] as ModelLayer[]).map((layer, index) => {
            const y = 24 + index * 54
            const selected = view.layer === 'ALL' || view.layer === layer
            return <g key={layer} opacity={selected ? 1 : .35}>
              <rect x="12" y={y} width="376" height="36" rx="8" fill={layer === 'SURFACE' ? '#4b7050' : '#825b3c'} stroke={selected ? '#f5df9a' : '#bdac90'} strokeWidth={selected ? 3 : 1} />
              <text x="28" y={y + 24} fill="#fff" fontSize="16">{layerCaptions[layer].label}</text>
              <path d={`M 134 ${y + 18} H 360`} fill="none" stroke="#f5df9a" strokeWidth="5" strokeLinecap="round" />
              {index < 3 && <path d={`M ${index % 2 ? 190 : 310} ${y + 36} v 18`} stroke="#e9cf98" strokeWidth="3" strokeDasharray="4 3" />}
            </g>
          })}
        </svg>
        <figcaption>Sơ đồ chủ đề không theo tỷ lệ; nét nối là quy ước giảng dạy. Không thể suy ra phòng cố định theo lớp hay độ sâu đo đạc.</figcaption>
      </figure>}
      <div className="lw-model-controls" role="group" aria-label="Điều khiển sa bàn">
        <button type="button" aria-pressed={exploded} onClick={() => onExploded(!exploded)}>{exploded ? 'Ghép các lớp' : 'Tách các lớp'}</button>
        <button type="button" onClick={() => update({ type: 'ROTATE', direction: -1 })}>Xoay trái</button>
        <button type="button" onClick={() => update({ type: 'ROTATE', direction: 1 })}>Xoay phải</button>
        <button type="button" disabled={view.zoom >= 1.5} onClick={() => update({ type: 'ZOOM', direction: 1 })}>Phóng to</button>
        <button type="button" disabled={view.zoom <= .75} onClick={() => update({ type: 'ZOOM', direction: -1 })}>Thu nhỏ</button>
        <button type="button" onClick={() => update({ type: 'RESET' })}>Góc nhìn ban đầu</button>
        <button type="button" aria-pressed={view.diagram} onClick={() => update({ type: 'DIAGRAM' })}>{view.diagram ? 'Xem mô hình 3D' : 'Sơ đồ 2D'}</button>
      </div>
      <details className="lw-model-source">
        <summary>Nguồn và giới hạn</summary>
        <p>{item.source}</p>
        <p>{item.limitations}</p>
      </details>
      <button type="button" ref={closeRef} className="lw-model-close" onClick={onClose}>Trở lại vị trí đang đứng</button>
    </section>
  </div>
}
