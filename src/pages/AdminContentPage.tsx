// src/pages/AdminContentPage.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminErrorState } from '../components/admin/AdminAsyncState'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPagination } from '../components/admin/AdminPagination'
import { ImageFilePicker } from '../components/admin/ImageFilePicker'
import {
  CheckboxInput,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from '../components/admin/FormField'
import {
  adminApi,
  type AdminArtifact,
  type AdminArtifactInput,
  type AdminContentType,
  type AdminDeleteImpact,
  type AdminDiscoveryPoint,
  type AdminDiscoveryPointInput,
  type AdminQuest,
  type AdminQuestInput,
  type DeleteReasonPreset,
} from '../features/admin/api'
import {
  clearAdminDraft,
  createLatestRequestGuard,
  readAdminDraft,
  shouldPreserveAdminDraft,
  validateDeleteReason,
  writeAdminDraft,
} from '../features/admin/state'
import { panoramaAdminApi, validatePanoramaFile } from '../features/admin/panoramaAdminApi'
import { panoramaApi, type Panorama } from '../features/panorama/api'
import { locationsApi, type Location } from '../features/locations/api'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { AdminStationsPanel } from '../components/admin/AdminStationsPanel'
import { AdminContentReportsPanel } from '../components/admin/AdminContentReportsPanel'
import { useAuth } from '../shared/auth/useAuth'
import type { PageResponse } from '../shared/api/contracts'

type Tab = 'discovery' | 'artifacts' | 'quests' | 'panoramas' | 'stations' | 'reports'
const CONTENT_ROUTE = '/admin/content'

type ModalState =
  | { kind: 'discovery'; mode: 'create' | 'edit'; item?: AdminDiscoveryPoint }
  | { kind: 'artifact'; mode: 'create' | 'edit'; item?: AdminArtifact }
  | { kind: 'quest'; mode: 'create' | 'edit'; item?: AdminQuest }
  | { kind: 'panorama-upload'; mode: 'create' }
  | { kind: 'panorama-replace'; mode: 'edit'; item: Panorama }
  | null

export function AdminContentPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab') as Tab | null
  const tab: Tab = requestedTab && ['discovery', 'artifacts', 'quests', 'panoramas', 'stations', 'reports'].includes(requestedTab)
    ? requestedTab
    : 'discovery'
  const [locations, setLocations] = useState<Location[]>([])
  const locationId = searchParams.get('locationId') || CU_CHI_LOCATION_ID
  const query = searchParams.get('q')?.trim() ?? ''
  const page = Math.max(Number(searchParams.get('page') ?? '1') - 1, 0)
  const sort = searchParams.get('sort') === 'name,desc' ? 'name,desc' : 'name,asc'
  const [discovery, setDiscovery] = useState<AdminDiscoveryPoint[]>([])
  const [artifacts, setArtifacts] = useState<AdminArtifact[]>([])
  const [quests, setQuests] = useState<AdminQuest[]>([])
  const [discoveryPage, setDiscoveryPage] = useState<PageResponse<AdminDiscoveryPoint> | null>(null)
  const [artifactPage, setArtifactPage] = useState<PageResponse<AdminArtifact> | null>(null)
  const [questPage, setQuestPage] = useState<PageResponse<AdminQuest> | null>(null)
  const [panoramas, setPanoramas] = useState<Panorama[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)
  const [eraCount, setEraCount] = useState<{ eraCount: number; sufficient: boolean } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: AdminContentType; id: string; name: string; rowVersion: number } | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<AdminDeleteImpact | null>(null)
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const contentRequestGuard = useRef(createLatestRequestGuard())
  const locationsRequestGuard = useRef(createLatestRequestGuard())
  const eraRequestGuard = useRef(createLatestRequestGuard())
  const deleteImpactRequestGuard = useRef(createLatestRequestGuard())
  const { showToast } = useToast()
  const { user } = useAuth()
  const userId = user?.id

  const selectedLocation = locations.find((l) => l.id === locationId)

  const loadContent = useCallback(() => {
    if (!locationId) return
    const request = contentRequestGuard.current.begin()
    setLoading(true)
    setLoadError(null)
    Promise.all([
      adminApi.listDiscoveryPointsPage(locationId, { page, size: 20, q: query || undefined, sort }),
      adminApi.listArtifactsPage(locationId, { page, size: 20, q: query || undefined, sort }),
      adminApi.listQuestsPage(locationId, { page, size: 20, q: query || undefined, sort }),
      panoramaApi.byLocation(locationId),
    ])
      .then(([d, a, q, p]) => {
        if (!request.isLatest()) return
        setDiscoveryPage(d)
        setArtifactPage(a)
        setQuestPage(q)
        setDiscovery(d.items)
        setArtifacts(a.items)
        setQuests(q.items)
        setPanoramas(p)
      })
      .catch((e) => {
        if (request.isLatest()) setLoadError(getFriendlyErrorMessage(e, 'quest'))
      })
      .finally(() => {
        if (request.isLatest()) setLoading(false)
      })
  }, [locationId, page, query, sort])

  useEffect(() => {
    const request = locationsRequestGuard.current.begin()
    locationsApi
      .list({ size: 100 })
      .then((next) => { if (request.isLatest()) setLocations(next) })
      .catch(() => { if (request.isLatest()) showToast({ message: 'Không tải được danh sách địa điểm.', type: 'error' }) })
    return () => locationsRequestGuard.current.invalidate()
  }, [showToast])

  useEffect(() => {
    loadContent()
    return () => contentRequestGuard.current.invalidate()
  }, [loadContent])

  useEffect(() => {
    if (!locationId) return
    const request = eraRequestGuard.current.begin()
    adminApi
      .eraCount(locationId)
      .then((next) => { if (request.isLatest()) setEraCount(next) })
      .catch(() => { if (request.isLatest()) setEraCount(null) })
    return () => eraRequestGuard.current.invalidate()
  }, [locationId])

  useEffect(() => () => deleteImpactRequestGuard.current.invalidate(), [])

  const draftFormId = (kind: 'discovery' | 'artifact' | 'quest', id?: string) =>
    `${kind}:${id ? `edit:${id}` : `create:${locationId}`}`

  const getDraft = <T,>(formId: string): T | null => {
    if (!userId || typeof sessionStorage === 'undefined') return null
    return readAdminDraft<T>(sessionStorage, userId, CONTENT_ROUTE, formId)
  }

  const clearDraft = (formId: string) => {
    if (userId && typeof sessionStorage !== 'undefined') {
      clearAdminDraft(sessionStorage, userId, CONTENT_ROUTE, formId)
    }
  }

  const preserveDraftOnUnauthorized = (cause: unknown, formId: string, body: unknown) => {
    if (userId && typeof sessionStorage !== 'undefined' && shouldPreserveAdminDraft(cause)) {
      writeAdminDraft(sessionStorage, userId, CONTENT_ROUTE, formId, body)
    }
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'discovery', label: 'Điểm khám phá', count: discoveryPage?.totalItems ?? 0 },
    { id: 'artifacts', label: 'Hiện vật', count: artifactPage?.totalItems ?? 0 },
    { id: 'quests', label: 'Nhiệm vụ', count: questPage?.totalItems ?? 0 },
    { id: 'panoramas', label: 'Panorama 360°', count: panoramas.length },
    { id: 'stations', label: 'Trạm pilot', count: 6 },
    { id: 'reports', label: 'Báo sai liệu', count: 0 },
  ]

  const updateListUrl = (changes: Record<string, string>) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      Object.entries(changes).forEach(([key, value]) => {
        if (value) next.set(key, value)
        else next.delete(key)
      })
      return next
    })
  }

  const activePage = tab === 'discovery' ? discoveryPage : tab === 'artifacts' ? artifactPage : tab === 'quests' ? questPage : null

  const openDelete = (target: { type: AdminContentType; id: string; name: string; rowVersion: number }) => {
    const request = deleteImpactRequestGuard.current.begin()
    setDeleteTarget(target)
    setDeleteImpact(null)
    setDeleteError(null)
    setDeleteImpactLoading(true)
    adminApi.deleteImpact(target.type, target.id)
      .then((next) => { if (request.isLatest()) setDeleteImpact(next) })
      .catch((cause) => { if (request.isLatest()) setDeleteError(getFriendlyErrorMessage(cause, 'quest')) })
      .finally(() => { if (request.isLatest()) setDeleteImpactLoading(false) })
  }

  const confirmDelete = async (reasonPreset: DeleteReasonPreset, reasonDetail: string) => {
    if (!deleteTarget) return
    setSaving(true)
    setDeleteError(null)
    try {
      await adminApi.softDeleteContent(deleteTarget.type, deleteTarget.id, {
        reasonPreset,
        reasonDetail: reasonDetail.trim() || null,
        rowVersion: deleteTarget.rowVersion,
        idempotencyKey: crypto.randomUUID(),
      })
      showToast({ message: 'Đã chuyển nội dung vào Thùng rác.', type: 'success' })
      setDeleteTarget(null)
      loadContent()
    } catch (cause) {
      setDeleteError(getFriendlyErrorMessage(cause, 'quest'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDiscovery = async (body: AdminDiscoveryPointInput, id?: string) => {
    const formId = draftFormId('discovery', id)
    setSaving(true)
    try {
      if (id) {
        const item = discovery.find((entry) => entry.id === id)
        if (!item) throw new Error('Không tìm thấy rowVersion của điểm khám phá.')
        await adminApi.updateDiscoveryPoint(id, body, item.rowVersion)
        showToast({ message: 'Đã cập nhật điểm khám phá.', type: 'success' })
      } else {
        await adminApi.createDiscoveryPoint(body)
        showToast({ message: 'Đã tạo điểm khám phá mới.', type: 'success' })
      }
      clearDraft(formId)
      setModal(null)
      loadContent()
    } catch (e) {
      preserveDraftOnUnauthorized(e, formId, body)
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      throw e
    } finally {
      setSaving(false)
    }
  }

  const handleSaveArtifact = async (body: AdminArtifactInput, id?: string) => {
    const formId = draftFormId('artifact', id)
    setSaving(true)
    try {
      if (id) {
        const item = artifacts.find((entry) => entry.id === id)
        if (!item) throw new Error('Không tìm thấy rowVersion của hiện vật.')
        await adminApi.updateArtifact(id, body, item.rowVersion)
        showToast({ message: 'Đã cập nhật hiện vật.', type: 'success' })
      } else {
        await adminApi.createArtifact(body)
        showToast({ message: 'Đã tạo hiện vật mới.', type: 'success' })
      }
      clearDraft(formId)
      setModal(null)
      loadContent()
    } catch (e) {
      preserveDraftOnUnauthorized(e, formId, body)
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      throw e
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQuest = async (body: AdminQuestInput, id?: string) => {
    const formId = draftFormId('quest', id)
    setSaving(true)
    try {
      if (id) {
        const item = quests.find((entry) => entry.id === id)
        if (!item) throw new Error('Không tìm thấy rowVersion của nhiệm vụ.')
        await adminApi.updateQuest(id, body, item.rowVersion)
        showToast({ message: 'Đã cập nhật nhiệm vụ.', type: 'success' })
      } else {
        await adminApi.createQuest(body)
        showToast({ message: 'Đã tạo nhiệm vụ mới.', type: 'success' })
      }
      clearDraft(formId)
      setModal(null)
      loadContent()
    } catch (e) {
      preserveDraftOnUnauthorized(e, formId, body)
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      throw e
    } finally {
      setSaving(false)
    }
  }

  const handleUploadPanorama = async (title: string, file: File) => {
    const validation = validatePanoramaFile(file)
    if (validation) {
      showToast({ message: validation, type: 'error' })
      return
    }
    setSaving(true)
    try {
      await panoramaAdminApi.uploadPanorama({ locationId, title, file })
      showToast({ message: 'Đã tải panorama lên.', type: 'success' })
      setModal(null)
      loadContent()
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'upload'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleReplacePanorama = async (panoramaId: string, file: File) => {
    const validation = validatePanoramaFile(file)
    if (validation) {
      showToast({ message: validation, type: 'error' })
      return
    }
    setSaving(true)
    try {
      await panoramaAdminApi.replacePanoramaImage(panoramaId, file)
      showToast({ message: 'Đã thay ảnh panorama.', type: 'success' })
      setModal(null)
      loadContent()
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'upload'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
      <section className="max-w-5xl w-full pb-20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-md">
          <div>
            <h1 className="font-display-lg text-on-surface">
              {selectedLocation ? `Nội dung: ${selectedLocation.name}` : 'Quản lý nội dung'}
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">CMS nội bộ — tạo và chỉnh sửa theo địa điểm (chọn tab Hiện vật / Nhiệm vụ để thêm mới)</p>
          </div>
        </div>

        <div className="mb-md flex flex-wrap items-end gap-sm">
          <FormField label="Địa điểm">
            <SelectInput value={locationId} onChange={(e) => updateListUrl({ locationId: e.target.value, page: '' })}>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.city ? `(${loc.city})` : ''}
                </option>
              ))}
            </SelectInput>
          </FormField>
          {eraCount && (
            <span
              className={`text-xs px-2 py-1 rounded-full border mb-1 ${
                eraCount.sufficient
                  ? 'border-secondary/50 text-secondary bg-secondary/10'
                  : 'border-error/50 text-error bg-error/10'
              }`}
              title="Value Proposition: three periods — mỗi di tích cần ≥3 era"
            >
              {eraCount.eraCount}/3 thời kỳ (era)
              {!eraCount.sufficient && ' — cần bổ sung'}
            </span>
          )}
        </div>

        {(['discovery', 'artifacts', 'quests'] as Tab[]).includes(tab) && (
          <div className="mb-md flex flex-wrap gap-3">
            <input
              aria-label="Tìm nội dung"
              value={searchParams.get('q') ?? ''}
              onChange={(event) => updateListUrl({ q: event.target.value, page: '' })}
              placeholder="Tìm theo tên hoặc mã mở khóa…"
              className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <SelectInput
              aria-label="Sắp xếp nội dung"
              value={sort}
              onChange={(event) => updateListUrl({ sort: event.target.value === 'name,asc' ? '' : event.target.value, page: '' })}
            >
              <option value="name,asc">Tên A–Z</option>
              <option value="name,desc">Tên Z–A</option>
            </SelectInput>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-md border-b border-outline-variant">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => updateListUrl({ tab: t.id === 'discovery' ? '' : t.id, page: '' })}
              className={`px-md py-sm text-sm border-b-2 -mb-px ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="flex justify-end mb-sm">
          {tab === 'discovery' && (
            <button
              type="button"
              onClick={() => setModal({ kind: 'discovery', mode: 'create' })}
              className="inline-flex items-center gap-1 px-md py-xs rounded-lg bg-primary text-on-primary text-sm"
            >
              <MaterialIcon name="add" className="text-sm" /> Thêm điểm khám phá
            </button>
          )}
          {tab === 'artifacts' && (
            <button
              type="button"
              onClick={() => setModal({ kind: 'artifact', mode: 'create' })}
              className="inline-flex items-center gap-1 px-md py-xs rounded-lg bg-primary text-on-primary text-sm"
            >
              <MaterialIcon name="add" className="text-sm" /> Thêm hiện vật
            </button>
          )}
          {tab === 'quests' && (
            <button
              type="button"
              onClick={() => setModal({ kind: 'quest', mode: 'create' })}
              className="inline-flex items-center gap-1 px-md py-xs rounded-lg bg-primary text-on-primary text-sm"
            >
              <MaterialIcon name="add" className="text-sm" /> Thêm nhiệm vụ
            </button>
          )}
          {tab === 'panoramas' && (
            <button
              type="button"
              onClick={() => setModal({ kind: 'panorama-upload', mode: 'create' })}
              className="inline-flex items-center gap-1 px-md py-xs rounded-lg bg-primary text-on-primary text-sm"
            >
              <MaterialIcon name="upload" className="text-sm" /> Tải panorama mới
            </button>
          )}
        </div>

        {loading && tab !== 'stations' && <p className="text-on-surface-variant text-sm">Đang tải...</p>}
        {!loading && loadError && tab !== 'stations' && tab !== 'reports' && <AdminErrorState message={loadError} onRetry={loadContent} />}

        {!loading && !loadError && tab === 'discovery' && (
          <ContentTable
            headers={['Tên', 'unlock_key', 'Vị trí map', 'Thứ tự', '']}
            rows={discovery.map((p) => ({
              key: p.id,
              cells: [
                p.name,
                p.unlockKey,
                `${p.mapXPct ?? '—'} / ${p.mapYPct ?? '—'}`,
                String(p.sortOrder),
              ],
              onEdit: () => setModal({ kind: 'discovery', mode: 'edit', item: p }),
              onDelete: () => openDelete({ type: 'DISCOVERY_POINT', id: p.id, name: p.name, rowVersion: p.rowVersion }),
            }))}
          />
        )}

        {!loading && !loadError && tab === 'artifacts' && (
          <ContentTable
            headers={['Tên', 'unlock_key', 'Độ tin cậy', 'Thứ tự', '']}
            rows={artifacts.map((a) => ({
              key: a.id,
              cells: [a.name, a.unlockKey, a.reliability ?? '—', String(a.sortOrder)],
              onEdit: () => setModal({ kind: 'artifact', mode: 'edit', item: a }),
              onDelete: () => openDelete({ type: 'ARTIFACT', id: a.id, name: a.name, rowVersion: a.rowVersion }),
            }))}
          />
        )}

        {!loading && !loadError && tab === 'quests' && (
          <ContentTable
            headers={['Tiêu đề', 'Điểm', 'Trigger', 'Onsite', '']}
            rows={quests.map((q) => ({
              key: q.id,
              cells: [
                q.title,
                String(q.pointsReward),
                q.completionTrigger ?? 'discovery',
                q.requireOnsiteCheckin ? 'Có' : 'Không',
              ],
              onEdit: () => setModal({ kind: 'quest', mode: 'edit', item: q }),
              onDelete: () => openDelete({ type: 'QUEST', id: q.id, name: q.title, rowVersion: q.rowVersion }),
            }))}
          />
        )}

        {!loading && !loadError && tab === 'panoramas' && (
          <ContentTable
            headers={['Tiêu đề', 'Ảnh', '']}
            rows={panoramas.map((p) => ({
              key: p.id,
              cells: [
                p.title,
                p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="h-10 w-20 object-cover rounded" />
                ) : (
                  '—'
                ),
              ],
              onEdit: () => setModal({ kind: 'panorama-replace', mode: 'edit', item: p }),
              editLabel: 'Thay ảnh',
            }))}
          />
        )}

        {!loading && !loadError && activePage && (
          <AdminPagination
            page={activePage.page}
            totalPages={activePage.totalPages}
            totalItems={activePage.totalItems}
            onPageChange={(nextPage) => updateListUrl({ page: nextPage > 0 ? String(nextPage + 1) : '' })}
          />
        )}

        {tab === 'stations' && <AdminStationsPanel />}
        {tab === 'reports' && <AdminContentReportsPanel />}

        {modal?.kind === 'discovery' && (
          <AdminModal
            title={modal.mode === 'create' ? 'Thêm điểm khám phá' : 'Sửa điểm khám phá'}
            onClose={() => setModal(null)}
          >
            <DiscoveryPointForm
              key={draftFormId('discovery', modal.item?.id)}
              locationId={locationId}
              initial={modal.item}
              draft={getDraft<AdminDiscoveryPointInput>(draftFormId('discovery', modal.item?.id))}
              saving={saving}
              onSubmit={(body) => handleSaveDiscovery(body, modal.item?.id)}
              onCancel={() => setModal(null)}
            />
          </AdminModal>
        )}

        {modal?.kind === 'artifact' && (
          <AdminModal
            title={modal.mode === 'create' ? 'Thêm hiện vật' : 'Sửa hiện vật'}
            onClose={() => setModal(null)}
            wide
          >
            <ArtifactForm
              key={draftFormId('artifact', modal.item?.id)}
              locationId={locationId}
              initial={modal.item}
              draft={getDraft<AdminArtifactInput>(draftFormId('artifact', modal.item?.id))}
              saving={saving}
              onSubmit={(body) => handleSaveArtifact(body, modal.item?.id)}
              onCancel={() => setModal(null)}
            />
          </AdminModal>
        )}

        {modal?.kind === 'quest' && (
          <AdminModal
            title={modal.mode === 'create' ? 'Thêm nhiệm vụ' : 'Sửa nhiệm vụ'}
            onClose={() => setModal(null)}
            wide
          >
            <QuestForm
              key={draftFormId('quest', modal.item?.id)}
              locationId={locationId}
              initial={modal.item}
              draft={getDraft<AdminQuestInput>(draftFormId('quest', modal.item?.id))}
              saving={saving}
              onSubmit={(body) => handleSaveQuest(body, modal.item?.id)}
              onCancel={() => setModal(null)}
            />
          </AdminModal>
        )}

        {modal?.kind === 'panorama-upload' && (
          <AdminModal title="Tải panorama 360° mới" onClose={() => setModal(null)}>
            <PanoramaUploadForm
              saving={saving}
              onSubmit={handleUploadPanorama}
              onCancel={() => setModal(null)}
            />
          </AdminModal>
        )}

        {modal?.kind === 'panorama-replace' && (
          <AdminModal title={`Thay ảnh: ${modal.item.title}`} onClose={() => setModal(null)}>
            <PanoramaReplaceForm
              currentImageUrl={modal.item.imageUrl}
              saving={saving}
              onSubmit={(file) => handleReplacePanorama(modal.item.id, file)}
              onCancel={() => setModal(null)}
            />
          </AdminModal>
        )}

        {deleteTarget && (
          <AdminModal title={`Xóa mềm: ${deleteTarget.name}`} onClose={() => !saving && setDeleteTarget(null)} wide>
            <DeleteContentForm
              impact={deleteImpact}
              loading={deleteImpactLoading}
              saving={saving}
              error={deleteError}
              onRetry={() => openDelete(deleteTarget)}
              onSubmit={confirmDelete}
              onCancel={() => setDeleteTarget(null)}
            />
          </AdminModal>
        )}
      </section>
  )
}

type TableRow = {
  key: string
  cells: (string | ReactNode)[]
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
}

function ContentTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
  if (rows.length === 0) {
    return <p className="text-on-surface-variant text-sm">Chưa có dữ liệu cho địa điểm này.</p>
  }
  return (
    <div className="overflow-x-auto border border-outline-variant rounded-xl">
      <table className="w-full text-xs">
        <thead className="bg-surface-container-high text-on-surface-variant">
          <tr>
            {headers.map((h) => (
              <th key={h || 'actions'} className="text-left px-2 py-1.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-outline-variant/50">
              {row.cells.map((cell, j) => (
                <td key={j} className="px-2 py-1.5 align-top">
                  {cell}
                </td>
              ))}
              <td className="px-2 py-1.5 align-top">
                <div className="flex items-center gap-3 whitespace-nowrap">
                {row.onEdit && (
                  <button
                    type="button"
                    onClick={row.onEdit}
                    className="text-secondary text-xs hover:underline"
                  >
                    {row.editLabel ?? 'Sửa'}
                  </button>
                )}
                {row.onDelete && (
                  <button type="button" onClick={row.onDelete} className="text-red-700 text-xs font-semibold hover:underline">Xóa</button>
                )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const DELETE_REASONS: DeleteReasonPreset[] = ['Sai nguồn', 'Lỗi kỹ thuật', 'Trùng nội dung', 'Yêu cầu pháp lý', 'Khác']

function DeleteContentForm({
  impact,
  loading,
  saving,
  error,
  onRetry,
  onSubmit,
  onCancel,
}: {
  impact: AdminDeleteImpact | null
  loading: boolean
  saving: boolean
  error: string | null
  onRetry: () => void
  onSubmit: (reasonPreset: DeleteReasonPreset, reasonDetail: string) => Promise<void>
  onCancel: () => void
}) {
  const [reasonPreset, setReasonPreset] = useState<DeleteReasonPreset>('Sai nguồn')
  const [reasonDetail, setReasonDetail] = useState('')
  const validation = validateDeleteReason(reasonPreset, reasonDetail)

  if (loading) return <p role="status" className="text-sm text-slate-600">Đang kiểm tra ảnh hưởng…</p>
  if (error && !impact) return <AdminErrorState message={error} onRetry={onRetry} />

  return (
    <form onSubmit={(event) => { event.preventDefault(); if (!validation && impact?.deletable) void onSubmit(reasonPreset, reasonDetail) }} className="space-y-5">
      {impact && (
        <section className={`rounded-xl border p-4 ${!impact.deletable ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
          <h3 className="font-bold text-slate-950">Ảnh hưởng trước khi xóa</h3>
          {impact.blockers.length === 0 && impact.warnings.length === 0 && <p className="mt-2 text-sm text-slate-700">Không phát hiện tham chiếu hoặc tiến độ bị ảnh hưởng.</p>}
          {impact.blockers.length > 0 && <div className="mt-3"><p className="text-sm font-bold text-red-800">Điều kiện đang chặn</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{impact.blockers.map((item) => <li key={item.code}>{item.message} ({item.count})</li>)}</ul></div>}
          {impact.warnings.length > 0 && <div className="mt-3"><p className="text-sm font-bold text-amber-900">Cảnh báo</p><ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{impact.warnings.map((item) => <li key={item.code}>{item.message} ({item.count})</li>)}</ul></div>}
          {!impact.deletable && <p className="mt-3 font-bold text-red-800">Chưa thể xóa cho đến khi xử lý hết các điều kiện đang chặn.</p>}
        </section>
      )}
      {error && impact && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      <FormField label="Lý do xóa">
        <SelectInput value={reasonPreset} onChange={(event) => setReasonPreset(event.target.value as DeleteReasonPreset)}>{DELETE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}</SelectInput>
      </FormField>
      <FormField label={reasonPreset === 'Khác' ? 'Mô tả lý do *' : 'Ghi chú thêm'} hint={reasonPreset === 'Khác' ? 'Tối thiểu 10 ký tự' : undefined}>
        <TextArea value={reasonDetail} onChange={(event) => setReasonDetail(event.target.value)} rows={3} />
      </FormField>
      {validation && reasonPreset === 'Khác' && <p className="text-sm text-red-700">{validation}</p>}
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Huỷ</button>
        <button type="submit" disabled={saving || !!validation || !impact?.deletable} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">{saving ? 'Đang xóa…' : 'Xác nhận xóa mềm'}</button>
      </div>
    </form>
  )
}

function DiscoveryPointForm({
  locationId,
  initial,
  draft,
  saving,
  onSubmit,
  onCancel,
}: {
  locationId: string
  initial?: AdminDiscoveryPoint
  draft: AdminDiscoveryPointInput | null
  saving: boolean
  onSubmit: (body: AdminDiscoveryPointInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(draft?.name ?? initial?.name ?? '')
  const [unlockKey, setUnlockKey] = useState(draft?.unlockKey ?? initial?.unlockKey ?? '')
  const [mapXPct, setMapXPct] = useState((draft?.mapXPct ?? initial?.mapXPct)?.toString() ?? '')
  const [mapYPct, setMapYPct] = useState((draft?.mapYPct ?? initial?.mapYPct)?.toString() ?? '')
  const [yaw, setYaw] = useState((draft?.yaw ?? initial?.yaw)?.toString() ?? '')
  const [pitch, setPitch] = useState((draft?.pitch ?? initial?.pitch)?.toString() ?? '')
  const [sortOrder, setSortOrder] = useState((draft?.sortOrder ?? initial?.sortOrder)?.toString() ?? '0')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      locationId,
      name: name.trim(),
      unlockKey: unlockKey.trim(),
      mapXPct: mapXPct ? Number(mapXPct) : null,
      mapYPct: mapYPct ? Number(mapYPct) : null,
      yaw: yaw ? Number(yaw) : null,
      pitch: pitch ? Number(pitch) : null,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <FormField label="Tên *">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormField label="unlock_key *" hint="VD: scene:xxx, era:1948, artifact:xxx">
        <TextInput value={unlockKey} onChange={(e) => setUnlockKey(e.target.value)} required />
      </FormField>
      <div className="grid grid-cols-2 gap-sm">
        <FormField label="map_x_pct">
          <TextInput type="number" step="0.01" value={mapXPct} onChange={(e) => setMapXPct(e.target.value)} />
        </FormField>
        <FormField label="map_y_pct">
          <TextInput type="number" step="0.01" value={mapYPct} onChange={(e) => setMapYPct(e.target.value)} />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-sm">
        <FormField label="yaw" hint="Góc ngang hotspot tour 360°">
          <TextInput type="number" step="0.0001" value={yaw} onChange={(e) => setYaw(e.target.value)} />
        </FormField>
        <FormField label="pitch" hint="Góc dọc hotspot tour 360°">
          <TextInput type="number" step="0.0001" value={pitch} onChange={(e) => setPitch(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Thứ tự">
        <TextInput type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </FormField>
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  )
}

function ArtifactForm({
  locationId,
  initial,
  draft,
  saving,
  onSubmit,
  onCancel,
}: {
  locationId: string
  initial?: AdminArtifact
  draft: AdminArtifactInput | null
  saving: boolean
  onSubmit: (body: AdminArtifactInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(draft?.name ?? initial?.name ?? '')
  const [unlockKey, setUnlockKey] = useState(draft?.unlockKey ?? initial?.unlockKey ?? '')
  const [imageUrl, setImageUrl] = useState(draft?.imageUrl ?? initial?.imageUrl ?? '')
  const [description, setDescription] = useState(draft?.description ?? initial?.description ?? '')
  const [reliability, setReliability] = useState(draft?.reliability ?? initial?.reliability ?? '')
  const [sortOrder, setSortOrder] = useState((draft?.sortOrder ?? initial?.sortOrder)?.toString() ?? '0')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      locationId,
      name: name.trim(),
      unlockKey: unlockKey.trim(),
      imageUrl: imageUrl.trim() || null,
      description: description.trim() || null,
      reliability: reliability.trim() || null,
      sortOrder: sortOrder ? Number(sortOrder) : 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <FormField label="Tên *">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} required />
      </FormField>
      <FormField label="unlock_key *">
        <TextInput value={unlockKey} onChange={(e) => setUnlockKey(e.target.value)} required />
      </FormField>
      <FormField label="image_url">
        <TextInput value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="/media/..." />
      </FormField>
      <FormField label="Mô tả">
        <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </FormField>
      <FormField label="Độ tin cậy">
        <TextInput value={reliability} onChange={(e) => setReliability(e.target.value)} placeholder="cao / trung bình" />
      </FormField>
      <FormField label="Thứ tự">
        <TextInput type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
      </FormField>
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  )
}

function QuestForm({
  locationId,
  initial,
  draft,
  saving,
  onSubmit,
  onCancel,
}: {
  locationId: string
  initial?: AdminQuest
  draft: AdminQuestInput | null
  saving: boolean
  onSubmit: (body: AdminQuestInput) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(draft?.title ?? initial?.title ?? '')
  const [description, setDescription] = useState(draft?.description ?? initial?.description ?? '')
  const [story, setStory] = useState(draft?.story ?? initial?.story ?? '')
  const [pointsReward, setPointsReward] = useState((draft?.pointsReward ?? initial?.pointsReward)?.toString() ?? '100')
  const [requiredOrder, setRequiredOrder] = useState((draft?.requiredOrder ?? initial?.requiredOrder)?.toString() ?? '0')
  const [completionTrigger, setCompletionTrigger] = useState(draft?.completionTrigger ?? initial?.completionTrigger ?? 'discovery')
  const [requireOnsiteCheckin, setRequireOnsiteCheckin] = useState(draft?.requireOnsiteCheckin ?? initial?.requireOnsiteCheckin ?? false)
  const [stepsTotal, setStepsTotal] = useState((draft?.stepsTotal ?? initial?.stepsTotal)?.toString() ?? '')
  const [coverImage, setCoverImage] = useState(draft?.coverImage ?? initial?.coverImage ?? '')
  const [stepDiscoveryKeys, setStepDiscoveryKeys] = useState(draft?.stepDiscoveryKeys ?? initial?.stepDiscoveryKeys ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      locationId,
      title: title.trim(),
      description: description.trim() || null,
      story: story.trim() || null,
      pointsReward: pointsReward ? Number(pointsReward) : 0,
      requiredOrder: requiredOrder ? Number(requiredOrder) : 0,
      completionTrigger,
      requireOnsiteCheckin,
      stepsTotal: stepsTotal ? Number(stepsTotal) : null,
      coverImage: coverImage.trim() || null,
      stepDiscoveryKeys: stepDiscoveryKeys.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <FormField label="Tiêu đề *">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} required />
      </FormField>
      <FormField label="Mô tả ngắn">
        <TextArea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </FormField>
      <FormField label="Câu chuyện / briefing">
        <TextArea value={story} onChange={(e) => setStory(e.target.value)} rows={3} />
      </FormField>
      <div className="grid grid-cols-2 gap-sm">
        <FormField label="Điểm thưởng">
          <TextInput type="number" value={pointsReward} onChange={(e) => setPointsReward(e.target.value)} />
        </FormField>
        <FormField label="Thứ tự bắt buộc">
          <TextInput type="number" value={requiredOrder} onChange={(e) => setRequiredOrder(e.target.value)} />
        </FormField>
      </div>
      <FormField label="completion_trigger">
        <SelectInput value={completionTrigger} onChange={(e) => setCompletionTrigger(e.target.value)}>
          <option value="discovery">discovery (remote-friendly)</option>
          <option value="checkin">checkin (onsite)</option>
        </SelectInput>
      </FormField>
      <CheckboxInput
        label="require_onsite_checkin — cần đến tận nơi để hoàn thành"
        checked={requireOnsiteCheckin}
        onChange={setRequireOnsiteCheckin}
      />
      <div className="grid grid-cols-2 gap-sm">
        <FormField label="steps_total">
          <TextInput type="number" value={stepsTotal} onChange={(e) => setStepsTotal(e.target.value)} />
        </FormField>
        <FormField label="cover_image">
          <TextInput value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="/media/..." />
        </FormField>
      </div>
      <FormField label="step_discovery_keys" hint="Danh sách unlock_key, phân cách bằng dấu phẩy">
        <TextArea value={stepDiscoveryKeys} onChange={(e) => setStepDiscoveryKeys(e.target.value)} rows={2} />
      </FormField>
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  )
}

function PanoramaUploadForm({
  saving,
  onSubmit,
  onCancel,
}: {
  saving: boolean
  onSubmit: (title: string, file: File) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('Panorama 360°')
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    await onSubmit(title.trim() || 'Panorama 360°', file)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <FormField label="Tiêu đề">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </FormField>
      <FormField label="Ảnh equirectangular">
        <ImageFilePicker
          newLabel="Ảnh panorama mới"
          hint="JPEG/PNG/WebP, tối đa 8MB"
          required
          onFileChange={setFile}
        />
      </FormField>
      <FormActions saving={saving} onCancel={onCancel} submitLabel="Tải lên" />
    </form>
  )
}

function PanoramaReplaceForm({
  currentImageUrl,
  saving,
  onSubmit,
  onCancel,
}: {
  currentImageUrl: string | null
  saving: boolean
  onSubmit: (file: File) => Promise<void>
  onCancel: () => void
}) {
  const [file, setFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    await onSubmit(file)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1">
      <FormField label="So sánh ảnh">
        <ImageFilePicker
          currentImageUrl={currentImageUrl}
          currentLabel="Ảnh hiện tại"
          newLabel="Ảnh thay thế"
          hint="JPEG/PNG/WebP, tối đa 8MB"
          required
          onFileChange={setFile}
        />
      </FormField>
      <FormActions saving={saving} onCancel={onCancel} submitLabel="Thay ảnh" />
    </form>
  )
}

function FormActions({
  saving,
  onCancel,
  submitLabel = 'Lưu',
}: {
  saving: boolean
  onCancel: () => void
  submitLabel?: string
}) {
  return (
    <div className="flex gap-sm justify-end pt-md mt-sm border-t border-outline-variant/50">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-md py-xs rounded-lg border border-outline-variant text-sm"
      >
        Huỷ
      </button>
      <button
        type="submit"
        disabled={saving}
        className="px-md py-xs rounded-lg bg-primary text-on-primary text-sm disabled:opacity-60"
      >
        {saving ? 'Đang lưu...' : submitLabel}
      </button>
    </div>
  )
}
