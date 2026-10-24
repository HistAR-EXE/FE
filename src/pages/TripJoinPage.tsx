import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { fieldTripApi } from '../features/field-trips/api'
import { formatVisit, participationLabel, type TripJoinPreview } from '../features/field-trips/types'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

export function TripJoinPage() {
  const { code = '' } = useParams()
  const { showToast } = useToast()
  const [preview, setPreview] = useState<TripJoinPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [groupId, setGroupId] = useState('')
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setPreview(null)
    setJoined(false)
    setGroupId('')
    fieldTripApi.preview(code)
      .then((next) => {
        if (cancelled) return
        setPreview(next)
        setGroupId(next.groups[0]?.id ?? '')
      })
      .catch((cause) => {
        if (!cancelled) setError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code])

  const onJoin = async (event: FormEvent) => {
    event.preventDefault()
    if (!groupId || error) return
    try {
      setSaving(true)
      await fieldTripApi.join({ code, groupId })
      setJoined(true)
      showToast({ message: 'Bạn đã vào nhóm của chuyến đi', type: 'success' })
    } catch (cause) {
      setError(getFriendlyErrorMessage(cause, 'quest'))
      setPreview(null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Tham gia chuyến đi" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-3xl mx-auto w-full space-y-md">
        {loading && <p className="text-sm text-on-surface-variant">Đang tải chuyến đi...</p>}
        {error && (
          <p role="alert" className="rounded-lg border border-error/40 bg-error/10 px-md py-sm text-sm">{error}</p>
        )}
        {preview && !error && (
          <form onSubmit={(event) => void onJoin(event)} className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
            <h1 className="font-display-md text-on-surface">{preview.title}</h1>
            <p className="text-sm text-on-surface-variant">Di tích: {preview.siteCode}</p>
            <p className="text-sm">
              Khung giờ:{' '}
              <time dateTime={preview.visitStart}>{formatVisit(preview.visitStart)}</time>
              {' – '}
              <time dateTime={preview.visitEnd}>{formatVisit(preview.visitEnd)}</time>
            </p>
            <fieldset className="space-y-sm">
              <legend className="text-sm font-medium">Chọn nhóm</legend>
              {preview.groups.length === 0 && <p className="text-sm text-on-surface-variant">Chuyến chưa có nhóm để tham gia.</p>}
              {preview.groups.map((group) => (
                <label key={group.id} className="flex items-start gap-sm text-sm">
                  <input
                    type="radio"
                    name="group"
                    value={group.id}
                    checked={groupId === group.id}
                    onChange={() => setGroupId(group.id)}
                  />
                  <span>
                    {group.name} · {participationLabel(group.participationMode)}
                    {group.declaredSize != null ? ` · sĩ số ${group.declaredSize}` : ''}
                    {` · ${group.memberCount} thành viên`}
                  </span>
                </label>
              ))}
            </fieldset>
            {preview.groups.length > 0 && (
              <Button type="submit" disabled={saving || !groupId || joined}>Tham gia nhóm</Button>
            )}
            {joined && <p className="text-sm text-secondary">Đã tham gia nhóm</p>}
          </form>
        )}
      </main>
    </AppLayout>
  )
}
