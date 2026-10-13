import { useCallback, useEffect, useMemo, useState } from 'react'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { adminApi, type NarrativeDraft, type NarrativePilotAdmin, type NarrativeReview } from '../features/admin/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

const reviewLabels: Record<string, string> = { DRAFT: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' }

function StatusBadge({ label, tone }: { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const classes = { neutral: 'border-slate-300 bg-slate-100 text-slate-700', success: 'border-emerald-300 bg-emerald-50 text-emerald-800', warning: 'border-amber-300 bg-amber-50 text-amber-900', danger: 'border-red-300 bg-red-50 text-red-800' }[tone]
  return <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${classes}`}><span aria-hidden="true">●</span>{label}</span>
}

function readinessRows(pilot: NarrativePilotAdmin) {
  const has = (fragment: string) => !pilot.readinessErrors.some((error) => error.includes(fragment))
  return [
    { label: 'Feature flag pilot đang bật', pass: pilot.globalFlagEnabled, detail: pilot.globalFlagEnabled ? 'PILOT_NARRATIVE_INVESTIGATION=true' : 'Bật biến môi trường rồi khởi động lại backend' },
    { label: 'Nội dung đã được duyệt', pass: pilot.reviewStatus === 'APPROVED', detail: pilot.reviewStatus === 'APPROVED' ? 'Review APPROVED' : 'Cần review graph trước khi enable' },
    { label: 'Locale tiếng Việt', pass: pilot.approvedLocales.includes('vi') && has('locale vi'), detail: pilot.approvedLocales.includes('vi') ? 'vi' : 'Chưa có locale vi được duyệt' },
    { label: 'Graph hợp lệ', pass: pilot.graphValid, detail: pilot.graphValid ? 'Flow và node reference hợp lệ' : 'Graph còn lỗi cấu trúc' },
    { label: 'Nguồn và citation đầy đủ', pass: pilot.sourceCount > 0 && has('source'), detail: pilot.sourceCount > 0 ? `${pilot.sourceCount} source` : 'Chưa có source' },
  ]
}

export function AdminNarrativePilotsPage() {
  const { showToast } = useToast()
  const [pilots, setPilots] = useState<NarrativePilotAdmin[]>([])
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null)
  const [reviews, setReviews] = useState<NarrativeReview[]>([])
  const [note, setNote] = useState('')
  const [rolloutReason, setRolloutReason] = useState('')
  const [draft, setDraft] = useState<NarrativeDraft | null>(null)
  const [draftJson, setDraftJson] = useState('')
  const [draftReason, setDraftReason] = useState('')
  const [draftLoading, setDraftLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const selected = useMemo(() => pilots.find((pilot) => pilot.questId === selectedQuestId) ?? pilots[0], [pilots, selectedQuestId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const next = await adminApi.listNarrativePilots()
      setPilots(next)
      setSelectedQuestId((current) => current && next.some((pilot) => pilot.questId === current) ? current : next[0]?.questId ?? null)
    } catch (error) {
      showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
    } finally { setLoading(false) }
  }, [showToast])

  const loadReviews = useCallback(async (questId: string) => {
    try { setReviews(await adminApi.narrativeReviews(questId)) }
    catch (error) { showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' }) }
  }, [showToast])

  useEffect(() => { void load() }, [load])
  useEffect(() => { if (selected?.questId) void loadReviews(selected.questId) }, [loadReviews, selected?.questId])
  useEffect(() => {
    if (!selected?.questId) return
    setDraftLoading(true)
    adminApi.draftNarrative(selected.questId).then((next) => { setDraft(next); setDraftJson(next.graphJson) }).catch((error) => showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })).finally(() => setDraftLoading(false))
  }, [selected?.questId, showToast])

  const refreshSelected = async () => {
    if (!selected) return
    const next = await adminApi.narrativeReadiness(selected.questId)
    setPilots((current) => current.map((pilot) => pilot.questId === next.questId ? next : pilot))
    await loadReviews(next.questId)
  }

  const submitReview = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selected) return
    const trimmed = note.trim()
    if (trimmed.length < 10) { showToast({ message: 'Ghi chú review cần ít nhất 10 ký tự.', type: 'error' }); return }
    setWorking(true)
    try {
      await adminApi.reviewNarrative(selected.questId, { decision, approvedLocales: decision === 'APPROVED' ? ['vi'] : [], note: trimmed })
      setNote('')
      showToast({ message: decision === 'APPROVED' ? 'Đã duyệt narrative tiếng Việt.' : 'Đã từ chối narrative.', type: 'success' })
      await refreshSelected()
    } catch (error) { showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' }) }
    finally { setWorking(false) }
  }

  const togglePilot = async () => {
    if (!selected) return
    const reason = rolloutReason.trim()
    if (reason.length < 10) { showToast({ message: 'Lý do bật/tắt pilot cần ít nhất 10 ký tự.', type: 'error' }); return }
    setWorking(true)
    try {
      if (selected.enabled) { await adminApi.disableNarrative(selected.questId, reason); showToast({ message: 'Đã tắt pilot Củ Chi.', type: 'success' }) }
      else { await adminApi.enableNarrative(selected.questId, reason); showToast({ message: 'Đã bật pilot Củ Chi.', type: 'success' }) }
      setRolloutReason('')
      await refreshSelected()
    } catch (error) { showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' }) }
    finally { setWorking(false) }
  }

  const draftStats = useMemo(() => {
    try {
      const graph = JSON.parse(draftJson) as { nodes?: Array<{ type?: string }>; sources?: unknown[]; evidenceNodeCodes?: unknown[]; outcomeNodeCodes?: unknown[] }
      return `Nodes ${graph.nodes?.length ?? 0} · Sources ${graph.sources?.length ?? 0} · Evidence ${graph.evidenceNodeCodes?.length ?? 0} · Outcomes ${graph.outcomeNodeCodes?.length ?? 0}`
    } catch { return 'JSON chưa hợp lệ — backend sẽ từ chối khi lưu' }
  }, [draftJson])

  const saveDraft = async () => {
    if (!selected || !draft) return
    const reason = draftReason.trim()
    if (reason.length < 10) { showToast({ message: 'Lý do cập nhật cần ít nhất 10 ký tự.', type: 'error' }); return }
    setWorking(true)
    try {
      const next = await adminApi.updateNarrativeDraft(selected.questId, { expectedVersion: draft.version, graphJson: draftJson, reason })
      setDraft(next); setDraftJson(next.graphJson); setDraftReason('')
      showToast({ message: 'Đã lưu draft mới. Pilot vẫn tắt và cần review lại.', type: 'success' })
      await refreshSelected()
    } catch (error) { showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' }) }
    finally { setWorking(false) }
  }

  if (loading) return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-700">Đang tải narrative pilots...</div>

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Vận hành / Narrative pilots</p><h2 className="mt-2 text-3xl font-black text-slate-950">Duyệt và bật pilot</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">Review nội dung, kiểm tra readiness và rollout có kiểm soát. Củ Chi hiện chỉ bật locale tiếng Việt.</p></div>
      <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50" aria-label="Tải lại danh sách pilot"><MaterialIcon name="refresh" /> Tải lại</button>
    </div>
    {pilots.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">Chưa có narrative pilot nào trong cơ sở dữ liệu.</div> : <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Danh sách narrative pilots"><div className="mb-3 flex items-center justify-between"><h3 className="font-black text-slate-950">Danh sách pilot</h3><span className="text-xs font-bold text-slate-500">{pilots.length} mục</span></div><div className="space-y-2">{pilots.map((pilot) => <button key={pilot.questId} type="button" onClick={() => setSelectedQuestId(pilot.questId)} className={`w-full rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-600 ${selected?.questId === pilot.questId ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-400'}`}><div className="flex items-start justify-between gap-3"><span className="font-black text-slate-900">{pilot.questTitle}</span><span className="text-xs font-bold text-slate-500">v{pilot.version}</span></div><div className="mt-3 flex flex-wrap gap-2"><StatusBadge label={reviewLabels[pilot.reviewStatus] ?? pilot.reviewStatus} tone={pilot.reviewStatus === 'APPROVED' ? 'success' : pilot.reviewStatus === 'REJECTED' ? 'danger' : 'warning'} /><StatusBadge label={pilot.enabled ? 'Đang bật' : 'Đang tắt'} tone={pilot.enabled ? 'success' : 'neutral'} /></div></button>)}</div></section>
      {selected && <section className="space-y-6"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Quest</p><h3 className="mt-1 text-2xl font-black text-slate-950">{selected.questTitle}</h3><p className="mt-1 text-sm text-slate-500">Version {selected.version} · Locale được duyệt: {selected.approvedLocales.join(', ') || 'chưa có'}</p></div><button type="button" onClick={() => void togglePilot()} disabled={working || (!selected.enabled && selected.readinessErrors.length > 0)} className={`rounded-xl px-4 py-2 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${selected.enabled ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{selected.enabled ? 'Tắt pilot' : 'Bật pilot'}</button></div><label className="mt-4 block text-sm font-bold text-slate-700">Lý do rollout <span className="font-normal text-slate-500">(tối thiểu 10 ký tự, lưu vào audit)</span><input value={rolloutReason} onChange={(event) => setRolloutReason(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" placeholder="Ví dụ: Đã kiểm tra graph và citation Củ Chi" /></label>{!selected.enabled && selected.readinessErrors.length > 0 && <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">Nút bật đang khóa vì còn điều kiện chưa đạt. Xem checklist bên dưới.</p>}</div>
        <div className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-black text-slate-950">Readiness checklist</h3><div className="mt-4 space-y-3">{readinessRows(selected).map((row) => <div key={row.label} className="flex gap-3 rounded-xl border border-slate-200 p-3"><MaterialIcon name={row.pass ? 'check_circle' : 'error'} className={row.pass ? 'text-emerald-700' : 'text-red-700'} /><div><p className="font-bold text-slate-900">{row.label}</p><p className="text-xs text-slate-600">{row.detail}</p></div></div>)}</div>{selected.readinessErrors.length > 0 && <details className="mt-4 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-black text-slate-800">Chi tiết lỗi từ API ({selected.readinessErrors.length})</summary><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">{selected.readinessErrors.map((error) => <li key={error}>{error}</li>)}</ul></details>}</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-black text-slate-950">Review nội dung</h3><p className="mt-1 text-sm text-slate-600">Duyệt tiếng Việt sau khi đã kiểm tra fact, wording, reward và citation.</p><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} minLength={10} className="mt-4 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" placeholder="Ghi chú review, tối thiểu 10 ký tự..." aria-label="Ghi chú review" /><div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => void submitReview('APPROVED')} disabled={working || selected.reviewStatus === 'APPROVED'} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">Duyệt tiếng Việt</button><button type="button" onClick={() => void submitReview('REJECTED')} disabled={working} className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-black text-red-800 hover:bg-red-100 disabled:opacity-50">Từ chối</button></div></div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-black text-slate-950">Chỉnh sửa graph draft</h3><p className="mt-1 text-sm text-slate-600">Chỉ sửa bản draft. Lưu sẽ tăng version, tắt pilot và bắt buộc review lại; bản đang chạy không bị ghi đè.</p>{draftLoading ? <p className="mt-4 text-sm text-slate-600">Đang tải graph...</p> : <><p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">v{draft?.version ?? selected.version} · {draftStats}</p><textarea value={draftJson} onChange={(event) => setDraftJson(event.target.value)} rows={16} className="mt-3 w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" aria-label="Graph JSON draft" /><input value={draftReason} onChange={(event) => setDraftReason(event.target.value)} className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-200" placeholder="Lý do chỉnh graph, tối thiểu 10 ký tự" /><button type="button" onClick={() => void saveDraft()} disabled={working || !draft} className="mt-3 rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white hover:bg-blue-800 disabled:opacity-50">Lưu draft mới</button></>}</div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="font-black text-slate-950">Lịch sử review</h3>{reviews.length === 0 ? <p className="mt-3 text-sm text-slate-600">Chưa có lượt review.</p> : <div className="mt-4 space-y-3">{reviews.map((review) => <div key={`${review.investigationId}-${review.reviewedAt}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0"><div><p className="font-bold text-slate-900">{reviewLabels[review.decision] ?? review.decision} · {review.approvedLocales.join(', ') || 'không locale'}</p><p className="text-xs text-slate-600">{review.reviewedBy} · {new Date(review.reviewedAt).toLocaleString('vi-VN')}</p></div><p className="max-w-md text-sm text-slate-700">{review.note || 'Không có ghi chú'}</p></div>)}</div>}</div>
      </section>}
    </div>}
  </div>
}
