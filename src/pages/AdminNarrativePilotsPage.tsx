import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoading,
} from "../components/admin/AdminAsyncState";
import { AdminModal } from "../components/admin/AdminModal";
import { AdminPagination } from "../components/admin/AdminPagination";
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
import { ApiError } from "../shared/api/contracts";
import { getFriendlyErrorMessage } from "../shared/api/errorMessages";
import { useAuth } from "../shared/auth/useAuth";
import { useToast } from "../shared/ui/toast/useToast";

type Tab = "readiness" | "graph" | "sources" | "reward" | "history";
type RolloutAction = "enable" | "pause" | "resume" | "publish-draft";
type SavedForm = { graph: NarrativeGraphAdmin; note: string };

const ROUTE = "/admin/narrative-pilots";
const tabs: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "readiness", label: "Readiness", icon: "fact_check" },
  { id: "graph", label: "Graph", icon: "account_tree" },
  { id: "sources", label: "Nguồn & citation", icon: "menu_book" },
  { id: "reward", label: "Reward & ending", icon: "emoji_events" },
  { id: "history", label: "Lịch sử", icon: "history" },
];
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
  const colors = {
    neutral: "border-slate-300 bg-slate-100 text-slate-700",
    success: "border-emerald-300 bg-emerald-50 text-emerald-800",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
    danger: "border-red-300 bg-red-50 text-red-800",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${colors}`}
    >
      <MaterialIcon name={icon} className="text-base" />
      {label}
    </span>
  );
}
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
  const requestedTab = searchParams.get("tab") as Tab | null;
  const activeTab =
    requestedTab && tabs.some((item) => item.id === requestedTab)
      ? requestedTab
      : "readiness";
  const [search, setSearch] = useState(filters.q);
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
  const [pauseDialog, setPauseDialog] = useState(false);
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
  }, [filters.page, filters.q, filters.reviewStatus, filters.rolloutState]);
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
    if (!detail || working || detail.draft) return;
    setWorking("create");
    try {
      await adminApi.createNarrativeDraft(detail.questId, {
        rowVersion: detail.rowVersion,
      });
      showToast({
        message: "Đã tạo một draft mới từ bản đang phát hành.",
        type: "success",
      });
      await refresh();
    } catch (error) {
      handleMutationError(error);
      if (error instanceof ApiError && error.code === "DRAFT_ALREADY_EXISTS")
        await refresh();
    } finally {
      setWorking(null);
    }
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
    const version =
      action === "publish-draft" || action === "enable"
        ? detail.draftVersion
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
      if (action === "resume")
        await adminApi.resumeNarrative(detail.questId, body, idempotencyKey);
      if (action === "publish-draft")
        await adminApi.publishNarrativeDraft(
          detail.questId,
          body,
          idempotencyKey,
        );
      rolloutKeys.current.delete(requestIdentity);
      setPauseDialog(false);
      showToast({ message: "Đã cập nhật rollout narrative.", type: "success" });
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
      })
    : [];
  const blockingItems = readiness?.items.filter((item) => !item.passed) ?? [];
  const rolloutBlocked = !readiness?.ready;
  const resumeBlocked = rolloutState === "PAUSED" && !publishedReadiness?.ready;

  return (
    <section
      className="w-full max-w-7xl space-y-5"
      aria-busy={loading || detailLoading}
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-amber-700">
            Vận hành / Narrative pilots
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Narrative Pilot Console
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Soạn graph theo cấu trúc runtime, review theo version và rollout mà
            không ghi đè bản learner đang dùng.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            loadList();
            if (selectedQuestId) loadDetail(selectedQuestId);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold"
        >
          <MaterialIcon name="refresh" /> Tải lại
        </button>
      </header>
      <form
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(220px,1fr)_180px_180px_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          updateFilters({ q: search.trim() });
        }}
      >
        <input
          aria-label="Tìm narrative pilot"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm quest…"
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <select
          aria-label="Trạng thái review"
          value={filters.reviewStatus}
          onChange={(event) =>
            updateFilters({ reviewStatus: event.target.value })
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          <option value="">Mọi review</option>
          <option value="DRAFT">Chờ duyệt</option>
          <option value="APPROVED">Đã duyệt</option>
          <option value="REJECTED">Từ chối</option>
        </select>
        <select
          aria-label="Trạng thái rollout"
          value={filters.rolloutState}
          onChange={(event) =>
            updateFilters({ rolloutState: event.target.value })
          }
          className="rounded-lg border border-slate-300 bg-white px-3 py-2"
        >
          <option value="">Mọi rollout</option>
          <option value="NOT_RELEASED">Chưa phát hành</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="PAUSED">Đã tạm dừng</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-amber-500 px-4 py-2 font-bold text-slate-950"
        >
          Tìm
        </button>
      </form>
      {loading && <AdminLoading label="Đang tải narrative pilots" />}
      {!loading && loadError && (
        <AdminErrorState message={loadError} onRetry={loadList} />
      )}
      {!loading && !loadError && result?.items.length === 0 && (
        <AdminEmptyState
          title="Không có narrative pilot"
          detail="Thử thay đổi bộ lọc hoặc tạo narrative từ backend."
        />
      )}
      {!loading && !loadError && result && result.items.length > 0 && (
        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="space-y-2">
              {result.items.map((pilot) => (
                <button
                  key={pilot.questId}
                  type="button"
                  onClick={() => setSelectedQuestId(pilot.questId)}
                  aria-pressed={selectedQuestId === pilot.questId}
                  className={`w-full rounded-lg border p-3 text-left focus-visible:ring-2 focus-visible:ring-amber-500 ${selectedQuestId === pilot.questId ? "border-amber-400 bg-amber-50" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <p className="font-bold text-slate-950">{pilot.questTitle}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {pilot.locationName ??
                      pilot.locationId ??
                      "Chưa gắn địa điểm"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
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
                  </div>
                </button>
              ))}
            </div>
            <AdminPagination
              page={result.page}
              totalPages={result.totalPages}
              totalItems={result.totalItems}
              onPageChange={(page) => updateFilters({ page })}
            />
          </aside>
          <main className="min-w-0 space-y-4">
            {detailLoading && <AdminLoading label="Đang tải chi tiết pilot" />}
            {!detailLoading && detailError && (
              <AdminErrorState
                message={detailError}
                onRetry={() => selectedQuestId && loadDetail(selectedQuestId)}
              />
            )}
            {!detailLoading && !detailError && detail && (
              <>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-950">
                        {detail.questTitle}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Published{" "}
                        {detail.publishedVersion
                          ? `v${detail.publishedVersion}`
                          : "—"}{" "}
                        · Draft{" "}
                        {detail.draftVersion ? `v${detail.draftVersion}` : "—"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge
                          label={`Review: ${reviewLabels[reviewStatus] ?? reviewStatus}`}
                          icon="rate_review"
                          tone={reviewTone(reviewStatus)}
                        />
                        <StatusBadge
                          label={`Rollout: ${rolloutLabels[rolloutState] ?? rolloutState}`}
                          icon="rocket_launch"
                          tone={rolloutTone(rolloutState)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!detail.draft && (
                        <button
                          type="button"
                          onClick={() => void createDraft()}
                          disabled={Boolean(working)}
                          className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800 disabled:opacity-50"
                        >
                          {working === "create" ? "Đang tạo…" : "Tạo draft"}
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
                            : blockingItems.map((item) => item.message).join(" ");
                        return (
                          <button
                            key={action.action}
                            type="button"
                            disabled={disabled}
                            title={disabled ? disabledReason : undefined}
                            onClick={() =>
                              action.action === "pause"
                                ? setPauseDialog(true)
                                : void runRollout(action.action)
                            }
                            className={`rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50 ${action.action === "pause" ? "border border-red-300 bg-red-50 text-red-800" : "bg-emerald-700 text-white"}`}
                          >
                            {working === action.action
                              ? "Đang xử lý…"
                              : action.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {rolloutBlocked &&
                    rolloutActions.some(
                      (action) =>
                        action.action === "enable" ||
                        action.action === "publish-draft",
                    ) && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                        Hành động đang khóa:{" "}
                        {blockingItems[0]?.message ?? "Readiness chưa đạt."}
                      </p>
                    )}
                  {resumeBlocked &&
                    rolloutActions.some((action) => action.action === "resume") && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                        Không thể tiếp tục bản published: {publishedReadiness?.items.find((item) => !item.passed)?.message ?? "Readiness chưa đạt."}
                      </p>
                    )}
                </div>
                {permissionError && (
                  <div
                    role="alert"
                    className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900"
                  >
                    <MaterialIcon name="lock" />
                    <p className="text-sm font-semibold">{permissionError}</p>
                  </div>
                )}
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <div
                    role="tablist"
                    aria-label="Chi tiết narrative pilot"
                    className="flex min-w-max border-b border-slate-200 px-2"
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
                        className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold focus-visible:ring-2 focus-visible:ring-amber-500 ${activeTab === tab.id ? "border-amber-500 text-slate-950" : "border-transparent text-slate-600"}`}
                      >
                        <MaterialIcon name={tab.icon} />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div
                    id={`narrative-panel-${activeTab}`}
                    role="tabpanel"
                    aria-labelledby={`narrative-tab-${activeTab}`}
                    className="p-4 md:p-5"
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
                      />
                    )}
                    {activeTab === "graph" && graph && (
                      <>
                        <EditorHeader
                          title="Graph draft có cấu trúc"
                          detail="Mỗi node dùng đúng trường runtime; choice chỉ trỏ đến node tồn tại."
                          onSave={saveDraft}
                          saving={working === "save"}
                          disabled={!draft || Boolean(working)}
                        />
                        <>
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
                        </>
                        <details className="mt-4 rounded-lg bg-slate-50 p-3">
                          <summary className="cursor-pointer text-sm font-bold text-slate-700">
                            JSON export chỉ đọc
                          </summary>
                          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
                            {JSON.stringify(graph, null, 2)}
                          </pre>
                        </details>
                      </>
                    )}
                    {activeTab === "sources" && graph && (
                      <>
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
                      </>
                    )}
                    {activeTab === "reward" && graph && (
                      <>
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
                      </>
                    )}
                    {activeTab === "history" && <HistoryTab events={audit} />}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      )}
      {pauseDialog && (
        <PauseDialog
          busy={working === "pause"}
          onClose={() => setPauseDialog(false)}
          onConfirm={(reason) => void runRollout("pause", reason)}
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
        <h3 className="font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{detail}</p>
      </div>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={disabled}
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {saving ? "Đang lưu…" : "Lưu draft"}
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
      className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
    >
      {saving ? "Đang lưu…" : label}
    </button>
  );
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
}: {
  detail: NarrativePilotDetail;
  readiness: NarrativeReadiness | null;
  graph: NarrativeGraphAdmin | null;
  note: string;
  noteError?: string;
  working: string | null;
  onNoteChange: (value: string) => void;
  onReview: (decision: "APPROVED" | "REJECTED") => Promise<void>;
}) {
  const status = detail.draft?.reviewStatus ?? detail.reviewStatus;
  return (
    <div className="space-y-5">
      {readiness && !readiness.globalFlagEnabled && (
        <div
          role="note"
          className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <MaterialIcon name="toggle_off" />
          <div>
            <p className="font-black">Global flag đang tắt</p>
            <p className="text-sm">
              Cấu hình deployment này chỉ đọc. Bật flag ở backend rồi tải lại
              trang.
            </p>
          </div>
        </div>
      )}
      <div>
        <h3 className="font-black text-slate-950">
          Checklist readiness{" "}
          {readiness?.draftVersion ? `· draft v${readiness.draftVersion}` : ""}
        </h3>
        {!readiness ? (
          <p className="mt-3 text-sm text-slate-600">
            Chưa có dữ liệu readiness.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {readiness.items.map((item) => (
              <div
                key={`${item.code}-${item.nodeCode ?? ""}-${item.field ?? ""}`}
                className={`flex gap-3 rounded-lg border p-3 ${item.passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}
              >
                <MaterialIcon
                  name={item.passed ? "check_circle" : "error"}
                  className={item.passed ? "text-emerald-700" : "text-red-700"}
                />
                <div>
                  <p className="font-bold text-slate-950">{item.code}</p>
                  <p className="text-sm text-slate-700">{item.message}</p>
                  {!item.passed &&
                    item.nodeCode &&
                    graph?.nodes.some(
                      (node) => node.code === item.nodeCode,
                    ) && (
                      <a
                        href={`#node-${item.nodeCode}`}
                        className="mt-1 inline-block text-xs font-bold text-blue-700"
                      >
                        Mở node {item.nodeCode}
                      </a>
                    )}
                  {item.field && (
                    <p className="mt-1 font-mono text-xs text-slate-600">
                      {item.field}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-950">Review draft</h3>
            <p className="mt-1 text-sm text-slate-600">
              Review và rollout là hai trạng thái độc lập. Chỉ locale vi là bắt
              buộc.
            </p>
          </div>
          <StatusBadge
            label={reviewLabels[status] ?? status}
            icon="rate_review"
            tone={reviewTone(status)}
          />
        </div>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Ghi chú review (tối thiểu 10 ký tự)
          <textarea
            rows={4}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            className="mt-2 w-full resize-y rounded-lg border border-slate-300 p-3 font-normal"
          />
        </label>
        {noteError && (
          <p className="mt-1 text-xs font-semibold text-red-700">{noteError}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!detail.draft || Boolean(working)}
            onClick={() => void onReview("APPROVED")}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {working === "review-APPROVED" ? "Đang duyệt…" : "Duyệt tiếng Việt"}
          </button>
          <button
            type="button"
            disabled={!detail.draft || Boolean(working)}
            onClick={() => void onReview("REJECTED")}
            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-bold text-red-800 disabled:opacity-50"
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
        detail="Timeline sẽ hiển thị audit event review, draft và rollout tại đây."
      />
    );
  return (
    <div>
      <h3 className="font-black text-slate-950">Timeline audit</h3>
      <p className="mt-1 text-sm text-slate-600">
        Một nguồn duy nhất từ admin audit; event trùng ID đã được loại bỏ.
      </p>
      <ol className="mt-4 space-y-3">
        {events.map((event) => (
          <li
            key={event.id}
            className="grid gap-1 rounded-lg border border-slate-200 p-3 sm:grid-cols-[160px_1fr]"
          >
            <time className="text-xs font-semibold text-slate-500">
              {new Date(event.occurredAt).toLocaleString("vi-VN")}
            </time>
            <div>
              <p className="font-bold text-slate-950">{event.action}</p>
              <p className="text-sm text-slate-600">
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
function PauseDialog({
  busy,
  onClose,
  onConfirm,
}: {
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
    <AdminModal title="Tạm dừng narrative pilot" onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!error) onConfirm({ reasonPreset, reasonDetail });
        }}
      >
        <p className="text-sm text-slate-600">
          Bản đã phát hành vẫn được giữ để có thể tiếp tục đúng version sau này.
        </p>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Lý do
          <select
            value={reasonPreset}
            onChange={(event) =>
              setReasonPreset(event.target.value as DeleteReasonPreset)
            }
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
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
          <label className="mt-3 block text-sm font-bold text-slate-700">
            Chi tiết
            <textarea
              value={reasonDetail}
              onChange={(event) => setReasonDetail(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-300 p-3"
            />
          </label>
        )}
        {error && (
          <p className="mt-1 text-xs font-semibold text-red-700">{error}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={busy || Boolean(error)}
            className="rounded-lg bg-red-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Đang tạm dừng…" : "Xác nhận tạm dừng"}
          </button>
        </div>
      </form>
    </AdminModal>
  );
}
