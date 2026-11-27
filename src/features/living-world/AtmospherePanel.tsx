import { atmosphereEligible } from './worldAtmosphere'
import type { AtmospherePhase } from './worldAtmosphere'

type Props = { phase: AtmospherePhase; zone: string; onSkip: () => void }

const captions = {
  NOTICE: { label: 'Sắp chuyển nhịp', text: 'Một tín hiệu xa sắp xuất hiện trong cảnh dựng. Âm thanh tăng nhẹ; bạn có thể bỏ qua.' },
  ALERT: { label: 'Nhịp cảnh đang diễn ra', text: 'Có tiếng ù trầm từ xa trong cảnh dựng. Bạn vẫn tự do khám phá không gian.' },
  RECOVERY: { label: 'Trở lại nhịp yên', text: 'Tiếng ù xa dần; công việc tiếp tục trong nhịp sinh hoạt nhẹ nhàng.' },
} as const

export function AtmospherePanel({ phase, zone, onSkip }: Props) {
  if (!atmosphereEligible(zone) || phase === 'CALM' || phase === 'SETTLED') return null
  const caption = captions[phase]
  const text = phase === 'ALERT' && zone === 'L1-C'
    ? 'Có tiếng ù trầm từ xa trong cảnh dựng. Người nấu và người phụ việc tạm dừng để lắng nghe.'
    : phase === 'ALERT' && (zone === 'S3' || zone === 'S4')
    ? 'Có tiếng ù trầm từ xa nơi chân trời. Mọi người trên sân và cánh đồng tạm dừng tay lắng nghe trước khi trở lại nhịp sinh hoạt.'
    : caption.text
  return <section role="region" aria-label="Nhịp không gian" className="lw-atmosphere" data-phase={phase}>
    <div role="status" aria-live="polite" aria-atomic="true">
      <h2>{caption.label}</h2>
      <p>{text}</p>
      <p className="lw-atmosphere-disclosure">Cảnh dựng hư cấu phục vụ giáo dục. Âm thanh tổng hợp, không phải bản ghi lịch sử.</p>
    </div>
    <button type="button" onClick={onSkip}>Bỏ qua nhịp cảnh</button>
  </section>
}
