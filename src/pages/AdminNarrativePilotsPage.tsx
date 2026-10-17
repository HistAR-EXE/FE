import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoading,
} from "../components/admin/AdminAsyncState";
import { AdminModal } from "../components/admin/AdminModal";
import { AdminPagination } from "../components/admin/AdminPagination";
import { AdminPageHeader } from "../components/admin/AdminPageHeader";
import {
  NarrativeGraphEditor,
  NarrativeRewardsEditor,
  NarrativeSourcesEditor,
} from "../components/admin/NarrativeGraphEditor";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import {
  adminApi,
  type AdminAuditEvent,
  type DeleteReasonPreset,
  type NarrativeGraphAdmin,
  type NarrativePilotAdmin,
  type NarrativePilotDetail,
  type NarrativeReadiness,
  type NarrativeDestinationReadiness,
  type PageResponse,
} from "../features/admin/api";
import {
  buildNarrativePilotSearchParams,
  clearAdminDraft,
  createLatestRequestGuard,
  dedupeNarrativeAuditEvents,
  getNarrativeRolloutActions,
  parseNarrativePilotListState,
  readAdminDraft,
  shouldPreserveAdminDraft,
  validateDeleteReason,
  validateNarrativeGraph,
  validateNarrativeReviewNote,
  writeAdminDraft,
} from "../features/admin/state";
import { ApiError, type StructuredGateError } from "../shared/api/contracts";
import { getFriendlyErrorMessage } from "../shared/api/errorMessages";
import { useAuth } from "../shared/auth/useAuth";
import { useToast } from "../shared/ui/toast/useToast";
import { locationsApi, type Location } from "../features/locations/api";

type Tab = "readiness" | "graph" | "sources" | "reward" | "history";
type RolloutAction = "enable" | "pause" | "resume" | "publish-draft" | "rollback";
type SavedForm = { graph: NarrativeGraphAdmin; note: string };

