import { useEffect, useMemo, useRef, useState } from 'react'
import { locationsApi, type Location } from '../locations/api'
import {
  errorNamesBlock,
  siteWorkspaceApi,
  workspaceErrorMessage,
  type ContentVersion,
  type SiteProfileSnapshot,
  type SiteRole,
  type SiteWorkspaceSummary,
} from './api'

const EMPTY_PROFILE: SiteProfileSnapshot = {
  name: '',
  description: '',
  formattedAddress: '',
  coverImage: '',
  sources: '',
}

function readProfile(version: ContentVersion | undefined): SiteProfileSnapshot {
  if (!version?.snapshotJson) return EMPTY_PROFILE
  try {
    const parsed = JSON.parse(version.snapshotJson) as Partial<SiteProfileSnapshot>
    return {
      name: parsed.name ?? '',
      description: parsed.description ?? '',
      formattedAddress: parsed.formattedAddress ?? '',
      coverImage: parsed.coverImage ?? '',
      sources: parsed.sources ?? '',
    }
  } catch {
    return EMPTY_PROFILE
  }
}

function latestProfile(versions: ContentVersion[], status: ContentVersion['status']): ContentVersion | undefined {
  return versions
    .filter((version) => version.contentKind === 'SITE_PROFILE' && version.resourceKey === 'profile' && version.status === status)
    .sort((left, right) => right.version - left.version)[0]
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function profileFromSummary(summary: SiteWorkspaceSummary): SiteProfileSnapshot | null {
  const name = text(summary.name)
  const description = text(summary.description)
  const formattedAddress = text(summary.formattedAddress)
  const coverImage = text(summary.coverImage)
  const sources = text(summary.sources)
  if (!name && !description && !formattedAddress && !coverImage && !sources) return null
  return {
    name: name || text(summary.locationName),
    description,
    formattedAddress,
    coverImage,
    sources,
  }
}

function profileFromLocation(location: Location): SiteProfileSnapshot {
  return {
    name: text(location.name),
    description: text(location.description),
    formattedAddress: text(location.formattedAddress),
    coverImage: text(location.coverImage),
    sources: '',
  }
}

function mergeSeed(location: SiteProfileSnapshot | null, summary: SiteProfileSnapshot | null): SiteProfileSnapshot | null {
  if (!location && !summary) return null
  const base = location ?? EMPTY_PROFILE
  if (!summary) return base
  return {
    name: summary.name || base.name,
    description: summary.description || base.description,
    formattedAddress: summary.formattedAddress || base.formattedAddress,
    coverImage: summary.coverImage || base.coverImage,
    sources: summary.sources || base.sources,
  }
}

type SiteProfileDraftEditorProps = {
  siteCode: string
  role: SiteRole
  versions: ContentVersion[]
  summary: SiteWorkspaceSummary
  onSaved: (version: ContentVersion) => void
}

export function SiteProfileDraftEditor({ siteCode, role, versions, summary, onSaved }: SiteProfileDraftEditorProps) {
  const draft = useMemo(() => latestProfile(versions, 'DRAFT'), [versions])
  const published = useMemo(() => latestProfile(versions, 'PUBLISHED'), [versions])
  const seeded = draft ?? published
  const seedKey = seeded ? `${seeded.status}:${seeded.id}:${seeded.revision}` : `live:${summary.siteCode}`
  const summarySeed = !seeded ? profileFromSummary(summary) : null
  const waitsForLocation = !seeded && Boolean(text(summary.locationName))
  const [form, setForm] = useState<SiteProfileSnapshot>(() => (seeded ? readProfile(seeded) : summarySeed ?? EMPTY_PROFILE))
  const [current, setCurrent] = useState<ContentVersion | undefined>(draft)
  const [pinned, setPinned] = useState<ContentVersion | null>(null)
  const [seedReady, setSeedReady] = useState(!waitsForLocation)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dirty = useRef(false)
  const seedSeen = useRef(Boolean(seeded || summarySeed))
  const heldSubmission = useRef<ContentVersion | null>(null)
  const seedSite = useRef(summary.siteCode)
  const canEdit = role === 'SITE_MANAGER' || role === 'CONTENT_EDITOR'
  const shown = current ?? pinned

  useEffect(() => {
    if (seedSite.current !== summary.siteCode) {
      seedSite.current = summary.siteCode
      dirty.current = false
      seedSeen.current = false
      heldSubmission.current = null
      setPinned(null)
    }

    const keepEdits = dirty.current && seedSeen.current

    if (draft) {
      if (!keepEdits) {
        dirty.current = false
        seedSeen.current = true
        setForm(readProfile(draft))
      }
      setCurrent(draft)
      setPinned(null)
      setSeedReady(true)
      return
    }

    const held = heldSubmission.current
    if (held && held.siteCode === summary.siteCode && (!published || held.version >= published.version)) {
      if (!keepEdits) {
        dirty.current = false
        seedSeen.current = true
        setForm(readProfile(held))
      }
      setCurrent(undefined)
      setPinned(held)
      setSeedReady(true)
      return
    }

    if (published) {
      if (!keepEdits) {
        dirty.current = false
        seedSeen.current = true
        setForm(readProfile(published))
      }
      setCurrent(undefined)
      setPinned(null)
      setSeedReady(true)
      return
    }

    setCurrent(undefined)
    const fromSummary = profileFromSummary(summary)
    const query = text(summary.locationName)
    if (!query) {
      if (fromSummary && !keepEdits) {
        dirty.current = false
        seedSeen.current = true
        setForm(fromSummary)
      }
      setSeedReady(true)
      return
    }

    let cancelled = false
    locationsApi
      .list({ search: query, size: 50 })
      .then((items) => {
        if (cancelled || (dirty.current && seedSeen.current)) return
        const wanted = query.toLowerCase()
        const match = items.find((item) => text(item.name).toLowerCase() === wanted) ?? null
        const merged = mergeSeed(match ? profileFromLocation(match) : null, fromSummary)
        if (!merged) return
        dirty.current = false
        seedSeen.current = true
        setForm(merged)
      })
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return
        seedSeen.current = true
        setSeedReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [draft, published, seedKey, summary])

  const setField = (field: keyof SiteProfileSnapshot, value: string) => {
    dirty.current = true
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const persist = async () => {
    const snapshot: SiteProfileSnapshot = {
      name: form.name.trim(),
      description: form.description.trim(),
      formattedAddress: form.formattedAddress.trim(),
      coverImage: form.coverImage.trim(),
      sources: form.sources.trim(),
    }
    const saved = current
      ? await siteWorkspaceApi.updateDraft(siteCode, 'SITE_PROFILE', 'profile', current.version, snapshot, current.revision)
      : await siteWorkspaceApi.createDraft(siteCode, 'SITE_PROFILE', 'profile', snapshot)
    heldSubmission.current = null
    setPinned(null)
    setCurrent(saved)
    onSaved(saved)
    return saved
  }

  const save = async () => {
    if (!seedReady) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await persist()
      setMessage(`Đã lưu bản nháp phiên bản ${saved.version}`)
    } catch (cause: unknown) {
      setError(workspaceErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!seedReady) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await persist()
      const submitted = await siteWorkspaceApi.submit(siteCode, 'SITE_PROFILE', 'profile', saved.version, saved.revision)
      heldSubmission.current = submitted
      dirty.current = false
      seedSeen.current = true
      setForm(readProfile(submitted))
      setCurrent(undefined)
      setPinned(submitted)
      onSaved(submitted)
      setMessage(`Đã gửi duyệt hồ sơ phiên bản ${submitted.version}`)
    } catch (cause: unknown) {
      setError(workspaceErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="max-w-3xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <p className="text-sm text-slate-600">
        {shown ? `Phiên bản ${shown.version} · ${statusLabel(shown.status)}` : 'Chưa có bản nháp hồ sơ.'}
      </p>
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
      <Field label="Tên di tích" value={form.name} disabled={!canEdit || busy} onChange={(value) => setField('name', value)} />
      <Field label="Mô tả" value={form.description} disabled={!canEdit || busy} multiline onChange={(value) => setField('description', value)} />
      <Field label="Địa chỉ" value={form.formattedAddress} disabled={!canEdit || busy} onChange={(value) => setField('formattedAddress', value)} />
      <Field label="Ảnh bìa" value={form.coverImage} disabled={!canEdit || busy} onChange={(value) => setField('coverImage', value)} />
      <Field label="Nguồn" value={form.sources} disabled={!canEdit || busy} multiline onChange={(value) => setField('sources', value)} />
      {error && errorNamesBlock(error) && (
        <pre aria-label="Snapshot block lỗi" className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(form, null, 2)}
        </pre>
      )}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} disabled={busy || !seedReady} onClick={() => void save()}>
            Lưu nháp
          </button>
          <button type="submit" className={primaryButton} disabled={busy || !seedReady}>
            Gửi duyệt
          </button>
        </div>
      )}
    </form>
  )
}

const primaryButton =
  'inline-flex items-center justify-center rounded-lg bg-[#014a9e] px-4 py-2 text-sm font-bold text-white hover:bg-[#013874] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] disabled:cursor-not-allowed disabled:opacity-60'

function statusLabel(status: ContentVersion['status']): string {
  switch (status) {
    case 'DRAFT':
      return 'Bản nháp'
    case 'IN_REVIEW':
      return 'Chờ duyệt'
    case 'APPROVED':
      return 'Đã duyệt'
    case 'PUBLISHED':
      return 'Đã phát hành'
    case 'ARCHIVED':
      return 'Đã lưu trữ'
  }
}

function Field({
  label,
  value,
  onChange,
  disabled,
  multiline = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  multiline?: boolean
}) {
  const className =
    'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:border-[#0275FB] focus-visible:ring-2 focus-visible:ring-[#0275FB]/30 disabled:bg-slate-100'
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {label}
      {multiline ? (
        <textarea className={className} rows={4} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={className} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  )
}
