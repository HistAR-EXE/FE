import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AdminErrorState, AdminEmptyState, AdminLoading } from '../components/admin/AdminAsyncState'
import { AdminModal } from '../components/admin/AdminModal'
import { AdminPagination } from '../components/admin/AdminPagination'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import {
  adminApi,
  type AdminOrganizationSummary,
  type OrgActivityLog,
  type OrgArCard,
  type OrgArReport,
  type OrgCertificate,
  type OrgContract,
  type OrgContractInput,
  type OrganizationAnalytics,
  type PageResponse,
} from '../features/admin/api'
import { createLatestRequestGuard, parseAdminListState } from '../features/admin/state'
import { orgApi, type OrgRosterMember } from '../features/org/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

type DetailTab = 'roster' | 'contract' | 'report' | 'logs'
type OrgFormMode = 'create' | 'edit'

/** Plan chips shown in directory (counts loaded without the active plan filter). */
const PLAN_FACET_IDS = ['STANDARD', 'ORG_BASIC', 'PREMIUM'] as const
type PlanFacetId = (typeof PLAN_FACET_IDS)[number]
type PlanFacetCounts = { all: number } & Record<PlanFacetId, number>

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const inputClass =
  'w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary'
const btnGhost =
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-surface-container-high px-3 font-headline-sm text-sm text-on-surface hover:bg-surface-container-highest disabled:opacity-50'
const btnPrimary =
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-container px-3 font-headline-sm text-sm font-bold text-on-primary-container shadow-[0_0_16px_rgba(78,222,163,0.3)] hover:opacity-95 disabled:opacity-50'
const btnTab =
  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 font-headline-sm text-sm transition-all'

