import { useEffect, useMemo, useState } from 'react'
import {
  errorNamesBlock,
  siteWorkspaceApi,
  workspaceErrorMessage,
  type ContentVersion,
  type SiteRole,
  type StationBlockType,
  type StationSnapshot,
  type StationSummary,
} from './api'

type BlockForm = {
  blockType: StationBlockType
  title: string
  body: string
  mediaUrl: string
  metaJson: string | null
}

type StationForm = {
  name: string
  sortOrder: string
  lat: string
  lng: string
  questStepKey: string
  active: boolean
  blocks: BlockForm[]
}

const EMPTY_BLOCK: BlockForm = { blockType: 'TEXT', title: '', body: '', mediaUrl: '', metaJson: null }

function emptyForm(): StationForm {
  return {
    name: '',
    sortOrder: '0',
    lat: '',
    lng: '',
    questStepKey: '',
    active: true,
    blocks: [{ ...EMPTY_BLOCK }],
  }
}

function latestDraft(versions: ContentVersion[], stationCode: string): ContentVersion | undefined {
  return versions
    .filter((version) => version.contentKind === 'STATION' && version.resourceKey === stationCode && version.status === 'DRAFT')
    .sort((left, right) => right.version - left.version)[0]
}

function readForm(version: ContentVersion | undefined, station: StationSummary | undefined): StationForm {
  if (version?.snapshotJson) {
    try {
      const parsed = JSON.parse(version.snapshotJson) as Partial<StationSnapshot>
      const blocks = Array.isArray(parsed.blocks)
        ? parsed.blocks.map((block) => ({
            blockType: block.blockType ?? 'TEXT',
            title: block.title ?? '',
            body: block.body ?? '',
            mediaUrl: block.mediaUrl ?? '',
            metaJson: block.metaJson ?? null,
          }))
        : [{ ...EMPTY_BLOCK }]
      return {
        name: parsed.name ?? '',
        sortOrder: parsed.sortOrder == null ? '0' : String(parsed.sortOrder),
        lat: parsed.lat == null ? '' : String(parsed.lat),
        lng: parsed.lng == null ? '' : String(parsed.lng),
        questStepKey: parsed.questStepKey ?? '',
        active: parsed.active ?? true,
        blocks,
      }
    } catch {
      return fromStation(station)
    }
  }
  return fromStation(station)
}

function fromStation(station: StationSummary | undefined): StationForm {
  if (!station) return emptyForm()
  const blocks = station.blocks.length > 0
    ? station.blocks.map((block) => ({
        blockType: block.blockType,
        title: block.title ?? '',
        body: block.body ?? '',
        mediaUrl: block.mediaUrl ?? '',
        metaJson: block.metaJson ?? null,
      }))
    : [{ ...EMPTY_BLOCK }]
  return {
    name: station.name ?? '',
    sortOrder: String(station.sortOrder ?? 0),
    lat: station.lat == null ? '' : String(station.lat),
    lng: station.lng == null ? '' : String(station.lng),
    questStepKey: station.questStepKey ?? '',
    active: station.active,
    blocks,
  }
}

