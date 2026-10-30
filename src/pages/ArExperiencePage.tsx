// src/pages/ArExperiencePage.tsx
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArHomeExperience } from "../features/ar/ArHomeExperience";
import { AppLayout } from "../components/layout/AppLayout";
import { MaterialIcon } from "../components/ui/MaterialIcon";
import {
    AR_ARTIFACTS,
    AR_REVIEW_ARTIFACTS,
    readArtifact,
} from "../features/ar/arExperience";
import { ArCameraExperience } from "../features/ar/ArCameraExperience";
import { CU_CHI_LOCATION_ID } from "../shared/config/constants";
import mascotImg from "../assets/mascot-chrono-ar.png";
import { useAuth } from '../shared/auth/useAuth'
import { hasPremiumAccess } from '../shared/access/contentAccess'
import { isFreeAr } from '../shared/access/premiumContentPolicy'
import { PremiumContentModal } from '../components/monetization/PremiumContentModal'
import "../features/ar/arExperience.css";
import "../features/ar/arHeroScene.css";
import "../features/ar/arTypography.css";

const ArtifactModelViewer = lazy(() =>
    import("../features/ar/ArtifactModelViewer").then((module) => ({
        default: module.ArtifactModelViewer,
    })),
);

const OPTIONS = [
    {
        id: "explore",
        icon: "deployed_code",
        title: "Khám phá 3D",
        hint: "Ngay trên màn hình của bạn",
        number: "01",
    },
    {
        id: "home",
        icon: "view_in_ar",
        title: "AR tại nhà",
        hint: "Laptop kết nối điện thoại",
        number: "02",
    },
    {
        id: "onsite",
        icon: "qr_code_scanner",
        title: "Tại Củ Chi",
        hint: "Quét trạm · Tiếp nối hành trình",
        number: "03",
    },
] as const;

