import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { NarrativeInvestigation, NarrativeNode } from './api'

type Props = { investigation: NarrativeInvestigation }
type TaskPresentation = { icon: string; label: string; guidance: string }

const taskPresentation: Record<string, TaskPresentation> = {
  OBSERVATION: { icon: 'visibility', label: 'Quan sát hiện trường', guidance: 'Đọc chi tiết, đối chiếu manh mối và chọn hướng điều tra tiếp theo.' },
  MAP_TIMELINE: { icon: 'timeline', label: 'Ghép bản đồ · timeline', guidance: 'Đặt sự kiện đúng vị trí và trình tự trước khi rút ra kết luận.' },
  SOURCE_COMPARISON: { icon: 'compare', label: 'Đối chiếu nguồn', guidance: 'So sánh chi tiết trùng khớp và điểm còn chưa thống nhất giữa các tư liệu.' },
  AI_INTERVIEW: { icon: 'record_voice_over', label: 'Phỏng vấn nhân vật AI', guidance: 'Đặt câu hỏi kiểm chứng; mọi câu trả lời cần được so với tư liệu trong hồ sơ.' },
  TOUR_360_OBSERVATION: { icon: '360', label: 'Quan sát Tour 360°', guidance: 'Vào không gian 360°, tìm đúng dấu hiệu thị giác rồi quay lại bảng chứng cứ.' },
  EVIDENCE: { icon: 'fact_check', label: 'Mảnh tư liệu', guidance: 'Manh mối đã được ghi vào hồ sơ. Hãy tìm thêm nguồn độc lập trước khi kết luận.' },
  OUTCOME: { icon: 'emoji_events', label: 'Kết luận điều tra', guidance: 'Chỉ chọn kết luận khi số chứng cứ đạt ngưỡng yêu cầu.' },
}

const presentationFor = (type: string): TaskPresentation => taskPresentation[type] ?? taskPresentation.OBSERVATION
const outcomeLabel = (node: NarrativeNode) => node.title || node.code.replaceAll('-', ' ')

