// "Báo sai sử liệu" — lightweight compliance channel (MVBP §12.3).
import { useState } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'
import { emitEvent } from '../../lib/pilotEvents'
import { useToast } from '../../shared/ui/toast/useToast'

type Props = {
  stationCode?: string
  context?: string
}

export function ReportContentButton({ stationCode, context = 'app' }: Props) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { showToast } = useToast()

  const submit = () => {
    const text = reason.trim()
    if (text.length < 8) {
      showToast({ message: 'Mô tả ngắn (≥8 ký tự) giúp đội nội dung kiểm tra.', type: 'error' })
      return
    }
    emitEvent('content_report', {
      stationCode,
      payload: { reason: text.slice(0, 500), context },
    })
    showToast({
      message: 'Đã ghi nhận báo cáo. Cảm ơn bạn — đội sử liệu sẽ rà soát.',
      type: 'success',
    })
    setReason('')
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        data-testid="report-content-btn"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-[#fdb438]"
      >
        <MaterialIcon name="flag" className="text-sm" /> Báo sai sử liệu
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#161824] border border-white/15 p-5 space-y-3 shadow-2xl">
            <h3 className="font-black text-white text-sm uppercase tracking-wider">Báo sai sử liệu</h3>
            <p className="text-xs text-gray-400">
              Không lưu ảnh selfie. Chỉ gửi mô tả lỗi nội dung để đội duyệt tư liệu.
              {stationCode ? ` Trạm: ${stationCode}.` : ''}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"
              placeholder="Ví dụ: số liệu năm không khớp nguồn đã duyệt..."
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/15 text-xs font-bold text-gray-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={submit}
                className="px-4 py-2 rounded-xl bg-[#fe951c] text-black text-xs font-black uppercase"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
