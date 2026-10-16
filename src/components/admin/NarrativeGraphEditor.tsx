import { MaterialIcon } from '../ui/MaterialIcon'
import type { NarrativeGraphAdmin, NarrativeNodeAdmin, NarrativeNodeType } from '../../features/admin/api'

const NARRATIVE_NODE_TYPES: NarrativeNodeType[] = [
  'TOUR_360_OBSERVATION',
  'AI_INTERVIEW',
  'SOURCE_COMPARISON',
  'EVIDENCE',
  'OUTCOME',
]

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-500'

function Field({ label, path, errors, children }: { label: string; path: string; errors: Record<string, string>; children: React.ReactNode }) {
  const error = errors[path]
  const errorId = `${path.replaceAll('.', '-')}-error`
  return <label className="block text-sm font-semibold text-slate-700"><span>{label}</span>{children}{error && <span id={errorId} className="mt-1 block text-xs font-semibold text-red-700">{error}</span>}</label>
}

function listValue(value?: string[]) { return value?.join('\n') ?? '' }
function parseList(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean) }

export function NarrativeGraphEditor({ graph, errors, onChange }: { graph: NarrativeGraphAdmin; errors: Record<string, string>; onChange: (graph: NarrativeGraphAdmin) => void }) {
  const patchNode = (index: number, patch: Partial<NarrativeNodeAdmin>) => {
    const nodes = graph.nodes.map((node, nodeIndex) => nodeIndex === index ? { ...node, ...patch } : node)
    onChange({ ...graph, nodes })
  }
  const addNode = () => {
    const code = `node-${graph.nodes.length + 1}`
    onChange({ ...graph, nodes: [...graph.nodes, { code, type: 'EVIDENCE', title: '', prompt: '', choices: [], sourceIds: [], observationChecklist: [] }] })
  }
  const removeNode = (index: number) => {
    const code = graph.nodes[index].code
    onChange({
      ...graph,
      nodes: graph.nodes.filter((_, nodeIndex) => nodeIndex !== index),
      evidenceNodeCodes: graph.evidenceNodeCodes.filter((item) => item !== code),
      outcomeNodeCodes: graph.outcomeNodeCodes.filter((item) => item !== code),
    })
  }

  return <div className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-slate-50 p-4">
      <Field label="Node bắt đầu" path="startNodeCode" errors={errors}>
        <select className={`${inputClass} mt-1 min-w-64`} value={graph.startNodeCode} onChange={(event) => onChange({ ...graph, startNodeCode: event.target.value })} aria-describedby={errors.startNodeCode ? 'startNodeCode-error' : undefined}>
          <option value="">Chọn node bắt đầu</option>{graph.nodes.map((node) => <option key={node.code} value={node.code}>{node.code}</option>)}
        </select>
      </Field>
      <button type="button" onClick={addNode} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100"><MaterialIcon name="add" /> Thêm node</button>
    </div>
    {graph.nodes.map((node, nodeIndex) => {
      const base = `nodes.${nodeIndex}`
      const sourceOptions = graph.sources.map((source) => source.sourceId)
      return <section key={`${node.code}-${nodeIndex}`} id={`node-${node.code}`} className="rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`node-title-${nodeIndex}`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-slate-500">Node {nodeIndex + 1}</p><h4 id={`node-title-${nodeIndex}`} className="font-black text-slate-950">{node.title || node.code || 'Node chưa đặt tên'}</h4></div><button type="button" onClick={() => removeNode(nodeIndex)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-red-700 hover:bg-red-50"><MaterialIcon name="delete" /> Xóa</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Mã node" path={`${base}.code`} errors={errors}><input className={`${inputClass} mt-1`} value={node.code} onChange={(event) => patchNode(nodeIndex, { code: event.target.value })} /></Field>
          <Field label="Loại node" path={`${base}.type`} errors={errors}><select className={`${inputClass} mt-1`} value={node.type} onChange={(event) => patchNode(nodeIndex, { type: event.target.value as NarrativeNodeType })}>{NARRATIVE_NODE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Tiêu đề" path={`${base}.title`} errors={errors}><input className={`${inputClass} mt-1`} value={node.title ?? ''} onChange={(event) => patchNode(nodeIndex, { title: event.target.value })} /></Field>
          <Field label="Nhãn fact" path={`${base}.factLabel`} errors={errors}><input className={`${inputClass} mt-1`} value={node.factLabel ?? ''} onChange={(event) => patchNode(nodeIndex, { factLabel: event.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Prompt hiển thị" path={`${base}.prompt`} errors={errors}><textarea rows={3} className={`${inputClass} mt-1 resize-y`} value={node.prompt ?? ''} onChange={(event) => patchNode(nodeIndex, { prompt: event.target.value })} /></Field></div>
          {node.type === 'TOUR_360_OBSERVATION' && <Field label="Đường dẫn hành động" path={`${base}.actionHref`} errors={errors}><input className={`${inputClass} mt-1`} value={node.actionHref ?? ''} onChange={(event) => patchNode(nodeIndex, { actionHref: event.target.value })} /></Field>}
          {node.type === 'OUTCOME' && <Field label="Số chứng cứ tối thiểu" path={`${base}.minimumEvidence`} errors={errors}><input type="number" min="0" className={`${inputClass} mt-1`} value={node.minimumEvidence ?? 0} onChange={(event) => patchNode(nodeIndex, { minimumEvidence: Number(event.target.value) })} /></Field>}
          {node.type === 'EVIDENCE' && <><Field label="Evidence key" path={`${base}.evidenceKey`} errors={errors}><input className={`${inputClass} mt-1`} value={node.evidenceKey ?? ''} onChange={(event) => patchNode(nodeIndex, { evidenceKey: event.target.value })} /></Field><Field label="Linked minigame ID" path={`${base}.linkedMinigameId`} errors={errors}><input className={`${inputClass} mt-1`} value={node.linkedMinigameId ?? ''} onChange={(event) => patchNode(nodeIndex, { linkedMinigameId: event.target.value || null })} /></Field></>}
          {['TOUR_360_OBSERVATION', 'AI_INTERVIEW', 'SOURCE_COMPARISON', 'EVIDENCE'].includes(node.type) && <div className="md:col-span-2"><Field label="Checklist quan sát (mỗi dòng một mục)" path={`${base}.observationChecklist`} errors={errors}><textarea rows={3} className={`${inputClass} mt-1 resize-y`} value={listValue(node.observationChecklist)} onChange={(event) => patchNode(nodeIndex, { observationChecklist: parseList(event.target.value) })} /></Field></div>}
          {['SOURCE_COMPARISON', 'EVIDENCE'].includes(node.type) && <div className="md:col-span-2"><p className="text-sm font-semibold text-slate-700">Nguồn tham chiếu</p><div className="mt-2 flex flex-wrap gap-2">{sourceOptions.length === 0 ? <span className="text-sm text-slate-500">Thêm source ở tab Nguồn & citation.</span> : sourceOptions.map((sourceId) => <label key={sourceId} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={node.sourceIds?.includes(sourceId) ?? false} onChange={(event) => patchNode(nodeIndex, { sourceIds: event.target.checked ? [...(node.sourceIds ?? []), sourceId] : (node.sourceIds ?? []).filter((item) => item !== sourceId) })} />{sourceId}</label>)}</div>{node.sourceIds?.map((_, sourceIndex) => errors[`${base}.sourceIds.${sourceIndex}`] && <p key={sourceIndex} className="mt-1 text-xs font-semibold text-red-700">{errors[`${base}.sourceIds.${sourceIndex}`]}</p>)}</div>}
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-black text-slate-900">Lựa chọn chuyển node</p><button type="button" onClick={() => patchNode(nodeIndex, { choices: [...node.choices, { code: '', targetNodeCode: '' }] })} className="text-sm font-bold text-blue-700 hover:underline">+ Thêm lựa chọn</button></div><div className="space-y-2">{node.choices.length === 0 ? <p className="text-sm text-slate-500">Node kết thúc, chưa có lựa chọn tiếp theo.</p> : node.choices.map((choice, choiceIndex) => { const choiceBase = `${base}.choices.${choiceIndex}`; return <div key={choiceIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label={`Nhãn lựa chọn ${choiceIndex + 1}`} className={inputClass} value={choice.code} onChange={(event) => patchNode(nodeIndex, { choices: node.choices.map((item, index) => index === choiceIndex ? { ...item, code: event.target.value } : item) })} placeholder="Nhãn lựa chọn" /><div><select aria-label={`Node đích ${choiceIndex + 1}`} className={inputClass} value={choice.targetNodeCode} onChange={(event) => patchNode(nodeIndex, { choices: node.choices.map((item, index) => index === choiceIndex ? { ...item, targetNodeCode: event.target.value } : item) })}><option value="">Chọn node đích</option>{graph.nodes.map((target) => <option key={target.code} value={target.code}>{target.code}</option>)}</select>{errors[`${choiceBase}.targetNodeCode`] && <p className="mt-1 text-xs font-semibold text-red-700">{errors[`${choiceBase}.targetNodeCode`]}</p>}</div><button type="button" aria-label={`Xóa lựa chọn ${choiceIndex + 1}`} onClick={() => patchNode(nodeIndex, { choices: node.choices.filter((_, index) => index !== choiceIndex) })} className="rounded-lg px-2 text-red-700 hover:bg-red-50"><MaterialIcon name="close" /></button></div> })}</div></div>
      </section>
    })}
  </div>
}

export function NarrativeSourcesEditor({ graph, errors, onChange }: { graph: NarrativeGraphAdmin; errors: Record<string, string>; onChange: (graph: NarrativeGraphAdmin) => void }) {
  const patchSource = (index: number, patch: Partial<NarrativeGraphAdmin['sources'][number]>) => onChange({ ...graph, sources: graph.sources.map((source, sourceIndex) => sourceIndex === index ? { ...source, ...patch } : source) })
  return <div className="space-y-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">Nguồn & citation</h3><p className="mt-1 text-sm text-slate-600">Locale <strong>vi</strong> bắt buộc source ID, version và citation. Locale khác là tùy chọn trong pilot này.</p></div><button type="button" onClick={() => onChange({ ...graph, sources: [...graph.sources, { sourceId: '', version: '', locale: 'vi', citation: '', url: '' }] })} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"><MaterialIcon name="add" /> Thêm nguồn</button></div>
    {graph.sources.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">Chưa có nguồn. Thêm ít nhất một nguồn tiếng Việt trước khi review.</p> : <div className="overflow-x-auto"><table className="min-w-[900px] w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-slate-600">{['Source ID', 'Version', 'Locale', 'Citation', 'URL', ''].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{graph.sources.map((source, index) => <tr key={`${source.sourceId}-${index}`} className="border-b border-slate-100 align-top"><td className="p-2"><input className={inputClass} value={source.sourceId} onChange={(event) => patchSource(index, { sourceId: event.target.value })} />{errors[`sources.${index}.sourceId`] && <p className="mt-1 text-xs text-red-700">{errors[`sources.${index}.sourceId`]}</p>}</td><td className="p-2"><input className={inputClass} value={source.version} onChange={(event) => patchSource(index, { version: event.target.value })} />{errors[`sources.${index}.version`] && <p className="mt-1 text-xs text-red-700">{errors[`sources.${index}.version`]}</p>}</td><td className="p-2"><input className={`${inputClass} w-24`} value={source.locale} onChange={(event) => patchSource(index, { locale: event.target.value })} /></td><td className="p-2"><textarea rows={3} className={`${inputClass} min-w-64 resize-y`} value={source.citation} onChange={(event) => patchSource(index, { citation: event.target.value })} />{errors[`sources.${index}.citation`] && <p className="mt-1 text-xs text-red-700">{errors[`sources.${index}.citation`]}</p>}</td><td className="p-2"><input type="url" className={`${inputClass} min-w-56`} value={source.url ?? ''} onChange={(event) => patchSource(index, { url: event.target.value || null })} /></td><td className="p-2"><button type="button" aria-label={`Xóa nguồn ${source.sourceId || index + 1}`} onClick={() => onChange({ ...graph, sources: graph.sources.filter((_, sourceIndex) => sourceIndex !== index) })} className="rounded-lg p-2 text-red-700 hover:bg-red-50"><MaterialIcon name="delete" /></button></td></tr>)}</tbody></table></div>}
  </div>
}

export function NarrativeRewardsEditor({ graph, fixed, fixedXp, onChange }: { graph: NarrativeGraphAdmin; fixed: boolean; fixedXp?: number | null; onChange: (graph: NarrativeGraphAdmin) => void }) {
  const rewardNodes = graph.nodes.map((node, index) => ({ node, index })).filter(({ node }) => node.type === 'EVIDENCE' || node.type === 'OUTCOME')
  const patchReward = (index: number, rewardXp: number | null) => onChange({ ...graph, nodes: graph.nodes.map((node, nodeIndex) => nodeIndex === index ? { ...node, rewardXp } : node) })
  return <div className="space-y-4"><div><h3 className="font-black text-slate-950">Reward & ending</h3><p className="mt-1 text-sm text-slate-600">Kết quả phản ánh đúng các node runtime. Chỉ trường <code>rewardXp</code> trong graph có thể chỉnh sửa.</p></div>{fixed && <div role="note" className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900"><MaterialIcon name="lock" /><div><p className="font-bold">Reward do backend cố định</p><p className="text-sm">Giá trị runtime{typeof fixedXp === 'number' ? `: ${fixedXp} XP` : ''}; frontend chỉ hiển thị, không gửi thay đổi.</p></div></div>}
    <div className="space-y-3">{rewardNodes.map(({ node, index }) => <div key={node.code} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"><div><p className="font-black text-slate-950">{node.title || node.code}</p><p className="mt-1 text-xs font-bold text-slate-500">{node.type} · {graph.outcomeNodeCodes.includes(node.code) ? 'Ending' : 'Reward checkpoint'}</p>{node.type === 'OUTCOME' && <p className="mt-2 max-w-2xl text-sm text-slate-600">{node.prompt || 'Chưa có nội dung kết thúc.'}</p>}</div><label className="text-sm font-semibold text-slate-700">Reward XP<input type="number" min="0" disabled={fixed} className={`${inputClass} mt-1 w-32`} value={node.rewardXp ?? ''} onChange={(event) => patchReward(index, event.target.value === '' ? null : Number(event.target.value))} /></label></div>)}</div>
    <div><h4 className="font-bold text-slate-900">Danh sách ending</h4><ul className="mt-2 space-y-2">{graph.outcomeNodeCodes.map((code) => { const node = graph.nodes.find((item) => item.code === code); return <li key={code} className="rounded-lg bg-slate-50 px-3 py-2"><span className="font-semibold text-slate-900">{node?.title || code}</span><span className="ml-2 text-sm text-slate-600">{node?.minimumEvidence ?? 0} chứng cứ tối thiểu</span></li> })}</ul></div>
  </div>
}
