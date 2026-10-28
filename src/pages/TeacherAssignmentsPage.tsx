// src/pages/TeacherAssignmentsPage.tsx
import { useTeacherWorkspace } from '../features/org/teacher-workspace-context'
import { TeacherQuestFields } from '../features/org/TeacherQuestFields'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { getData, httpClient } from '../shared/api/httpClient'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

type Assignment = {
    id: string
    title: string
    questId: string
    campaignId: string | null
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

type TeacherAiDraft = {
    id: string
    title: string
    questId: string
    campaignId: string | null
    sourceVersion: string
    answerBlocks: Array<{ content: string; sources: Array<{ title: string }> }>
    approvedLocales: string[]
    evaluationPassed: boolean
    evaluationReasons: string[]
    status: 'DRAFT' | 'REVIEWED' | 'PUBLISHED'
    publishedAssignmentId?: string | null
}

export function TeacherAssignmentsPage() {
    const { showToast } = useToast()
    const { capabilities } = useTeacherWorkspace()
    const [loadError, setLoadError] = useState('')
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [drafts, setDrafts] = useState<TeacherAiDraft[]>([])
    const [title, setTitle] = useState('')
    const [questId, setQuestId] = useState('')
    const [campaignId, setCampaignId] = useState('')
    const [draftTitle, setDraftTitle] = useState('')
    const [draftQuestId, setDraftQuestId] = useState('')
    const [draftCampaignId, setDraftCampaignId] = useState('')
    const [sourceVersion, setSourceVersion] = useState('')
    const [draftContent, setDraftContent] = useState('')
    const [citationTitle, setCitationTitle] = useState('')
    const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const reload = () => {
        getData<Assignment[]>(httpClient.get('/api/lms/assignments'))
            .then(setAssignments)
            .catch(() => setLoadError('Chưa tải được bài tập. Vui lòng thử lại.'))
        if (capabilities?.contentDrafts)
            getData<TeacherAiDraft[]>(httpClient.get('/api/lms/teacher-ai-drafts'))
                .then(setDrafts)
                .catch(() =>
                    setLoadError('Chưa tải được bản nháp nội dung. Vui lòng thử lại.'),
                )
    }

    const onCreateDraft = async (e: FormEvent) => {
        e.preventDefault()
        if (
            !draftTitle.trim() ||
            !draftQuestId.trim() ||
            !sourceVersion.trim() ||
            !draftContent.trim() ||
            !citationTitle.trim()
        )
            return
        try {
            setLoading(true)
            const updating = Boolean(editingDraftId)
            const body = {
                title: draftTitle.trim(),
                questId: draftQuestId.trim(),
                campaignId: draftCampaignId.trim(),
                sourceVersion: sourceVersion.trim(),
                answerBlocks: [
                    {
                        type: 'VERIFIED_FACT',
                        confidence: 'VERIFIED',
                        content: draftContent.trim(),
                        sources: [{ title: citationTitle.trim(), excerpt: '', url: null }],
                    },
                ],
                approvedLocales: ['vi', 'en', 'ko', 'zh-CN'],
            }
            await getData(
                editingDraftId
                    ? httpClient.put(
                        `/api/lms/teacher-ai-drafts/${editingDraftId}`,
                        body,
                    )
                    : httpClient.post('/api/lms/teacher-ai-drafts', body),
            )
            setDraftTitle('')
            setDraftQuestId('')
            setDraftCampaignId('')
            setSourceVersion('')
            setDraftContent('')
            setCitationTitle('')
            setEditingDraftId(null)
            reload()
            showToast({
                message: updating
                    ? 'Đã cập nhật draft; cần review lại trước publish.'
                    : 'Đã lưu draft; cần review trước khi publish.',
                type: 'success',
            })
        } catch (err) {
            showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const editDraft = (draft: TeacherAiDraft) => {
        setEditingDraftId(draft.id)
        setDraftTitle(draft.title)
        setDraftQuestId(draft.questId)
        setDraftCampaignId(draft.campaignId ?? '')
        setSourceVersion(draft.sourceVersion)
        setDraftContent(draft.answerBlocks[0]?.content ?? '')
        setCitationTitle(draft.answerBlocks[0]?.sources[0]?.title ?? '')
    }

    const advanceDraft = async (
        draftId: string,
        action: 'review' | 'publish',
    ) => {
        try {
            setLoading(true)
            await getData(
                httpClient.post(`/api/lms/teacher-ai-drafts/${draftId}/${action}`),
            )
            reload()
            showToast({
                message:
                    action === 'review'
                        ? 'Draft đã được review.'
                        : 'Đã publish thành bài tập.',
                type: 'success',
            })
        } catch (err) {
            showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        reload()
    }, [])

    const onCreate = async (e: FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !questId.trim()) return
        try {
            setLoading(true)
            await getData(
                httpClient.post('/api/lms/assignments', {
                    title: title.trim(),
                    questId: questId.trim(),
                    ...(campaignId.trim() ? { campaignId: campaignId.trim() } : {}),
                }),
            )
            setTitle('')
            setQuestId('')
            setCampaignId('')
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
            showToast({
                message: 'Trình duyệt chặn cửa sổ in. Cho phép popup.',
                type: 'error',
            })
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
        const csv = rows
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'histar-lms-report.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <main>
            {/* HEADER BÀI TẬP CỦA LỚP */}
            <div className="tw-page-head">
                <div>
                    <span className="tw-eyebrow">NHIỆM VỤ &amp; ĐÁNH GIÁ TỰ ĐỘNG</span>
                    <h1>Bài tập của lớp</h1>
                    <p>
                        Giao bài quest, auto-chấm khi học sinh hoàn thành, xuất báo cáo
                        CSV/PDF.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        className="tw-button secondary"
                        onClick={exportCsv}
                    >
                        <MaterialIcon name="download" className="text-lg" />
                        Xuất CSV
                    </button>
                    <button
                        type="button"
                        className="tw-button secondary"
                        onClick={exportPdf}
                    >
                        <MaterialIcon name="picture_as_pdf" className="text-lg" />
                        Xuất PDF
                    </button>
                </div>
            </div>

            {/* BỐ CỤC TẠO BÀI TẬP & DRAFT AI */}
            <div className="tw-columns">
                <div className="tw-stack">
                    <form onSubmit={(e) => void onCreate(e)} className="tw-card tw-form">
                        <div>
                            <span className="tw-eyebrow">01 / GIAO NHIỆM VỤ MỚI</span>
                            <h2>Tạo bài tập mới</h2>
                            <p>
                                Chọn nhiệm vụ khám phá và chiến dịch tương ứng để giao cho học
                                sinh trong tổ chức.
                            </p>
                        </div>
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Tiêu đề bài"
                            className="tw-input"
                        />
                        <TeacherQuestFields
                            questId={questId}
                            campaignId={campaignId}
                            onQuestChange={setQuestId}
                            onCampaignChange={setCampaignId}
                        />
                        <button type="submit" className="tw-button" disabled={loading}>
                            <MaterialIcon name="send" className="text-lg" />
                            Giao bài
                        </button>
                    </form>

                    {loadError && (
                        <p className="tw-note error" role="alert">
                            {loadError}{' '}
                            <button
                                type="button"
                                className="tw-button secondary"
                                onClick={reload}
                            >
                                Thử lại
                            </button>
                        </p>
                    )}

                    {/* DANH SÁCH BÀI TẬP ĐÃ GIAO */}
                    <section className="tw-card">
                        <span className="tw-eyebrow">02 / TIẾN ĐỘ NỘP BÀI</span>
                        <h2>
                            Danh sách bài tập đã giao{' '}
                            <span className="tw-plan-badge">{assignments.length}</span>
                        </h2>
                        <p>
                            Điểm số được tự động ghi nhận ngay khi học sinh hoàn thành nhiệm
                            vụ tại di tích hoặc trên web.
                        </p>

                        <div className="tw-stack">
                            {assignments.length === 0 ? (
                                <div className="tw-note">
                                    Chưa có bài tập nào được giao cho lớp.
                                </div>
                            ) : (
                                assignments.map((assignment) => (
                                    <article
                                        key={assignment.id}
                                        className="rounded-2xl border-2 border-[#0275FB]/15 bg-[#F8FBFF] p-5 transition-all hover:border-[#FDC908]"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <h3>{assignment.title}</h3>
                                                <p className="text-xs font-bold text-[#0275FB] mt-1">
                                                    Quest: {assignment.questTitle} · campaign:{' '}
                                                    {assignment.campaignId ?? '—'}
                                                </p>
                                            </div>
                                            <span className="tw-plan-badge">
                        {assignment.submissions.length} bài nộp
                      </span>
                                        </div>

                                        <ul className="tw-invites">
                                            {assignment.submissions.length === 0 ? (
                                                <li className="text-[#475569]">Chưa có bài nộp</li>
                                            ) : (
                                                assignment.submissions.map((s) => (
                                                    <li key={s.id}>
                                                        <strong>{s.studentName}</strong>
                                                        <span>
                              {s.score ?? 0}% {s.autoGraded ? '(auto)' : ''}
                            </span>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    </article>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* CỘT PHẢI: DRAFT AI — REVIEW TRƯỚC PUBLISH */}
                <div className="tw-stack">
                    {capabilities?.contentDrafts && (
                        <section className="tw-card">
                            <span className="tw-eyebrow">TRỢ LÝ BIÊN SOẠN HỌC LIỆU</span>
                            <h2>Draft AI — review trước publish</h2>
                            <p>
                                Citation và đủ bốn bản dịch đã duyệt là điều kiện publish. Draft
                                không tự động thành bài tập.
                            </p>

                            <form
                                onSubmit={(e) => void onCreateDraft(e)}
                                className="tw-form"
                            >
                                <input
                                    value={draftTitle}
                                    onChange={(e) => setDraftTitle(e.target.value)}
                                    placeholder="Tiêu đề draft"
                                    className="tw-input"
                                />
                                <TeacherQuestFields
                                    questId={draftQuestId}
                                    campaignId={draftCampaignId}
                                    onQuestChange={setDraftQuestId}
                                    onCampaignChange={setDraftCampaignId}
                                    campaignRequired
                                />
                                <input
                                    value={sourceVersion}
                                    onChange={(e) => setSourceVersion(e.target.value)}
                                    placeholder="Phiên bản nguồn đã duyệt, ví dụ cu-chi-v1"
                                    className="tw-input"
                                />
                                <textarea
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    placeholder="Câu hỏi, đáp án hoặc nội dung AI draft đã được giáo viên rà soát"
                                    className="tw-input min-h-28"
                                />
                                <input
                                    value={citationTitle}
                                    onChange={(e) => setCitationTitle(e.target.value)}
                                    placeholder="Tên tư liệu/citation đã duyệt"
                                    className="tw-input"
                                />
                                <div className="flex flex-wrap gap-2.5">
                                    <button
                                        type="submit"
                                        className="tw-button"
                                        disabled={loading}
                                    >
                                        {editingDraftId ? 'Lưu thay đổi' : 'Lưu draft'}
                                    </button>
                                    {editingDraftId && (
                                        <button
                                            type="button"
                                            className="tw-button secondary"
                                            onClick={() => setEditingDraftId(null)}
                                        >
                                            Hủy sửa
                                        </button>
                                    )}
                                </div>
                            </form>

                            <div className="tw-stack" style={{ marginTop: 20 }}>
                                {drafts.length === 0 ? (
                                    <p className="tw-note">Chưa có draft AI.</p>
                                ) : (
                                    drafts.map((draft) => (
                                        <article
                                            key={draft.id}
                                            className="rounded-2xl border-2 border-[#0275FB]/15 bg-[#F8FBFF] p-4 space-y-3"
                                        >
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <h3>{draft.title}</h3>
                                                    <p className="text-xs font-bold text-[#475569]">
                                                        {draft.sourceVersion} · campaign {draft.campaignId}{' '}
                                                        · {draft.status}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-black ${
                                                        draft.evaluationPassed
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-rose-100 text-rose-700'
                                                    }`}
                                                >
                          {draft.evaluationPassed
                              ? 'Evaluation đạt'
                              : 'Evaluation bị chặn'}
                        </span>
                                            </div>
                                            <p className="text-sm font-medium text-[#0F1B33]">
                                                {draft.answerBlocks[0]?.content}
                                            </p>
                                            {!draft.evaluationPassed && (
                                                <p className="text-xs font-bold text-rose-600">
                                                    {draft.evaluationReasons.join(' ')}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-2">
                                                {draft.status === 'DRAFT' && (
                                                    <button
                                                        type="button"
                                                        className="tw-button secondary"
                                                        disabled={loading}
                                                        onClick={() => editDraft(draft)}
                                                    >
                                                        Chỉnh sửa
                                                    </button>
                                                )}
                                                {draft.status === 'DRAFT' && (
                                                    <button
                                                        type="button"
                                                        className="tw-button secondary"
                                                        disabled={loading || !draft.evaluationPassed}
                                                        onClick={() => void advanceDraft(draft.id, 'review')}
                                                    >
                                                        Đánh dấu đã review
                                                    </button>
                                                )}
                                                {draft.status === 'REVIEWED' && (
                                                    <button
                                                        type="button"
                                                        className="tw-button gold"
                                                        disabled={loading}
                                                        onClick={() =>
                                                            void advanceDraft(draft.id, 'publish')
                                                        }
                                                    >
                                                        Publish bài tập
                                                    </button>
                                                )}
                                                {draft.status === 'PUBLISHED' && (
                                                    <span className="tw-plan-badge">Đã publish</span>
                                                )}
                                            </div>
                                        </article>
                                    ))
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            <div>
                <Link to="/teacher" className="tw-button secondary">
                    ← Về Teacher Dashboard
                </Link>
            </div>
        </main>
    )
}