export function NarrativeInvestigationBoard({ investigation }: Props) {
  const graph = investigation.graph
  const [currentCode, setCurrentCode] = useState(graph.startNodeCode)
  const [evidence, setEvidence] = useState<Set<string>>(new Set())
  const current = graph.nodes.find((node) => node.code === currentCode) ?? graph.nodes[0]
  const evidenceTotal = graph.evidenceNodeCodes.length
  const progress = evidenceTotal ? Math.round((evidence.size / evidenceTotal) * 100) : 0
  const currentTask = presentationFor(current?.type ?? 'OBSERVATION')
  const outcomes = graph.outcomeNodeCodes
    .map((code) => graph.nodes.find((node) => node.code === code))
    .filter((node): node is NarrativeNode => Boolean(node))

  const collectAndMove = (code: string) => {
    if (graph.evidenceNodeCodes.includes(code)) setEvidence((collected) => new Set(collected).add(code))
    setCurrentCode(code)
  }

  const quality = useMemo(() => {
    if (!evidenceTotal || evidence.size === 0) return { label: 'Cần thêm chứng cứ', className: 'text-gray-400' }
    if (evidence.size < evidenceTotal) return { label: 'Hồ sơ đang được củng cố', className: 'text-[#fdb438]' }
    return { label: 'Hồ sơ đủ mạnh để kết luận', className: 'text-emerald-300' }
  }, [evidence.size, evidenceTotal])

  if (!current) return null

  return (
    <section className="relative my-10 overflow-hidden rounded-[2rem] border border-[#388cf1]/25 bg-[#10131f] p-5 shadow-[0_24px_70px_rgba(0,0,0,.42)] md:p-8">
      <div className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-[#388cf1]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[#fe951c]/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-[#fdb438]">Hồ sơ điều tra · v{investigation.version}</p><h2 className="mt-1 text-2xl font-black text-white md:text-3xl">BẢNG CHỨNG CỨ</h2><p className="mt-1 text-sm text-gray-400">Quan sát, đối chiếu, rồi mới kết luận.</p></div>
        <div className="min-w-40 rounded-2xl border border-[#fdb438]/20 bg-black/30 p-3"><div className="flex justify-between text-xs font-bold text-[#fdb438]"><span>CHỨNG CỨ</span><span>{evidence.size}/{evidenceTotal}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#fe951c] to-[#fdb438] transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className={`mt-2 text-[11px] font-bold ${quality.className}`}>{quality.label}</p></div>
      </div>
      <div className="relative mt-6 grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
        <div className="rounded-2xl border border-white/10 bg-[#161824]/95 p-5">
          <div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#388cf1]/15 text-[#79b7ff]"><MaterialIcon name={currentTask.icon} className="text-2xl" /></div><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#388cf1]">{currentTask.label}</p><h3 className="font-black text-white">{current.title || current.code.replaceAll('-', ' ')}</h3></div></div>
          <p className="mt-5 text-sm font-medium leading-relaxed text-gray-300">{current.prompt || currentTask.guidance}</p>
          {current.actionHref && <Link to={current.actionHref} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[#388cf1]/40 bg-[#388cf1]/10 px-4 py-3 text-sm font-black text-[#b9d8ff] transition hover:border-[#388cf1] hover:bg-[#388cf1]/20"><MaterialIcon name={currentTask.icon} className="text-lg" /> Mở không gian nhiệm vụ</Link>}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{current.choices.map((choice) => <button key={choice.code} type="button" onClick={() => collectAndMove(choice.targetNodeCode)} className="group rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:-translate-y-1 hover:border-[#fe951c]/70 hover:bg-[#fe951c]/10"><div className="flex items-center justify-between gap-3"><span className="font-black text-white">{choice.code.replaceAll('-', ' ')}</span><MaterialIcon name="arrow_forward" className="text-[#fdb438] transition group-hover:translate-x-1" /></div><span className="mt-2 block text-xs text-gray-500">Mở nhánh điều tra</span></button>)}</div>
          {current.choices.length === 0 && current.type !== 'OUTCOME' && <button type="button" onClick={() => collectAndMove(current.code)} className="mt-5 rounded-xl bg-gradient-to-r from-[#fe951c] to-[#fdb438] px-5 py-3 text-sm font-black text-black">Ghi nhận vào hồ sơ</button>}
        </div>
        <aside className="space-y-3"><div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-gray-500">Mảnh tư liệu</p><div className="mt-3 space-y-2">{graph.evidenceNodeCodes.map((code) => <div key={code} className={`flex items-center gap-3 rounded-xl p-3 ${evidence.has(code) ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-gray-400'}`}><MaterialIcon name={evidence.has(code) ? 'check_circle' : 'lock'} className="text-lg" /><span className="text-sm font-bold">{code.replaceAll('-', ' ')}</span></div>)}</div></div>
          <div className="rounded-2xl border border-[#fdb438]/20 bg-[#fdb438]/5 p-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#fdb438]">Các kết thúc</p><div className="mt-3 space-y-2">{outcomes.map((outcome) => { const minimum = outcome.minimumEvidence ?? 0; const unlocked = evidence.size >= minimum; return <button key={outcome.code} type="button" disabled={!unlocked} onClick={() => collectAndMove(outcome.code)} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${unlocked ? 'bg-[#fe951c]/10 text-white hover:bg-[#fe951c]/20' : 'bg-black/20 text-gray-500'}`}><MaterialIcon name={unlocked ? 'emoji_events' : 'lock'} className={unlocked ? 'text-[#fdb438]' : ''} /><span><span className="block text-sm font-black">{outcomeLabel(outcome)}</span><span className="text-xs">Cần {minimum} chứng cứ</span></span></button> })}</div><p className="mt-3 text-xs text-gray-400">Khám phá nhận XP ngay; kết thúc chỉ mở khi hồ sơ đủ chứng cứ.</p></div></aside>
      </div>
    </section>
  )
}
