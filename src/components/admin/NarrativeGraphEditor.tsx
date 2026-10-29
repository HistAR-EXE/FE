import { useEffect, useState } from 'react'
import { MaterialIcon } from '../ui/MaterialIcon'
import type { NarrativeGraphAdmin, NarrativeNodeAdmin, NarrativeNodeType, NarrativeSourceAdmin } from '../../features/admin/api'
import { AdminModal } from './AdminModal'

const NARRATIVE_NODE_TYPES: NarrativeNodeType[] = [
  'TOUR_360_OBSERVATION',
  'AI_INTERVIEW',
  'SOURCE_COMPARISON',
  'EVIDENCE',
  'OUTCOME',
]

const NODE_TYPE_LABELS: Record<NarrativeNodeType, string> = {
  TOUR_360_OBSERVATION: 'Quan sát 360°',
  AI_INTERVIEW: 'Phỏng vấn AI',
  SOURCE_COMPARISON: 'Đối chiếu nguồn',
  EVIDENCE: 'Thu thập chứng cứ',
  OUTCOME: 'Kết thúc',
}

const inputClass = 'w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:outline-none disabled:opacity-50'

function Field({ label, path, errors, children }: { label: string; path: string; errors: Record<string, string>; children: React.ReactNode }) {
  const error = errors[path]
  const errorId = `${path.replaceAll('.', '-')}-error`
  return <label className="block font-label-sm text-label-sm text-outline"><span>{label}</span>{children}{error && <span id={errorId} className="mt-1 block font-body-sm text-body-sm font-semibold text-error">{error}</span>}</label>
}

function listValue(value?: string[]) { return value?.join('\n') ?? '' }
function parseList(value: string) { return value.split('\n').map((item) => item.trim()).filter(Boolean) }