function requireNumber(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function toSnapshot(stationCode: string, form: StationForm): StationSnapshot | null {
  const sortOrder = requireNumber(form.sortOrder)
  const lat = requireNumber(form.lat)
  const lng = requireNumber(form.lng)
  if (sortOrder == null || lat == null || lng == null) return null
  return {
    stationCode,
    name: form.name.trim(),
    sortOrder,
    lat,
    lng,
    questStepKey: form.questStepKey.trim(),
    active: form.active,
    blocks: form.blocks.map((block, index) => ({
      blockType: block.blockType,
      title: block.title.trim(),
      body: block.body.trim(),
      mediaUrl: block.mediaUrl.trim(),
      sortOrder: index,
      metaJson: block.metaJson,
    })),
  }
}

function blockLabel(base: string, index: number, count: number): string {
  return count > 1 ? `${base} ${index + 1}` : base
}

type StationDraftEditorProps = {
  siteCode: string
  role: SiteRole
  stations: StationSummary[]
  versions: ContentVersion[]
  onSaved: (version: ContentVersion) => void
}

export function StationDraftEditor({ siteCode, role, stations, versions, onSaved }: StationDraftEditorProps) {
  const [stationCode, setStationCode] = useState(stations[0]?.code ?? '')
  const selectedCode = stationCode || stations[0]?.code || ''
  const station = stations.find((item) => item.code === selectedCode)
  const draft = useMemo(() => latestDraft(versions, selectedCode), [versions, selectedCode])
  const seedKey = `${selectedCode}:${draft ? `${draft.id}:${draft.revision}` : station?.id ?? 'empty'}`
  const [form, setForm] = useState<StationForm>(() => readForm(draft, station))
  const [current, setCurrent] = useState<ContentVersion | undefined>(draft)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failedSnapshot, setFailedSnapshot] = useState<StationSnapshot | null>(null)
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const canEdit = role === 'SITE_MANAGER' || role === 'CONTENT_EDITOR'

  useEffect(() => {
    if (!stationCode && stations[0]?.code) setStationCode(stations[0].code)
  }, [stationCode, stations])

  useEffect(() => {
    setForm(readForm(draft, station))
    setCurrent(draft)
    setQrPayload(null)
  }, [draft, seedKey, selectedCode, station])

  const persist = async (snapshot: StationSnapshot) => {
    const saved = current
      ? await siteWorkspaceApi.updateDraft(siteCode, 'STATION', selectedCode, current.version, snapshot, current.revision)
      : await siteWorkspaceApi.createDraft(siteCode, 'STATION', selectedCode, snapshot)
    setCurrent(saved)
    onSaved(saved)
    return saved
  }

  const run = async (action: 'save' | 'submit') => {
    if (!selectedCode) return
    const snapshot = toSnapshot(selectedCode, form)
    if (!snapshot) {
      setError('Thứ tự, vĩ độ và kinh độ phải là số.')
      setMessage(null)
      setFailedSnapshot(null)
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    setFailedSnapshot(null)
    try {
      const saved = await persist(snapshot)
      if (action === 'save') {
        setMessage(`Đã lưu bản nháp trạm ${selectedCode} phiên bản ${saved.version}`)
        return
      }
      const submitted = await siteWorkspaceApi.submit(siteCode, 'STATION', selectedCode, saved.version, saved.revision)
      setCurrent(submitted)
      onSaved(submitted)
      setMessage(`Đã gửi duyệt trạm ${selectedCode} phiên bản ${submitted.version}`)
    } catch (cause: unknown) {
      const text = workspaceErrorMessage(cause)
      setError(text)
      setFailedSnapshot(errorNamesBlock(text) ? snapshot : null)
    } finally {
      setBusy(false)
    }
  }

  const requestQr = async () => {
    if (!selectedCode) return
    setBusy(true)
    setError(null)
    setFailedSnapshot(null)
    try {
      const qr = await siteWorkspaceApi.staticQr(siteCode, selectedCode)
      setQrPayload(qr.payload)
      setMessage(`Đã tạo QR tĩnh cho ${selectedCode}`)
    } catch (cause: unknown) {
      setError(workspaceErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const updateBlock = (index: number, patch: Partial<BlockForm>) => {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block, blockIndex) => (blockIndex === index ? { ...block, ...patch } : block)),
    }))
  }

  return (
    <form
      className="max-w-3xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void run('submit')
      }}
    >
      <label className="block text-sm font-semibold text-slate-800">
        Mã trạm
        <select
          className={inputClass}
          value={selectedCode}
          disabled={busy || stations.length === 0}
          onChange={(event) => setStationCode(event.target.value)}
        >
          {stations.length === 0 && <option value="">Chưa có trạm</option>}
          {stations.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code} — {item.name}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      )}
      <TextField label="Tên trạm" value={form.name} disabled={!canEdit || busy} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Thứ tự" value={form.sortOrder} disabled={!canEdit || busy} inputMode="numeric" onChange={(value) => setForm((prev) => ({ ...prev, sortOrder: value }))} />
        <TextField label="Vĩ độ" value={form.lat} disabled={!canEdit || busy} inputMode="decimal" onChange={(value) => setForm((prev) => ({ ...prev, lat: value }))} />
        <TextField label="Kinh độ" value={form.lng} disabled={!canEdit || busy} inputMode="decimal" onChange={(value) => setForm((prev) => ({ ...prev, lng: value }))} />
      </div>
      <TextField label="Khóa bước nhiệm vụ" value={form.questStepKey} disabled={!canEdit || busy} onChange={(value) => setForm((prev) => ({ ...prev, questStepKey: value }))} />
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <input
          type="checkbox"
          checked={form.active}
          disabled={!canEdit || busy}
          onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
        />
        Đang hoạt động
      </label>
      <fieldset className="space-y-3 rounded-xl border border-slate-200 p-3">
        <legend className="px-1 text-sm font-bold text-slate-800">Block nội dung</legend>
        {form.blocks.map((block, index) => (
          <div key={`${selectedCode}-${index}`} className="grid gap-3 rounded-lg bg-slate-50 p-3">
            <label className="block text-sm font-semibold text-slate-800">
              {blockLabel('Loại block', index, form.blocks.length)}
              <select
                className={inputClass}
                value={block.blockType}
                disabled={!canEdit || busy}
                onChange={(event) => updateBlock(index, { blockType: event.target.value as StationBlockType })}
              >
                <option value="TEXT">Văn bản</option>
                <option value="IMAGE">Hình ảnh</option>
                <option value="AUDIO">Âm thanh</option>
                <option value="VIDEO">Video</option>
                <option value="HOTSPOT">Điểm nóng</option>
              </select>
            </label>
            <TextField label={blockLabel('Tiêu đề block', index, form.blocks.length)} value={block.title} disabled={!canEdit || busy} onChange={(value) => updateBlock(index, { title: value })} />
            <TextField label={blockLabel('Nội dung block', index, form.blocks.length)} value={block.body} disabled={!canEdit || busy} multiline onChange={(value) => updateBlock(index, { body: value })} />
            <TextField label={blockLabel('URL phương tiện', index, form.blocks.length)} value={block.mediaUrl} disabled={!canEdit || busy} onChange={(value) => updateBlock(index, { mediaUrl: value })} />
            {canEdit && (
              <button
                type="button"
                className={secondaryButton}
                disabled={busy}
                onClick={() => setForm((prev) => ({ ...prev, blocks: prev.blocks.filter((_, blockIndex) => blockIndex !== index) }))}
              >
                {blockLabel('Xóa block', index, form.blocks.length)}
              </button>
            )}
          </div>
        ))}
        {canEdit && (
          <button
            type="button"
            className={secondaryButton}
            disabled={busy}
            onClick={() => setForm((prev) => ({ ...prev, blocks: [...prev.blocks, { ...EMPTY_BLOCK }] }))}
          >
            Thêm block
          </button>
        )}
      </fieldset>
      {failedSnapshot && (
        <pre aria-label="Snapshot block lỗi" className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(failedSnapshot, null, 2)}
        </pre>
      )}
      {qrPayload && (
        <output aria-label="Nội dung QR" className="block rounded-lg border border-slate-200 bg-white p-3 text-sm break-all text-slate-900">
          {qrPayload}
        </output>
      )}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} disabled={busy || !selectedCode} onClick={() => void run('save')}>
            Lưu nháp
          </button>
          <button type="submit" className={primaryButton} disabled={busy || !selectedCode}>
            Gửi duyệt
          </button>
          <button type="button" className={secondaryButton} disabled={busy || !selectedCode} onClick={() => void requestQr()}>
            Lấy QR tĩnh
          </button>
        </div>
      )}
    </form>
  )
}

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-[#014a9e] focus-visible:ring-2 focus-visible:ring-[#014a9e]/30 disabled:bg-slate-100'
const primaryButton =
  'inline-flex items-center justify-center rounded-lg bg-[#014a9e] px-4 py-2 text-sm font-bold text-white hover:bg-[#013874] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] disabled:cursor-not-allowed disabled:opacity-60'

function TextField({
  label,
  value,
  onChange,
  disabled,
  multiline = false,
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  multiline?: boolean
  inputMode?: 'numeric' | 'decimal'
}) {
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      {multiline ? (
        <textarea className={inputClass} rows={3} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={inputClass} value={value} disabled={disabled} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  )
}