const ROUTE = "/admin/narrative-pilots";
const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "readiness", label: "Độ sẵn sàng", icon: "checklist" },
  { id: "graph", label: "Sơ đồ", icon: "account_tree" },
  { id: "sources", label: "Nguồn & trích dẫn", icon: "menu_book" },
  { id: "reward", label: "Phần thưởng & kết thúc", icon: "military_tech" },
  { id: "history", label: "Lịch sử", icon: "history" },
];

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
function pilotCode(questId: string) {
  return `PLT-${questId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}
function locationLabel(locationName?: string | null, locationId?: string | null) {
  if (locationName?.trim()) return locationName.trim();
  if (locationId?.trim() && !looksLikeUuid(locationId)) return locationId.trim();
  return "Chưa gắn địa điểm";
}
function nodeTypeIcon(type: string) {
  if (type === "TOUR_360_OBSERVATION") return "360";
  if (type === "AI_INTERVIEW") return "forum";
  if (type === "SOURCE_COMPARISON") return "compare";
  if (type === "OUTCOME") return "military_tech";
  return "view_in_ar";
}
function nodeTypeLabel(type: string) {
  if (type === "TOUR_360_OBSERVATION") return "Tour 360°";
  if (type === "AI_INTERVIEW") return "Phỏng vấn AI";
  if (type === "SOURCE_COMPARISON") return "Đối chiếu nguồn";
  if (type === "OUTCOME") return "Kết thúc";
  return "Chứng cứ / AR";
}
const reviewLabels: Record<string, string> = {
  DRAFT: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};
const rolloutLabels: Record<string, string> = {
  NOT_RELEASED: "Chưa phát hành",
  ACTIVE: "Đang hoạt động",
  PAUSED: "Đã tạm dừng",
};

function StatusBadge({
  label,
  icon,
  tone,
}: {
  label: string;
  icon: string;
  tone: "neutral" | "success" | "warning" | "danger";
}) {
  const pill =
    tone === "success"
      ? "ops-pill ops-pill-success"
      : tone === "warning"
        ? "ops-pill ops-pill-warn"
        : tone === "danger"
          ? "ops-pill ops-pill-danger"
          : "ops-pill ops-pill-neutral";
  return (
    <span className={pill}>
      <MaterialIcon name={icon} className="text-[13px]" />
      {label}
    </span>
  );
}

const inputClass =
  "rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-body-md text-body-md text-on-surface";
const btnGhost =
  "inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-2 font-label-sm text-label-sm text-on-surface hover:bg-surface-container-high disabled:opacity-50";
const btnDanger =
  "inline-flex items-center gap-1.5 rounded-lg border border-error/40 bg-error-container/40 px-3 py-2 font-label-sm text-label-sm font-bold text-error disabled:opacity-50";
function reviewTone(status: string) {
  return status === "APPROVED"
    ? ("success" as const)
    : status === "REJECTED"
      ? ("danger" as const)
      : ("warning" as const);
}
function rolloutTone(status: string) {
  return status === "ACTIVE"
    ? ("success" as const)
    : status === "PAUSED"
      ? ("warning" as const)
      : ("neutral" as const);
}
function statusOf(error: unknown) {
  return error instanceof ApiError
    ? error.status
    : typeof error === "object" && error && "status" in error
      ? error.status
      : undefined;
}
function readinessFieldErrors(
  readiness: NarrativeReadiness | null,
  graph: NarrativeGraphAdmin | null,
) {
  if (!readiness || !graph) return {};
  return Object.fromEntries(
    readiness.items
      .filter((item) => !item.passed && item.field)
      .map((item) => {
        const nodeIndex = item.nodeCode
          ? graph.nodes.findIndex((node) => node.code === item.nodeCode)
          : -1;
        return [
          nodeIndex >= 0 && !item.field!.startsWith("nodes.")
            ? `nodes.${nodeIndex}.${item.field}`
            : item.field!,
          item.message,
        ];
      }),
  );
}

export function AdminNarrativePilotsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseNarrativePilotListState(searchParams);
  const locationId = searchParams.get("locationId") ?? "";
  const sort = searchParams.get("sort") ?? "questTitle,asc";
  const requestedTab = searchParams.get("tab") as Tab | null;
  const activeTab =
    requestedTab && tabs.some((item) => item.id === requestedTab)
      ? requestedTab
      : "readiness";
  const [search, setSearch] = useState(filters.q);
  const [locations, setLocations] = useState<Location[]>([]);
  const [result, setResult] =
    useState<PageResponse<NarrativePilotAdmin> | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [detail, setDetail] = useState<NarrativePilotDetail | null>(null);
  const [readiness, setReadiness] = useState<NarrativeReadiness | null>(null);
  const [publishedReadiness, setPublishedReadiness] =
    useState<NarrativeReadiness | null>(null);
  const [audit, setAudit] = useState<AdminAuditEvent[]>([]);
  const [graph, setGraph] = useState<NarrativeGraphAdmin | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [rollbackAction, setRollbackAction] = useState<"pause" | "rollback" | null>(null);
  const [gateErrors, setGateErrors] = useState<StructuredGateError[]>([]);
  const listGuard = useRef(createLatestRequestGuard());
  const detailGuard = useRef(createLatestRequestGuard());
  const rolloutKeys = useRef(new Map<string, string>());
  const { user } = useAuth();
  const { showToast } = useToast();
  const userId = user?.id;
  const draft = detail?.draft ?? null;
  const emptyGraph: NarrativeGraphAdmin = {
    startNodeCode: "",
    nodes: [],
    evidenceNodeCodes: [],
    outcomeNodeCodes: [],
    sources: [],
  };
  const fieldErrors = useMemo(
    () => ({
      ...validateNarrativeGraph(graph ?? emptyGraph),
      ...readinessFieldErrors(readiness, graph),
      ...errors,
    }),
    [errors, graph, readiness],
  );

  const updateFilters = (patch: Partial<typeof filters>) => {
    const next = { ...filters, ...patch };
    if (!("page" in patch)) next.page = 0;
    const params = buildNarrativePilotSearchParams(next);
    if (activeTab !== "readiness") params.set("tab", activeTab);
    if (locationId) params.set("locationId", locationId);
    if (sort !== "questTitle,asc") params.set("sort", sort);
    setSearchParams(params);
  };
  const loadList = useCallback(() => {
    const request = listGuard.current.begin();
    setLoading(true);
    setLoadError(null);
    adminApi
      .listNarrativePilots({
        page: filters.page,
        size: 20,
        q: filters.q || undefined,
        reviewStatus: filters.reviewStatus || undefined,
        rolloutState: filters.rolloutState || undefined,
        locationId: locationId || undefined,
        sort,
      })
      .then((next) => {
        if (!request.isLatest()) return;
        setResult(next);
        setSelectedQuestId((current) =>
          current && next.items.some((item) => item.questId === current)
            ? current
            : (next.items[0]?.questId ?? null),
        );
      })
      .catch((error) => {
        if (request.isLatest())
          setLoadError(getFriendlyErrorMessage(error, "quest"));
      })
      .finally(() => {
        if (request.isLatest()) setLoading(false);
      });
  }, [filters.page, filters.q, filters.reviewStatus, filters.rolloutState, locationId, sort]);
  const loadDetail = useCallback(
    (questId: string) => {
      const request = detailGuard.current.begin();
      setDetailLoading(true);
      setDetailError(null);
      setPermissionError(null);
      adminApi
        .narrativeDetail(questId)
        .then(async (next) => {
          if (!request.isLatest()) return;
          const [nextReadiness, nextPublishedReadiness, nextAudit] =
            await Promise.all([
              next.draftVersion == null
                ? Promise.resolve(null)
                : adminApi.narrativeReadiness(questId, next.draftVersion),
              next.publishedVersion == null ||
              next.publishedVersion === next.draftVersion
                ? Promise.resolve(null)
                : adminApi.narrativeReadiness(questId, next.publishedVersion),
              adminApi.narrativeAudit(questId),
            ]);
          if (!request.isLatest()) return;
          setDetail(next);
          setReadiness(nextReadiness);
          setPublishedReadiness(nextPublishedReadiness);
          setAudit(dedupeNarrativeAuditEvents(nextAudit));
          const saved =
            userId && typeof sessionStorage !== "undefined"
              ? readAdminDraft<SavedForm>(
                  sessionStorage,
                  userId,
                  ROUTE,
                  `narrative:${questId}:draft`,
                )
              : null;
          setGraph(
            saved?.graph ?? next.draft?.graph ?? next.published?.graph ?? null,
          );
          setNote(saved?.note ?? "");
          setErrors({});
        })
        .catch((error) => {
          if (request.isLatest())
            setDetailError(getFriendlyErrorMessage(error, "quest"));
        })
        .finally(() => {
          if (request.isLatest()) setDetailLoading(false);
        });
    },
    [userId],
  );
  useEffect(() => {
    loadList();
    return () => listGuard.current.invalidate();
  }, [loadList]);
  useEffect(() => {
    if (selectedQuestId) loadDetail(selectedQuestId);
    else {
      setDetail(null);
      setGraph(null);
    }
    return () => detailGuard.current.invalidate();
  }, [loadDetail, selectedQuestId]);
  useEffect(() => setSearch(filters.q), [filters.q]);
  useEffect(() => { locationsApi.list({ size: 100 }).then(setLocations).catch(() => setLocations([])); }, []);

  const updateExtraFilter = (key: "locationId" | "sort", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && !(key === "sort" && value === "questTitle,asc")) next.set(key, value); else next.delete(key);
    next.delete("page");
    setSearchParams(next);
  };

  const preserveUnauthorized = (error: unknown) => {
    if (
      detail &&
      graph &&
      userId &&
      typeof sessionStorage !== "undefined" &&
      shouldPreserveAdminDraft(error)
    )
      writeAdminDraft(
        sessionStorage,
        userId,
        ROUTE,
        `narrative:${detail.questId}:draft`,
        { graph, note } satisfies SavedForm,
      );
  };
  const clearSaved = () => {
    if (detail && userId && typeof sessionStorage !== "undefined")
      clearAdminDraft(
        sessionStorage,
        userId,
        ROUTE,
        `narrative:${detail.questId}:draft`,
      );
  };
  const handleMutationError = (error: unknown) => {
    preserveUnauthorized(error);
    if (statusOf(error) === 403)
      setPermissionError(
        "Biểu mẫu vẫn được giữ nguyên, nhưng tài khoản này không có quyền thực hiện thao tác.",
      );
    if (error instanceof ApiError && error.fieldErrors)
      setErrors(error.fieldErrors);
    if (error instanceof ApiError)
      setGateErrors(error.gateErrors ?? []);
    showToast({
      message: getFriendlyErrorMessage(error, "quest"),
      type: "error",
    });
  };
  const refresh = async () => {
    if (detail) {
      loadDetail(detail.questId);
      loadList();
    }
  };
  const createDraft = async () => {
    if (!detail || working) return;
    if (detail.draft) {
      showToast({
        message: `Pilot này đã có bản nháp v${detail.draftVersion}. Đang mở sơ đồ để chỉnh sửa.`,
        type: "success",
      });
      setTab("graph");
      return;
    }
    setWorking("create");
    try {
      await adminApi.createNarrativeDraft(detail.questId, {
        rowVersion: detail.rowVersion,
      });
      showToast({
        message: "Đã tạo bản nháp pilot mới. Có thể chỉnh sơ đồ và nguồn ngay.",
        type: "success",
      });
      await refresh();
      setTab("graph");
    } catch (error) {
      handleMutationError(error);
      if (error instanceof ApiError && error.code === "DRAFT_ALREADY_EXISTS")
        await refresh();
    } finally {
      setWorking(null);
    }
  };
  const startPilotAction = () => {
    if (working) return;
    if (!detail) {
      showToast({
        message: "Chọn một quest bên trái trước khi khởi tạo pilot.",
        type: "error",
      });
      return;
    }
    void createDraft();
  };
  const saveDraft = async () => {
    if (!detail || !draft || !graph || working) return;
    const localErrors = validateNarrativeGraph(graph);
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      showToast({
        message: "Kiểm tra các trường được đánh dấu trong graph.",
        type: "error",
      });
      return;
    }
    setWorking("save");
    try {
      await adminApi.updateNarrativeDraft(detail.questId, draft.version, {
        rowVersion: draft.rowVersion,
        graph,
      });
      clearSaved();
      showToast({ message: "Đã lưu draft.", type: "success" });
      await refresh();
    } catch (error) {
      handleMutationError(error);
    } finally {
      setWorking(null);
    }
  };
  const submitReview = async (decision: "APPROVED" | "REJECTED") => {
    if (!detail || !draft || working) return;
    const noteError = validateNarrativeReviewNote(note);
    if (noteError) {
      setErrors((current) => ({ ...current, reviewNote: noteError }));
      return;
    }
    setWorking(`review-${decision}`);
    try {
      await adminApi.reviewNarrative(detail.questId, {
        version: draft.version,
        revision: draft.revision,
        decision,
        approvedLocales: decision === "APPROVED" ? ["vi"] : [],
        note: note.trim(),
      });
      clearSaved();
      setNote("");
      showToast({
        message:
          decision === "APPROVED"
            ? "Đã duyệt draft tiếng Việt."
            : "Đã từ chối draft.",
        type: "success",
      });
      await refresh();
    } catch (error) {
      handleMutationError(error);
    } finally {
      setWorking(null);
    }
  };
  const runRollout = async (
    action: RolloutAction,
    reason?: { reasonPreset: DeleteReasonPreset; reasonDetail: string },
  ) => {
    if (!detail || working) return;
    const rollbackTarget = detail.versions
      ?.filter((item) => item.version < (detail.publishedVersion ?? Number.MAX_SAFE_INTEGER))
      .filter((item) => item.reviewStatus === "APPROVED")
      .sort((left, right) => right.version - left.version)[0]?.version ?? null;
    const version =
      action === "publish-draft" || action === "enable"
        ? detail.draftVersion
        : action === "rollback"
          ? rollbackTarget
          : detail.publishedVersion;
    if (version == null) return;
    setWorking(action);
    const body = {
      version,
      rowVersion: detail.rowVersion,
      ...(reason
        ? {
            reasonPreset: reason.reasonPreset,
            reasonDetail: reason.reasonDetail || null,
          }
        : {}),
    };
    const requestIdentity = `${detail.questId}:${action}:${JSON.stringify(body)}`;
    const idempotencyKey =
      rolloutKeys.current.get(requestIdentity) ?? crypto.randomUUID();
    rolloutKeys.current.set(requestIdentity, idempotencyKey);
    try {
      if (action === "enable")
        await adminApi.enableNarrative(detail.questId, body, idempotencyKey);
      if (action === "pause")
        await adminApi.pauseNarrative(detail.questId, body, idempotencyKey);
      if (action === "rollback")
        await adminApi.rollbackNarrative(detail.questId, body, idempotencyKey);
      if (action === "resume")
        await adminApi.resumeNarrative(detail.questId, body, idempotencyKey);
      if (action === "publish-draft")
        await adminApi.publishNarrativeDraft(
          detail.questId,
          body,
          idempotencyKey,
        );
      rolloutKeys.current.delete(requestIdentity);
      setRollbackAction(null);
      showToast({ message: "Đã cập nhật trạng thái phát hành cốt truyện.", type: "success" });
      setGateErrors([]);
      await refresh();
    } catch (error) {
      handleMutationError(error);
    } finally {
      setWorking(null);
    }
  };
  const setTab = (tab: Tab) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (tab === "readiness") next.delete("tab");
      else next.set("tab", tab);
      return next;
    });
  const onTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
            tabs.length;
    setTab(tabs[nextIndex].id);
    document.getElementById(`narrative-tab-${tabs[nextIndex].id}`)?.focus();
  };
  const reviewStatus =
    detail?.draft?.reviewStatus ?? detail?.reviewStatus ?? "DRAFT";
  const rolloutState = detail?.rolloutState ?? "NOT_RELEASED";
  const rolloutActions = detail
    ? getNarrativeRolloutActions({
        rolloutState,
        publishedVersion: detail.publishedVersion,
        draftVersion: detail.draftVersion,
        draftReviewStatus:
          detail.draft?.reviewStatus ?? detail.draftReviewStatus ?? null,
        rollbackTargetVersion:
          detail.versions
            ?.filter((item) => item.version < (detail.publishedVersion ?? Number.MAX_SAFE_INTEGER))
            .filter((item) => item.reviewStatus === "APPROVED")
            .sort((left, right) => right.version - left.version)[0]?.version ?? null,
      })
    : [];
  const blockingItems = readiness?.items.filter((item) => !item.passed) ?? [];
  const rolloutBlocked = !readiness?.ready;
  const resumeBlocked = rolloutState === "PAUSED" && !publishedReadiness?.ready;
  const nodeCount = graph?.nodes.length ?? 0;
  const sourceCount = graph?.sources.length ?? 0;
  const evidenceCount = graph?.evidenceNodeCodes.length ?? 0;
  const graphRewardXp =
    graph?.nodes.reduce((sum, node) => sum + (node.rewardXp ?? 0), 0) ?? 0;
  const fixedRewardXp =
    draft?.runtimeRewardXp ?? detail?.published?.runtimeRewardXp ?? null;
  const rewardXpDisplay =
    typeof fixedRewardXp === "number" ? fixedRewardXp : graphRewardXp;
  const readinessPassed =
    readiness?.items.filter((item) => item.passed).length ?? 0;
  const readinessTotal = readiness?.items.length ?? 0;
  const readinessPct =
    readinessTotal > 0
      ? Math.round((readinessPassed / readinessTotal) * 100)
      : null;
  const openCount =
    result?.items.filter((item) => item.reviewStatus === "DRAFT").length ??
    result?.totalItems ??
    0;

  return (
    <section
      className="flex w-full flex-col pb-20"
      aria-busy={loading || detailLoading}
    >
      <AdminPageHeader
        eyebrow="Vận hành / Cốt truyện AR"
        title="Pilot cốt truyện"
        description="Soạn cấu trúc, duyệt phiên bản và phát hành mà không ghi đè trải nghiệm đang chạy."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                loadList();
                if (selectedQuestId) loadDetail(selectedQuestId);
              }}
              className={btnGhost}
            >
              <MaterialIcon name="refresh" className="text-[16px]" /> Tải lại
            </button>
            <Link to="/admin/audit" className={btnGhost}>
              <MaterialIcon name="history" className="text-[16px]" /> Nhật ký Audit
            </Link>
            <button
              type="button"
              disabled={Boolean(working)}
              title={
                detail?.draft
                  ? `Mở bản nháp v${detail.draftVersion}`
                  : "Tạo bản nháp pilot từ quest đang chọn"
              }
              onClick={startPilotAction}
              className="ops-btn-primary disabled:opacity-50"
            >
              <MaterialIcon name="add_circle" className="text-[16px]" />
              {working === "create"
                ? "Đang tạo…"
                : detail?.draft
                  ? "Mở bản nháp"
                  : "Khởi tạo Pilot mới"}
            </button>
          </div>
        }
      />

      <form
        className="mb-space-lg flex flex-col gap-space-md rounded-xl bg-surface-container-low px-4 py-space-md shadow-md xl:flex-row xl:items-center xl:justify-between"
        onSubmit={(event) => {
          event.preventDefault();
          updateFilters({ q: search.trim() });
        }}
      >
        <div className="flex flex-1 flex-col items-stretch gap-space-md sm:flex-row sm:items-center">
          <div className="relative max-w-lg flex-1">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline"
            />
            <input
              aria-label="Tìm pilot cốt truyện"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm quest hoặc kịch bản cốt truyện…"
              className="w-full rounded-lg bg-surface-container-lowest py-2 pl-9 pr-4 font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:bg-surface-container-high focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Trạng thái duyệt"
              value={filters.reviewStatus}
              onChange={(event) =>
                updateFilters({ reviewStatus: event.target.value })
              }
              className="rounded-lg bg-surface-container-lowest px-3 py-2 font-label-sm text-label-sm text-on-surface-variant"
            >
              <option value="">Trạng thái: Tất cả</option>
              <option value="DRAFT">Trạng thái: Chờ duyệt</option>
              <option value="APPROVED">Trạng thái: Đã duyệt</option>
              <option value="REJECTED">Trạng thái: Từ chối</option>
            </select>
            <select
              aria-label="Lọc địa điểm"
              value={locationId}
              onChange={(event) =>
                updateExtraFilter("locationId", event.target.value)
              }
              className="rounded-lg bg-surface-container-lowest px-3 py-2 font-label-sm text-label-sm text-on-surface-variant"
            >
              <option value="">Địa điểm: Toàn quốc</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Trạng thái phát hành"
              value={filters.rolloutState}
              onChange={(event) =>
                updateFilters({ rolloutState: event.target.value })
              }
              className="hidden rounded-lg bg-surface-container-lowest px-3 py-2 font-label-sm text-label-sm text-on-surface-variant md:block"
            >
              <option value="">Phát hành: Tất cả</option>
              <option value="NOT_RELEASED">Chưa phát hành</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="PAUSED">Đã tạm dừng</option>
            </select>
            <select
              aria-label="Sắp xếp pilot"
              value={sort}
              onChange={(event) => updateExtraFilter("sort", event.target.value)}
              className="hidden rounded-lg bg-surface-container-lowest px-3 py-2 font-label-sm text-label-sm text-on-surface-variant lg:block"
            >
              <option value="questTitle,asc">Sắp xếp: Tên A–Z</option>
              <option value="questTitle,desc">Sắp xếp: Tên Z–A</option>
              <option value="updatedAt,desc">Sắp xếp: Mới cập nhật</option>
            </select>
            <button type="submit" className="ops-btn-primary justify-center px-4 py-2">
              Tìm
            </button>
          </div>
        </div>
      </form>

      {loading && <AdminLoading label="Đang tải pilot cốt truyện" />}
      {!loading && loadError && (
        <AdminErrorState message={loadError} onRetry={loadList} />
      )}
      {!loading && !loadError && result?.items.length === 0 && (
        <AdminEmptyState
          title="Không có pilot cốt truyện"
          detail="Thử thay đổi bộ lọc hoặc tạo cốt truyện từ máy chủ."
        />
      )}
      {!loading && !loadError && result && result.items.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-space-md xl:grid-cols-12">
          <aside className="flex min-w-0 flex-col gap-space-sm xl:col-span-4 xl:sticky xl:top-20 xl:self-start">
            <div className="flex items-center justify-between px-space-sm">
              <div className="flex items-center gap-space-xs">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  Danh sách Quest Pilot
                </h2>
                <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-code-sm text-code-sm text-primary">
                  {openCount} đang mở
                </span>
              </div>
              <span className="ops-pill ops-pill-neutral">{result.totalItems}</span>
            </div>
            <div className="max-h-[72vh] space-y-2 overflow-y-auto pr-0.5">
              {result.items.map((pilot) => {
                const selected = selectedQuestId === pilot.questId;
                const code = pilotCode(pilot.questId);
                const versionLabel =
                  pilot.draftVersion != null
                    ? `v${pilot.draftVersion}`
                    : pilot.publishedVersion != null
                      ? `v${pilot.publishedVersion}`
                      : "—";
                return (
                  <button
                    key={pilot.questId}
                    type="button"
                    onClick={() => setSelectedQuestId(pilot.questId)}
                    aria-pressed={selected}
                    className={`group relative w-full overflow-hidden rounded-xl p-space-md text-left transition-all ${
                      selected
                        ? "bg-surface-container-high shadow-md"
                        : "bg-surface-container-low shadow-sm hover:bg-surface-container"
                    }`}
                  >
                    {selected && (
                      <span className="absolute bottom-0 left-0 top-0 w-1 bg-primary" />
                    )}
                    <div
                      className={`mb-2 flex items-start justify-between gap-space-sm ${selected ? "pl-2" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-label-sm text-label-sm uppercase tracking-widest ${
                              selected ? "text-secondary" : "text-outline"
                            }`}
                          >
                            {code}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-outline" />
                          <span className="font-code-sm text-code-sm text-outline">
                            {versionLabel}
                          </span>
                        </div>
                        <h3 className="mt-0.5 truncate font-headline-sm text-headline-sm leading-tight text-on-surface transition-colors group-hover:text-primary">
                          {pilot.questTitle}
                        </h3>
                      </div>
                      <StatusBadge
                        label={
                          reviewLabels[pilot.reviewStatus] ?? pilot.reviewStatus
                        }
                        icon={
                          pilot.reviewStatus === "APPROVED"
                            ? "verified"
                            : pilot.reviewStatus === "REJECTED"
                              ? "cancel"
                              : "rate_review"
                        }
                        tone={reviewTone(pilot.reviewStatus)}
                      />
                    </div>
                    <div
                      className={`mb-2.5 flex flex-wrap items-center gap-1.5 ${selected ? "pl-2" : ""}`}
                    >
                      <span className="rounded bg-primary-container/15 px-2 py-0.5 font-label-sm text-label-sm text-primary">
                        AR Quest
                      </span>
                      <span className="flex items-center gap-0.5 rounded bg-surface-container-lowest px-2 py-0.5 font-label-sm text-label-sm text-outline">
                        <MaterialIcon name="location_on" className="text-[12px]" />
                        {locationLabel(pilot.locationName, pilot.locationId)}
                      </span>
                    </div>
                    <div
                      className={`flex items-center justify-between rounded-lg bg-surface-container-lowest/40 p-2 font-body-sm text-body-sm text-outline ${selected ? "pl-2" : ""}`}
                    >
                      <StatusBadge
                        label={
                          rolloutLabels[pilot.rolloutState] ?? pilot.rolloutState
                        }
                        icon={
                          pilot.rolloutState === "ACTIVE"
                            ? "play_circle"
                            : pilot.rolloutState === "PAUSED"
                              ? "pause_circle"
                              : "schedule"
                        }
                        tone={rolloutTone(pilot.rolloutState)}
                      />
                      {selected && readinessPct != null ? (
                        <span className="flex items-center gap-1 font-label-sm text-label-sm text-primary">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                          Sẵn sàng {readinessPct}%
                        </span>
                      ) : (
                        <span className="font-code-sm text-code-sm text-outline">
                          {versionLabel}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <AdminPagination
              page={result.page}
              totalPages={result.totalPages}
              totalItems={result.totalItems}
              onPageChange={(page) => updateFilters({ page })}
            />
          </aside>

          <main className="flex min-w-0 flex-col gap-space-md xl:col-span-8">
            {detailLoading && <AdminLoading label="Đang tải chi tiết pilot" />}
            {!detailLoading && detailError && (
              <AdminErrorState
                message={detailError}
                onRetry={() => selectedQuestId && loadDetail(selectedQuestId)}
              />
            )}
            {!detailLoading && !detailError && detail && (
              <>
                <div className="flex flex-col gap-space-md rounded-xl bg-surface-container-low p-space-lg shadow-md">
                  <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-space-sm">
                        <StatusBadge
                          label={reviewLabels[reviewStatus] ?? reviewStatus}
                          icon="rate_review"
                          tone={reviewTone(reviewStatus)}
                        />
                        <span className="font-code-sm text-code-sm text-outline">
                          {pilotCode(detail.questId)}
                        </span>
                        <span className="text-outline">•</span>
                        <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                          <MaterialIcon
                            name="location_on"
                            className="text-[16px] text-primary"
                          />
                          {locationLabel(detail.locationName, detail.locationId)}
                        </span>
                        <StatusBadge
                          label={rolloutLabels[rolloutState] ?? rolloutState}
                          icon="rocket_launch"
                          tone={rolloutTone(rolloutState)}
                        />
                      </div>
                      <h3 className="mt-1 font-headline-xl text-headline-xl tracking-tight text-on-surface">
                        {detail.questTitle}
                      </h3>
                      <p className="font-body-md text-body-md text-outline">
                        Phiên bản đã phát hành{" "}
                        {detail.publishedVersion
                          ? `v${detail.publishedVersion}`
                          : "—"}{" "}
                        · Bản nháp{" "}
                        {detail.draftVersion ? `v${detail.draftVersion}` : "—"}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 self-start lg:self-center">
                      {!detail.draft && (
                        <button
                          type="button"
                          onClick={() => void createDraft()}
                          disabled={Boolean(working)}
                          className="ops-btn-primary disabled:opacity-50"
                        >
                          {working === "create" ? "Đang tạo…" : "Tạo bản nháp"}
                        </button>
                      )}
                      {rolloutActions.map((action) => {
                        const needsReadiness =
                          action.action === "enable" ||
                          action.action === "publish-draft";
                        const disabled =
                          Boolean(working) ||
                          (needsReadiness && rolloutBlocked) ||
                          (action.action === "resume" && resumeBlocked);
                        const disabledReason =
                          action.action === "resume" && resumeBlocked
                            ? publishedReadiness?.items
                                .filter((item) => !item.passed)
                                .map((item) => item.message)
                                .join(" ")
                            : blockingItems
                                .map((item) => item.message)
                                .join(" ");
                        return (
                          <button
                            key={action.action}
                            type="button"
                            disabled={disabled}
                            title={disabled ? disabledReason : undefined}
                            onClick={() =>
                              action.action === "pause" || action.action === "rollback"
                                ? setRollbackAction(action.action)
                                : void runRollout(action.action)
                            }
                            className={
                              action.action === "pause" || action.action === "rollback"
                                ? btnDanger
                                : "ops-btn-primary disabled:opacity-50"
                            }
                          >
                            {working === action.action
                              ? "Đang xử lý…"
                              : action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-space-sm pt-space-sm sm:grid-cols-4">
                    <div className="flex flex-col rounded-lg bg-surface-container p-space-sm">
                      <span className="font-label-sm text-label-sm uppercase text-outline">
                        Số node kịch bản
                      </span>
                      <span className="mt-0.5 font-headline-md text-headline-md text-on-surface">
                        {nodeCount || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col rounded-lg bg-surface-container p-space-sm">
                      <span className="font-label-sm text-label-sm uppercase text-outline">
                        Nguồn & trích dẫn
                      </span>
                      <span className="mt-0.5 font-headline-md text-headline-md text-secondary">
                        {sourceCount || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col rounded-lg bg-surface-container p-space-sm">
                      <span className="font-label-sm text-label-sm uppercase text-outline">
                        Evidence nodes
                      </span>
                      <span className="mt-0.5 font-headline-md text-headline-md text-tertiary">
                        {evidenceCount || "—"}
                      </span>
                    </div>
                    <div className="flex flex-col rounded-lg bg-surface-container p-space-sm">
                      <span className="font-label-sm text-label-sm uppercase text-outline">
                        Điểm thưởng hoàn tất
                      </span>
                      <span className="mt-0.5 font-headline-md text-headline-md text-primary">
                        {rewardXpDisplay > 0 ? `+${rewardXpDisplay} XP` : "—"}
                      </span>
                    </div>
                  </div>

                  {rolloutBlocked &&
                    rolloutActions.some(
                      (action) =>
                        action.action === "enable" ||
                        action.action === "publish-draft",
                    ) && (
                      <p className="rounded-lg border border-outline-variant bg-tertiary/10 px-3 py-2 font-body-sm text-body-sm text-tertiary">
                        Hành động đang khóa:{" "}
                        {blockingItems[0]?.message ?? "Độ sẵn sàng chưa đạt."}
                      </p>
                    )}
                  {resumeBlocked &&
                    rolloutActions.some(
                      (action) => action.action === "resume",
                    ) && (
                      <p className="rounded-lg border border-outline-variant bg-tertiary/10 px-3 py-2 font-body-sm text-body-sm text-tertiary">
                        Không thể tiếp tục phiên bản đã phát hành:{" "}
                        {publishedReadiness?.items.find((item) => !item.passed)
                          ?.message ?? "Độ sẵn sàng chưa đạt."}
                      </p>
                    )}
                </div>

                {permissionError && (
                  <div
                    role="alert"
                    className="flex gap-3 rounded-xl border border-error/40 bg-error-container/40 p-4 text-error"
                  >
                    <MaterialIcon name="lock" />
                    <p className="font-body-sm text-body-sm font-semibold">
                      {permissionError}
                    </p>
                  </div>
                )}

                <div
                  role="tablist"
                  aria-label="Chi tiết pilot cốt truyện"
                  className="flex items-center gap-1 overflow-x-auto rounded-xl bg-surface-container-lowest p-1.5 shadow-sm"
                >
                  {tabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      id={`narrative-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      aria-controls={`narrative-panel-${tab.id}`}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      onClick={() => setTab(tab.id)}
                      onKeyDown={(event) => onTabKeyDown(event, index)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-space-md py-2 font-headline-sm text-headline-sm transition-colors ${
                        activeTab === tab.id
                          ? "bg-surface-container-high text-primary shadow-sm"
                          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                      }`}
                    >
                      <MaterialIcon name={tab.icon} className="text-[18px]" />
                      {tab.label}
                      {tab.id === "readiness" && readiness && (
                        <span
                          className={`ml-1 h-2 w-2 rounded-full ${
                            readiness.ready ? "bg-primary" : "bg-tertiary"
                          }`}
                        />
                      )}
                      {tab.id === "history" && detail.draftVersion != null && (
                        <span className="rounded bg-surface-container px-1.5 py-0.5 font-code-sm text-code-sm text-outline">
                          v{detail.draftVersion}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div
                  id={`narrative-panel-${activeTab}`}
                  role="tabpanel"
                  aria-labelledby={`narrative-tab-${activeTab}`}
                  className="space-y-space-md"
                >
                  {activeTab === "readiness" && (
                    <ReadinessTab
                      detail={detail}
                      readiness={readiness}
                      graph={graph}
                      note={note}
                      noteError={errors.reviewNote}
                      working={working}
                      onNoteChange={(value) => {
                        setNote(value);
                        setErrors((current) => ({
                          ...current,
                          reviewNote: "",
                        }));
                      }}
                      onReview={submitReview}
                      gateErrors={gateErrors}
                      locationData={locations.find((l) => l.id === detail.locationId)}
                      onToggleAr={async (isArAvailable) => {
                        if (!detail.locationId) return;
                        const reason = isArAvailable
                          ? `Admin phát hành ${detail.questTitle ?? detail.questId} ra map`
                          : `Admin ẩn ${detail.questTitle ?? detail.questId} khỏi map`;
                        await adminApi.toggleArAvailability(detail.locationId, { isArAvailable, reason });
                        // Refresh locations list so badge updates immediately
                        locationsApi.list({ size: 100 }).then(setLocations).catch(() => undefined);
                      }}
                    />
                  )}
                  {activeTab === "graph" && graph && (
                    <>
                      <QuestNodeFlow graph={graph} />
                      <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
                        <EditorHeader
                          title="Sơ đồ bản nháp có cấu trúc"
                          detail="Mỗi node dùng đúng trường runtime; choice chỉ trỏ đến node tồn tại."
                          onSave={saveDraft}
                          saving={working === "save"}
                          disabled={!draft || Boolean(working)}
                        />
                        {draft ? (
                          <NarrativeGraphEditor
                            graph={graph}
                            errors={fieldErrors}
                            onChange={setGraph}
                          />
                        ) : (
                          <AdminEmptyState
                            title="Chưa có draft"
                            detail="Tạo một draft để chỉnh graph mà không ảnh hưởng bản đang phát hành."
                          />
                        )}
                        <details className="mt-4 rounded-xl bg-surface-container p-3">
                          <summary className="cursor-pointer font-label-sm text-label-sm font-bold text-on-surface-variant">
                            Bản xuất dữ liệu chỉ đọc
                          </summary>
                          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap font-code-sm text-code-sm text-on-surface-variant">
                            {JSON.stringify(graph, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </>
                  )}
                  {activeTab === "sources" && graph && (
                    <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
                      <NarrativeSourcesEditor
                        graph={graph}
                        errors={fieldErrors}
                        onChange={setGraph}
                      />
                      <SaveButton
                        label="Lưu nguồn"
                        disabled={!draft || Boolean(working)}
                        saving={working === "save"}
                        onClick={saveDraft}
                      />
                    </div>
                  )}
                  {activeTab === "reward" && graph && (
                    <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
                      <NarrativeRewardsEditor
                        graph={graph}
                        fixed={Boolean(
                          draft?.runtimeRewardFixed ??
                            detail.published?.runtimeRewardFixed,
                        )}
                        fixedXp={
                          draft?.runtimeRewardXp ??
                          detail.published?.runtimeRewardXp
                        }
                        onChange={setGraph}
                      />
                      <SaveButton
                        label="Lưu reward"
                        disabled={
                          !draft ||
                          Boolean(working) ||
                          Boolean(draft?.runtimeRewardFixed)
                        }
                        saving={working === "save"}
                        onClick={saveDraft}
                      />
                    </div>
                  )}
                  {activeTab === "history" && (
                    <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
                      <HistoryTab events={audit} />
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      )}
      {rollbackAction && (
        <RollbackDialog
          action={rollbackAction}
          busy={working === rollbackAction}
          onClose={() => setRollbackAction(null)}
          onConfirm={(reason) => void runRollout(rollbackAction, reason)}
        />
      )}
    </section>
  );
}

function EditorHeader({
  title,
  detail,
  onSave,
  saving,
  disabled,
}: {
  title: string;
  detail: string;
  onSave: () => Promise<void>;
  saving: boolean;
  disabled: boolean;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface">{title}</h3>
        <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{detail}</p>
      </div>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={disabled}
        className="ops-btn-primary disabled:opacity-50"
      >
        {saving ? "Đang lưu…" : "Lưu bản nháp"}
      </button>
    </div>
  );
}
function SaveButton({
  label,
  disabled,
  saving,
  onClick,
}: {
  label: string;
  disabled: boolean;
  saving: boolean;
  onClick: () => Promise<void>;
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="ops-btn-primary mt-4 disabled:opacity-50"
    >
      {saving ? "Đang lưu…" : label}
    </button>
  );
}

function readinessTitle(code: string) {
  const map: Record<string, string> = {
    FEATURE_FLAG: "Cờ tính năng narrative",
    REVIEW_APPROVED: "Trạng thái duyệt bản nháp",
    LOCALE_VI: "Locale tiếng Việt",
    GRAPH_VALID: "Cấu trúc sơ đồ",
    SOURCE_PRESENT: "Nguồn & trích dẫn",
  };
  return map[code] ?? code.replaceAll("_", " ");
}

const READINESS_GROUPS: Array<{
  id: string;
  title: string;
  codes: string[];
}> = [
  {
    id: "system",
    title: "Hệ thống & cờ tính năng",
    codes: ["FEATURE_FLAG"],
  },
  {
    id: "review",
    title: "Thẩm định & locale",
    codes: ["REVIEW_APPROVED", "LOCALE_VI"],
  },
  {
    id: "structure",
    title: "Cấu trúc sơ đồ & nguồn",
    codes: ["GRAPH_VALID", "SOURCE_PRESENT"],
  },
];

function QuestNodeFlow({ graph }: { graph: NarrativeGraphAdmin }) {
  const [selectedCode, setSelectedCode] = useState(
    graph.startNodeCode || graph.nodes[0]?.code || "",
  );
  useEffect(() => {
    if (!graph.nodes.some((node) => node.code === selectedCode)) {
      setSelectedCode(graph.startNodeCode || graph.nodes[0]?.code || "");
    }
  }, [graph, selectedCode]);
  const selected =
    graph.nodes.find((node) => node.code === selectedCode) ?? graph.nodes[0];
  if (!graph.nodes.length) {
    return (
      <AdminEmptyState
        title="Chưa có node"
        detail="Sơ đồ kịch bản sẽ hiện khi draft có nodes."
      />
    );
  }
  return (
    <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-headline-sm text-headline-sm text-on-surface">
          Sơ đồ Kịch bản Điều hướng
        </h3>
        <span className="font-code-sm text-code-sm text-outline">
          {graph.nodes.length} node
        </span>
      </div>
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
        {graph.nodes.map((node, index) => {
          const active = node.code === selected?.code;
          return (
            <div key={node.code} className="flex min-w-[9.5rem] items-center">
              <button
                type="button"
                onClick={() => setSelectedCode(node.code)}
                className={`flex w-full flex-col items-center gap-2 rounded-xl p-3 text-center transition ${
                  active
                    ? "bg-primary/15 ring-1 ring-primary"
                    : "bg-surface-container hover:bg-surface-container-high"
                }`}
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    active
                      ? "bg-primary text-on-primary"
                      : node.type === "OUTCOME"
                        ? "bg-tertiary/20 text-tertiary"
                        : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  <MaterialIcon
                    name={nodeTypeIcon(node.type)}
                    className="text-[20px]"
                  />
                </span>
                <span className="line-clamp-2 font-label-sm text-label-sm font-bold text-on-surface">
                  {node.title?.trim() || node.code}
                </span>
                <span className="font-code-sm text-code-sm text-outline">
                  {nodeTypeLabel(node.type)}
                </span>
              </button>
              {index < graph.nodes.length - 1 && (
                <MaterialIcon
                  name="chevron_right"
                  className="mx-1 shrink-0 text-[18px] text-outline"
                />
              )}
            </div>
          );
        })}
      </div>
      {selected && (
        <p className="mt-3 rounded-lg bg-surface-container px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
          Node được chọn:{" "}
          <span className="font-semibold text-on-surface">
            {selected.title?.trim() || selected.code}
          </span>{" "}
          · type: {selected.type}
          {selected.prompt ? ` · ${selected.prompt}` : ""}
        </p>
      )}
    </div>
  );
}

function ReadinessGroupCard({
  title,
  items,
  graph,
}: {
  title: string;
  items: NarrativeReadiness["items"];
  graph: NarrativeGraphAdmin | null;
}) {
  const passed = items.filter((item) => item.passed).length;
  const total = items.length;
  const allPassed = total > 0 && passed === total;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;
  return (
    <div className="flex flex-col justify-between rounded-xl bg-surface-container-low p-space-md shadow-sm">
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="font-headline-sm text-headline-sm text-on-surface">
            {title}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-code-sm text-code-sm ${
              allPassed
                ? "bg-primary-container/20 text-primary"
                : "bg-tertiary-container/20 text-tertiary"
            }`}
          >
            {total === 0 ? "—" : `${passed}/${total}${allPassed ? " Đạt" : ""}`}
          </span>
        </div>
        <div className="mb-4 space-y-2">
          {items.length === 0 ? (
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Không có mục trong nhóm này.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={`${item.code}-${item.nodeCode ?? ""}-${item.field ?? ""}`}
                className="flex items-start justify-between gap-2 font-body-sm text-body-sm"
              >
                <span className="flex min-w-0 items-start gap-1.5 text-on-surface">
                  <MaterialIcon
                    name={item.passed ? "check_circle" : "error"}
                    className={`mt-0.5 shrink-0 text-[16px] ${
                      item.passed ? "text-primary" : "text-error"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {readinessTitle(item.code)}
                    </span>
                    <span className="block text-on-surface-variant">
                      {item.message}
                    </span>
                    {!item.passed &&
                      item.nodeCode &&
                      graph?.nodes.some(
                        (node) => node.code === item.nodeCode,
                      ) && (
                        <a
                          href={`#node-${item.nodeCode}`}
                          className="mt-1 inline-block font-label-sm text-label-sm font-bold text-primary"
                        >
                          Mở node {item.nodeCode}
                        </a>
                      )}
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
        <div
          className={`h-full rounded-full ${allPassed ? "bg-primary" : "bg-tertiary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function destinationChecklist(readiness: NarrativeReadiness | null, graph: NarrativeGraphAdmin | null): NarrativeDestinationReadiness[] {
  if (readiness?.destinations?.length) return readiness.destinations;
  const destinations = [
    { type: "TOUR_360_OBSERVATION", label: "Tour 360°", icon: "360" },
    { type: "AI_INTERVIEW", label: "Phỏng vấn AI", icon: "forum" },
    { type: "SOURCE_COMPARISON", label: "Đối chiếu nguồn", icon: "compare" },
    { type: "EVIDENCE", label: "Chứng cứ / AR", icon: "view_in_ar" },
    { type: "OUTCOME", label: "Kết thúc", icon: "military_tech" },
  ] as const;
  return destinations.map((destination) => ({
    destinationId: null,
    destinationName: destination.label,
    required: true,
    isReady: (graph?.nodes.filter((node) => node.type === destination.type) ?? []).length > 0,
    checks: [],
    ...destination,
  })).map(({ destinationId, destinationName, required, isReady, checks }) => ({
    destinationId, destinationName, required, isReady, checks,
  }));
}

function ReadinessTab({
  detail,
  readiness,
  graph,
  note,
  noteError,
  working,
  onNoteChange,
  onReview,
  gateErrors,
  locationData,
  onToggleAr,
}: {
  detail: NarrativePilotDetail;
  readiness: NarrativeReadiness | null;
  graph: NarrativeGraphAdmin | null;
  note: string;
  noteError?: string;
  working: string | null;
  onNoteChange: (value: string) => void;
  onReview: (decision: "APPROVED" | "REJECTED") => Promise<void>;
  gateErrors: StructuredGateError[];
  locationData: Location | undefined;
  onToggleAr: (isArAvailable: boolean) => Promise<void>;
}) {
  const status = detail.draft?.reviewStatus ?? detail.reviewStatus;
  const passedCount = readiness?.items.filter((item) => item.passed).length ?? 0;
  const totalCount = readiness?.items.length ?? 0;
  const groupedCodes = new Set(READINESS_GROUPS.flatMap((group) => group.codes));
  const leftover =
    readiness?.items.filter((item) => !groupedCodes.has(item.code)) ?? [];
  const destinations = destinationChecklist(readiness, graph);
  return (
    <div className="space-y-space-md">
      {readiness && !readiness.globalFlagEnabled && (
        <div
          role="note"
          className="flex gap-3 rounded-xl border border-outline-variant bg-tertiary/10 p-4 text-tertiary"
        >
          <MaterialIcon name="toggle_off" />
          <div>
            <p className="font-headline-sm text-on-surface">Global flag đang tắt</p>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Cấu hình deployment này chỉ đọc. Bật flag ở backend rồi tải lại trang.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">
            Độ sẵn sàng{" "}
            {readiness?.draftVersion
              ? `· bản nháp v${readiness.draftVersion}`
              : ""}
          </h3>
          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
            Ma trận phát hành — chỉ dữ liệu readiness từ API.
          </p>
        </div>
        {readiness && (
          <span
            className={
              readiness.ready ? "ops-pill ops-pill-success" : "ops-pill ops-pill-warn"
            }
          >
            {passedCount}/{totalCount} đạt
          </span>
        )}
      </div>

      {!readiness ? (
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Chưa có dữ liệu readiness.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-space-md md:grid-cols-3">
          {READINESS_GROUPS.map((group) => (
            <ReadinessGroupCard
              key={group.id}
              title={group.title}
              items={readiness.items.filter((item) =>
                group.codes.includes(item.code),
              )}
              graph={graph}
            />
          ))}
          {leftover.length > 0 && (
            <ReadinessGroupCard
              title="Mục khác"
              items={leftover}
              graph={graph}
            />
          )}
        </div>
      )}

      <section className="rounded-xl bg-surface-container-low p-space-md shadow-sm" aria-labelledby="narrative-destinations-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="narrative-destinations-title" className="font-headline-md text-headline-md text-on-surface">
              Checklist điểm đến narrative
            </h3>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Xác nhận mỗi điểm đến runtime có node tương ứng trước khi phát hành.
            </p>
          </div>
          <span className="ops-pill ops-pill-neutral">{destinations.filter((item) => item.isReady).length}/{destinations.length} điểm đến</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <a
              key={destination.destinationId ?? destination.destinationName}
              href="#narrative-destinations-title"
              className={`flex items-start gap-2 rounded-lg border p-3 ${destination.isReady ? "border-primary/30 bg-primary/5" : "border-outline-variant bg-surface-container"}`}
            >
              <MaterialIcon name={destination.isReady ? "check_circle" : "error"} className={destination.isReady ? "text-primary" : "text-error"} />
              <span className="min-w-0">
                <span className="block font-label-sm text-label-sm font-bold text-on-surface">{destination.destinationName}</span>
                <span className="block font-body-sm text-body-sm text-on-surface-variant">
                  {destination.isReady ? "Sẵn sàng phát hành" : "Chưa sẵn sàng phát hành"}
                </span>
                {destination.checks.length > 0 && (
                  <span className="mt-1 block font-body-sm text-body-sm text-on-surface-variant">
                    {destination.checks.filter((check) => check.passed).length}/{destination.checks.length} điều kiện đạt
                  </span>
                )}
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* AR Availability — BE source of truth, bridging NarrativeReadiness + is_ar_available */}
      {locationData && (
        <section className="rounded-xl bg-surface-container-low p-space-md shadow-sm" aria-labelledby="ar-availability-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="ar-availability-title" className="font-headline-md text-headline-md text-on-surface">
                Phát hành ra map
              </h3>
              <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
                Bật để điểm đến hiện trên bản đồ với badge AR. Tắt không xoá dữ liệu.
              </p>
            </div>
            <span className={locationData.isArAvailable ? "ops-pill ops-pill-success" : "ops-pill ops-pill-neutral"}>
              <MaterialIcon name={locationData.isArAvailable ? "public" : "public_off"} className="text-[13px]" />
              {locationData.isArAvailable ? "Đang hiển thị" : "Đang ẩn"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {locationData.isArAvailable ? (
              <button
                type="button"
                className="ops-btn ops-btn-danger"
                disabled={working !== null}
                onClick={() => onToggleAr(false)}
              >
                <MaterialIcon name="public_off" />
                Ẩn khỏi map
              </button>
            ) : (
              <button
                type="button"
                className="ops-btn ops-btn-primary"
                disabled={working !== null || !readiness?.ready}
                title={!readiness?.ready ? "Cần hoàn thành readiness checklist trước" : undefined}
                onClick={() => onToggleAr(true)}
              >
                <MaterialIcon name="public" />
                Phát hành ra map
              </button>
            )}
          </div>
          {!readiness?.ready && !locationData.isArAvailable && (
            <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
              Hoàn thành readiness checklist để mở khoá nút Phát hành.
            </p>
          )}
        </section>
      )}

      {gateErrors.length > 0 && (
        <section role="alert" className="rounded-xl border border-error/30 bg-error-container/20 p-space-md">
          <h3 className="font-headline-sm text-headline-sm text-error">Gate phát hành bị chặn</h3>
          <ul className="mt-2 space-y-2">
            {gateErrors.map((error) => (
              <li key={`${error.code}-${error.field ?? ""}-${error.destination ?? ""}`} className="font-body-sm text-body-sm text-on-surface">
                <span className="font-code-sm text-code-sm font-bold">{error.code}</span>: {error.message}
                {error.destination ? ` · ${error.destination}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {graph && <QuestNodeFlow graph={graph} />}

      <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Duyệt bản nháp
            </h3>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Review và rollout là hai trạng thái độc lập. Chỉ locale vi là bắt buộc.
            </p>
          </div>
          <StatusBadge
            label={reviewLabels[status] ?? status}
            icon="rate_review"
            tone={reviewTone(status)}
          />
        </div>
        <label className="mt-4 block font-label-sm text-label-sm text-outline">
          Ghi chú review (tối thiểu 10 ký tự)
          <textarea
            rows={4}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            className={`mt-2 w-full resize-y ${inputClass}`}
          />
        </label>
        {noteError && (
          <p className="mt-1 font-body-sm text-body-sm font-semibold text-error">
            {noteError}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!detail.draft || Boolean(working)}
            onClick={() => void onReview("APPROVED")}
            className="ops-btn-primary disabled:opacity-50"
          >
            {working === "review-APPROVED" ? "Đang duyệt…" : "Duyệt tiếng Việt"}
          </button>
          <button
            type="button"
            disabled={!detail.draft || Boolean(working)}
            onClick={() => void onReview("REJECTED")}
            className={btnDanger}
          >
            {working === "review-REJECTED" ? "Đang từ chối…" : "Từ chối"}
          </button>
        </div>
      </div>
    </div>
  );
}
function HistoryTab({ events }: { events: AdminAuditEvent[] }) {
  if (!events.length)
    return (
      <AdminEmptyState
        title="Chưa có lịch sử"
        detail="Dòng thời gian sẽ hiển thị sự kiện kiểm toán khi duyệt, tạo bản nháp và phát hành tại đây."
      />
    );
  return (
    <div>
      <h3 className="font-headline-md text-headline-md text-on-surface">Lịch sử kiểm toán</h3>
      <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
        Một nguồn duy nhất từ admin audit; event trùng ID đã được loại bỏ.
      </p>
      <ol className="mt-4 space-y-2">
        {events.map((event) => (
          <li
            key={event.id}
            className="grid gap-1 rounded-xl border border-outline-variant bg-surface-container p-3 sm:grid-cols-[10rem_1fr]"
          >
            <time className="font-code-sm text-code-sm text-outline">
              {new Date(event.occurredAt).toLocaleString("vi-VN")}
            </time>
            <div>
              <p className="font-headline-sm text-on-surface">{event.action}</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {event.actorName ?? event.actorId}
                {event.reason ? ` · ${event.reason}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
function RollbackDialog({
  action,
  busy,
  onClose,
  onConfirm,
}: {
  action: "pause" | "rollback";
  busy: boolean;
  onClose: () => void;
  onConfirm: (reason: {
    reasonPreset: DeleteReasonPreset;
    reasonDetail: string;
  }) => void;
}) {
  const [reasonPreset, setReasonPreset] =
    useState<DeleteReasonPreset>("Lỗi kỹ thuật");
  const [reasonDetail, setReasonDetail] = useState("");
  const error = validateDeleteReason(reasonPreset, reasonDetail);
  return (
    <AdminModal title={action === "rollback" ? "Khôi phục pilot cốt truyện" : "Tạm dừng pilot cốt truyện"} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!error) onConfirm({ reasonPreset, reasonDetail });
        }}
      >
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {action === "rollback"
            ? "Khôi phục về bản narrative đã được duyệt trước đó. Tiến độ người học không bị reset."
            : "Tạm dừng rollout hiện tại. Bản đã phát hành và phê duyệt vẫn được giữ nguyên để có thể tiếp tục sau này."}
        </p>
        <label className="mt-4 block font-label-sm text-label-sm text-outline">
          Lý do
          <select
            value={reasonPreset}
            onChange={(event) =>
              setReasonPreset(event.target.value as DeleteReasonPreset)
            }
            className={`mt-2 w-full ${inputClass}`}
          >
            {[
              "Sai nguồn",
              "Lỗi kỹ thuật",
              "Trùng nội dung",
              "Yêu cầu pháp lý",
              "Khác",
            ].map((reason) => (
              <option key={reason}>{reason}</option>
            ))}
          </select>
        </label>
        {reasonPreset === "Khác" && (
          <label className="mt-3 block font-label-sm text-label-sm text-outline">
            Chi tiết
            <textarea
              value={reasonDetail}
              onChange={(event) => setReasonDetail(event.target.value)}
              rows={3}
              className={`mt-2 w-full ${inputClass}`}
            />
          </label>
        )}
        {error && (
          <p className="mt-1 font-body-sm text-body-sm font-semibold text-error">{error}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy || Boolean(error)}
            className={btnDanger}
          >
            {busy ? "Đang xử lý…" : action === "rollback" ? "Xác nhận khôi phục" : "Xác nhận tạm dừng"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
