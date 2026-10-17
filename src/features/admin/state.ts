export type AdminListState = {
  page: number
  size: number
  q: string
  type: string
  sort: string
}

type AdminDraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

const ADMIN_DRAFT_PREFIX = 'histar:admin-draft:v1:'
const SENSITIVE_DRAFT_KEY = /(?:token|password|secret|file|adminnotes|inquirynotes|contactnotes|notes)/i

function adminDraftKey(userId: string, route: string, formId: string) {
  return `${ADMIN_DRAFT_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(route)}:${encodeURIComponent(formId)}`
}

function sanitizeAdminDraftValue(value: unknown, key = ''): unknown {
  const normalizedKey = key.replace(/[-_]/g, '')
  if (SENSITIVE_DRAFT_KEY.test(normalizedKey)) return undefined
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAdminDraftValue(item)).filter((item) => item !== undefined)
  }
  if (typeof value !== 'object') return undefined
  if ('arrayBuffer' in value && typeof value.arrayBuffer === 'function') return undefined

  return Object.fromEntries(
    Object.entries(value)
      .map(([entryKey, entryValue]) => [entryKey, sanitizeAdminDraftValue(entryValue, entryKey)] as const)
      .filter((entry): entry is readonly [string, unknown] => entry[1] !== undefined),
  )
}

export function writeAdminDraft<T>(
  storage: AdminDraftStorage,
  userId: string,
  route: string,
  formId: string,
  value: T,
) {
  storage.setItem(adminDraftKey(userId, route, formId), JSON.stringify(sanitizeAdminDraftValue(value)))
}

export function shouldPreserveAdminDraft(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && 'status' in cause && cause.status === 401
}

export function readAdminDraft<T>(
  storage: AdminDraftStorage,
  userId: string,
  route: string,
  formId: string,
): T | null {
  const raw = storage.getItem(adminDraftKey(userId, route, formId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    storage.removeItem(adminDraftKey(userId, route, formId))
    return null
  }
}

export function clearAdminDraft(
  storage: AdminDraftStorage,
  userId: string,
  route: string,
  formId: string,
) {
  storage.removeItem(adminDraftKey(userId, route, formId))
}

export function clearAdminDraftsForUser(storage: AdminDraftStorage, userId: string) {
  const prefix = `${ADMIN_DRAFT_PREFIX}${encodeURIComponent(userId)}:`
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key?.startsWith(prefix)) keys.push(key)
  }
  keys.forEach((key) => storage.removeItem(key))
}

export function createLatestRequestGuard() {
  let sequence = 0
  return {
    begin() {
      const requestSequence = ++sequence
      return { isLatest: () => requestSequence === sequence }
    },
    invalidate() {
      sequence += 1
    },
  }
}

function integerParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

export function parseAdminListState(params: URLSearchParams): AdminListState {
  return {
    page: integerParam(params.get('page'), 1, 1, Number.MAX_SAFE_INTEGER) - 1,
    size: integerParam(params.get('size'), 20, 1, 100),
    q: params.get('q')?.trim() ?? '',
    type: params.get('type')?.trim() ?? '',
    sort: params.get('sort')?.trim() ?? '',
  }
}

export function buildAdminListSearchParams(state: AdminListState): URLSearchParams {
  const params = new URLSearchParams()
  if (state.page > 0) params.set('page', String(state.page + 1))
  if (state.size !== 20) params.set('size', String(state.size))
  if (state.q) params.set('q', state.q)
  if (state.type) params.set('type', state.type)
  if (state.sort) params.set('sort', state.sort)
  return params
}

export function validateDeleteReason(reasonPreset: string, reasonDetail: string): string | null {
  if (!reasonPreset) return 'Vui lòng chọn lý do.'
  if (reasonPreset === 'Khác' && reasonDetail.trim().length < 10) {
    return 'Lý do Khác cần ít nhất 10 ký tự.'
  }
  return null
}

export type PaymentAction = 'MARK_PAID' | 'REFUND' | 'VOID'

export function getPaymentActionsForStatus(status: string): PaymentAction[] {
  switch (status.trim().toUpperCase()) {
    case 'PENDING':
    case 'UNDERPAID':
      return ['MARK_PAID', 'VOID']
    case 'PAID':
      return ['REFUND']
    default:
      return []
  }
}

export function validatePaymentActionReason(reason: string): string | null {
  return reason.trim().length < 10 ? 'Lý do cần ít nhất 10 ký tự.' : null
}

export function formatSuppressedMetric(value: number | null | undefined, suppressed?: boolean): string {
  if (suppressed) return 'Ẩn (<10 mẫu)'
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return String(value)
}

export function formatSuppressedCount(value: number | null | undefined, suppressed?: boolean): string {
  if (suppressed || (typeof value === 'number' && value < 10)) return 'Ẩn (<10 mẫu)'
  return formatSuppressedMetric(value)
}

export type NarrativePilotListState = {
  page: number
  q: string
  reviewStatus: string
  rolloutState: string
}