function orgCode(id: string) {
  return `ORG-${id.replace(/-/g, '').slice(0, 4).toUpperCase()}`
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function formatCount(value: number) {
  return value.toLocaleString('vi-VN')
}

function planLabel(org: AdminOrganizationSummary) {
  const plan = (org.plan ?? '').trim().toLowerCase()
  const planType = (org.planType ?? '').trim().toUpperCase()
  if (
    ['org_basic', 'basic', 'micro', 'trial'].includes(plan) ||
    ['ORG_BASIC', 'MICRO', 'BASIC'].includes(planType)
  ) {
    return 'ORG_BASIC'
  }
  if (
    ['standard', 'org_pro', 'pro', 'b2b', 'b2b2c'].includes(plan) ||
    ['STANDARD', 'ORG_PRO', 'PRO', 'B2B', 'B2B2C'].includes(planType)
  ) {
    return 'STANDARD'
  }
  if (plan === 'premium' || planType === 'PREMIUM') return 'PREMIUM'
  return org.planType ?? org.plan ?? 'Chưa có gói'
}

function statusMeta(status?: string | null) {
  const key = (status ?? '').toUpperCase()
  if (key === 'ACTIVE' || key === 'ĐANG HOẠT ĐỘNG') {
    return { label: 'Đang hoạt động', tone: 'primary' as const }
  }
  if (key === 'INACTIVE' || key === 'NGỪNG HOẠT ĐỘNG') {
    return { label: 'Ngừng hoạt động', tone: 'muted' as const }
  }
  if (key.includes('PENDING') || key.includes('REVIEW') || key.includes('DUYỆT')) {
    return { label: 'Đang kiểm duyệt', tone: 'tertiary' as const }
  }
  return { label: status?.trim() || 'Chưa rõ', tone: 'muted' as const }
}

function roleBadge(role: string) {
  const key = role.trim().toLowerCase()
  if (key.includes('admin') || key.includes('owner') || key.includes('lead')) {
    return { className: 'bg-primary/10 text-primary', icon: 'military_tech' as const }
  }
  if (key.includes('teach') || key.includes('gv') || key.includes('giáo')) {
    return { className: 'bg-surface-container-high text-on-surface-variant', icon: 'history_edu' as const }
  }
  return { className: 'bg-surface-container text-outline', icon: null }
}

function questPct(member: OrgRosterMember, maxQuests: number) {
  if (maxQuests <= 0) return 0
  return Math.min(100, Math.round((member.questsCompleted / maxQuests) * 100))
}

export function AdminOrganizationsPage() {
  const [params, setParams] = useSearchParams()
  const state = parseAdminListState(params)
  const plan = params.get('plan') ?? ''
  const status = params.get('status') ?? ''
  const orgId = params.get('orgId') ?? ''
  const [search, setSearch] = useState(state.q)
  const [memberSearch, setMemberSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeTab, setActiveTab] = useState<DetailTab>('roster')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [result, setResult] = useState<PageResponse<AdminOrganizationSummary> | null>(null)
  const [data, setData] = useState<OrganizationAnalytics | null>(null)
  const [roster, setRoster] = useState<OrgRosterMember[]>([])
  const [planFacets, setPlanFacets] = useState<PlanFacetCounts>({
    all: 0,
    STANDARD: 0,
    ORG_BASIC: 0,
    PREMIUM: 0,
  })
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [orgForm, setOrgForm] = useState<OrgFormMode | null>(null)
  const [orgName, setOrgName] = useState('')
  const [orgPlanType, setOrgPlanType] = useState('STANDARD')
  const [orgContactEmail, setOrgContactEmail] = useState('')
  const [orgStatus, setOrgStatus] = useState('ACTIVE')
  const [orgOpsNote, setOrgOpsNote] = useState('')
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [memberModalOpen, setMemberModalOpen] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberDisplayName, setMemberDisplayName] = useState('')
  const [memberSendEmail, setMemberSendEmail] = useState(true)
  const [contracts, setContracts] = useState<OrgContract[]>([])
  const [arReport, setArReport] = useState<OrgArReport | null>(null)
  const [activityLogs, setActivityLogs] = useState<PageResponse<OrgActivityLog> | null>(null)
  const [logPage, setLogPage] = useState(0)
  const [, setArCards] = useState<OrgArCard[]>([])
  const [, setCertificates] = useState<OrgCertificate[]>([])
  const [contractModal, setContractModal] = useState<'create' | OrgContract | null>(null)
  const [contractForm, setContractForm] = useState<OrgContractInput>({
    title: '',
    contractCode: '',
    licenseSeats: 30,
    planType: 'STANDARD',
    status: 'ACTIVE',
    startsOn: '',
    endsOn: '',
    documentUrl: '',
    notes: '',
  })
  const [certModalOpen, setCertModalOpen] = useState(false)
  const [certTitle, setCertTitle] = useState('Chứng nhận trải nghiệm AR HistAR')
  const importInputRef = useRef<HTMLInputElement>(null)
  const listGuard = useRef(createLatestRequestGuard())
  const detailGuard = useRef(createLatestRequestGuard())
  const facetGuard = useRef(createLatestRequestGuard())
  const { showToast } = useToast()

  const updateParam = (key: string, value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page' && key !== 'orgId') next.delete('page')
      return next
    })

  const loadOrganizations = useCallback(() => {
    const request = listGuard.current.begin()
    setLoading(true)
    setError(null)
    adminApi
      .listOrganizations({
        page: state.page,
        size: state.size,
        q: state.q || undefined,
        plan: plan || undefined,
        status: status || undefined,
      })
      .then((next) => {
        if (!request.isLatest()) return
        setResult(next)
        if (!orgId && next.items[0]) updateParam('orgId', next.items[0].id)
      })
      .catch((cause) => {
        if (!request.isLatest()) return
        setResult(null)
        setError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => {
        if (request.isLatest()) setLoading(false)
      })
  }, [orgId, plan, state.page, state.q, state.size, status])

  const loadDetails = useCallback(() => {
    if (!orgId) {
      setData(null)
      setRoster([])
      return
    }
    const request = detailGuard.current.begin()
    setDetailLoading(true)
    setDetailError(null)
    Promise.all([adminApi.organizationAnalytics(orgId), orgApi.roster(orgId)])
      .then(([analytics, members]) => {
        if (!request.isLatest()) return
        setData(analytics)
        setRoster(members)
        setSelectedIds([])
        setMemberSearch('')
        setRoleFilter('')
        setActiveTab('roster')
      })
      .catch((cause) => {
        if (!request.isLatest()) return
        setData(null)
        setRoster([])
        setDetailError(getFriendlyErrorMessage(cause, 'quest'))
      })
      .finally(() => {
        if (request.isLatest()) setDetailLoading(false)
      })
  }, [orgId])

  /**
   * Chip counts from an unfiltered list, using the same planLabel() as cards
   * (org_basic plan + MICRO planType both count as ORG_BASIC).
   */
  const loadPlanFacets = useCallback(() => {
    const request = facetGuard.current.begin()
    const countFrom = (items: AdminOrganizationSummary[], totalItems: number): PlanFacetCounts => {
      const next: PlanFacetCounts = {
        all: totalItems,
        STANDARD: 0,
        ORG_BASIC: 0,
        PREMIUM: 0,
      }
      for (const org of items) {
        const label = planLabel(org)
        if (label === 'STANDARD') next.STANDARD += 1
        else if (label === 'ORG_BASIC') next.ORG_BASIC += 1
        else if (label === 'PREMIUM') next.PREMIUM += 1
      }
      return next
    }

    const shared = {
      q: state.q || undefined,
      status: status || undefined,
    }

    adminApi
      .listOrganizations({ ...shared, page: 0, size: 100 })
      .then(async (first) => {
        if (!request.isLatest()) return
        let items = [...first.items]
        if (first.totalItems > items.length && first.totalPages > 1) {
          const rest = await Promise.all(
            Array.from({ length: first.totalPages - 1 }, (_, i) =>
              adminApi.listOrganizations({ ...shared, page: i + 1, size: 100 }),
            ),
          )
          if (!request.isLatest()) return
          for (const page of rest) items = items.concat(page.items)
        }
        setPlanFacets(countFrom(items, first.totalItems))
      })
      .catch(() => {
        if (!request.isLatest()) return
      })
  }, [state.q, status])

  useEffect(() => {
    loadOrganizations()
    return () => listGuard.current.invalidate()
  }, [loadOrganizations])

  useEffect(() => {
    loadDetails()
    return () => detailGuard.current.invalidate()
  }, [loadDetails])

  useEffect(() => {
    loadPlanFacets()
    return () => facetGuard.current.invalidate()
  }, [loadPlanFacets])

  useEffect(() => setSearch(state.q), [state.q])

  const selectedOrg = useMemo(
    () => result?.items.find((item) => item.id === orgId) ?? null,
    [orgId, result],
  )

  const filteredRoster = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    return roster.filter((member) => {
      if (roleFilter && member.orgRole.toLowerCase() !== roleFilter.toLowerCase()) return false
      if (!q) return true
      return (
        member.displayName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        member.userId.toLowerCase().includes(q)
      )
    })
  }, [memberSearch, roleFilter, roster])

  const roleOptions = useMemo(() => {
    const set = new Set(roster.map((m) => m.orgRole).filter(Boolean))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'))
  }, [roster])

  const maxQuests = useMemo(
    () => Math.max(0, ...roster.map((m) => m.questsCompleted), 0),
    [roster],
  )

  const totalXp = useMemo(
    () => roster.reduce((sum, m) => sum + (m.totalPoints ?? 0), 0),
    [roster],
  )

  const avgXp = data && data.memberCount > 0 ? Math.round(totalXp / data.memberCount) : 0

  const planChips = useMemo(
    () => [
      { id: '', label: `TẤT CẢ (${formatCount(planFacets.all)})` },
      ...PLAN_FACET_IDS.map((id) => ({
        id,
        label: `${id} (${formatCount(planFacets[id])})`,
      })),
    ],
    [planFacets],
  )

  /** Normalize legacy / duplicate plan query keys. */
  useEffect(() => {
    const legacy = plan.toUpperCase()
    if (legacy === 'B2B' || legacy === 'B2B2C') {
      setParams((current) => {
        const next = new URLSearchParams(current)
        next.set('plan', 'STANDARD')
        next.delete('page')
        return next
      })
      return
    }
    if (legacy === 'MICRO' || legacy === 'BASIC') {
      setParams((current) => {
        const next = new URLSearchParams(current)
        next.set('plan', 'ORG_BASIC')
        next.delete('page')
        return next
      })
    }
  }, [plan, setParams])

  const loadTabData = useCallback(
    async (tab: DetailTab, id: string) => {
      if (!id) return
      try {
        if (tab === 'contract') {
          setContracts(await adminApi.listOrgContracts(id))
        } else if (tab === 'report') {
          setArReport(await adminApi.getOrgArReport(id))
        } else if (tab === 'logs') {
          setActivityLogs(await adminApi.listOrgActivityLogs(id, { page: logPage, size: 10 }))
        }
      } catch (cause) {
        showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
      }
    },
    [logPage, showToast],
  )

  useEffect(() => {
    if (!orgId || activeTab === 'roster') return
    void loadTabData(activeTab, orgId)
  }, [activeTab, loadTabData, orgId])

  useEffect(() => {
    if (activeTab === 'logs' && orgId) void loadTabData('logs', orgId)
  }, [activeTab, loadTabData, logPage, orgId])

  const syncCrm = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const resultSync = await adminApi.syncOrgCrm(orgId)
      showToast({
        message: `Đồng bộ CRM: liên kết ${resultSync.linkedCount} inquiry.`,
        type: 'success',
      })
      const analytics = await adminApi.organizationAnalytics(orgId)
      setData(analytics)
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const issueArCards = async () => {
    if (!orgId) return
    const targetLabel =
      selectedIds.length > 0 ? `${selectedIds.length} thành viên đã chọn` : 'toàn bộ roster ACTIVE'
    if (!window.confirm(`Cấp thẻ AR cho ${targetLabel}?`)) return
    setSaving(true)
    try {
      const body = selectedIds.length > 0 ? { userIds: selectedIds } : undefined
      const resultCards = await adminApi.issueOrgArCards(orgId, body)
      setArCards(resultCards.cards?.length ? resultCards.cards : await adminApi.listOrgArCards(orgId))
      showToast({
        message: `Cấp thẻ AR: ${resultCards.issued} mới, bỏ qua ${resultCards.skipped}.`,
        type: 'success',
      })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const issueCertificates = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const resultCerts = await adminApi.issueOrgCertificates(orgId, {
        userIds: selectedIds.length > 0 ? selectedIds : undefined,
        title: certTitle.trim() || undefined,
      })
      setCertificates(await adminApi.listOrgCertificates(orgId))
      setCertModalOpen(false)
      showToast({ message: `Đã cấp ${resultCerts.issued} chứng nhận.`, type: 'success' })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const openContractCreate = () => {
    setContractForm({
      title: 'Hợp đồng trải nghiệm AR HistAR',
      contractCode: `CTR-${Date.now().toString(36).toUpperCase()}`,
      licenseSeats: 30,
      planType: 'STANDARD',
      status: 'ACTIVE',
      startsOn: new Date().toISOString().slice(0, 10),
      endsOn: '',
      documentUrl: '',
      notes: '',
    })
    setContractModal('create')
  }

  const saveContract = async () => {
    if (!orgId || !contractModal) return
    if (contractForm.title.trim().length < 2 || !contractForm.contractCode.trim()) {
      showToast({ message: 'Nhập tiêu đề và mã hợp đồng.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const body: OrgContractInput = {
        ...contractForm,
        title: contractForm.title.trim(),
        contractCode: contractForm.contractCode.trim(),
        startsOn: contractForm.startsOn || null,
        endsOn: contractForm.endsOn || null,
        documentUrl: contractForm.documentUrl || null,
        notes: contractForm.notes || null,
      }
      if (contractModal === 'create') {
        await adminApi.createOrgContract(orgId, body)
      } else {
        await adminApi.updateOrgContract(orgId, contractModal.id, body)
      }
      setContractModal(null)
      setContracts(await adminApi.listOrgContracts(orgId))
      showToast({ message: 'Đã lưu hợp đồng.', type: 'success' })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const isTechnicalAnalyticsNote = (note?: string | null) => {
    const value = (note ?? '').trim().toLowerCase()
    if (!value) return true
    return (
      value.includes('organization_members') ||
      value.includes('user_quest_progress') ||
      value.includes('seed organization_members') ||
      value.includes('cohort thật từ')
    )
  }

  const opsNoteDisplay = isTechnicalAnalyticsNote(data?.note) ? '' : (data?.note ?? '').trim()

  const openCreateOrg = () => {
    setOrgName('')
    setOrgPlanType('STANDARD')
    setOrgContactEmail('')
    setOrgStatus('ACTIVE')
    setOrgOpsNote('')
    setOrgForm('create')
  }

  const openEditOrg = () => {
    if (!selectedOrg) return
    setOrgName(selectedOrg.name)
    setOrgPlanType(selectedOrg.planType ?? selectedOrg.plan ?? 'STANDARD')
    setOrgContactEmail('')
    setOrgStatus((selectedOrg.status ?? 'ACTIVE').toUpperCase())
    setOrgOpsNote(opsNoteDisplay)
    setOrgForm('edit')
  }

  const openOpsNoteEditor = () => {
    setOrgOpsNote(opsNoteDisplay)
    setNoteModalOpen(true)
  }

  const saveOpsNote = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      await adminApi.updateOrganization(orgId, { opsNote: orgOpsNote.trim() })
      showToast({ message: 'Đã cập nhật ghi chú vận hành.', type: 'success' })
      setNoteModalOpen(false)
      loadDetails()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const saveOrgForm = async () => {
    if (orgName.trim().length < 2) {
      showToast({ message: 'Tên tổ chức cần ít nhất 2 ký tự.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      if (orgForm === 'create') {
        const created = await adminApi.createOrganization({
          name: orgName.trim(),
          planType: orgPlanType || undefined,
          contactEmail: orgContactEmail.trim() || undefined,
          status: orgStatus || undefined,
        })
        showToast({ message: `Đã tạo tổ chức ${created.name}.`, type: 'success' })
        setOrgForm(null)
        updateParam('orgId', created.id)
        loadOrganizations()
        loadPlanFacets()
      } else if (orgForm === 'edit' && orgId) {
        await adminApi.updateOrganization(orgId, {
          name: orgName.trim(),
          planType: orgPlanType || undefined,
          contactEmail: orgContactEmail.trim() || undefined,
          status: orgStatus || undefined,
          opsNote: orgOpsNote.trim(),
        })
        showToast({ message: 'Đã cập nhật tổ chức.', type: 'success' })
        setOrgForm(null)
        loadOrganizations()
        loadPlanFacets()
        loadDetails()
      }
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const shareInvite = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const invite = await adminApi.generateOrgInvite(orgId)
      const text = invite.inviteUrl || invite.inviteCode
      await navigator.clipboard?.writeText(text)
      showToast({
        message: `Đã tạo mã mời ${invite.inviteCode} và sao chép liên kết.`,
        type: 'success',
      })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const exportRoster = async () => {
    if (!orgId) return
    setSaving(true)
    try {
      const blob = await adminApi.exportOrgRosterCsv(orgId)
      downloadBlob(blob, `org-roster-${orgId.slice(0, 8)}.csv`)
      showToast({ message: 'Đã xuất roster CSV (mở được bằng Excel).', type: 'success' })
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const onImportFile = async (file: File | null) => {
    if (!orgId || !file) return
    setSaving(true)
    try {
      const resultImport = await adminApi.importOrgRosterCsv(orgId, file)
      showToast({
        message: `Import xong: tạo ${resultImport.created}, ghi danh ${resultImport.enrolled}, bỏ qua ${resultImport.skipped}.`,
        type: resultImport.errors.length ? 'info' : 'success',
      })
      if (resultImport.errors[0]) {
        showToast({ message: resultImport.errors[0], type: 'error' })
      }
      loadDetails()
      loadOrganizations()
      loadPlanFacets()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const saveMember = async () => {
    if (!orgId || !memberEmail.trim().includes('@')) {
      showToast({ message: 'Email thành viên không hợp lệ.', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const created = await adminApi.addOrgMember(orgId, {
        email: memberEmail.trim(),
        displayName: memberDisplayName.trim() || undefined,
        sendCredentialsEmail: memberSendEmail,
      })
      const temp = created.temporaryPassword
        ? ` Mật khẩu tạm: ${created.temporaryPassword}`
        : ''
      showToast({
        message: created.accountCreated
          ? `Đã tạo tài khoản ${created.email}.${temp}`
          : `Đã ghi danh ${created.email} vào tổ chức.`,
        type: 'success',
      })
      setMemberModalOpen(false)
      setMemberEmail('')
      setMemberDisplayName('')
      loadDetails()
      loadOrganizations()
      loadPlanFacets()
    } catch (cause) {
      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const toggleMember = (userId: string) =>
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    )

  const allFilteredSelected =
    filteredRoster.length > 0 && filteredRoster.every((m) => selectedIds.includes(m.userId))

  return (
    <section className="flex w-full min-w-0 flex-col pb-8" aria-busy={loading || detailLoading || saving}>
      <input
        ref={importInputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => void onImportFile(event.target.files?.[0] ?? null)}
      />
      <AdminPageHeader
        eyebrow="/admin/organizations · Quy mô đối tác di sản"
        title="Quản trị Tổ chức & Cơ quan Liên kết"
        description="Quản trị các cơ quan đối tác, trường học, bảo tàng và doanh nghiệp liên kết trải nghiệm AR di sản — dữ liệu từ máy chủ."
        actions={
          <>
            <button
              type="button"
              className={btnGhost}
              disabled={!orgId || saving}
              onClick={() => void exportRoster()}
            >
              <MaterialIcon name="download" className="text-[18px] text-outline" />
              Xuất dữ liệu CSV
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={!orgId || saving}
              onClick={() => void syncCrm()}
            >
              <MaterialIcon name="sync" className="text-[18px] text-outline" />
              Đồng bộ CRM
            </button>
            <button type="button" className={btnPrimary} onClick={openCreateOrg}>
              <MaterialIcon name="add_business" className="text-[18px]" />
              + Thêm tổ chức mới
            </button>
          </>
        }
      />

      <div className="mt-2 grid grid-cols-12 items-start gap-4 xl:gap-6">
        {/* LEFT: Partner directory */}
        <aside className="col-span-12 flex min-w-0 flex-col gap-4 xl:col-span-4">
          <div className="space-y-3 rounded-xl bg-surface-container-low p-3.5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MaterialIcon name="domain" className="text-[18px] text-primary" />
                <span className="font-headline-sm text-headline-sm text-on-surface">Danh mục Đối tác</span>
              </div>
              <span className="rounded-full bg-surface-container-highest px-2 py-0.5 font-code-sm text-code-sm text-primary">
                {formatCount(planFacets.all)} ĐỐI TÁC
              </span>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                updateParam('q', search.trim())
              }}
              className="relative"
            >
              <MaterialIcon
                name="search"
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline"
              />
              <input
                aria-label="Tìm tổ chức"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${inputClass} pl-8`}
                placeholder="Tìm tên tổ chức, mã đối tác..."
              />
            </form>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {planChips.map((chip) => (
                  <button
                    key={chip.id || 'all'}
                    type="button"
                    onClick={() => updateParam('plan', chip.id)}
                    className={`inline-flex h-8 shrink-0 items-center rounded-md px-2.5 font-label-sm text-label-sm transition-colors ${
                      plan.toUpperCase() === chip.id || (!plan && !chip.id)
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container text-outline hover:bg-surface-container-high'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-code-sm text-code-sm uppercase tracking-wider text-outline">
                  Trạng thái lọc
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {[
                    { value: '', label: 'Tất cả', dot: 'bg-outline' },
                    { value: 'ACTIVE', label: 'Hoạt động', dot: 'bg-primary' },
                    { value: 'INACTIVE', label: 'Ngừng', dot: 'bg-outline' },
                  ].map((item) => (
                    <button
                      key={item.value || 'all-status'}
                      type="button"
                      onClick={() => updateParam('status', item.value)}
                      className={`inline-flex items-center gap-1.5 font-code-sm text-code-sm ${
                        status === item.value ? 'text-primary' : 'text-outline hover:text-on-surface'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dot}`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {loading && <AdminLoading label="Đang tải tổ chức" />}
          {!loading && error && <AdminErrorState message={error} onRetry={loadOrganizations} />}
          {!loading && !error && result?.items.length === 0 && (
            <div className="flex flex-col gap-3 rounded-xl bg-surface-container-low p-4">
              <AdminEmptyState
                title="Không có tổ chức"
                detail={
                  plan || status || state.q
                    ? 'Không có tổ chức phù hợp với bộ lọc hiện tại. Thử chọn TẤT CẢ hoặc xóa bộ lọc.'
                    : 'Chưa có tổ chức trên máy chủ.'
                }
              />
              {(plan || status || state.q) && (
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => {
                    setSearch('')
                    setParams((current) => {
                      const next = new URLSearchParams(current)
                      ;['q', 'plan', 'status', 'page'].forEach((key) => next.delete(key))
                      return next
                    })
                  }}
                >
                  <MaterialIcon name="filter_alt_off" className="text-[16px]" />
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
          {!loading && !error && result && result.items.length > 0 && (
            <>
              <div className="flex flex-col gap-2.5">
                {result.items.map((org) => {
                  const isSelected = org.id === orgId
                  const meta = statusMeta(org.status)
                  const members = org.memberCount ?? 0
                  return (
                    <button
                      key={org.id}
                      type="button"
                      onClick={() => updateParam('orgId', org.id)}
                      className={`w-full overflow-hidden rounded-xl p-3.5 text-left transition-all ${
                        isSelected
                          ? 'border-l-[3px] border-l-primary bg-surface-container-high pl-[calc(0.875rem-1px)] shadow-md'
                          : 'border-l-[3px] border-l-transparent bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                              isSelected
                                ? 'bg-surface-container-lowest text-primary shadow-inner'
                                : 'bg-surface-container text-outline'
                            }`}
                          >
                            <MaterialIcon name="domain" className="text-[22px]" />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`font-code-sm text-code-sm ${
                                  isSelected ? 'font-medium tracking-tight text-primary' : 'text-outline'
                                }`}
                              >
                                {orgCode(org.id)}
                              </span>
                              {isSelected && (
                                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-label-sm text-[10px] text-primary">
                                  Đang chọn
                                </span>
                              )}
                            </div>
                            <h3
                              className={`mt-0.5 truncate font-headline-sm tracking-tight text-on-surface ${
                                isSelected ? 'text-body-lg font-semibold' : 'text-body-md'
                              }`}
                            >
                              {org.name}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2 font-body-sm text-body-sm text-outline">
                              <span className={isSelected ? 'font-medium text-on-surface-variant' : ''}>
                                {planLabel(org)}
                              </span>
                              <span>•</span>
                              <span className={`font-code-sm text-code-sm ${isSelected ? 'text-on-surface' : ''}`}>
                                {formatCount(members)} thành viên
                              </span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-label-sm text-code-sm ${
                            meta.tone === 'primary'
                              ? 'bg-primary/15 text-primary'
                              : meta.tone === 'tertiary'
                                ? 'bg-tertiary/15 text-tertiary'
                                : 'bg-surface-container-high text-outline'
                          }`}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-2 px-2 py-1 font-code-sm text-code-sm text-outline">
                <span>
                  Hiển thị {result.items.length}
                  {plan
                    ? ` · lọc ${formatCount(result.totalItems)} / tổng ${formatCount(planFacets.all)}`
                    : ` / ${formatCount(planFacets.all)}`}{' '}
                  đối tác
                </span>
                <AdminPagination
                  page={result.page}
                  totalPages={result.totalPages}
                  totalItems={result.totalItems}
                  onPageChange={(page) => updateParam('page', page ? String(page + 1) : '')}
                />
              </div>
            </>
          )}
        </aside>

        {/* RIGHT: Detail + roster */}
        <div className="col-span-12 flex min-w-0 flex-col gap-5 xl:col-span-8">
          {!orgId && !loading && (
            <AdminEmptyState title="Chọn tổ chức" detail="Chọn một đối tác ở danh mục bên trái để xem chi tiết." />
          )}
          {detailLoading && <AdminLoading label="Đang tải chi tiết tổ chức" />}
          {!detailLoading && detailError && (
            <AdminErrorState message={detailError} onRetry={loadDetails} />
          )}
          {!detailLoading && !detailError && data && selectedOrg && (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-5 shadow-md sm:p-6">
                <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="flex items-start gap-4 md:items-center">
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-surface-container text-primary shadow-[0_0_24px_rgba(78,222,163,0.15)]">
                      <MaterialIcon name="account_balance" className="text-[36px]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm font-semibold text-primary">
                          MÃ: {orgCode(selectedOrg.id)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label-sm text-code-sm ${
                            statusMeta(selectedOrg.status).tone === 'primary'
                              ? 'bg-primary/15 text-primary'
                              : 'bg-surface-container-high text-outline'
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {planLabel(selectedOrg)} · {statusMeta(selectedOrg.status).label}
                        </span>
                      </div>
                      <h2 className="mt-1 font-headline-lg text-headline-lg font-bold tracking-tight text-on-surface">
                        {data.name}
                      </h2>
                      <p className="mt-1.5 font-body-sm text-body-sm text-on-surface-variant">
                        {data.lastCrmSyncedAt
                          ? `CRM: lần đồng bộ ${new Date(data.lastCrmSyncedAt).toLocaleString('vi-VN')}${
                              typeof data.crmLinkedInquiryCount === 'number'
                                ? ` · ${data.crmLinkedInquiryCount} inquiry`
                                : ''
                            }`
                          : 'CRM: chưa đồng bộ'}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high"
                      onClick={openEditOrg}
                      aria-label="Chỉnh sửa hồ sơ"
                    >
                      <MaterialIcon name="edit" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high"
                      disabled={saving}
                      onClick={() => void shareInvite()}
                      aria-label="Chia sẻ mã mời"
                    >
                      <MaterialIcon name="share" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      className={`${btnGhost} text-primary`}
                      onClick={() => {
                        setMemberEmail('')
                        setMemberDisplayName('')
                        setMemberSendEmail(true)
                        setMemberModalOpen(true)
                      }}
                    >
                      <MaterialIcon name="person_add" className="text-[18px]" />
                      Thêm thành viên
                    </button>
                    <button
                      type="button"
                      className={btnGhost}
                      disabled={saving || !orgId}
                      onClick={() => void issueArCards()}
                    >
                      <MaterialIcon name="badge" className="text-[18px]" />
                      Cấp thẻ AR
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 border-t border-surface-container-high/40 pt-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col justify-between rounded-xl bg-surface-container/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-outline">Nhiệm vụ học tập</span>
                      <MaterialIcon name="task_alt" className="text-[18px] text-primary" />
                    </div>
                    <div className="mt-2">
                      <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                        {data.completionRatePct}%
                      </span>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, data.completionRatePct)}%` }}
                        />
                      </div>
                      <span className="mt-1 block font-body-sm text-[11px] text-outline">
                        Hoàn thành quest (máy chủ)
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl bg-surface-container/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-outline">Hành trình Di sản AR</span>
                      <MaterialIcon name="explore" className="text-[18px] text-secondary" />
                    </div>
                    <div className="mt-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                          {data.fullTourRatePct}%
                        </span>
                        <span className="font-code-sm text-code-sm text-secondary">
                          {formatCount(data.memberCount)} TV
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          className="h-full rounded-full bg-secondary"
                          style={{ width: `${Math.min(100, data.fullTourRatePct)}%` }}
                        />
                      </div>
                      <span className="mt-1 block font-body-sm text-[11px] text-outline">
                        Hoàn thành toàn hành trình
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl bg-surface-container/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-outline">Tổng XP tích lũy</span>
                      <MaterialIcon name="social_leaderboard" className="text-[18px] text-tertiary" />
                    </div>
                    <div className="mt-2">
                      <span className="font-headline-lg text-headline-lg font-bold text-on-surface">
                        {formatCount(totalXp)}
                      </span>
                      <div className="mt-2 flex items-center gap-1.5 font-code-sm text-code-sm text-outline">
                        <MaterialIcon name="military_tech" className="text-[14px] text-tertiary" />
                        <span>
                          Trung bình {formatCount(avgXp)} XP / thành viên
                        </span>
                      </div>
                      <span className="mt-1 block font-body-sm text-[11px] text-outline">
                        Tổng từ roster hiện tại
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between rounded-xl bg-surface-container/70 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-body-sm text-body-sm text-outline">Ghi chú vận hành</span>
                      <MaterialIcon name="flag" className="text-[18px] text-on-surface-variant" />
                    </div>
                    <div className="mt-1">
                      <div className="rounded bg-surface-container-high p-2 font-body-sm text-body-sm leading-relaxed text-on-surface">
                        {opsNoteDisplay ? (
                          <>
                            <span className="font-semibold text-primary">Đối tác:</span> {opsNoteDisplay}
                          </>
                        ) : (
                          <span className="text-outline">Chưa có ghi chú vận hành.</span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2 font-code-sm text-code-sm text-outline">
                        <span>Thành viên: {formatCount(data.memberCount)}</span>
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={openOpsNoteEditor}
                        >
                          Sửa ghi chú
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 border-b border-surface-container-high/60 pb-2">
                <nav
                  aria-label="Chi tiết tổ chức"
                  className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 [scrollbar-width:thin]"
                >
                  {(
                    [
                      {
                        id: 'roster' as const,
                        icon: 'group',
                        label: 'Thành viên',
                        title: 'Danh sách thành viên (Roster)',
                        count: roster.length,
                      },
                      {
                        id: 'contract' as const,
                        icon: 'description',
                        label: 'Hợp đồng',
                        title: 'Hợp đồng & Giấy phép',
                      },
                      {
                        id: 'report' as const,
                        icon: 'assessment',
                        label: 'Báo cáo AR',
                        title: 'Báo cáo ngoại khóa AR',
                      },
                      {
                        id: 'logs' as const,
                        icon: 'history_edu',
                        label: 'Nhật ký',
                        title: 'Nhật ký truy cập',
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      title={tab.title}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${btnTab} ${
                        activeTab === tab.id
                          ? 'bg-surface-container-high text-primary shadow-sm'
                          : 'text-outline hover:bg-surface-container hover:text-on-surface'
                      }`}
                    >
                      <MaterialIcon name={tab.icon} className="text-[18px]" />
                      <span>{tab.label}</span>
                      {'count' in tab && tab.count !== undefined && (
                        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 font-code-sm text-code-sm font-semibold text-primary">
                          {formatCount(tab.count)}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
                <button
                  type="button"
                  className={`${btnGhost} shrink-0`}
                  disabled={!orgId || saving}
                  onClick={() => importInputRef.current?.click()}
                >
                  <MaterialIcon name="file_upload" className="text-[16px]" />
                  <span className="hidden sm:inline">Import Excel</span>
                  <span className="sm:hidden">Import</span>
                </button>
              </div>

              {activeTab === 'contract' && (
                <div className="rounded-2xl bg-surface-container-low p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Hợp đồng & giấy phép</h3>
                    <button type="button" className={btnPrimary} disabled={saving} onClick={openContractCreate}>
                      <MaterialIcon name="add" className="text-[16px]" />
                      Thêm hợp đồng
                    </button>
                  </div>
                  {contracts.length === 0 ? (
                    <AdminEmptyState title="Chưa có hợp đồng" detail="Tạo hợp đồng đầu tiên cho tổ chức này." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[40rem] text-left">
                        <thead className="font-label-sm text-label-sm uppercase text-outline">
                          <tr>
                            <th className="py-2">Mã</th>
                            <th className="py-2">Tiêu đề</th>
                            <th className="py-2">Trạng thái</th>
                            <th className="py-2">Ghế</th>
                            <th className="py-2 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="font-body-sm text-body-sm">
                          {contracts.map((c) => (
                            <tr key={c.id} className="border-t border-surface-container-high/50">
                              <td className="py-2 font-code-sm">{c.contractCode}</td>
                              <td className="py-2">{c.title}</td>
                              <td className="py-2">{c.status}</td>
                              <td className="py-2">{c.licenseSeats ?? '—'}</td>
                              <td className="py-2 text-right">
                                <button
                                  type="button"
                                  className="text-primary hover:underline"
                                  onClick={() => {
                                    setContractForm({
                                      title: c.title,
                                      contractCode: c.contractCode,
                                      licenseSeats: c.licenseSeats ?? null,
                                      planType: c.planType ?? 'STANDARD',
                                      status: c.status,
                                      startsOn: c.startsOn ?? '',
                                      endsOn: c.endsOn ?? '',
                                      documentUrl: c.documentUrl ?? '',
                                      notes: c.notes ?? '',
                                    })
                                    setContractModal(c)
                                  }}
                                >
                                  Sửa
                                </button>
                                {c.status !== 'CANCELLED' && (
                                  <button
                                    type="button"
                                    className="ml-3 text-error hover:underline"
                                    disabled={saving}
                                    onClick={() =>
                                      void (async () => {
                                        if (!orgId) return
                                        setSaving(true)
                                        try {
                                          await adminApi.cancelOrgContract(orgId, c.id)
                                          setContracts(await adminApi.listOrgContracts(orgId))
                                          showToast({ message: 'Đã hủy hợp đồng.', type: 'success' })
                                        } catch (cause) {
                                          showToast({
                                            message: getFriendlyErrorMessage(cause, 'quest'),
                                            type: 'error',
                                          })
                                        } finally {
                                          setSaving(false)
                                        }
                                      })()
                                    }
                                  >
                                    Hủy
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'report' && (
                <div className="rounded-2xl bg-surface-container-low p-4 shadow-sm sm:p-5">
                  <h3 className="mb-3 font-headline-sm text-headline-sm text-on-surface">
                    Báo cáo ngoại khóa AR (30 ngày)
                  </h3>
                  {!arReport ? (
                    <AdminLoading label="Đang tải báo cáo AR" />
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {[
                          ['Thành viên', arReport.memberCount],
                          ['Check-in', arReport.checkins],
                          ['Phiên visit', arReport.visitSessions],
                          ['Onsite', arReport.onsiteSessions],
                          ['Discoveries', arReport.discoveries],
                          ['Quest xong', arReport.questCompletions],
                        ].map(([label, value]) => (
                          <div key={String(label)} className="rounded-xl bg-surface-container/70 p-3">
                            <p className="font-body-sm text-body-sm text-outline">{label}</p>
                            <p className="mt-1 font-headline-lg text-headline-lg font-bold text-on-surface">
                              {formatCount(Number(value))}
                            </p>
                          </div>
                        ))}
                      </div>
                      {arReport.dailyCheckins.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 font-label-sm text-label-sm text-outline">Check-in theo ngày</p>
                          <ul className="max-h-48 space-y-1 overflow-y-auto font-code-sm text-code-sm text-on-surface">
                            {arReport.dailyCheckins.map((d) => (
                              <li key={d.day} className="flex justify-between gap-4 border-b border-surface-container-high/40 py-1">
                                <span>{d.day}</span>
                                <span>{d.count}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="rounded-2xl bg-surface-container-low p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">Nhật ký tổ chức</h3>
                    {orgId && (
                      <Link
                        to={`/admin/audit?entityType=ORGANIZATION&entityId=${encodeURIComponent(orgId)}`}
                        className={`${btnGhost} text-primary`}
                      >
                        <MaterialIcon name="open_in_new" className="text-[16px]" />
                        Mở Audit
                      </Link>
                    )}
                  </div>
                  {!activityLogs || activityLogs.items.length === 0 ? (
                    <AdminEmptyState title="Chưa có nhật ký" detail="Chưa có sự kiện audit cho tổ chức này." />
                  ) : (
                    <>
                      <ul className="space-y-2">
                        {activityLogs.items.map((log) => (
                          <li
                            key={log.id}
                            className="rounded-lg bg-surface-container/60 px-3 py-2 font-body-sm text-body-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-primary">{log.action}</span>
                              <span className="font-code-sm text-code-sm text-outline">
                                {new Date(log.occurredAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-on-surface-variant">
                              {log.actorDisplayName || log.actorName || log.actorEmail || 'Hệ thống'}
                              {log.reason ? ` · ${log.reason}` : ''}
                            </p>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3">
                        <AdminPagination
                          variant="stitch"
                          page={activityLogs.page}
                          totalPages={activityLogs.totalPages}
                          totalItems={activityLogs.totalItems}
                          onPageChange={(page) => setLogPage(page)}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'roster' && (
                <div className="rounded-2xl bg-surface-container-low p-4 shadow-sm sm:p-5">
                  {roster.length === 0 ? (
                    <AdminEmptyState
                      title="Chưa có thành viên"
                      detail="Roster của tổ chức đang trống."
                    />
                  ) : (
                    <>
                      <div className="flex flex-col justify-between gap-3 pb-3 sm:flex-row sm:items-center">
                        <div className="relative w-full max-w-md flex-1">
                          <MaterialIcon
                            name="search"
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-outline"
                          />
                          <input
                            aria-label="Tìm thành viên"
                            value={memberSearch}
                            onChange={(event) => setMemberSearch(event.target.value)}
                            className={`${inputClass} pl-8`}
                            placeholder="Tìm theo tên, email hoặc ID..."
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label="Lọc vai trò"
                            value={roleFilter}
                            onChange={(event) => setRoleFilter(event.target.value)}
                            className={inputClass}
                          >
                            <option value="">Tất cả vai trò</option>
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="min-w-0 overflow-x-auto">
                        <table className="w-full min-w-[48rem] border-collapse text-left">
                          <thead>
                            <tr className="bg-surface-container-lowest font-code-sm text-code-sm uppercase tracking-wider text-outline">
                              <th className="w-10 rounded-l-lg px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  aria-label="Chọn tất cả trên trang"
                                  checked={allFilteredSelected}
                                  onChange={() =>
                                    setSelectedIds(
                                      allFilteredSelected
                                        ? selectedIds.filter(
                                            (id) => !filteredRoster.some((m) => m.userId === id),
                                          )
                                        : Array.from(
                                            new Set([
                                              ...selectedIds,
                                              ...filteredRoster.map((m) => m.userId),
                                            ]),
                                          ),
                                    )
                                  }
                                  className="accent-primary"
                                />
                              </th>
                              <th className="px-3 py-2.5">Thành viên & Định danh</th>
                              <th className="px-3 py-2.5">Vai trò trong Org</th>
                              <th className="px-3 py-2.5">Cấp bậc AR</th>
                              <th className="px-3 py-2.5 text-right">Tổng XP</th>
                              <th className="rounded-r-lg px-3 py-2.5">Tiến độ Quests</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container-high/30 font-body-sm text-body-sm">
                            {filteredRoster.map((member) => {
                              const badge = roleBadge(member.orgRole)
                              const pct = questPct(member, maxQuests || 1)
                              return (
                                <tr
                                  key={member.userId}
                                  className="transition-colors hover:bg-surface-container"
                                >
                                  <td className="px-3 py-3">
                                    <input
                                      type="checkbox"
                                      aria-label={`Chọn ${member.displayName}`}
                                      checked={selectedIds.includes(member.userId)}
                                      onChange={() => toggleMember(member.userId)}
                                      className="accent-primary"
                                    />
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex items-center gap-3">
                                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/20 font-headline-sm font-bold text-primary">
                                        {initials(member.displayName || member.email)}
                                      </div>
                                      <div className="min-w-0 flex flex-col">
                                        <span className="truncate font-headline-sm text-body-md font-semibold text-on-surface">
                                          {member.displayName || 'Không có tên'}
                                        </span>
                                        <span className="truncate font-code-sm text-code-sm text-outline">
                                          {member.email}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-label-sm text-code-sm ${badge.className}`}
                                    >
                                      {badge.icon && (
                                        <MaterialIcon name={badge.icon} className="text-[13px]" />
                                      )}
                                      {member.orgRole}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3">
                                    <span className="font-medium text-on-surface">Level {member.level}</span>
                                  </td>
                                  <td className="px-3 py-3 text-right font-code-sm text-code-sm font-bold text-primary">
                                    {formatCount(member.totalPoints)} XP
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="flex w-28 flex-col gap-1">
                                      <div className="flex items-center justify-between font-code-sm text-code-sm">
                                        <span className="text-on-surface">
                                          {formatCount(member.questsCompleted)} quests
                                        </span>
                                        <span className="font-semibold text-primary">{pct}%</span>
                                      </div>
                                      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-highest">
                                        <div
                                          className="h-full rounded-full bg-primary"
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      {filteredRoster.length === 0 && (
                        <p className="mt-3 font-body-sm text-body-sm text-outline">
                          Không có thành viên khớp bộ lọc hiện tại.
                        </p>
                      )}

                      <div className="mt-2 flex flex-col justify-between gap-4 border-t border-surface-container-high/40 pt-4 sm:flex-row sm:items-center">
                        <div className="flex flex-wrap items-center gap-2 font-code-sm text-code-sm text-outline">
                          <span>Đã chọn {formatCount(selectedIds.length)} hàng</span>
                          <span>•</span>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-headline-sm text-body-sm text-primary hover:underline"
                            onClick={() => setSelectedIds(roster.map((m) => m.userId))}
                          >
                            <MaterialIcon name="select_all" className="text-[16px]" />
                            Chọn tất cả {formatCount(roster.length)} thành viên
                          </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className={btnGhost}
                            disabled={saving}
                            onClick={() => void exportRoster()}
                          >
                            <MaterialIcon name="table_view" className="text-[16px] text-outline" />
                            Xuất Excel (CSV)
                          </button>
                          <button
                            type="button"
                            className={btnPrimary}
                            disabled={saving || roster.length === 0}
                            onClick={() => {
                              setCertTitle('Chứng nhận trải nghiệm AR HistAR')
                              setCertModalOpen(true)
                            }}
                          >
                            <MaterialIcon name="verified" className="text-[16px]" />
                            Cấp chứng nhận hàng loạt
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {orgForm && (
        <AdminModal
          title={orgForm === 'create' ? 'Thêm tổ chức mới' : 'Chỉnh sửa tổ chức'}
          subtitle="Admin organization upsert"
          icon="domain"
          onClose={() => !saving && setOrgForm(null)}
          wide
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Tên tổ chức
              <input
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                className={inputClass}
                placeholder="Ví dụ: Trường THPT Demo"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Gói / planType
                <select
                  value={orgPlanType}
                  onChange={(event) => setOrgPlanType(event.target.value)}
                  className={inputClass}
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="ORG_BASIC">ORG_BASIC</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Trạng thái
                <select
                  value={orgStatus}
                  onChange={(event) => setOrgStatus(event.target.value)}
                  className={inputClass}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Email liên hệ
              <input
                type="email"
                value={orgContactEmail}
                onChange={(event) => setOrgContactEmail(event.target.value)}
                className={inputClass}
                placeholder="contact@org.vn"
              />
            </label>
            {orgForm === 'edit' && (
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Ghi chú vận hành
                <textarea
                  value={orgOpsNote}
                  onChange={(event) => setOrgOpsNote(event.target.value)}
                  rows={3}
                  maxLength={2000}
                  className={`${inputClass} resize-none`}
                  placeholder="Ghi chú nội bộ về hợp đồng, ưu tiên vận hành…"
                />
              </label>
            )}
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setOrgForm(null)}>
                Hủy
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={() => void saveOrgForm()}>
                {saving ? 'Đang lưu…' : orgForm === 'create' ? 'Tạo tổ chức' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {noteModalOpen && (
        <AdminModal
          title="Ghi chú vận hành"
          subtitle="Internal ops note"
          icon="flag"
          onClose={() => !saving && setNoteModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Nội dung ghi chú
              <textarea
                value={orgOpsNote}
                onChange={(event) => setOrgOpsNote(event.target.value)}
                rows={4}
                maxLength={2000}
                className={`${inputClass} resize-none`}
                placeholder="Ví dụ: Gói ưu tiên bổ sung 15 tài khoản hướng dẫn viên…"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button
                type="button"
                className={btnGhost}
                disabled={saving}
                onClick={() => setNoteModalOpen(false)}
              >
                Hủy
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={() => void saveOpsNote()}>
                {saving ? 'Đang lưu…' : 'Lưu ghi chú'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {memberModalOpen && (
        <AdminModal
          title="Thêm thành viên vào tổ chức"
          subtitle="Provision / enroll roster member"
          icon="person_add"
          onClose={() => !saving && setMemberModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Email
              <input
                type="email"
                value={memberEmail}
                onChange={(event) => setMemberEmail(event.target.value)}
                className={inputClass}
                placeholder="hocsinh@ams.edu.vn"
              />
            </label>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Tên hiển thị
              <input
                value={memberDisplayName}
                onChange={(event) => setMemberDisplayName(event.target.value)}
                className={inputClass}
                placeholder="Tùy chọn"
              />
            </label>
            <label className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={memberSendEmail}
                onChange={(event) => setMemberSendEmail(event.target.checked)}
                className="accent-primary"
              />
              Gửi email mật khẩu tạm (nếu tạo tài khoản mới)
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button
                type="button"
                className={btnGhost}
                disabled={saving}
                onClick={() => setMemberModalOpen(false)}
              >
                Hủy
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={() => void saveMember()}>
                {saving ? 'Đang lưu…' : 'Thêm thành viên'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {contractModal && (
        <AdminModal
          title={contractModal === 'create' ? 'Thêm hợp đồng' : 'Sửa hợp đồng'}
          subtitle="Organization contract"
          icon="description"
          onClose={() => !saving && setContractModal(null)}
          wide
        >
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Tiêu đề
                <input
                  value={contractForm.title}
                  onChange={(event) => setContractForm((c) => ({ ...c, title: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Mã hợp đồng
                <input
                  value={contractForm.contractCode}
                  onChange={(event) => setContractForm((c) => ({ ...c, contractCode: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Số ghế / seats
                <input
                  type="number"
                  min={0}
                  value={contractForm.licenseSeats ?? ''}
                  onChange={(event) =>
                    setContractForm((c) => ({
                      ...c,
                      licenseSeats: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Gói
                <select
                  value={contractForm.planType ?? 'STANDARD'}
                  onChange={(event) => setContractForm((c) => ({ ...c, planType: event.target.value }))}
                  className={inputClass}
                >
                  <option value="STANDARD">STANDARD</option>
                  <option value="ORG_BASIC">ORG_BASIC</option>
                  <option value="PREMIUM">PREMIUM</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Trạng thái
                <select
                  value={contractForm.status ?? 'ACTIVE'}
                  onChange={(event) => setContractForm((c) => ({ ...c, status: event.target.value }))}
                  className={inputClass}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                URL tài liệu
                <input
                  value={contractForm.documentUrl ?? ''}
                  onChange={(event) => setContractForm((c) => ({ ...c, documentUrl: event.target.value }))}
                  className={inputClass}
                  placeholder="https://…"
                />
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Bắt đầu
                <input
                  type="date"
                  value={contractForm.startsOn ?? ''}
                  onChange={(event) => setContractForm((c) => ({ ...c, startsOn: event.target.value }))}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
                Kết thúc
                <input
                  type="date"
                  value={contractForm.endsOn ?? ''}
                  onChange={(event) => setContractForm((c) => ({ ...c, endsOn: event.target.value }))}
                  className={inputClass}
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Ghi chú
              <textarea
                value={contractForm.notes ?? ''}
                onChange={(event) => setContractForm((c) => ({ ...c, notes: event.target.value }))}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setContractModal(null)}>
                Hủy
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={() => void saveContract()}>
                {saving ? 'Đang lưu…' : 'Lưu hợp đồng'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {certModalOpen && (
        <AdminModal
          title="Cấp chứng nhận hàng loạt"
          subtitle={
            selectedIds.length > 0
              ? `${selectedIds.length} thành viên đã chọn`
              : 'Toàn bộ roster ACTIVE'
          }
          icon="verified"
          onClose={() => !saving && setCertModalOpen(false)}
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 font-label-sm text-label-sm text-outline">
              Tiêu đề chứng nhận
              <input
                value={certTitle}
                onChange={(event) => setCertTitle(event.target.value)}
                className={inputClass}
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2 border-t border-outline-variant/50 pt-4">
              <button
                type="button"
                className={btnGhost}
                disabled={saving || !orgId}
                onClick={() =>
                  void (async () => {
                    if (!orgId) return
                    try {
                      const blob = await adminApi.exportOrgCertificatesCsv(orgId)
                      downloadBlob(blob, `org-${orgId}-certificates.csv`)
                      showToast({ message: 'Đã xuất CSV chứng nhận.', type: 'success' })
                    } catch (cause) {
                      showToast({ message: getFriendlyErrorMessage(cause, 'quest'), type: 'error' })
                    }
                  })()
                }
              >
                Xuất CSV
              </button>
              <button type="button" className={btnGhost} disabled={saving} onClick={() => setCertModalOpen(false)}>
                Hủy
              </button>
              <button type="button" className={btnPrimary} disabled={saving} onClick={() => void issueCertificates()}>
                {saving ? 'Đang cấp…' : 'Cấp chứng nhận'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </section>
  )
}