export function ArExperiencePage() {
    const { isAuthenticated, user } = useAuth()
    const [params, setParams] = useSearchParams();
    const includeReview =
        AR_REVIEW_ARTIFACTS.length > 0 && params.get("review") === "1";
    const artifact = readArtifact(params.get("artifact") ?? (!hasPremiumAccess(user) ? 'rifle' : null), includeReview);
    const collection = includeReview
        ? [...AR_ARTIFACTS, ...AR_REVIEW_ARTIFACTS]
        : AR_ARTIFACTS;
    const selectedIndex =
        collection.findIndex((item) => item.id === artifact.id) + 1;
    const reviewQuery = includeReview ? "&review=1" : "";
    const requestedView = params.get("view");
    const view = ["home", "onsite", "camera", "target"].includes(
        requestedView ?? "",
    )
        ? requestedView!
        : "explore";
    const [loadModel, setLoadModel] = useState(false);
    const [premiumOpen, setPremiumOpen] = useState(() => !isAuthenticated || (!hasPremiumAccess(user) && !isFreeAr(artifact.id)))
    const [lockedTarget, setLockedTarget] = useState<string | undefined>(undefined)
    const locked = !isAuthenticated || (!hasPremiumAccess(user) && !isFreeAr(artifact.id))
    useEffect(() => { if (locked) setPremiumOpen(true) }, [locked, artifact.id])
    const change = (next: string, id = artifact.id) => {
        if (!isAuthenticated || (!hasPremiumAccess(user) && !isFreeAr(id))) {
            setLockedTarget(`/ar-experience?${new URLSearchParams({ artifact: id, view: next })}`)
            setPremiumOpen(true)
            return
        }
        setLoadModel(false);
        const nextParams = new URLSearchParams({ artifact: id });
        if (next !== "explore") nextParams.set("view", next);
        if (includeReview) nextParams.set("review", "1");
        setParams(nextParams);
    };

    const toggleReview = () => {
        const nextParams = new URLSearchParams(params);
        if (includeReview) {
            nextParams.delete("review");
            if (artifact.status === "review")
                nextParams.set("artifact", hasPremiumAccess(user) ? AR_ARTIFACTS[0].id : 'rifle');
        } else nextParams.set("review", "1");
        setLoadModel(false);
        setParams(nextParams);
    };

    if (locked) return <AppLayout mobileTitle="Khám phá AR" showCta={false}>
        <main className="min-h-screen bg-slate-50 p-6 text-center">
            <h1 className="text-2xl font-bold">{artifact.name}</h1>
            <p className="mt-3">Mẫu AR này cần Premium.</p>
            <button type="button" className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white" onClick={() => setPremiumOpen(true)}>Xem quyền truy cập</button>
            <PremiumContentModal open={premiumOpen} onClose={() => setPremiumOpen(false)} title="Mẫu AR này cần Premium" authenticated={isAuthenticated} next={lockedTarget} />
        </main>
    </AppLayout>

    if (view === "target")
        return (
            <main className="ar-print-page">
                <div className="ar-print-actions">
                    <Link
                        to={`/ar-experience?artifact=${artifact.id}&view=home${reviewQuery}`}
                    >
                        ← Về trải nghiệm AR
                    </Link>
                    <button
                        className="ar-button ar-button-blue"
                        onClick={() => window.print()}
                    >
                        In thẻ di sản
                    </button>
                </div>
                <article className="ar-print-card">
                    <p className="ar-eyebrow">TIMELENS · THẺ DI SẢN</p>
                    <h1>{artifact.name}</h1>
                    {artifact.status === "review" && (
                        <p className="ar-review-notice">
                            Ứng viên chờ kiểm duyệt · Chưa xác minh nguồn gốc lịch sử.
                        </p>
                    )}
                    <img
                        src={artifact.target}
                        alt={`Ảnh mục tiêu nhận diện ${artifact.name}`}
                    />
                    <p>Giữ đầy đủ khung hình và in màu. {artifact.recognitionCard}</p>
                    <small>{artifact.targetCaption} · Ảnh thực địa do nhóm chụp.</small>
                </article>
            </main>
        );

    return (
        <AppLayout
            mobileTitle="Khám phá AR"
            className="ar-experience-shell"
            showCta={false}
        >
            <PremiumContentModal open={premiumOpen} onClose={() => setPremiumOpen(false)} title="Mẫu AR này cần Premium" authenticated={isAuthenticated} next={lockedTarget} />
            <div className={`ar-experience ${view === "camera" ? "is-camera" : ""}`}>
                <header className="ar-hero">
                    <div className="ar-hero-copy">
                        <p className="ar-eyebrow">
                            <span /> TIMELENS / PHÒNG KHÁM PHÁ DI SẢN
                        </p>
                        <h1>
                            Lịch sử, gần hơn
                            <br />
                            <em>một góc nhìn.</em>
                        </h1>
                        <p>
                            Xoay một hiện vật. Khám phá một câu chuyện.
                            <br className="hidden sm:block" /> Và mang trải nghiệm ấy ra không
                            gian quanh bạn.
                        </p>
                        <div className="ar-hero-tags">
              <span>
                <MaterialIcon name="mouse" /> Khám phá từ xa
              </span>
                            <span>
                <MaterialIcon name="smartphone" /> AR trên điện thoại
              </span>
                            <span>
                <MaterialIcon name="deployed_code" /> {AR_ARTIFACTS.length} Hiện
                vật Củ Chi
              </span>
                        </div>
                    </div>
                    <div className="ar-hero-visual" aria-hidden="true">
                        <div className="ar-orbit ar-orbit-one" />
                        <div className="ar-orbit ar-orbit-two" />
                        <div className="ar-hologram-floor"><span /><span /><span /></div>
                        <div className="ar-feature-float ar-feature-float--cube"><MaterialIcon name="deployed_code" /><span>XOAY · KHÁM PHÁ 3D</span></div>
                        <div className="ar-feature-float ar-feature-float--phone"><MaterialIcon name="smartphone" /><span>ĐƯA DI SẢN VÀO AR</span><i /></div>
                        <div className="ar-feature-float ar-feature-float--scan"><MaterialIcon name="qr_code_scanner" /><span>QUÉT TRẠM DI TÍCH</span></div>
                        <span className="ar-scene-spark ar-scene-spark--one">✦</span>
                        <span className="ar-scene-spark ar-scene-spark--two">✧</span>
                        <img
                            src={mascotImg}
                            alt=""
                            className="ar-hero-mascot"
                        />
                        <span className="ar-visual-coord">CỦ CHI / VIỆT NAM</span>
                        <MaterialIcon name="view_in_ar" className="ar-hero-icon" />
                        <span className="ar-visual-label">
              MỘT DI SẢN
              <br />
              <strong>NHIỀU CÁCH KHÁM PHÁ</strong>
            </span>
                    </div>
                </header>

                <main className="ar-main">
                    <nav className="ar-mode-nav" aria-label="Cách trải nghiệm">
                        {OPTIONS.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => change(option.id)}
                                aria-current={
                                    view === option.id ||
                                    (view === "camera" && option.id === "home")
                                        ? "page"
                                        : undefined
                                }
                            >
                <span className="ar-option-icon">
                  <MaterialIcon name={option.icon} />
                </span>
                                <span>
                  <strong>{option.title}</strong>
                  <small>{option.hint}</small>
                </span>
                                <span className="ar-option-number">{option.number}</span>
                            </button>
                        ))}
                    </nav>

                    {view === "onsite" ? (
                        <section className="ar-onsite ar-surface">
                            <div>
                                <p className="ar-eyebrow">
                                    <span /> HÀNH TRÌNH THỰC ĐỊA
                                </p>
                                <h2>Đang có mặt tại Củ Chi?</h2>
                                <p>
                                    Theo dấu các trạm di sản, quét QR tại địa điểm và tiếp tục
                                    nhiệm vụ của bạn. Mỗi trạm mở ra một câu chuyện và thử thách
                                    riêng.
                                </p>
                                <ol>
                                    <li>Tìm trạm theo hướng dẫn tại di tích.</li>
                                    <li>Quét QR tại trạm để check-in.</li>
                                    <li>Mở câu chuyện và mini-game đã được mở khóa.</li>
                                </ol>
                                <div className="ar-inline-actions">
                                    <Link
                                        className="ar-button ar-button-blue"
                                        to={`/scan?locationId=${CU_CHI_LOCATION_ID}`}
                                    >
                                        <MaterialIcon name="qr_code_scanner" /> Quét QR tại trạm
                                    </Link>
                                    <Link
                                        className="ar-button ar-button-yellow"
                                        aria-label="Xem nhiệm vụ tại di tích"
                                        to={`/quests?locationId=${CU_CHI_LOCATION_ID}&track=onsite`}
                                    >
                                        <MaterialIcon name="assignment" /> Xem nhiệm vụ tại di tích
                                    </Link>
                                </div>
                                <p className="ar-footnote">
                                    Check-in và phần thưởng được xác nhận qua hệ thống thực địa.
                                    Trải nghiệm AR tại nhà không thay thế check-in.
                                </p>
                            </div>
                            <div className="ar-onsite-image">
                                <img
                                    src="/images/cu-chi/loi-xuong-ham.jpg"
                                    alt="Lối xuống địa đạo Củ Chi"
                                />
                                <span>ĐI XA HƠN TRÊN HÀNH TRÌNH DI SẢN</span>
                            </div>
                        </section>
                    ) : (
                        <>
                            <section className="ar-section-heading">
                                <div>
                                    <p className="ar-eyebrow">
                                        <span /> BỘ SƯU TẬP TRẢI NGHIỆM / {AR_ARTIFACTS.length} HIỆN
                                        VẬT
                                    </p>
                                    <h2>
                                        {view === "explore"
                                            ? "Chọn một hiện vật. Bắt đầu khám phá."
                                            : view === "camera"
                                                ? "Sẵn sàng cho một góc nhìn mới."
                                                : "Từ màn hình, đến không gian của bạn."}
                                    </h2>
                                </div>
                            </section>

                            <div className="ar-collection-toolbar">
                                <p>Chọn mô hình để xem thông tin và mở trải nghiệm.</p>
                                {AR_REVIEW_ARTIFACTS.length > 0 && (
                                    <button
                                        className="ar-text-link"
                                        aria-pressed={includeReview}
                                        onClick={toggleReview}
                                    >
                                        {includeReview
                                            ? "Ẩn ứng viên dự phòng"
                                            : `Xem ${AR_REVIEW_ARTIFACTS.length} ứng viên dự phòng`}
                                    </button>
                                )}
                            </div>

                            <div
                                className="ar-artifact-tabs"
                                role="group"
                                aria-label="Chọn hiện vật"
                            >
                                {collection.map((item) => (
                                    <button
                                        key={item.id}
                                        aria-pressed={artifact.id === item.id}
                                        onClick={() => change(view, item.id)}
                                    >
                                        <img
                                            className="ar-artifact-thumbnail"
                                            src={item.thumbnail}
                                            alt={`Mô hình ${item.name}`}
                                            loading="lazy"
                                        />
                                        <span className="min-w-0 flex-1 space-y-0.5">
                      {item.status === "review" && (
                          <span className="ar-review-label inline-block px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-[9px] font-black uppercase text-amber-900 mb-0.5">CHỜ KIỂM DUYỆT</span>
                      )}
                                            <strong className="block text-sm sm:text-base font-black text-[#0F1B33] truncate group-hover:text-[#0275FB]">
                          {item.name}
                      </strong>
                      <small
                          className="block text-xs font-semibold text-slate-600 !whitespace-normal"
                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                      >
                              {item.subtitle}
                      </small>
                    </span>
                                        <MaterialIcon
                                            name={
                                                artifact.id === item.id
                                                    ? "check_circle"
                                                    : "arrow_forward"
                                            }
                                        />
                                    </button>
                                ))}
                            </div>

                            {artifact.status === "review" && (
                                <aside className="ar-review-notice" role="note">
                                    <strong>Ứng viên chờ kiểm duyệt</strong>
                                    <p>
                                        Mô hình dự phòng để xem xét nội dung. Chưa xác minh niên
                                        đại, xuất xứ hay mối liên hệ với hiện vật tại địa đạo Củ
                                        Chi.
                                    </p>
                                </aside>
                            )}

                            {view === "explore" && (
                                <section className="ar-exhibit ar-surface">
                                    <div className="ar-exhibit-stage">
                                        {loadModel ? (
                                            <Suspense
                                                fallback={
                                                    <div className="ar-model-placeholder" role="status">
                                                        Đang chuẩn bị trình xem 3D…
                                                    </div>
                                                }
                                            >
                                                <ArtifactModelViewer
                                                    key={artifact.id}
                                                    artifact={artifact}
                                                />
                                            </Suspense>
                                        ) : (
                                            <div className="ar-model-placeholder">
                        <span className="ar-specimen-icon">
                          <MaterialIcon name={artifact.icon} />
                        </span>
                                                <span className="ar-specimen-index">
                          {artifact.status === "review"
                              ? "ỨNG VIÊN DỰ PHÒNG"
                              : `HIỆN VẬT ${String(selectedIndex).padStart(2, "0")} / ${AR_ARTIFACTS.length}`}
                        </span>
                                                <h3>{artifact.name}</h3>
                                                <p>Xem mô hình từ mọi góc nhìn</p>
                                                <button
                                                    className="ar-button ar-button-blue"
                                                    onClick={() => setLoadModel(true)}
                                                >
                                                    <MaterialIcon name="deployed_code" /> Tải mô hình 3D
                                                </button>
                                                <small>Mô hình chỉ tải khi bạn chọn mở.</small>
                                            </div>
                                        )}
                                    </div>
                                    <div className="ar-exhibit-story space-y-4">
                                        {(() => {
                                            const info = {
                                                historicalContext: artifact.description,
                                                structureAndMaterial: artifact.detail,
                                                usageSpace: "Quan sát và tương tác với mô hình minh họa trên màn hình hoặc qua ảnh nhận diện AR.",
                                            };
                                            return (
                                                <>
                                                    <div>
                                                        <p className="ar-eyebrow">
                                                            <span /> THÔNG TIN MÔ HÌNH
                                                        </p>
                                                        <h2>{artifact.name}</h2>
                                                        <p className="text-sm font-medium text-slate-700 leading-relaxed">
                                                            {info.historicalContext}
                                                        </p>
                                                    </div>

                                                    {/* Khối Kiến thức cấu tạo & Không gian lịch sử */}
                                                    <div className="p-3.5 rounded-2xl bg-[#F2F7FF] border border-[#0275FB]/20 space-y-2.5 text-xs">
                                                        <div className="flex items-start gap-2.5">
                                                            <MaterialIcon
                                                                name="architecture"
                                                                className="text-base text-[#0275FB] shrink-0 mt-0.5"
                                                            />
                                                            <div>
                                                                <strong className="font-black text-[#0F1B33] block">
                                                                    Chi tiết có thể quan sát:
                                                                </strong>
                                                                <span className="text-slate-600 font-medium leading-relaxed">
                                                                    {info.structureAndMaterial}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start gap-2.5 pt-2 border-t border-[#0275FB]/10">
                                                            <MaterialIcon
                                                                name="location_on"
                                                                className="text-base text-[#0275FB] shrink-0 mt-0.5"
                                                            />
                                                            <div>
                                                                <strong className="font-black text-[#0F1B33] block">
                                                                    Phạm vi trải nghiệm:
                                                                </strong>
                                                                <span className="text-slate-600 font-medium">
                                                                    {info.usageSpace}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <p className="text-xs leading-relaxed text-slate-600 ar-model-disclaimer">{artifact.note}</p>
                                                    <p className="ar-footnote">
                                                        Tác giả: {artifact.author} · {artifact.license}
                                                        {" · "}<a className="ar-text-link" href={artifact.source} target="_blank" rel="noopener noreferrer">Nguồn mô hình ↗</a>
                                                    </p>
                                                    <button
                                                        className="ar-button ar-button-yellow w-full"
                                                        onClick={() => change("home")}
                                                    >
                                                        <MaterialIcon name="view_in_ar" /> Trải nghiệm bằng AR{" "}
                                                        <span>↗</span>
                                                    </button>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </section>
                            )}

                            {view === "home" && <ArHomeExperience key={artifact.id} artifact={artifact} includeReview={includeReview} onOpenCamera={() => change("camera")} />}

                            {view === "camera" && (
                                <div key={artifact.id}>
                                    <p className="ar-recognition-note">
                                        {artifact.recognitionCard}
                                    </p>
                                    <ArCameraExperience artifact={artifact} />
                                    <div className="ar-camera-bottom">
                                        <button
                                            className="ar-text-link"
                                            onClick={() => change("explore")}
                                        >
                                            ← Xem hiện vật 3D
                                        </button>
                                        <button
                                            className="ar-text-link"
                                            onClick={() => change("home")}
                                        >
                                            Hướng dẫn kết nối điện thoại →
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}
