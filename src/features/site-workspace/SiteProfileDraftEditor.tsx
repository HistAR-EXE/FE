import { useEffect, useMemo, useState } from 'react'
import {
  errorNamesBlock,
  siteWorkspaceApi,
  workspaceErrorMessage,
  type ContentVersion,
  type SiteProfileSnapshot,
  type SiteRole,
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

function latestDraft(versions: ContentVersion[]): ContentVersion | undefined {
  return versions
    .filter((version) => version.contentKind === 'SITE_PROFILE' && version.resourceKey === 'profile' && version.status === 'DRAFT')
    .sort((left, right) => right.version - left.version)[0]
}

type SiteProfileDraftEditorProps = {
  siteCode: string
  role: SiteRole
  versions: ContentVersion[]
  onSaved: (version: ContentVersion) => void
}

export function SiteProfileDraftEditor({ siteCode, role, versions, onSaved }: SiteProfileDraftEditorProps) {
  const draft = useMemo(() => latestDraft(versions), [versions])
  const seedKey = draft ? `${draft.id}:${draft.revision}` : 'empty'
  const [form, setForm] = useState<SiteProfileSnapshot>(() => readProfile(draft))
  const [current, setCurrent] = useState<ContentVersion | undefined>(draft)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canEdit = role === 'SITE_MANAGER' || role === 'CONTENT_EDITOR'

  useEffect(() => {
    setForm(readProfile(draft))
    setCurrent(draft)
  }, [draft, seedKey])

  const setField = (field: keyof SiteProfileSnapshot, value: string) => {
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
    setCurrent(saved)
    onSaved(saved)
    return saved
  }

  const save = async () => {
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
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await persist()
      const submitted = await siteWorkspaceApi.submit(siteCode, 'SITE_PROFILE', 'profile', saved.version, saved.revision)
      setCurrent(submitted)
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
        {current ? `Phiên bản ${current.version} · ${statusLabel(current.status)}` : 'Chưa có bản nháp hồ sơ.'}
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
          <button type="button" className={secondaryButton} disabled={busy} onClick={() => void save()}>
            Lưu nháp
          </button>
          <button type="submit" className={primaryButton} disabled={busy}>
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
