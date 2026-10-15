// src/pages/AdminContentPage.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AdminEmptyState, AdminErrorState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPagination } from '../components/admin/AdminPagination'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
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
import { dispatchAdminTrashChanged } from '../features/admin/events'
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
/** Stitch content lists: 5 rows per page (same as audit / users / billing) */
const CONTENT_PAGE_SIZE = 5

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
      adminApi.listDiscoveryPointsPage(locationId, { page, size: CONTENT_PAGE_SIZE, q: query || undefined, sort }),
      adminApi.listArtifactsPage(locationId, { page, size: CONTENT_PAGE_SIZE, q: query || undefined, sort }),
      adminApi.listQuestsPage(locationId, { page, size: CONTENT_PAGE_SIZE, q: query || undefined, sort }),
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

  const tabs: { id: Tab; label: string; icon: string; count?: number; danger?: boolean }[] = [
    { id: 'discovery', label: 'Điểm khám phá', icon: 'location_on', count: discoveryPage?.totalItems },
    { id: 'artifacts', label: 'Hiện vật', icon: 'museum', count: artifactPage?.totalItems },
    { id: 'quests', label: 'Nhiệm vụ', icon: 'flag', count: questPage?.totalItems },
    { id: 'panoramas', label: 'Panorama 360°', icon: '360', count: panoramas.length },
    { id: 'stations', label: 'Trạm pilot', icon: 'qr_code_2' },
    { id: 'reports', label: 'Báo sai dữ liệu', icon: 'report', danger: true },
  ]

  const inputClass = 'rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-body-md text-body-md text-on-surface'
  const btnGhost = 'inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface'

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

  const createAction = (() => {
    if (tab === 'discovery') return { label: 'Tạo điểm khám phá', onClick: () => setModal({ kind: 'discovery', mode: 'create' }) }
    if (tab === 'artifacts') return { label: 'Tạo hiện vật', onClick: () => setModal({ kind: 'artifact', mode: 'create' }) }
    if (tab === 'quests') return { label: 'Tạo nhiệm vụ', onClick: () => setModal({ kind: 'quest', mode: 'create' }) }
    if (tab === 'panoramas') return { label: 'Tải panorama mới', onClick: () => setModal({ kind: 'panorama-upload', mode: 'create' }) }
    return null
  })()

  const listTitle =
    tab === 'discovery' ? 'Danh sách POI hiển thị'
      : tab === 'artifacts' ? 'Danh sách hiện vật'
        : tab === 'quests' ? 'Danh sách nhiệm vụ'
          : tab === 'panoramas' ? 'Danh sách panorama 360°'
            : null

  const clearListFilters = () => updateListUrl({ q: '', sort: '', page: '' })
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
      dispatchAdminTrashChanged()
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

  const showListChrome = tab !== 'stations' && tab !== 'reports'
  const siteLabel = selectedLocation
    ? `${selectedLocation.name}${selectedLocation.city ? ` (${selectedLocation.city})` : ''}`
    : '—'

  return (
    <section className="flex w-full flex-col space-y-space-lg pb-20" aria-busy={loading && showListChrome}>
      <AdminPageHeader
        eyebrow="Vận hành / Di sản & nội dung"
        title="Quản lý Nội dung khám phá"
        description={
          selectedLocation
            ? `Đồng bộ POI, hiện vật, nhiệm vụ và panorama cho ${selectedLocation.name}.`
            : 'Tạo và chỉnh sửa nội dung khám phá theo địa điểm di sản.'
        }
        actions={
          createAction ? (
            <button type="button" onClick={createAction.onClick} className="ops-btn-primary">
              <MaterialIcon name="add" className="text-[18px]" />
              {createAction.label}
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-3 rounded-xl bg-surface-container-low p-space-lg sm:grid-cols-2 lg:grid-cols-12">
        <label className="flex flex-col gap-1 lg:col-span-4">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Chọn địa điểm di sản</span>
          <select
            aria-label="Địa điểm"
            value={locationId}
            onChange={(e) => updateListUrl({ locationId: e.target.value, page: '' })}
            className={inputClass}
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}{loc.city ? ` (${loc.city})` : ''}
              </option>
            ))}
          </select>
        </label>
        {(['discovery', 'artifacts', 'quests'] as Tab[]).includes(tab) && (
          <>
            <label className="flex flex-col gap-1 lg:col-span-4">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Tìm kiếm</span>
              <input
                aria-label="Tìm nội dung"
                value={searchParams.get('q') ?? ''}
                onChange={(event) => updateListUrl({ q: event.target.value, page: '' })}
                placeholder="Tên hoặc mã mở khóa…"
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 lg:col-span-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline">Sắp xếp</span>
              <select
                aria-label="Sắp xếp nội dung"
                value={sort}
                onChange={(event) => updateListUrl({ sort: event.target.value === 'name,asc' ? '' : event.target.value, page: '' })}
                className={inputClass}
              >
                <option value="name,asc">Tên A–Z</option>
                <option value="name,desc">Tên Z–A</option>
              </select>
            </label>
            <div className="flex items-end lg:col-span-2">
              <button type="button" onClick={clearListFilters} className={`w-full justify-center ${btnGhost}`}>
                <MaterialIcon name="restart_alt" className="text-[16px]" />
                Đặt lại
              </button>
            </div>
          </>
        )}
        {eraCount && (
          <div className="flex items-end lg:col-span-12">
            <span
              className={eraCount.sufficient ? 'ops-pill ops-pill-success' : 'ops-pill ops-pill-danger'}
              title="Mỗi di tích cần ≥3 thời kỳ (era)"
            >
              <MaterialIcon name="timeline" className="text-[12px]" />
              {eraCount.eraCount}/3 thời kỳ (era)
              {!eraCount.sufficient && ' — cần bổ sung'}
            </span>
          </div>
        )}
      </div>

      <nav className="ops-tabs" aria-label="Loại nội dung">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => updateListUrl({ tab: t.id === 'discovery' ? '' : t.id, page: '' })}
            className={`ops-tab ${tab === t.id ? 'ops-tab-active' : ''} ${t.danger ? 'ops-tab-danger' : ''}`}
          >
            <MaterialIcon name={t.icon} className="text-[16px]" />
            {t.label}
            {typeof t.count === 'number' && <span className="ops-tab-count">{t.count}</span>}
          </button>
        ))}
      </nav>

      <div className={showListChrome ? 'grid min-w-0 gap-space-lg lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]' : undefined}>
        <div className={showListChrome ? 'min-w-0 space-y-space-md' : undefined}>
          {listTitle && (
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-primary" />
                <h2 className="truncate font-headline-md text-headline-md text-on-surface">{listTitle}</h2>
                <span className="hidden truncate font-body-sm text-body-sm text-outline sm:inline">| {siteLabel}</span>
              </div>
              {activePage && (
                <span className="shrink-0 font-label-sm text-label-sm text-primary">{activePage.totalItems} kết quả</span>
              )}
              {tab === 'panoramas' && !loading && !loadError && (
                <span className="shrink-0 font-label-sm text-label-sm text-primary">{panoramas.length} kết quả</span>
              )}
            </div>
          )}

          {loading && showListChrome && <AdminLoading label="Đang tải nội dung" />}
          {!loading && loadError && showListChrome && <AdminErrorState message={loadError} onRetry={loadContent} />}

          {!loading && !loadError && tab === 'discovery' && (
            <ContentTable
              colWidths={['34%', '14%', '36%', '16%']}
              headers={['Tên điểm', 'Loại', 'Trạng thái gắn', '']}
              emptyTitle="Chưa có điểm khám phá"
              emptyDetail="Thêm POI cho địa điểm này hoặc đổi bộ lọc tìm kiếm."
              rows={discovery.map((p) => {
                const unlock = parseUnlockKey(p.unlockKey)
                return {
                  key: p.id,
                  cells: [
                    <NameCell
                      key="name"
                      title={p.name}
                      subtitle={unlock.subtitle}
                      icon={unlock.icon}
                      compact
                    />,
                    <ContentTypePill key="type" unlock={unlock} />,
                    <PlacementStatus
                      key="place"
                      mapped={p.mapXPct != null && p.mapYPct != null}
                      tourLinked={p.yaw != null && p.pitch != null}
                    />,
                  ],
                  onEdit: () => setModal({ kind: 'discovery', mode: 'edit', item: p }),
                  onDelete: () => openDelete({ type: 'DISCOVERY_POINT', id: p.id, name: p.name, rowVersion: p.rowVersion }),
                }
              })}
            />
          )}

          {!loading && !loadError && tab === 'artifacts' && (
            <ContentTable
              colWidths={['40%', '22%', '20%', '18%']}
              headers={['Tên hiện vật', 'Độ tin cậy', 'Ảnh', '']}
              emptyTitle="Chưa có hiện vật"
              emptyDetail="Thêm hiện vật hoặc nới bộ lọc để xem danh sách."
              rows={artifacts.map((a) => ({
                key: a.id,
                cells: [
                  <NameCell
                    key="name"
                    title={a.name}
                    subtitle={a.description?.trim() || parseUnlockKey(a.unlockKey).subtitle}
                    thumbUrl={a.imageUrl}
                    icon="museum"
                  />,
                  <span key="rel" className={a.reliability ? 'ops-pill ops-pill-warn' : 'ops-pill ops-pill-neutral'}>
                    {a.reliability ? reliabilityLabel(a.reliability) : 'Chưa gắn'}
                  </span>,
                  <span key="img" className={a.imageUrl ? 'ops-pill ops-pill-success' : 'ops-pill ops-pill-neutral'}>
                    {a.imageUrl ? 'Có ảnh' : 'Thiếu ảnh'}
                  </span>,
                ],
                onEdit: () => setModal({ kind: 'artifact', mode: 'edit', item: a }),
                onDelete: () => openDelete({ type: 'ARTIFACT', id: a.id, name: a.name, rowVersion: a.rowVersion }),
              }))}
            />
          )}

          {!loading && !loadError && tab === 'quests' && (
            <ContentTable
              colWidths={['36%', '16%', '32%', '16%']}
              headers={['Tên nhiệm vụ', 'Thưởng', 'Cách hoàn thành', '']}
              emptyTitle="Chưa có nhiệm vụ"
              emptyDetail="Tạo nhiệm vụ gắn với địa điểm này."
              rows={quests.map((q) => ({
                key: q.id,
                cells: [
                  <NameCell
                    key="name"
                    title={q.title}
                    subtitle={q.description?.trim() || undefined}
                    icon="flag"
                    compact
                  />,
                  <span key="xp" className="inline-flex items-center gap-1 whitespace-nowrap font-label-sm text-label-sm font-bold text-primary">
                    <MaterialIcon name="bolt" className="text-[16px]" />
                    +{q.pointsReward} XP
                  </span>,
                  <QuestCompletionMeta
                    key="done"
                    trigger={q.completionTrigger}
                    requireOnsite={!!q.requireOnsiteCheckin}
                  />,
                ],
                onEdit: () => setModal({ kind: 'quest', mode: 'edit', item: q }),
                onDelete: () => openDelete({ type: 'QUEST', id: q.id, name: q.title, rowVersion: q.rowVersion }),
              }))}
            />
          )}

          {!loading && !loadError && tab === 'panoramas' && (
            <ContentTable
              colWidths={['48%', '28%', '24%']}
              headers={['Tiêu đề panorama', 'Xem trước', '']}
              emptyTitle="Chưa có panorama"
              emptyDetail="Tải ảnh equirectangular 360° cho địa điểm này."
              rows={panoramas.map((p) => ({
                key: p.id,
                cells: [
                  <NameCell key="name" title={p.title} subtitle="Ảnh equirectangular 360°" icon="360" />,
                  p.imageUrl ? (
                    <img key="img" src={p.imageUrl} alt="" className="h-10 w-20 rounded-md object-cover ring-1 ring-outline-variant" />
                  ) : (
                    <span key="img" className="ops-pill ops-pill-warn">Thiếu ảnh</span>
                  ),
                ],
                onEdit: () => setModal({ kind: 'panorama-replace', mode: 'edit', item: p }),
                editIcon: 'image',
                editLabel: 'Thay ảnh',
              }))}
            />
          )}

          {!loading && !loadError && activePage && (
            <div className="mt-space-md flex flex-col items-center justify-between gap-2 sm:flex-row">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-outline">
                  Hiển thị {activePage.page * activePage.size + (activePage.items.length ? 1 : 0)} -{' '}
                  {activePage.page * activePage.size + activePage.items.length} trong{' '}
                  {activePage.totalItems.toLocaleString('vi-VN')} bản ghi
                </span>
                <span className="hidden h-1 w-1 rounded-full bg-outline md:inline-block" />
                <span className="hidden font-mono text-[11px] text-primary md:inline-block">
                  {CONTENT_PAGE_SIZE} bản ghi / trang
                </span>
              </div>
              <AdminPagination
                variant="stitch"
                page={activePage.page}
                totalPages={activePage.totalPages}
                totalItems={activePage.totalItems}
                onPageChange={(nextPage) => updateListUrl({ page: nextPage > 0 ? String(nextPage + 1) : '' })}
              />
            </div>
          )}
        </div>

        {showListChrome && (
          <aside className="w-full shrink-0 space-y-space-md lg:sticky lg:top-20 lg:self-start">
            <div className="ops-card space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate font-headline-sm text-headline-sm text-on-surface">Tổng quan địa điểm</h3>
                <span className="ops-pill ops-pill-success shrink-0">LIVE</span>
              </div>
              <p className="truncate font-body-sm text-body-sm text-on-surface-variant" title={siteLabel}>{siteLabel}</p>
              <dl className="grid grid-cols-2 gap-2">
                {[
                  ['POI', discoveryPage?.totalItems ?? '—'],
                  ['Hiện vật', artifactPage?.totalItems ?? '—'],
                  ['Nhiệm vụ', questPage?.totalItems ?? '—'],
                  ['Panorama', panoramas.length],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0 rounded-lg bg-surface-container p-2.5">
                    <dt className="truncate font-label-sm text-label-sm uppercase tracking-wider text-outline">{label}</dt>
                    <dd className="mt-0.5 font-headline-md text-headline-md text-primary">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="ops-card space-y-3 p-4">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Kiểm tra toàn vẹn</h3>
              {eraCount ? (
                eraCount.sufficient ? (
                  <p className="rounded-lg bg-primary/10 p-3 font-body-sm text-body-sm text-primary">
                    Đủ {eraCount.eraCount} thời kỳ (era) — đạt ngưỡng tối thiểu 3.
                  </p>
                ) : (
                  <p className="rounded-lg bg-error-container/40 p-3 font-body-sm text-body-sm text-error">
                    Chỉ có {eraCount.eraCount}/3 thời kỳ. Cần bổ sung điểm khám phá theo era.
                  </p>
                )
              ) : (
                <p className="font-body-sm text-body-sm text-outline">Chưa có dữ liệu era cho địa điểm này.</p>
              )}
              <button
                type="button"
                onClick={() => updateListUrl({ tab: 'reports', page: '' })}
                className={`${btnGhost} w-full justify-center text-error`}
              >
                <MaterialIcon name="report" className="text-[16px]" />
                Xem báo sai dữ liệu
              </button>
            </div>
          </aside>
        )}
      </div>

      {tab === 'stations' && <AdminStationsPanel />}
      {tab === 'reports' && <AdminContentReportsPanel />}

      {modal?.kind === 'discovery' && (
        <AdminModal
          title={modal.mode === 'create' ? 'Thêm điểm khám phá (POI)' : 'Cập nhật điểm khám phá (POI)'}
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
          title={modal.mode === 'create' ? 'Thêm hiện vật' : 'Cập nhật hiện vật'}
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
          title={modal.mode === 'create' ? 'Thêm nhiệm vụ' : 'Cập nhật nhiệm vụ'}
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
  editIcon?: string
}

type ParsedUnlock = {
  kind: string
  kindLabel: string
  subtitle: string
  icon: string
  tone: 'success' | 'warn' | 'neutral'
}

function parseUnlockKey(unlockKey: string): ParsedUnlock {
  const raw = unlockKey.trim()
  const colon = raw.indexOf(':')
  const kind = (colon >= 0 ? raw.slice(0, colon) : raw).toLowerCase()
  const value = colon >= 0 ? raw.slice(colon + 1) : ''
  const humanValue = value
    ? value.replace(/[_-]+/g, ' ').replace(/\b([a-f0-9]{8}-){1,}[a-f0-9-]{10,}\b/gi, 'mã cảnh').trim()
    : ''

  switch (kind) {
    case 'era':
      return { kind, kindLabel: 'Thời kỳ', subtitle: humanValue ? `Mốc lịch sử ${humanValue}` : 'Mốc thời kỳ', icon: 'timeline', tone: 'success' }
    case 'artifact':
      return { kind, kindLabel: 'Hiện vật', subtitle: humanValue ? `Gắn hiện vật: ${humanValue}` : 'Gắn hiện vật', icon: 'museum', tone: 'warn' }
    case 'scene':
      return { kind, kindLabel: 'Cảnh 360°', subtitle: 'Mở cảnh panorama', icon: '360', tone: 'neutral' }
    case 'photo':
      return { kind, kindLabel: 'Ảnh', subtitle: humanValue ? `Ảnh: ${humanValue}` : 'Điểm ảnh', icon: 'photo_camera', tone: 'neutral' }
    case 'dialogue':
      return { kind, kindLabel: 'Hội thoại', subtitle: humanValue ? `Thoại: ${humanValue}` : 'Đối thoại', icon: 'chat', tone: 'neutral' }
    case 'hotspot':
      return { kind, kindLabel: 'Hotspot', subtitle: humanValue ? `Hotspot: ${humanValue}` : 'Điểm nhấn', icon: 'my_location', tone: 'neutral' }
    default:
      return { kind: kind || 'other', kindLabel: 'Khác', subtitle: raw || 'Chưa có khóa mở', icon: 'place', tone: 'neutral' }
  }
}

function reliabilityLabel(value: string) {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'cao' || normalized === 'high' || normalized === 'primary') return 'Nguồn chính'
  if (normalized === 'trung bình' || normalized === 'medium') return 'Tham khảo'
  if (normalized === 'thấp' || normalized === 'low') return 'Cần kiểm chứng'
  return value
}

function NameCell({
  title,
  subtitle,
  thumbUrl,
  icon = 'place',
  compact = false,
}: {
  title: string
  subtitle?: string
  thumbUrl?: string | null
  icon?: string
  compact?: boolean
}) {
  const box = compact ? 'h-8 w-8' : 'h-9 w-9'
  return (
    <div className="flex min-w-0 max-w-full items-center gap-2">
      {thumbUrl ? (
        <img src={thumbUrl} alt="" className={`${box} shrink-0 rounded-md object-cover ring-1 ring-outline-variant`} />
      ) : (
        <div className={`grid ${box} shrink-0 place-items-center rounded-md bg-primary/15 text-primary`}>
          <MaterialIcon name={icon} className="text-[15px]" />
        </div>
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="truncate font-headline-sm text-body-md text-on-surface" title={title}>{title}</p>
        {subtitle && <p className="truncate font-body-sm text-body-sm text-outline" title={subtitle}>{subtitle}</p>}
      </div>
    </div>
  )
}

function ContentTypePill({ unlock }: { unlock: ParsedUnlock }) {
  const toneClass =
    unlock.tone === 'success' ? 'ops-pill ops-pill-success'
      : unlock.tone === 'warn' ? 'ops-pill ops-pill-warn'
        : 'ops-pill ops-pill-neutral'
  return <span className={toneClass}>{unlock.kindLabel}</span>
}

function PlacementStatus({ mapped, tourLinked }: { mapped: boolean; tourLinked: boolean }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <span className={mapped ? 'ops-pill ops-pill-success' : 'ops-pill ops-pill-warn'}>
        {mapped ? 'Đã gắn map' : 'Chưa gắn map'}
      </span>
      <span className={tourLinked ? 'ops-pill ops-pill-success' : 'ops-pill ops-pill-neutral'}>
        {tourLinked ? 'Tour 360°' : 'Chưa tour'}
      </span>
    </div>
  )
}

function QuestCompletionMeta({ trigger, requireOnsite }: { trigger?: string | null; requireOnsite: boolean }) {
  const triggerLabel =
    trigger === 'checkin' ? 'Check-in tại chỗ'
      : trigger === 'discovery' ? 'Khám phá từ xa'
        : (trigger || 'Khám phá từ xa')
  return (
    <div className="min-w-0 space-y-1">
      <span className={requireOnsite ? 'ops-pill ops-pill-warn' : 'ops-pill ops-pill-success'}>
        {requireOnsite ? 'Bắt buộc onsite' : 'Làm từ xa được'}
      </span>
      <p className="truncate font-body-sm text-body-sm text-outline">{triggerLabel}</p>
    </div>
  )
}

function ContentTable({
  headers,
  rows,
  emptyTitle,
  emptyDetail,
  colWidths,
}: {
  headers: string[]
  rows: TableRow[]
  emptyTitle?: string
  emptyDetail?: string
  colWidths?: string[]
}) {
  if (rows.length === 0) {
    return <AdminEmptyState title={emptyTitle ?? 'Chưa có dữ liệu'} detail={emptyDetail ?? 'Chưa có bản ghi cho địa điểm này.'} />
  }
  return (
    <div className="min-w-0 overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
      <table className="ops-table w-full text-left font-body-md text-body-md">
        {colWidths && (
          <colgroup>
            {colWidths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {headers.map((h, index) => (
              <th key={`${h}-${index}`} className="px-2 py-2.5 font-label-sm text-label-sm uppercase tracking-wider sm:px-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-surface-container/60">
              {row.cells.map((cell, j) => (
                <td key={j} className="px-2 py-2.5 align-middle sm:px-3">
                  {cell}
                </td>
              ))}
              <td className="px-2 py-2.5 align-middle sm:px-3">
                <div className="flex items-center justify-end gap-1">
                  {row.onEdit && (
                    <button
                      type="button"
                      onClick={row.onEdit}
                      aria-label={row.editLabel ?? 'Sửa'}
                      title={row.editLabel ?? 'Sửa'}
                      className="ops-icon-btn"
                    >
                      <MaterialIcon name={row.editIcon ?? 'edit'} className="text-[15px]" />
                    </button>
                  )}
                  {row.onDelete && (
                    <button
                      type="button"
                      onClick={row.onDelete}
                      aria-label="Xóa"
                      title="Xóa"
                      className="ops-icon-btn ops-icon-btn-danger"
                    >
                      <MaterialIcon name="delete" className="text-[15px]" />
                    </button>
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

  if (loading) return <p role="status" className="font-body-sm text-body-sm text-on-surface-variant">Đang kiểm tra ảnh hưởng…</p>
  if (error && !impact) return <AdminErrorState message={error} onRetry={onRetry} />

  return (
    <form onSubmit={(event) => { event.preventDefault(); if (!validation && impact?.deletable) void onSubmit(reasonPreset, reasonDetail) }} className="space-y-5">
      {impact && (
        <section className={`rounded-xl border p-4 ${!impact.deletable ? 'border-error/40 bg-error-container/30' : 'border-outline-variant bg-surface-container'}`}>
          <h3 className="font-headline-sm text-on-surface">Ảnh hưởng trước khi xóa</h3>
          {impact.blockers.length === 0 && impact.warnings.length === 0 && <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Không phát hiện tham chiếu hoặc tiến độ bị ảnh hưởng.</p>}
          {impact.blockers.length > 0 && <div className="mt-3"><p className="font-label-sm text-label-sm font-bold text-error">Điều kiện đang chặn</p><ul className="mt-1 list-disc space-y-1 pl-5 font-body-sm text-body-sm">{impact.blockers.map((item) => <li key={item.code}>{item.message} ({item.count})</li>)}</ul></div>}
          {impact.warnings.length > 0 && <div className="mt-3"><p className="font-label-sm text-label-sm font-bold text-tertiary">Cảnh báo</p><ul className="mt-1 list-disc space-y-1 pl-5 font-body-sm text-body-sm">{impact.warnings.map((item) => <li key={item.code}>{item.message} ({item.count})</li>)}</ul></div>}
          {!impact.deletable && <p className="mt-3 font-headline-sm text-error">Chưa thể xóa cho đến khi xử lý hết các điều kiện đang chặn.</p>}
        </section>
      )}
      {error && impact && <p role="alert" className="rounded-lg border border-error/40 bg-error-container/30 p-3 font-body-sm text-body-sm text-error">{error}</p>}
      <FormField label="Lý do xóa">
        <SelectInput value={reasonPreset} onChange={(event) => setReasonPreset(event.target.value as DeleteReasonPreset)}>{DELETE_REASONS.map((reason) => <option key={reason}>{reason}</option>)}</SelectInput>
      </FormField>
      <FormField label={reasonPreset === 'Khác' ? 'Mô tả lý do *' : 'Ghi chú thêm'} hint={reasonPreset === 'Khác' ? 'Tối thiểu 10 ký tự' : undefined}>
        <TextArea value={reasonDetail} onChange={(event) => setReasonDetail(event.target.value)} rows={3} />
      </FormField>
      {validation && reasonPreset === 'Khác' && <p className="font-body-sm text-body-sm text-error">{validation}</p>}
      <div className="flex justify-end gap-3 border-t border-outline-variant pt-4">
        <button type="button" onClick={onCancel} disabled={saving} className="rounded-lg border border-outline-variant px-4 py-2 font-label-sm text-label-sm text-on-surface">Huỷ</button>
        <button type="submit" disabled={saving || !!validation || !impact?.deletable} className="rounded-lg bg-error-container px-4 py-2 font-headline-sm text-headline-sm text-error disabled:opacity-50">{saving ? 'Đang xóa…' : 'Xác nhận xóa mềm'}</button>
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
  submitLabel = 'Lưu & cập nhật',
}: {
  saving: boolean
  onCancel: () => void
  submitLabel?: string
}) {
  return (
    <div className="mt-sm flex justify-end gap-sm border-t border-outline-variant pt-md">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-lg border border-outline-variant px-4 py-2 font-label-sm text-label-sm text-on-surface-variant"
      >
        Huỷ bỏ
      </button>
      <button
        type="submit"
        disabled={saving}
        className="ops-btn-primary disabled:opacity-60"
      >
        {saving ? 'Đang lưu…' : submitLabel}
      </button>
    </div>
  )
}
