import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { fieldTripApi } from '../features/field-trips/api'
import {
  FIELD_TRIP_STATUS_LABEL,
  SITE_CONFIRMATION_LABEL,
  canCancelTrip,
  canCreateGroup,
  canEditTrip,
  canRequestConfirmation,
  canStartTrip,
  formatVisit,
  participationLabel,
  toDatetimeLocal,
  toIsoFromLocal,
  type FieldTripResponse,
  type ParticipationMode,
  type TripGroupPreview,
} from '../features/field-trips/types'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

const fieldClass = 'w-full rounded-lg border border-outline-variant bg-surface px-md py-sm'

export function TeacherTripDetailPage() {
  const { tripId = '' } = useParams()
  const { showToast } = useToast()
  const [trip, setTrip] = useState<FieldTripResponse | null>(null)
  const [groups, setGroups] = useState<TripGroupPreview[]>([])
  const [title, setTitle] = useState('')
  const [siteCode, setSiteCode] = useState('')
  const [visitStart, setVisitStart] = useState('')
  const [visitEnd, setVisitEnd] = useState('')
  const [questId, setQuestId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [groupName, setGroupName] = useState('')
  const [participationMode, setParticipationMode] = useState<ParticipationMode>('INDIVIDUAL')
  const [declaredSize, setDeclaredSize] = useState('')
  const [qr, setQr] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const applyTrip = (next: FieldTripResponse) => {
    setTrip(next)
    setTitle(next.title)
    setSiteCode(next.siteCode)
    setVisitStart(toDatetimeLocal(next.visitStart))
    setVisitEnd(toDatetimeLocal(next.visitEnd))
    setQuestId(next.questId)
    setCampaignId(next.campaignId)
  }

  const loadGroups = async (joinCode: string) => {
    const preview = await fieldTripApi.preview(joinCode)
    setGroups(preview.groups)
  }

  useEffect(() => {
    let cancelled = false
    setLoadError(null)
    fieldTripApi.get(tripId)
      .then(async (next) => {
        if (cancelled) return
        applyTrip(next)
        const preview = await fieldTripApi.preview(next.joinCode)
        if (!cancelled) setGroups(preview.groups)
      })
      .catch((error) => {
        if (!cancelled) setLoadError(getFriendlyErrorMessage(error, 'quest'))
      })
    return () => {
      cancelled = true
    }
  }, [tripId])

  const joinUrl = trip ? `${window.location.origin}/trip/join/${trip.joinCode}` : ''

  useEffect(() => {
    if (!joinUrl) return
    let active = true
    QRCode.toDataURL(joinUrl, { width: 240, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0F1B33', light: '#FFFFFF' } })
      .then((value) => {
        if (active) setQr(value)
      })
      .catch(() => {
        if (active) setQr('')
      })
    return () => {
      active = false
    }
  }, [joinUrl])

  const onSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!trip || !canEditTrip(trip.status)) return
    try {
      setSaving(true)
      const next = await fieldTripApi.update(trip.id, {
        title: title.trim(),
        siteCode: siteCode.trim(),
        visitStart: toIsoFromLocal(visitStart),
        visitEnd: toIsoFromLocal(visitEnd),
        questId: questId.trim(),
        campaignId: campaignId.trim(),
        rowVersion: trip.rowVersion,
      })
      applyTrip(next)
      showToast({ message: 'Đã lưu chuyến đi', type: 'success' })
    } catch (error) {
      showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const onCreateGroup = async (event: FormEvent) => {
    event.preventDefault()
    if (!trip || !groupName.trim()) return
    let declared: number | undefined
    if (participationMode === 'SHARED_DEVICE') {
      const size = Number(declaredSize)
      if (!Number.isInteger(size) || size < 1) {
        showToast({ message: 'Nhóm một thiết bị cần sĩ số dự kiến.', type: 'error' })
        return
      }
      declared = size
    }
    const body = {
      name: groupName.trim(),
      participationMode,
      ...(declared != null ? { declaredSize: declared } : {}),
    }
    try {
      setSaving(true)
      await fieldTripApi.createGroup(trip.id, body)
      await loadGroups(trip.joinCode)
      setGroupName('')
      setDeclaredSize('')
      setParticipationMode('INDIVIDUAL')
      showToast({ message: 'Đã tạo nhóm', type: 'success' })
    } catch (error) {
      showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const transition = async (action: 'request-confirmation' | 'start' | 'cancel' | 'complete') => {
    if (!trip) return
    try {
      setSaving(true)
      const next = action === 'request-confirmation'
        ? await fieldTripApi.requestConfirmation(trip.id, trip.rowVersion)
        : action === 'start'
          ? await fieldTripApi.start(trip.id, trip.rowVersion)
          : action === 'cancel'
            ? await fieldTripApi.cancel(trip.id, trip.rowVersion)
            : await fieldTripApi.complete(trip.id, trip.rowVersion)
      applyTrip(next)
      showToast({
        message: action === 'start'
          ? 'Đã bắt đầu chuyến'
          : action === 'cancel'
            ? 'Đã hủy chuyến'
            : action === 'complete'
              ? 'Đã kết thúc chuyến'
              : 'Đã gửi xác nhận tới di tích',
        type: 'success',
      })
    } catch (error) {
      showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const copyJoinLink = async () => {
    if (!joinUrl) return
    try {
      await navigator.clipboard.writeText(joinUrl)
      showToast({ message: 'Đã sao chép liên kết tham gia', type: 'success' })
    } catch {
      showToast({ message: joinUrl, type: 'info' })
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Chi tiết chuyến đi" backTo="/teacher/trips" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        {loadError && <p role="alert" className="rounded-lg border border-error/40 bg-error/10 px-md py-sm text-sm">{loadError}</p>}
        {!trip && !loadError && <p className="text-sm text-on-surface-variant">Đang tải chuyến đi...</p>}
        {trip && (
          <>
            <div className="space-y-1">
              <h1 className="font-display-md text-on-surface">{trip.title}</h1>
              <p className="text-sm text-on-surface-variant">Trạng thái: {FIELD_TRIP_STATUS_LABEL[trip.status]}</p>
              <p className="text-sm text-on-surface-variant">Xác nhận di tích: {SITE_CONFIRMATION_LABEL[trip.siteConfirmationStatus]}</p>
              <p className="text-sm text-on-surface-variant">
                {trip.siteCode} · {formatVisit(trip.visitStart)} – {formatVisit(trip.visitEnd)}
              </p>
              {trip.siteNote && <p className="text-sm">Ghi chú di tích: {trip.siteNote}</p>}
            </div>

            {trip.status === 'PENDING_SITE' && (
              <p className="rounded-lg border border-secondary/40 bg-secondary/10 px-md py-sm text-sm">
                Đang chờ di tích xác nhận
              </p>
            )}

            <div className="flex flex-wrap gap-sm">
              {canRequestConfirmation(trip.status) && (
                <Button type="button" variant="outline" disabled={saving} onClick={() => void transition('request-confirmation')}>
                  Gửi xác nhận di tích
                </Button>
              )}
              {canStartTrip(trip) && (
                <Button type="button" disabled={saving} onClick={() => void transition('start')}>
                  Bắt đầu chuyến
                </Button>
              )}
              {canCancelTrip(trip.status) && (
                <Button type="button" variant="outline" disabled={saving} onClick={() => void transition('cancel')}>
                  Hủy chuyến
                </Button>
              )}
              {trip.status === 'ACTIVE' && (
                <Button type="button" disabled={saving} onClick={() => void transition('complete')}>
                  Kết thúc chuyến
                </Button>
              )}
              <Link to={`/teacher/trips/${trip.id}/live`} className="text-sm px-sm py-xs border border-outline-variant rounded-lg text-secondary">
                Live board
              </Link>
              <Link to={`/teacher/trips/${trip.id}/report`} className="text-sm px-sm py-xs border border-outline-variant rounded-lg text-secondary">
                Báo cáo
              </Link>
              <Link to={`/quests/${trip.questId}`} className="text-sm px-sm py-xs border border-outline-variant rounded-lg text-secondary">
                Mở nhiệm vụ
              </Link>
              <Link to="/scan" className="text-sm px-sm py-xs border border-outline-variant rounded-lg text-secondary">
                Quét trạm
              </Link>
            </div>

            {canEditTrip(trip.status) && (
              <form onSubmit={(event) => void onSave(event)} className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
                <h2 className="font-title-md">Sửa chuyến nháp</h2>
                <label className="block text-sm space-y-1">
                  Tiêu đề
                  <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} required />
                </label>
                <label className="block text-sm space-y-1">
                  Mã di tích
                  <input className={fieldClass} value={siteCode} onChange={(event) => setSiteCode(event.target.value)} required />
                </label>
                <div className="grid gap-sm md:grid-cols-2">
                  <label className="block text-sm space-y-1">
                    Giờ đến
                    <input className={fieldClass} type="datetime-local" value={visitStart} onChange={(event) => setVisitStart(event.target.value)} required />
                  </label>
                  <label className="block text-sm space-y-1">
                    Giờ về
                    <input className={fieldClass} type="datetime-local" value={visitEnd} onChange={(event) => setVisitEnd(event.target.value)} required />
                  </label>
                </div>
                <label className="block text-sm space-y-1">
                  Mã nhiệm vụ
                  <input className={`${fieldClass} font-mono text-xs`} value={questId} onChange={(event) => setQuestId(event.target.value)} required />
                </label>
                <label className="block text-sm space-y-1">
                  Mã chiến dịch
                  <input className={`${fieldClass} font-mono text-xs`} value={campaignId} onChange={(event) => setCampaignId(event.target.value)} required />
                </label>
                <Button type="submit" disabled={saving}>Lưu thay đổi</Button>
              </form>
            )}

            <section className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
              <h2 className="font-title-md">Nhóm tham gia</h2>
              {groups.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Chưa có nhóm.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {groups.map((group) => (
                    <li key={group.id}>
                      {group.name} · {participationLabel(group.participationMode)}
                      {group.participationMode === 'SHARED_DEVICE' && group.declaredSize != null ? ` · sĩ số ${group.declaredSize}` : ''}
                      {` · ${group.memberCount} thành viên`}
                    </li>
                  ))}
                </ul>
              )}
              {canCreateGroup(trip.status) && (
                <form onSubmit={(event) => void onCreateGroup(event)} className="space-y-sm pt-sm">
                  <label className="block text-sm space-y-1">
                    Tên nhóm
                    <input className={fieldClass} value={groupName} onChange={(event) => setGroupName(event.target.value)} required />
                  </label>
                  <label className="block text-sm space-y-1">
                    Hình thức tham gia
                    <select className={fieldClass} value={participationMode} onChange={(event) => setParticipationMode(event.target.value as ParticipationMode)}>
                      <option value="INDIVIDUAL">Cá nhân</option>
                      <option value="SHARED_DEVICE">Một thiết bị</option>
                    </select>
                  </label>
                  <label className="block text-sm space-y-1">
                    Sĩ số dự kiến
                    <input
                      className={fieldClass}
                      type="number"
                      min={1}
                      value={declaredSize}
                      onChange={(event) => setDeclaredSize(event.target.value)}
                      required={participationMode === 'SHARED_DEVICE'}
                    />
                  </label>
                  <Button type="submit" disabled={saving}>Tạo nhóm</Button>
                </form>
              )}
            </section>

            <section className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
              <h2 className="font-title-md">Mã tham gia</h2>
              <a href={joinUrl} className="block text-sm text-secondary underline break-all">{joinUrl}</a>
              <Button type="button" variant="outline" onClick={() => void copyJoinLink()}>Sao chép liên kết</Button>
              {qr && <img src={qr} alt={`Mã QR ${joinUrl}`} width={240} height={240} />}
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}
