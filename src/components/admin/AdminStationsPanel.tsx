// Minimal A3 CMS: list ST01–ST06, edit TEXT block body, toggle active, copy QR payload.
import { useCallback, useEffect, useState } from 'react'
import {
  adminApi,
  type AdminStation,
  type AdminStationImportItem,
} from '../../features/admin/api'
import { getFriendlyErrorMessage } from '../../shared/api/errorMessages'
import { useToast } from '../../shared/ui/toast/useToast'
import { MaterialIcon } from '../ui/MaterialIcon'

const SITE_OPTIONS = [
  { code: 'cu-chi', label: 'Củ Chi (Nam)' },
  { code: 'hoang-thanh-thang-long', label: 'Hoàng thành Thăng Long (Bắc)' },
  { code: 'dai-noi-hue', label: 'Đại Nội Huế (Trung)' },
] as const

export function AdminStationsPanel() {
  const [siteCode, setSiteCode] = useState<string>('cu-chi')
  const [stations, setStations] = useState<AdminStation[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCode, setSavingCode] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { name: string; body: string; active: boolean }>>({})
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const { showToast } = useToast()

  const load = useCallback(() => {
    setLoading(true)
    adminApi
      .listStations(siteCode)
      .then((list) => {
        setStations(list)
        const next: Record<string, { name: string; body: string; active: boolean }> = {}
        for (const s of list) {
          const text = s.blocks.find((b) => b.blockType === 'TEXT') ?? s.blocks[0]
          next[s.code] = {
            name: s.name,
            body: text?.body ?? '',
            active: s.active,
          }
        }
        setDrafts(next)
      })
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
      .finally(() => setLoading(false))
  }, [showToast, siteCode])

  useEffect(() => {
    load()
  }, [load])

  const saveOne = async (station: AdminStation) => {
    const draft = drafts[station.code]
    if (!draft) return
    setSavingCode(station.code)
    try {
      const otherBlocks = station.blocks
        .filter((b) => b.blockType !== 'TEXT')
        .map((b) => ({
          blockType: b.blockType,
          title: b.title,
          body: b.body,
          mediaUrl: b.mediaUrl,
          sortOrder: b.sortOrder,
          metaJson: b.metaJson,
        }))
      const textBlock = station.blocks.find((b) => b.blockType === 'TEXT')
      const body: AdminStationImportItem[] = [
        {
          code: station.code,
          name: draft.name,
          sortOrder: station.sortOrder,
          lat: station.lat,
          lng: station.lng,
          questStepKey: station.questStepKey,
          active: draft.active,
          blocks: [
            {
              blockType: 'TEXT',
              title: textBlock?.title ?? `Giới thiệu ${draft.name}`,
              body: draft.body,
              sortOrder: 1,
            },
            ...otherBlocks,
          ],
        },
      ]
      await adminApi.importStations(siteCode, body)
      showToast({ message: `Đã lưu ${station.code}`, type: 'success' })
      load()
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setSavingCode(null)
    }
  }

  const copyQr = async (code: string) => {
    try {
      const token = await adminApi.stationQrToken(code, siteCode, true)
      setQrPayload(token.payload)
      await navigator.clipboard.writeText(token.payload)
      showToast({
        message: token.signed
          ? 'Đã copy QR tĩnh HMAC (site:ST:0:sig)'
          : 'Đã copy QR (chưa ký — set PRESENCE_QR_HMAC_SECRET)',
        type: 'success',
      })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    }
  }

  if (loading) {
    return <p className="text-sm text-on-surface-variant">Đang tải trạm {siteCode}...</p>
  }

  return (
    <div data-testid="admin-stations-panel" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-bold text-on-surface">
          Site{' '}
          <select
            className="ml-2 rounded-lg border border-outline-variant bg-surface-container px-2 py-1"
            value={siteCode}
            onChange={(e) => setSiteCode(e.target.value)}
            data-testid="admin-stations-site"
          >
            {SITE_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-on-surface-variant">
        CMS ST01–ST06 theo site: sửa tên, TEXT, publish (`active`), xuất QR tĩnh in chống ẩm (`site:STxx:0:sig`).
      </p>
      {qrPayload && (
        <p className="text-xs font-mono break-all text-secondary bg-surface-container-high p-2 rounded-lg border border-outline-variant">
          Last QR: {qrPayload}
        </p>
      )}
      {stations.map((s) => {
        const draft = drafts[s.code]
        if (!draft) return null
        return (
          <article
            key={s.id}
            className="rounded-xl border border-outline-variant bg-surface-container p-md space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-title-md text-on-surface">
                {s.code} · sort {s.sortOrder}
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => copyQr(s.code)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-secondary/40 text-secondary text-xs font-bold"
                >
                  <MaterialIcon name="qr_code" className="text-sm" /> QR token
                </button>
                <button
                  type="button"
                  disabled={savingCode === s.code}
                  onClick={() => void saveOne(s)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-bold disabled:opacity-50"
                >
                  {savingCode === s.code ? 'Đang lưu…' : 'Lưu'}
                </button>
              </div>
            </div>
            <label className="block text-xs text-on-surface-variant">
              Tên trạm
              <input
                className="mt-1 w-full neo-input rounded-lg px-3 py-2"
                value={draft.name}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [s.code]: { ...draft, name: e.target.value } }))
                }
              />
            </label>
            <label className="block text-xs text-on-surface-variant">
              Nội dung (TEXT block)
              <textarea
                rows={4}
                className="mt-1 w-full neo-input rounded-lg px-3 py-2"
                value={draft.body}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [s.code]: { ...draft, body: e.target.value } }))
                }
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [s.code]: { ...draft, active: e.target.checked } }))
                }
              />
              Published (active)
            </label>
          </article>
        )
      })}
      {stations.length === 0 && (
        <p className="text-sm text-on-surface-variant">Chưa có trạm — chạy Flyway V21+.</p>
      )}
    </div>
  )
}
