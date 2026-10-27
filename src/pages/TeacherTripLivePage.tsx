import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fieldTripApi } from '../features/field-trips/api'
import {
  FIELD_TRIP_STATUS_LABEL,
  participationLabel,
  type FieldTripLiveBoard,
  type FieldTripResponse,
} from '../features/field-trips/types'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

const POLL_MS = 5000

export function TeacherTripLivePage() {
  const { tripId = '' } = useParams()
  const [trip, setTrip] = useState<FieldTripResponse | null>(null)
  const [board, setBoard] = useState<FieldTripLiveBoard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setTrip(null)
    setError(null)
    fieldTripApi.get(tripId)
      .then((next) => {
        if (!cancelled) setTrip(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getFriendlyErrorMessage(err, 'quest'))
      })
    return () => {
      cancelled = true
    }
  }, [tripId])

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    setBoard(null)

    const schedule = (status?: FieldTripLiveBoard['status']) => {
      if (cancelled || status === 'COMPLETED') return
      timer = window.setTimeout(() => {
        void load()
      }, POLL_MS)
    }

    const load = async () => {
      try {
        const next = await fieldTripApi.liveBoard(tripId)
        if (cancelled) return
        setBoard(next)
        setError(null)
        schedule(next.status)
      } catch (err: unknown) {
        if (cancelled) return
        setError(getFriendlyErrorMessage(err, 'quest'))
        schedule()
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [tripId])

  const status = board?.status ?? trip?.status
  const completed = status === 'COMPLETED'

  return (
    <>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        {error && <p role="alert" className="rounded-lg border border-error/40 bg-error/10 px-md py-sm text-sm">{error}</p>}
        <div className="space-y-1">
          <h1 className="font-display-md text-on-surface">{trip?.title ?? 'Live board'}</h1>
          {status && <p className="text-sm text-on-surface-variant">Trạng thái: {FIELD_TRIP_STATUS_LABEL[status]}</p>}
          {board && !completed && <p className="text-sm text-on-surface-variant">Cập nhật mỗi 5 giây</p>}
          {completed && (
            <Link to={`/teacher/trips/${tripId}/report`} className="text-sm text-secondary underline">
              Báo cáo
            </Link>
          )}
        </div>

        <section className="bg-surface-container border border-outline-variant rounded-xl p-md overflow-x-auto">
          {!board && !error && <p className="text-sm text-on-surface-variant">Đang tải...</p>}
          {board && (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-on-surface-variant border-b border-outline-variant">
                  <th className="py-2 pr-2">Tên hiển thị</th>
                  <th className="py-2 pr-2">Nhóm</th>
                  <th className="py-2 pr-2">Hình thức</th>
                  <th className="py-2 pr-2 text-right">Sĩ số</th>
                  <th className="py-2 pr-2 text-right">Trạm</th>
                  <th className="py-2 text-right">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {board.rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-md text-on-surface-variant">Chưa có tiến độ.</td>
                  </tr>
                ) : board.rows.map((row) => (
                  <tr key={`${row.groupId}:${row.userId ?? 'shared'}`} className="border-b border-outline-variant/40">
                    <td className="py-2 pr-2">{row.displayName}</td>
                    <td className="py-2 pr-2">{row.groupName}</td>
                    <td className="py-2 pr-2">{participationLabel(row.participationMode)}</td>
                    <td className="py-2 pr-2 text-right font-mono">{row.headcount}</td>
                    <td className="py-2 pr-2 text-right font-mono">{row.stationsCompleted}</td>
                    <td className="py-2 text-right font-mono">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </>
  )
}
