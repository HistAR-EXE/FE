import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { fieldTripApi } from '../features/field-trips/api'
import { buildFieldTripCsv } from '../features/field-trips/reportExport'
import {
  FIELD_TRIP_STATUS_LABEL,
  formatVisit,
  participationLabel,
  type FieldTripReport,
} from '../features/field-trips/types'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

export function TeacherTripReportPage() {
  const { tripId = '' } = useParams()
  const [report, setReport] = useState<FieldTripReport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fieldTripApi.report(tripId)
      .then((next) => {
        if (!cancelled) setReport(next)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getFriendlyErrorMessage(err, 'quest'))
      })
    return () => {
      cancelled = true
    }
  }, [tripId])

  const downloadCsv = () => {
    if (!report) return
    const csv = buildFieldTripCsv(report)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `bao-cao-${report.tripId}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Báo cáo chuyến đi" backTo={`/teacher/trips/${tripId}`} />}>
      <style>{`
        @media print {
          header, nav, aside, .no-print { display: none !important; }
          main.field-trip-report-root { margin: 0 !important; max-width: none !important; }
        }
      `}</style>
      <main className="field-trip-report-root mt-14 md:mt-16 p-md md:p-lg max-w-5xl mx-auto w-full space-y-md">
        {error && <p role="alert" className="rounded-lg border border-error/40 bg-error/10 px-md py-sm text-sm">{error}</p>}
        {!report && !error && <p className="text-sm text-on-surface-variant">Đang tải báo cáo...</p>}
        {report && (
          <>
            <div className="space-y-1">
              <h1 className="font-display-md text-on-surface">{report.title}</h1>
              <p className="text-sm text-on-surface-variant">Trạng thái: {FIELD_TRIP_STATUS_LABEL[report.status]}</p>
              <p className="text-sm text-on-surface-variant">{report.siteCode} · {formatVisit(report.generatedAt)}</p>
            </div>
            <div className="no-print flex flex-wrap gap-sm">
              <Button type="button" onClick={downloadCsv}>Tải CSV</Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>In / Lưu PDF</Button>
            </div>
            <section className="bg-surface-container border border-outline-variant rounded-xl p-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-on-surface-variant border-b border-outline-variant">
                    <th className="py-2 pr-2">Nhóm</th>
                    <th className="py-2 pr-2">Hình thức</th>
                    <th className="py-2 pr-2 text-right">Sĩ số</th>
                    <th className="py-2 pr-2 text-right">Trạm hoàn thành</th>
                    <th className="py-2 pr-2 text-right">Hoàn thành nhiệm vụ</th>
                    <th className="py-2 text-right">Điểm</th>
                  </tr>
                </thead>
                <tbody>
                  {report.groups.map((group) => (
                    <tr key={group.groupId} className="border-b border-outline-variant/40">
                      <td className="py-2 pr-2">{group.name}</td>
                      <td className="py-2 pr-2">{participationLabel(group.participationMode)}</td>
                      <td className="py-2 pr-2 text-right font-mono">{group.headcount}</td>
                      <td className="py-2 pr-2 text-right font-mono">{group.stationsCompleted}</td>
                      <td className="py-2 pr-2 text-right font-mono">{group.questCompletions}</td>
                      <td className="py-2 text-right font-mono">{group.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}