export function parseNarrativePilotListState(params: URLSearchParams): NarrativePilotListState {
  return {
    page: integerParam(params.get('page'), 1, 1, Number.MAX_SAFE_INTEGER) - 1,
    q: params.get('q')?.trim() ?? '',
    reviewStatus: params.get('reviewStatus')?.trim() ?? '',
    rolloutState: params.get('rolloutState')?.trim() ?? '',
  }
}

export function buildNarrativePilotSearchParams(state: NarrativePilotListState): URLSearchParams {
  const params = new URLSearchParams()
  if (state.page > 0) params.set('page', String(state.page + 1))
  if (state.q) params.set('q', state.q)
  if (state.reviewStatus) params.set('reviewStatus', state.reviewStatus)
  if (state.rolloutState) params.set('rolloutState', state.rolloutState)
  return params
}

export function validateNarrativeReviewNote(note: string): string | null {
  return note.trim().length >= 10 ? null : 'Ghi chú review cần ít nhất 10 ký tự.'
}

type NarrativeGraphLike = {
  startNodeCode: string
  nodes: Array<{
    code: string
    choices?: Array<{ targetNodeCode: string }>
    sourceIds?: string[]
  }>
  sources: Array<{ sourceId: string; version?: string; locale?: string; citation?: string }>
}

export function validateNarrativeGraph(graph: NarrativeGraphLike): Record<string, string> {
  const errors: Record<string, string> = {}
  const nodeCodes = new Set(graph.nodes.map((node) => node.code.trim()).filter(Boolean))
  const sourceIds = new Set(graph.sources.map((source) => source.sourceId.trim()).filter(Boolean))

  if (!graph.startNodeCode.trim()) errors.startNodeCode = 'Node bắt đầu là bắt buộc.'
  else if (!nodeCodes.has(graph.startNodeCode)) errors.startNodeCode = 'Node bắt đầu không tồn tại.'

  graph.nodes.forEach((node, nodeIndex) => {
    if (!node.code.trim()) errors[`nodes.${nodeIndex}.code`] = 'Mã node là bắt buộc.'
    node.choices?.forEach((choice, choiceIndex) => {
      if (!nodeCodes.has(choice.targetNodeCode)) {
        errors[`nodes.${nodeIndex}.choices.${choiceIndex}.targetNodeCode`] = 'Node đích không tồn tại.'
      }
    })
    node.sourceIds?.forEach((sourceId, sourceIndex) => {
      if (!sourceIds.has(sourceId)) errors[`nodes.${nodeIndex}.sourceIds.${sourceIndex}`] = 'Source không tồn tại.'
    })
  })

  graph.sources.forEach((source, sourceIndex) => {
    if (!source.sourceId.trim()) errors[`sources.${sourceIndex}.sourceId`] = 'Source ID là bắt buộc.'
    if (source.locale === 'vi' && !source.version?.trim()) {
      errors[`sources.${sourceIndex}.version`] = 'Version nguồn là bắt buộc cho locale vi.'
    }
    if (source.locale === 'vi' && !source.citation?.trim()) {
      errors[`sources.${sourceIndex}.citation`] = 'Citation là bắt buộc cho locale vi.'
    }
  })
  return errors
}

export function dedupeNarrativeAuditEvents<T extends { id: string; occurredAt: string }>(events: T[]): T[] {
  const unique = new Map(events.map((event) => [event.id, event]))
  return [...unique.values()].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
}

type NarrativeRolloutActionInput = {
  rolloutState: string
  publishedVersion: number | null
  draftVersion: number | null
  draftReviewStatus: string | null
  rollbackTargetVersion?: number | null
}

export function getNarrativeRolloutActions(input: NarrativeRolloutActionInput) {
  const actions: Array<{ action: 'enable' | 'pause' | 'resume' | 'publish-draft' | 'rollback'; label: string; version: number }> = []
  if (input.rolloutState === 'PAUSED' && input.publishedVersion !== null) {
    actions.push({ action: 'resume', label: `Tiếp tục v${input.publishedVersion}`, version: input.publishedVersion })
  } else if (input.rolloutState === 'ACTIVE' && input.publishedVersion !== null) {
    actions.push({ action: 'pause', label: 'Tạm dừng', version: input.publishedVersion })
    if (input.rollbackTargetVersion !== null && input.rollbackTargetVersion !== undefined) {
      actions.push({ action: 'rollback', label: `Khôi phục v${input.rollbackTargetVersion}`, version: input.rollbackTargetVersion })
    }
  } else if (input.rolloutState === 'NOT_RELEASED' && input.draftVersion !== null && input.draftReviewStatus === 'APPROVED') {
    actions.push({ action: 'enable', label: `Bật v${input.draftVersion}`, version: input.draftVersion })
  }
  if (input.publishedVersion !== null && input.draftVersion !== null && input.draftReviewStatus === 'APPROVED') {
    actions.push({ action: 'publish-draft', label: `Phát hành v${input.draftVersion}`, version: input.draftVersion })
  }
  return actions
}
