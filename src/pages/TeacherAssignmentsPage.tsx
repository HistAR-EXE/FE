import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { getData, httpClient } from '../shared/api/httpClient'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

type Assignment = {
  id: string
  title: string
  questId: string
  questTitle: string
  dueAt: string | null
  createdAt: string
  submissions: Array<{
    id: string
    studentId: string
    studentName: string
    score: number | null
    autoGraded: boolean
    completedAt: string | null
  }>
}

export function TeacherAssignmentsPage() {
  const { showToast } = useToast()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [title, setTitle] = useState('')
  const [questId, setQuestId] = useState('')
  const [loading, setLoading] = useState(false)

  const reload = () => {
    getData<Assignment[]>(httpClient.get('/api/lms/assignments'))
      .then(setAssignments)
      .catch(() => setAssignments([]))
  }

  useEffect(() => {
    reload()
  }, [])

  const onCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !questId.trim()) return
    try {
      setLoading(true)
      await getData(httpClient.post('/api/lms/assignments', { title: title.trim(), questId: questId.trim() }))
      setTitle('')
      setQuestId('')
      reload()
      showToast({ message: 'Đã tạo bài tập quest', type: 'success' })
    } catch (err) {
      showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const exportPdf = () => {
    const html = `
      <html><head><title>HistAR LMS Report</title>
      <style>body{font-family:Arial,sans-serif;padding:24px} h1{font-size:18px} table{width:100%;border-collapse:collapse;margin-top:16px}
      th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}</style></head><body>
      <h1>Báo cáo LMS — TimeLens</h1>
      <p>Xuất lúc: ${new Date().toLocaleString('vi-VN')}</p>
      <table><thead><tr><th>Bài tập</th><th>Học sinh</th><th>Điểm</th><th>Auto</th><th>Hoàn thành</th></tr></thead><tbody>
      ${assignments
        .flatMap((a) =>
          a.submissions.length === 0
            ? [[`${a.title}`, '—', '—', '—', '—']]
            : a.submissions.map((s) => [
                a.title,
                s.studentName,
                String(s.score ?? ''),
                s.autoGraded ? 'yes' : 'no',
                s.completedAt ?? '',
              ]),
        )
        .map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join('')}</tr>`)
        .join('')}
      </tbody></table></body></html>`
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) {
      showToast({ message: 'Trình duyệt chặn cửa sổ in. Cho phép popup.', type: 'error' })
      return
    }
    w.document.write(html)
    w.document.close()
    w.focus()
    w.print()
  }

  const exportCsv = () => {
    const rows = [
      ['Assignment', 'Student', 'Score', 'AutoGraded', 'CompletedAt'],
      ...assignments.flatMap((a) =>
        a.submissions.map((s) => [
          a.title,
          s.studentName,
          String(s.score ?? ''),
          s.autoGraded ? 'yes' : 'no',
          s.completedAt ?? '',
        ]),
      ),
    ]
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'histar-lms-report.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="LMS — Giao bài" backTo="/teacher" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-4xl mx-auto w-full space-y-lg">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <div>
            <h1 className="font-display-md text-on-surface">LMS Premium</h1>
            <p className="text-sm text-on-surface-variant">Giao bài quest, auto-chấm khi học sinh hoàn thành, xuất báo cáo CSV/PDF.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={exportCsv}>
              <MaterialIcon name="download" className="text-base mr-1" />
              Xuất CSV
            </Button>
            <Button type="button" variant="outline" onClick={exportPdf}>
              <MaterialIcon name="picture_as_pdf" className="text-base mr-1" />
              Xuất PDF
            </Button>
          </div>
        </div>

        <form onSubmit={(e) => void onCreate(e)} className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
          <h2 className="font-title-md">Tạo bài tập mới</h2>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề bài"
            className="w-full neo-input rounded-lg px-md py-sm"
          />
          <input
            value={questId}
            onChange={(e) => setQuestId(e.target.value)}
            placeholder="Quest UUID"
            className="w-full neo-input rounded-lg px-md py-sm font-mono text-xs"
          />
          <Button type="submit" disabled={loading}>
            Giao bài
          </Button>
        </form>

        <section className="space-y-md">
          {assignments.map((assignment) => (
            <article key={assignment.id} className="bg-surface-container border border-outline-variant rounded-xl p-md">
              <h3 className="font-title-md">{assignment.title}</h3>
              <p className="text-xs text-on-surface-variant mt-1">Quest: {assignment.questTitle}</p>
              <ul className="mt-sm space-y-1 text-sm">
                {assignment.submissions.length === 0 ? (
                  <li className="text-on-surface-variant">Chưa có bài nộp</li>
                ) : (
                  assignment.submissions.map((s) => (
                    <li key={s.id} className="flex justify-between gap-sm">
                      <span>{s.studentName}</span>
                      <span className="text-secondary">{s.score ?? 0}% {s.autoGraded ? '(auto)' : ''}</span>
                    </li>
                  ))
                )}
              </ul>
            </article>
          ))}
        </section>

        <Link to="/teacher" className="text-sm text-secondary underline">
          ← Về Teacher Dashboard
        </Link>
      </main>
    </AppLayout>
  )
}
