// src/components/consent/ConsentModal.tsx
import { useState } from 'react'
import { getConsent, saveConsent } from '../../lib/consent'
import { emitEvent } from '../../lib/pilotEvents'

type ToggleKey = 'analytics' | 'camera' | 'gps'

const ITEMS: { key: ToggleKey; title: string; description: string }[] = [
  {
    key: 'analytics',
    title: 'Phân tích sử dụng',
    description: 'Ghi nhận sự kiện ẩn danh (phiên, trạm đã đến) để cải thiện trải nghiệm pilot.',
  },
  {
    key: 'camera',
    title: 'Camera',
    description: 'Quét mã QR trạm và dùng AR / Time Portal.',
  },
  {
    key: 'gps',
    title: 'Vị trí (GPS)',
    description: 'Tùy chọn — xác minh bạn đang ở di tích. Quét QR trạm vẫn check-in được khi không có GPS.',
  },
]

/** Shown once per browser (localStorage `histar_consent_v1`). */
export function ConsentModal() {
  const [open, setOpen] = useState(() => getConsent() === null)
  const [choices, setChoices] = useState<Record<ToggleKey, boolean>>({ analytics: true, camera: true, gps: true })

  if (!open) return null

  const close = (next: Record<ToggleKey, boolean>) => {
    saveConsent(next)
    emitEvent('consent_updated', {
      payload: { purposes: Object.entries(next).filter(([, v]) => v).map(([k]) => k) },
    })
    setOpen(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
      data-testid="consent-modal"
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#12141f] text-white shadow-2xl p-6 space-y-4">
        <div>
          <h2 id="consent-title" className="text-lg font-black">
            Quyền riêng tư &amp; quyền truy cập
          </h2>
          <p className="text-sm text-gray-300 mt-1">
            TimeLens cần vài quyền để hoạt động tại di tích. Bạn có thể đổi ý bất cứ lúc nào trong cài đặt trình duyệt.{' '}
            <a href="/privacy" className="text-[#388cf1] underline">
              Chính sách bảo mật
            </a>
          </p>
        </div>

        <ul className="space-y-3">
          {ITEMS.map((item) => (
            <li key={item.key}>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-[#fe951c]"
                  checked={choices[item.key]}
                  onChange={(e) => setChoices((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                  data-testid={`consent-${item.key}`}
                />
                <span>
                  <span className="block text-sm font-bold">{item.title}</span>
                  <span className="block text-xs text-gray-400">{item.description}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            data-testid="consent-save"
            onClick={() => close(choices)}
            className="flex-1 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] px-4 py-2.5 text-sm font-black text-black"
          >
            Lưu lựa chọn
          </button>
          <button
            type="button"
            data-testid="consent-decline"
            onClick={() => close({ analytics: false, camera: false, gps: false })}
            className="flex-1 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-bold hover:bg-white/10"
          >
            Từ chối tất cả
          </button>
        </div>
      </div>
    </div>
  )
}