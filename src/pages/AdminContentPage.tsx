// src/pages/AdminContentPage.tsx
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminSubNav } from '../components/admin/AdminSubNav'
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
  type AdminDiscoveryPoint,
  type AdminDiscoveryPointInput,
  type AdminQuest,
  type AdminQuestInput,
} from '../features/admin/api'
import { panoramaAdminApi, validatePanoramaFile } from '../features/admin/panoramaAdminApi'
import { panoramaApi, type Panorama } from '../features/panorama/api'
import { locationsApi, type Location } from '../features/locations/api'
import { CU_CHI_LOCATION_ID } from '../shared/config/constants'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { MaterialIcon } from '../components/ui/MaterialIcon'

type Tab = 'discovery' | 'artifacts' | 'quests' | 'panoramas'

type ModalState =
  | { kind: 'discovery'; mode: 'create' | 'edit'; item?: AdminDiscoveryPoint }
  | { kind: 'artifact'; mode: 'create' | 'edit'; item?: AdminArtifact }
  | { kind: 'quest'; mode: 'create' | 'edit'; item?: AdminQuest }
  | { kind: 'panorama-upload'; mode: 'create' }
  | { kind: 'panorama-replace'; mode: 'edit'; item: Panorama }
  | null

export function AdminContentPage() {
  const [tab, setTab] = useState<Tab>('discovery')
  const [locations, setLocations] = useState<Location[]>([])
  const [locationId, setLocationId] = useState(CU_CHI_LOCATION_ID)
  const [discovery, setDiscovery] = useState<AdminDiscoveryPoint[]>([])
  const [artifacts, setArtifacts] = useState<AdminArtifact[]>([])
  const [quests, setQuests] = useState<AdminQuest[]>([])
  const [panoramas, setPanoramas] = useState<Panorama[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalState>(null)
  const [saving, setSaving] = useState(false)
  const [eraCount, setEraCount] = useState<{ eraCount: number; sufficient: boolean } | null>(null)
  const { showToast } = useToast()

  const selectedLocation = locations.find((l) => l.id === locationId)

  const loadContent = useCallback(() => {
    if (!locationId) return
    setLoading(true)
    Promise.all([
      adminApi.listDiscoveryPoints(locationId),
      adminApi.listArtifacts(locationId),
      adminApi.listQuests(locationId),
      panoramaApi.byLocation(locationId),
    ])
      .then(([d, a, q, p]) => {
        setDiscovery(d)
        setArtifacts(a)
        setQuests(q)
        setPanoramas(p)
      })
      .catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
      .finally(() => setLoading(false))
  }, [locationId, showToast])

  useEffect(() => {
    locationsApi
      .list({ size: 100 })
      .then(setLocations)
      .catch(() => showToast({ message: 'Không tải được danh sách địa điểm.', type: 'error' }))
  }, [showToast])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  useEffect(() => {
    if (!locationId) return
    adminApi
      .eraCount(locationId)
      .then(setEraCount)
      .catch(() => setEraCount(null))
  }, [locationId])

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'discovery', label: 'Điểm khám phá', count: discovery.length },
    { id: 'artifacts', label: 'Hiện vật', count: artifacts.length },
    { id: 'quests', label: 'Nhiệm vụ', count: quests.length },
    { id: 'panoramas', label: 'Panorama 360°', count: panoramas.length },
  ]

  const handleSaveDiscovery = async (body: AdminDiscoveryPointInput, id?: string) => {
    setSaving(true)
    try {
      if (id) {
        await adminApi.updateDiscoveryPoint(id, body)
        showToast({ message: 'Đã cập nhật điểm khám phá.', type: 'success' })
      } else {
        await adminApi.createDiscoveryPoint(body)
        showToast({ message: 'Đã tạo điểm khám phá mới.', type: 'success' })
      }
      setModal(null)
      loadContent()
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      throw e
    } finally {
      setSaving(false)
    }
  }

  const handleSaveArtifact = async (body: AdminArtifactInput, id?: string) => {
    setSaving(true)
    try {
      if (id) {
        await adminApi.updateArtifact(id, body)
        showToast({ message: 'Đã cập nhật hiện vật.', type: 'success' })
      } else {
        await adminApi.createArtifact(body)
        showToast({ message: 'Đã tạo hiện vật mới.', type: 'success' })
      }
      setModal(null)
      loadContent()
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
      throw e
    } finally {
      setSaving(false)
    }
  }

  const handleSaveQuest = async (body: AdminQuestInput, id?: string) => {
    setSaving(true)
    try {
      if (id) {
        await adminApi.updateQuest(id, body)
        showToast({ message: 'Đã cập nhật nhiệm vụ.', type: 'success' })
      } else {
        await adminApi.createQuest(body)
        showToast({ message: 'Đã tạo nhiệm vụ mới.', type: 'success' })
      }
      setModal(null)
      loadContent()
    } catch (e) {
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
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Quản trị nội dung" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full pb-20">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-md">
          <div>
            <h1 className="font-display-lg text-on-surface">
              {selectedLocation ? `Nội dung: ${selectedLocation.name}` : 'Quản lý nội dung'}
            </h1>
            <p className="text-xs text-on-surface-variant mt-0.5">CMS nội bộ — tạo và chỉnh sửa theo địa điểm (chọn tab Hiện vật / Nhiệm vụ để thêm mới)</p>
          </div>
          <div className="flex gap-2 text-sm shrink-0">
            <Link to="/profile" className="text-secondary inline-flex items-center gap-1 hover:underline">
              <MaterialIcon name="arrow_back" className="text-sm" /> Hồ sơ
            </Link>
          </div>
        </div>

        <AdminSubNav />

        <div className="mb-md flex flex-wrap items-end gap-sm">
          <FormField label="Địa điểm">
            <SelectInput value={locationId} onChange={(e) => setLocationId(e.target.value)}>
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

        <div className="flex flex-wrap gap-2 mb-md border-b border-outline-variant">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
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

        {loading && <p className="text-on-surface-variant text-sm">Đang tải...</p>}

        {!loading && tab === 'discovery' && (
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
            }))}
          />
        )}

        {!loading && tab === 'artifacts' && (
          <ContentTable
            headers={['Tên', 'unlock_key', 'Độ tin cậy', 'Thứ tự', '']}
            rows={artifacts.map((a) => ({
              key: a.id,
              cells: [a.name, a.unlockKey, a.reliability ?? '—', String(a.sortOrder)],
              onEdit: () => setModal({ kind: 'artifact', mode: 'edit', item: a }),
            }))}
          />
        )}

        {!loading && tab === 'quests' && (
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
            }))}
          />
        )}

        {!loading && tab === 'panoramas' && (
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

        {modal?.kind === 'discovery' && (
          <AdminModal
            title={modal.mode === 'create' ? 'Thêm điểm khám phá' : 'Sửa điểm khám phá'}
            onClose={() => setModal(null)}
          >
            <DiscoveryPointForm
              locationId={locationId}
              initial={modal.item}
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
              locationId={locationId}
              initial={modal.item}
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
              locationId={locationId}
              initial={modal.item}
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
      </main>
    </AppLayout>
  )
}

type TableRow = {
  key: string
  cells: (string | ReactNode)[]
  onEdit?: () => void
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
                {row.onEdit && (
                  <button
                    type="button"
                    onClick={row.onEdit}
                    className="text-secondary text-xs hover:underline"
                  >
                    {row.editLabel ?? 'Sửa'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DiscoveryPointForm({
  locationId,
  initial,
  saving,
  onSubmit,
  onCancel,
}: {
  locationId: string
  initial?: AdminDiscoveryPoint
  saving: boolean
  onSubmit: (body: AdminDiscoveryPointInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [unlockKey, setUnlockKey] = useState(initial?.unlockKey ?? '')
  const [mapXPct, setMapXPct] = useState(initial?.mapXPct?.toString() ?? '')
  const [mapYPct, setMapYPct] = useState(initial?.mapYPct?.toString() ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder?.toString() ?? '0')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      locationId,
      name: name.trim(),
      unlockKey: unlockKey.trim(),
      mapXPct: mapXPct ? Number(mapXPct) : null,
      mapYPct: mapYPct ? Number(mapYPct) : null,
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
  saving,
  onSubmit,
  onCancel,
}: {
  locationId: string
  initial?: AdminArtifact
  saving: boolean
  onSubmit: (body: AdminArtifactInput) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [unlockKey, setUnlockKey] = useState(initial?.unlockKey ?? '')
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [reliability, setReliability] = useState(initial?.reliability ?? '')
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder?.toString() ?? '0')

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
  saving,
  onSubmit,
  onCancel,
}: {
  locationId: string
  initial?: AdminQuest
  saving: boolean
  onSubmit: (body: AdminQuestInput) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [story, setStory] = useState(initial?.story ?? '')
  const [pointsReward, setPointsReward] = useState(initial?.pointsReward?.toString() ?? '100')
  const [requiredOrder, setRequiredOrder] = useState(initial?.requiredOrder?.toString() ?? '0')
  const [completionTrigger, setCompletionTrigger] = useState(initial?.completionTrigger ?? 'discovery')
  const [requireOnsiteCheckin, setRequireOnsiteCheckin] = useState(initial?.requireOnsiteCheckin ?? false)
  const [stepsTotal, setStepsTotal] = useState(initial?.stepsTotal?.toString() ?? '')
  const [coverImage, setCoverImage] = useState(initial?.coverImage ?? '')
  const [stepDiscoveryKeys, setStepDiscoveryKeys] = useState(initial?.stepDiscoveryKeys ?? '')

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