export function NarrativeGraphEditor({ graph, errors, onChange }: { graph: NarrativeGraphAdmin; errors: Record<string, string>; onChange: (graph: NarrativeGraphAdmin) => void }) {
  const [openNodeIndex, setOpenNodeIndex] = useState<number | null>(null)
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
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl bg-surface-container p-4">
      <Field label="Bước bắt đầu" path="startNodeCode" errors={errors}>
        <select className={`${inputClass} mt-1 min-w-64`} value={graph.startNodeCode} onChange={(event) => onChange({ ...graph, startNodeCode: event.target.value })} aria-describedby={errors.startNodeCode ? 'startNodeCode-error' : undefined}>
          <option value="">Chọn bước bắt đầu</option>{graph.nodes.map((node) => <option key={node.code} value={node.code}>{node.title || node.code}</option>)}
        </select>
      </Field>
      <button type="button" onClick={() => { addNode(); setOpenNodeIndex(graph.nodes.length) }} className="ops-btn-primary"><MaterialIcon name="add" className="text-[16px]" /> Thêm bước</button>
    </div>
    {graph.nodes.map((node, nodeIndex) => {
      const base = `nodes.${nodeIndex}`
      const sourceOptions = graph.sources.map((source) => source.sourceId)
      const expanded = openNodeIndex === nodeIndex
      const hasError = Object.keys(errors).some((path) => path.startsWith(`${base}.`))
      return <section key={`${node.code}-${nodeIndex}`} id={`node-${node.code}`} className={`narrative-node-card ${expanded ? 'is-open' : ''} ${hasError ? 'has-error' : ''}`} aria-labelledby={`node-title-${nodeIndex}`}>
        <button type="button" className="narrative-node-toggle" aria-expanded={expanded} aria-controls={`node-fields-${nodeIndex}`} onClick={() => setOpenNodeIndex(expanded ? null : nodeIndex)}>
          <span className="narrative-node-number">{nodeIndex + 1}</span>
          <span className="min-w-0 flex-1 text-left"><span id={`node-title-${nodeIndex}`} className="block truncate font-semibold text-on-surface">{node.title || node.code || 'Bước chưa đặt tên'}</span><span className="mt-0.5 block text-sm text-on-surface-variant">{node.type === 'EVIDENCE' ? 'Thu thập chứng cứ' : node.type === 'OUTCOME' ? 'Kết thúc' : node.type === 'AI_INTERVIEW' ? 'Phỏng vấn AI' : node.type === 'TOUR_360_OBSERVATION' ? 'Quan sát 360°' : 'Đối chiếu nguồn'} · {node.choices.length} lựa chọn{hasError ? ' · Cần kiểm tra' : ''}</span></span>
          <span className="narrative-node-action">{expanded ? 'Thu gọn' : 'Xem thêm'}</span><MaterialIcon name={expanded ? 'expand_less' : 'expand_more'} className="text-[20px]" />
        </button>
        {expanded && <div id={`node-fields-${nodeIndex}`} className="narrative-node-fields">
        <div className="mb-4 flex justify-end"><button type="button" onClick={() => { removeNode(nodeIndex); setOpenNodeIndex(null) }} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-label-sm text-label-sm font-bold text-error hover:bg-error-container/30"><MaterialIcon name="delete" className="text-[16px]" /> Xóa bước</button></div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Mã bước" path={`${base}.code`} errors={errors}><input className={`${inputClass} mt-1`} value={node.code} onChange={(event) => patchNode(nodeIndex, { code: event.target.value })} /></Field>
          <Field label="Loại bước" path={`${base}.type`} errors={errors}><select className={`${inputClass} mt-1`} value={node.type} onChange={(event) => patchNode(nodeIndex, { type: event.target.value as NarrativeNodeType })}>{NARRATIVE_NODE_TYPES.map((type) => <option key={type} value={type}>{NODE_TYPE_LABELS[type]}</option>)}</select></Field>
          <Field label="Tiêu đề" path={`${base}.title`} errors={errors}><input className={`${inputClass} mt-1`} value={node.title ?? ''} onChange={(event) => patchNode(nodeIndex, { title: event.target.value })} /></Field>
          <Field label="Nhãn thông tin" path={`${base}.factLabel`} errors={errors}><input className={`${inputClass} mt-1`} value={node.factLabel ?? ''} onChange={(event) => patchNode(nodeIndex, { factLabel: event.target.value })} /></Field>
          <div className="md:col-span-2"><Field label="Nội dung hiển thị" path={`${base}.prompt`} errors={errors}><textarea rows={3} className={`${inputClass} mt-1 resize-y`} value={node.prompt ?? ''} onChange={(event) => patchNode(nodeIndex, { prompt: event.target.value })} /></Field></div>
          {node.type === 'TOUR_360_OBSERVATION' && <Field label="Đường dẫn hành động" path={`${base}.actionHref`} errors={errors}><input className={`${inputClass} mt-1`} value={node.actionHref ?? ''} onChange={(event) => patchNode(nodeIndex, { actionHref: event.target.value })} /></Field>}
          {node.type === 'OUTCOME' && <Field label="Số chứng cứ tối thiểu" path={`${base}.minimumEvidence`} errors={errors}><input type="number" min="0" className={`${inputClass} mt-1`} value={node.minimumEvidence ?? 0} onChange={(event) => patchNode(nodeIndex, { minimumEvidence: Number(event.target.value) })} /></Field>}
          {node.type === 'EVIDENCE' && <><Field label="Mã chứng cứ" path={`${base}.evidenceKey`} errors={errors}><input className={`${inputClass} mt-1`} value={node.evidenceKey ?? ''} onChange={(event) => patchNode(nodeIndex, { evidenceKey: event.target.value })} /></Field><Field label="Mã trò chơi liên kết" path={`${base}.linkedMinigameId`} errors={errors}><input className={`${inputClass} mt-1`} value={node.linkedMinigameId ?? ''} onChange={(event) => patchNode(nodeIndex, { linkedMinigameId: event.target.value || null })} /></Field></>}
          {['TOUR_360_OBSERVATION', 'AI_INTERVIEW', 'SOURCE_COMPARISON', 'EVIDENCE'].includes(node.type) && <div className="md:col-span-2"><Field label="Checklist quan sát (mỗi dòng một mục)" path={`${base}.observationChecklist`} errors={errors}><textarea rows={3} className={`${inputClass} mt-1 resize-y`} value={listValue(node.observationChecklist)} onChange={(event) => patchNode(nodeIndex, { observationChecklist: parseList(event.target.value) })} /></Field></div>}
          {['SOURCE_COMPARISON', 'EVIDENCE'].includes(node.type) && <div className="md:col-span-2"><p className="text-sm font-semibold text-slate-700">Nguồn tham chiếu</p><div className="mt-2 flex flex-wrap gap-2">{sourceOptions.length === 0 ? <span className="text-sm text-slate-500">Thêm nguồn ở tab Nguồn & trích dẫn.</span> : sourceOptions.map((sourceId) => <label key={sourceId} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"><input type="checkbox" checked={node.sourceIds?.includes(sourceId) ?? false} onChange={(event) => patchNode(nodeIndex, { sourceIds: event.target.checked ? [...(node.sourceIds ?? []), sourceId] : (node.sourceIds ?? []).filter((item) => item !== sourceId) })} />{sourceId}</label>)}</div>{node.sourceIds?.map((_, sourceIndex) => errors[`${base}.sourceIds.${sourceIndex}`] && <p key={sourceIndex} className="mt-1 text-xs font-semibold text-red-700">{errors[`${base}.sourceIds.${sourceIndex}`]}</p>)}</div>}
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4"><div className="mb-2 flex items-center justify-between"><p className="text-sm font-black text-slate-900">Lựa chọn tiếp theo</p><button type="button" onClick={() => patchNode(nodeIndex, { choices: [...node.choices, { code: '', targetNodeCode: '' }] })} className="text-sm font-bold text-blue-700 hover:underline">+ Thêm lựa chọn</button></div><div className="space-y-2">{node.choices.length === 0 ? <p className="text-sm text-slate-500">Chưa có lựa chọn tiếp theo.</p> : node.choices.map((choice, choiceIndex) => { const choiceBase = `${base}.choices.${choiceIndex}`; return <div key={choiceIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input aria-label={`Nhãn lựa chọn ${choiceIndex + 1}`} className={inputClass} value={choice.code} onChange={(event) => patchNode(nodeIndex, { choices: node.choices.map((item, index) => index === choiceIndex ? { ...item, code: event.target.value } : item) })} placeholder="Nhãn lựa chọn" /><div><select aria-label={`Bước tiếp theo ${choiceIndex + 1}`} className={inputClass} value={choice.targetNodeCode} onChange={(event) => patchNode(nodeIndex, { choices: node.choices.map((item, index) => index === choiceIndex ? { ...item, targetNodeCode: event.target.value } : item) })}><option value="">Chọn bước tiếp theo</option>{graph.nodes.map((target) => <option key={target.code} value={target.code}>{target.title || target.code}</option>)}</select>{errors[`${choiceBase}.targetNodeCode`] && <p className="mt-1 text-xs font-semibold text-red-700">{errors[`${choiceBase}.targetNodeCode`]}</p>}</div><button type="button" aria-label={`Xóa lựa chọn ${choiceIndex + 1}`} onClick={() => patchNode(nodeIndex, { choices: node.choices.filter((_, index) => index !== choiceIndex) })} className="rounded-lg px-2 text-red-700 hover:bg-red-50"><MaterialIcon name="close" /></button></div> })}</div></div>
        </div>}
      </section>
    })}
  </div>
}

function truncateText(value: string, max = 120) {
  const trimmed = value.trim()
  if (!trimmed) return 'Chưa có trích dẫn'
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}

function emptySource(): NarrativeSourceAdmin {
  return { sourceId: '', version: '', locale: 'vi', citation: '', url: '' }
}

export function NarrativeSourcesEditor({ graph, errors, onChange }: { graph: NarrativeGraphAdmin; errors: Record<string, string>; onChange: (graph: NarrativeGraphAdmin) => void }) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState<NarrativeSourceAdmin | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (editingIndex == null) return
    if (editingIndex < 0 || editingIndex >= graph.sources.length) {
      setEditingIndex(null)
      setDraft(null)
      setIsCreating(false)
    }
  }, [editingIndex, graph.sources.length])

  const openEdit = (index: number) => {
    setIsCreating(false)
    setEditingIndex(index)
    setDraft({ ...graph.sources[index] })
  }
  const openCreate = () => {
    const next = [...graph.sources, emptySource()]
    onChange({ ...graph, sources: next })
    setIsCreating(true)
    setEditingIndex(next.length - 1)
    setDraft(emptySource())
  }
  const closeEditor = (discardCreate = false) => {
    if (discardCreate && isCreating && editingIndex != null) {
      onChange({
        ...graph,
        sources: graph.sources.filter((_, index) => index !== editingIndex),
      })
    }
    setEditingIndex(null)
    setDraft(null)
    setIsCreating(false)
  }
  const saveEditor = () => {
    if (editingIndex == null || !draft) return
    onChange({
      ...graph,
      sources: graph.sources.map((source, index) =>
        index === editingIndex
          ? {
              ...draft,
              url: draft.url?.trim() ? draft.url.trim() : null,
              path: draft.path?.trim() ? draft.path.trim() : null,
            }
          : source,
      ),
    })
    setEditingIndex(null)
    setDraft(null)
    setIsCreating(false)
  }
  const removeSource = (index: number) => {
    onChange({ ...graph, sources: graph.sources.filter((_, sourceIndex) => sourceIndex !== index) })
    if (editingIndex === index) {
      setEditingIndex(null)
      setDraft(null)
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">Nguồn & trích dẫn</h3>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Bản tiếng Việt bắt buộc mã nguồn, phiên bản và trích dẫn. Dùng nút Sửa để xem/chỉnh toàn bộ nội dung.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="ops-btn-primary">
          <MaterialIcon name="add" className="text-[16px]" /> Thêm nguồn
        </button>
      </div>

      {graph.sources.length === 0 ? (
        <p className="rounded-xl border border-dashed border-outline-variant p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
          Chưa có nguồn. Thêm ít nhất một nguồn tiếng Việt trước khi duyệt.
        </p>
      ) : (
        <ul className="space-y-3">
          {graph.sources.map((source, index) => {
            const hasError = Boolean(
              errors[`sources.${index}.sourceId`] ||
                errors[`sources.${index}.version`] ||
                errors[`sources.${index}.citation`],
            )
            return (
              <li
                key={`${source.sourceId || 'source'}-${index}`}
                className={`rounded-xl border p-4 ${
                  hasError
                    ? 'border-error/40 bg-error-container/20'
                    : 'border-outline-variant bg-surface-container'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-code-sm text-code-sm text-primary">
                        {source.sourceId || `Nguồn #${index + 1}`}
                      </span>
                      {source.version && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-outline" />
                          <span className="font-code-sm text-code-sm text-outline">{source.version}</span>
                        </>
                      )}
                      <span className="rounded bg-surface-container-highest px-2 py-0.5 font-label-sm text-label-sm uppercase text-on-surface-variant">
                        {source.locale || '—'}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words font-body-sm text-body-sm text-on-surface">
                      {expandedIndex === index ? source.citation || 'Chưa có trích dẫn' : truncateText(source.citation, 180)}
                    </p>
                    {source.citation.trim().length > 180 && <button type="button" className="narrative-more-button mt-2" aria-expanded={expandedIndex === index} onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}>{expandedIndex === index ? 'Thu gọn trích dẫn' : 'Xem thêm trích dẫn'}<MaterialIcon name={expandedIndex === index ? 'expand_less' : 'expand_more'} className="text-[18px]" /></button>}
                    {source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate font-label-sm text-label-sm text-secondary hover:underline"
                      >
                        <MaterialIcon name="link" className="shrink-0 text-[14px]" />
                        <span className="truncate">{source.url}</span>
                      </a>
                    )}
                    {(errors[`sources.${index}.sourceId`] ||
                      errors[`sources.${index}.version`] ||
                      errors[`sources.${index}.citation`]) && (
                      <p className="mt-2 font-body-sm text-body-sm font-semibold text-error">
                        {errors[`sources.${index}.citation`] ||
                          errors[`sources.${index}.sourceId`] ||
                          errors[`sources.${index}.version`]}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(index)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high"
                    >
                      <MaterialIcon name="edit" className="text-[16px]" /> Sửa
                    </button>
                    <button
                      type="button"
                      aria-label={`Xóa nguồn ${source.sourceId || index + 1}`}
                      onClick={() => removeSource(index)}
                      className="ops-icon-btn ops-icon-btn-danger"
                    >
                      <MaterialIcon name="delete" className="text-[16px]" />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editingIndex != null && draft && (
        <AdminModal
          title={
            isCreating
              ? 'Thêm nguồn & trích dẫn'
              : draft.sourceId?.trim()
                ? `Sửa nguồn · ${draft.sourceId}`
                : 'Sửa nguồn & trích dẫn'
          }
          onClose={() => closeEditor(true)}
          wide
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              saveEditor()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block font-label-sm text-label-sm text-outline sm:col-span-1">
                Mã nguồn
                <input
                  className={`${inputClass} mt-1`}
                  value={draft.sourceId}
                  onChange={(event) => setDraft({ ...draft, sourceId: event.target.value })}
                  required
                />
              </label>
              <label className="block font-label-sm text-label-sm text-outline">
                Phiên bản
                <input
                  className={`${inputClass} mt-1`}
                  value={draft.version}
                  onChange={(event) => setDraft({ ...draft, version: event.target.value })}
                  required
                />
              </label>
              <label className="block font-label-sm text-label-sm text-outline">
                Ngôn ngữ
                <input
                  className={`${inputClass} mt-1`}
                  value={draft.locale}
                  onChange={(event) => setDraft({ ...draft, locale: event.target.value })}
                  required
                />
              </label>
            </div>
            <label className="block font-label-sm text-label-sm text-outline">
              Trích dẫn (đầy đủ)
              <textarea
                rows={8}
                className={`${inputClass} mt-1 min-h-[10rem] resize-y`}
                value={draft.citation}
                onChange={(event) => setDraft({ ...draft, citation: event.target.value })}
                required
              />
            </label>
            <label className="block font-label-sm text-label-sm text-outline">
              Liên kết
              <input
                type="url"
                className={`${inputClass} mt-1`}
                value={draft.url ?? ''}
                onChange={(event) => setDraft({ ...draft, url: event.target.value || null })}
                placeholder="https://…"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => closeEditor(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high"
              >
                Hủy
              </button>
              <button type="submit" className="ops-btn-primary">
                <MaterialIcon name="check" className="text-[16px]" /> Áp dụng
              </button>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  )
}

export function NarrativeRewardsEditor({ graph, fixed, fixedXp, onChange }: { graph: NarrativeGraphAdmin; fixed: boolean; fixedXp?: number | null; onChange: (graph: NarrativeGraphAdmin) => void }) {
  const [showAll, setShowAll] = useState(false)
  const rewardNodes = graph.nodes.map((node, index) => ({ node, index })).filter(({ node }) => node.type === 'EVIDENCE' || node.type === 'OUTCOME')
  const patchReward = (index: number, rewardXp: number | null) => onChange({ ...graph, nodes: graph.nodes.map((node, nodeIndex) => nodeIndex === index ? { ...node, rewardXp } : node) })
  return <div className="space-y-4"><div><h3 className="font-headline-md text-headline-md text-on-surface">Phần thưởng & kết thúc</h3><p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">Xem điểm thưởng và điều kiện kết thúc của từng bước.</p></div>{fixed && <div role="note" className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800"><MaterialIcon name="lock" /><div><p className="font-headline-sm text-on-surface">Phần thưởng do máy chủ cố định</p><p className="font-body-sm text-body-sm text-on-surface-variant">Giá trị đang áp dụng{typeof fixedXp === 'number' ? `: ${fixedXp} XP` : ''}. Bạn không thể đổi tại đây.</p></div></div>}
    <div className="space-y-3">{rewardNodes.slice(0, showAll ? undefined : 2).map(({ node, index }) => <div key={node.code} className="narrative-reward-card flex flex-wrap items-center justify-between gap-4 rounded-xl p-4"><div className="min-w-0 flex-1"><p className="font-semibold text-on-surface">{node.title || node.code}</p><p className="mt-1 text-sm text-on-surface-variant">{node.type === 'OUTCOME' ? 'Bước kết thúc' : 'Bước thu thập chứng cứ'}</p>{node.type === 'OUTCOME' && <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-on-surface-variant">{node.prompt || 'Chưa có nội dung kết thúc.'}</p>}</div><label className="text-sm font-semibold text-on-surface-variant">XP thưởng<input type="number" min="0" disabled={fixed} className={`${inputClass} mt-1 w-32`} value={node.rewardXp ?? ''} onChange={(event) => patchReward(index, event.target.value === '' ? null : Number(event.target.value))} /></label></div>)}</div>
    {rewardNodes.length > 2 && <button type="button" className="narrative-more-button" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>{showAll ? 'Thu gọn phần thưởng' : `Xem thêm ${rewardNodes.length - 2} phần thưởng`}<MaterialIcon name={showAll ? 'expand_less' : 'expand_more'} className="text-[20px]" /></button>}
    <div><h4 className="font-semibold text-on-surface">Các cách kết thúc</h4><ul className="mt-2 grid gap-2 sm:grid-cols-2">{graph.outcomeNodeCodes.map((code) => { const node = graph.nodes.find((item) => item.code === code); return <li key={code} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2"><span className="font-semibold text-on-surface">{node?.title || code}</span><span className="ml-2 text-sm text-on-surface-variant">{node?.minimumEvidence ?? 0} chứng cứ tối thiểu</span></li> })}</ul></div>
  </div>
}
