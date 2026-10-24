import { useState } from 'react'
import { siteWorkspaceApi, workspaceErrorMessage, type ContentVersion, type ReviewDecision, type SiteRole } from './api'

type ReviewQueueProps = {
  siteCode: string
  role: SiteRole
  versions: ContentVersion[]
  onUpdated: (version: ContentVersion) => void
}

export function ReviewQueue({ siteCode, role, versions, onUpdated }: ReviewQueueProps) {
  const canReview = role === 'SITE_MANAGER' || role === 'CONTENT_REVIEWER'
  const canPublish = role === 'SITE_MANAGER'
  const queue = versions
    .filter((version) => version.status === 'IN_REVIEW' || version.status === 'APPROVED')
    .sort((left, right) => right.version - left.version)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const review = async (version: ContentVersion, decision: ReviewDecision) => {
    setBusyId(version.id)
    setError(null)
    setMessage(null)
    try {
      const updated = await siteWorkspaceApi.review(siteCode, version.contentKind, version.resourceKey, version.version, {
        expectedRevision: version.revision,
        decision,
        note: notes[version.id]?.trim() || null,
      })
      onUpdated(updated)
      setMessage(decision === 'APPROVE' ? `Đã phê duyệt phiên bản ${updated.version}` : `Đã yêu cầu chỉnh sửa phiên bản ${updated.version}`)
    } catch (cause: unknown) {
      setError(workspaceErrorMessage(cause))
    } finally {
      setBusyId(null)
    }
  }

  const publish = async (version: ContentVersion) => {
    setBusyId(version.id)
    setError(null)
    setMessage(null)
    try {
      const updated = await siteWorkspaceApi.publish(
        siteCode,
        version.contentKind,
        version.resourceKey,
        version.version,
        version.revision,
      )
      onUpdated(updated)
      setMessage(`Đã phát hành phiên bản ${updated.version}`)
    } catch (cause: unknown) {
      setError(workspaceErrorMessage(cause))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="max-w-3xl space-y-4" aria-label="Hàng chờ duyệt">
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
      {queue.length === 0 && <p className="text-sm text-slate-600">Không có nội dung chờ duyệt.</p>}
      <ul className="space-y-3">
        {queue.map((version) => (
          <li key={version.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-bold text-slate-900">{versionTitle(version)}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Phiên bản {version.version} · {version.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}
            </p>
            <SnapshotFields snapshotJson={version.snapshotJson} />
            {canReview && version.status === 'IN_REVIEW' && (
              <label className="mt-3 block text-sm font-semibold text-slate-800">
                Ghi chú duyệt
                <textarea
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  rows={2}
                  value={notes[version.id] ?? ''}
                  onChange={(event) => setNotes((prev) => ({ ...prev, [version.id]: event.target.value }))}
                />
              </label>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {canReview && version.status === 'IN_REVIEW' && (
                <>
                  <button type="button" className={primaryButton} disabled={busyId === version.id} onClick={() => void review(version, 'APPROVE')}>
                    Phê duyệt
                  </button>
                  <button type="button" className={secondaryButton} disabled={busyId === version.id} onClick={() => void review(version, 'REQUEST_CHANGES')}>
                    Yêu cầu chỉnh sửa
                  </button>
                </>
              )}
              {canPublish && version.status === 'APPROVED' && (
                <button type="button" className={primaryButton} disabled={busyId === version.id} onClick={() => void publish(version)}>
                  Phát hành
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function versionTitle(version: ContentVersion): string {
  if (version.contentKind === 'SITE_PROFILE') return `Hồ sơ di tích · phiên bản ${version.version}`
  return `Trạm ${version.resourceKey} · phiên bản ${version.version}`
}

const BLOCK_LABEL: Record<string, string> = {
  TEXT: 'Văn bản',
  IMAGE: 'Hình ảnh',
  AUDIO: 'Âm thanh',
  VIDEO: 'Video',
  HOTSPOT: 'Điểm nóng',
}

type SubmittedBlock = {
  blockType: string
  title: string
  body: string
  mediaUrl: string
}

type SubmittedSnapshot = {
  name: string
  description: string
  formattedAddress: string
  blocks: SubmittedBlock[]
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function readSnapshot(snapshotJson: string): SubmittedSnapshot | null {
  try {
    const parsed = JSON.parse(snapshotJson) as {
      name?: unknown
      description?: unknown
      formattedAddress?: unknown
      blocks?: unknown
    }
    const blocks = Array.isArray(parsed.blocks)
      ? parsed.blocks.map((block) => {
          const row = block as { blockType?: unknown; title?: unknown; body?: unknown; mediaUrl?: unknown }
          return {
            blockType: readText(row.blockType),
            title: readText(row.title),
            body: readText(row.body),
            mediaUrl: readText(row.mediaUrl),
          }
        })
      : []
    return {
      name: readText(parsed.name),
      description: readText(parsed.description),
      formattedAddress: readText(parsed.formattedAddress),
      blocks,
    }
  } catch {
    return null
  }
}

function SnapshotFields({ snapshotJson }: { snapshotJson: string }) {
  const snapshot = readSnapshot(snapshotJson)
  if (!snapshot) return <p className="mt-2 text-sm text-slate-600">Không đọc được nội dung đã gửi.</p>
  return (
    <div className="mt-3 space-y-3">
      <dl className="space-y-2 text-sm">
        <SnapshotField term="Tên" value={snapshot.name} />
        <SnapshotField term="Mô tả" value={snapshot.description} />
        <SnapshotField term="Địa chỉ" value={snapshot.formattedAddress} />
      </dl>
      {snapshot.blocks.map((block, index) => (
        <div key={`${block.blockType}-${index}`} className="rounded-lg bg-slate-50 p-3">
          <dl className="space-y-2 text-sm">
            <SnapshotField term="Block" value={[BLOCK_LABEL[block.blockType] ?? block.blockType, block.title, block.body].filter(Boolean).join(' · ')} />
            <SnapshotField term="Phương tiện" value={block.mediaUrl} />
          </dl>
        </div>
      ))}
    </div>
  )
}

function SnapshotField({ term, value }: { term: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="font-semibold text-slate-600">{term}</dt>
      <dd className="whitespace-pre-wrap text-slate-900">{value}</dd>
    </div>
  )
}

const primaryButton =
  'inline-flex items-center justify-center rounded-lg bg-[#014a9e] px-4 py-2 text-sm font-bold text-white hover:bg-[#013874] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton =
  'inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#014a9e] disabled:cursor-not-allowed disabled:opacity-60'
