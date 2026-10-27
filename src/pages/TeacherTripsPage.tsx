import { useTeacherWorkspace } from '../features/org/teacher-workspace-context'
import { TeacherQuestFields } from '../features/org/TeacherQuestFields'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { fieldTripApi } from '../features/field-trips/api'
import { FIELD_TRIP_STATUS_LABEL, toIsoFromLocal, type FieldTripResponse } from '../features/field-trips/types'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

const fieldClass = 'w-full rounded-lg border border-outline-variant bg-surface px-md py-sm'

export function TeacherTripsPage() {
  const { showToast } = useToast()
  const { memberships, orgId, setOrgId } = useTeacherWorkspace()
  const [trips, setTrips] = useState<FieldTripResponse[]>([])

  const [siteCode, setSiteCode] = useState('')
  const [title, setTitle] = useState('')
  const [visitStart, setVisitStart] = useState('')
  const [visitEnd, setVisitEnd] = useState('')
  const [questId, setQuestId] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [saving, setSaving] = useState(false)

  const reload = () => {
    fieldTripApi.listMine()
      .then(setTrips)
      .catch((error) => {
        setTrips([])
        showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
      })
  }

  useEffect(() => {
    reload()
  }, [showToast])

  const onCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!orgId || !siteCode.trim() || !title.trim() || !visitStart || !visitEnd || !questId.trim() || !campaignId.trim()) return
    try {
      setSaving(true)
      await fieldTripApi.create({
        orgId,
        siteCode: siteCode.trim(),
        title: title.trim(),
        visitStart: toIsoFromLocal(visitStart),
        visitEnd: toIsoFromLocal(visitEnd),
        questId: questId.trim(),
        campaignId: campaignId.trim(),
      })
      setTitle('')
      setQuestId('')
      setCampaignId('')
      reload()
      showToast({ message: 'Đã tạo chuyến tham quan', type: 'success' })
    } catch (error) {
      showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        <div>
          <h1 className="font-display-md text-on-surface">Chuyến tham quan</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Chọn di tích, khung giờ và nhiệm vụ phù hợp. Chuẩn bị nhóm học sinh trước khi bắt đầu chuyến.
          </p>
        </div>

        <form onSubmit={(event) => void onCreate(event)} className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
          <h2 className="font-title-md">Tạo chuyến đi</h2>
          <label className="block text-sm space-y-1">
            Tổ chức
            <select className={fieldClass} value={orgId} onChange={(event) => setOrgId(event.target.value)} required>
              {memberships.length === 0 && <option value="">Chưa có tổ chức</option>}
              {memberships.map((item) => (
                <option key={item.organizationId} value={item.organizationId}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm space-y-1">
            Mã di tích
            <input className={fieldClass} value={siteCode} onChange={(event) => setSiteCode(event.target.value)} placeholder="cu-chi" required />
          </label>
          <label className="block text-sm space-y-1">
            Tiêu đề
            <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} required />
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
          <TeacherQuestFields questId={questId} campaignId={campaignId} onQuestChange={setQuestId} onCampaignChange={setCampaignId} campaignRequired />
          <Button type="submit" disabled={saving || memberships.length === 0}>Tạo chuyến</Button>
        </form>

        <section className="space-y-sm">
          <h2 className="font-title-md">Chuyến của tôi</h2>
          {trips.length === 0 ? (
            <p className="text-sm text-on-surface-variant">Chưa có chuyến tham quan.</p>
          ) : (
            <ul className="space-y-sm">
              {trips.map((trip) => (
                <li key={trip.id} className="bg-surface-container border border-outline-variant rounded-xl p-md flex flex-wrap items-center justify-between gap-sm">
                  <div>
                    <Link to={`/teacher/trips/${trip.id}`} className="font-title-sm text-secondary underline">
                      {trip.title}
                    </Link>
                    <p className="text-xs text-on-surface-variant mt-1">{trip.siteCode} · {FIELD_TRIP_STATUS_LABEL[trip.status]}</p>
                  </div>
                  <span className="text-xs text-on-surface-variant">{trip.joinCode}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  )
}
