import { useEffect, useRef, useState } from "react";
import { MaterialIcon } from "../../components/ui/MaterialIcon";
import { isArFrameMessage, type ArArtifact } from "./arExperience";

export function ArCameraExperience({ artifact }: { artifact: ArArtifact }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [presentation, setPresentation] = useState({ scale: 1, rotation: 0, motion: false });
  const presentationRef = useRef(presentation);
  useEffect(() => {
    if (started && window.matchMedia("(max-width: 767px)").matches) {
      stage.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [started]);
  useEffect(() => {
    presentationRef.current = presentation;
    if (started) frame.current?.contentWindow?.postMessage({ type: "AR_PRESENTATION", artifact: artifact.id, ...presentation }, window.location.origin);
  }, [presentation, started, artifact.id]);

  useEffect(() => {
    if (!started) return;
    const frameWindow = frame.current?.contentWindow;
    let ready = false;
    const onMessage = (event: MessageEvent) => {
      if (
        !isArFrameMessage(
          event,
          frame.current?.contentWindow ?? null,
          window.location.origin,
          artifact.id,
        )
      )
        return;
      if (event.data.type === "AR_READY") {
        ready = true;
        setStatus("scanning");
        frame.current?.contentWindow?.postMessage({ type: "AR_PRESENTATION", artifact: artifact.id, ...presentationRef.current }, window.location.origin);
      }
      if (event.data.type === "AR_TARGET_FOUND") {
        ready = true;
        setStatus("found");
      }
      if (event.data.type === "AR_TARGET_LOST") setStatus("lost");
      if (event.data.type === "AR_ERROR") {
        setError(
          event.data.message ||
            "Không thể mở camera. Kiểm tra quyền truy cập và thử lại.",
        );
        setStatus("error");
        setStarted(false);
      }
    };
    const timeout = window.setTimeout(() => {
      if (!ready) {
        setError(
          "AR tải quá lâu. Camera đã được tắt. Kiểm tra kết nối và thử lại.",
        );
        setStatus("error");
        setStarted(false);
      }
    }, 60000);
    window.addEventListener("message", onMessage);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      // Same-origin synchronous cleanup runs before the iframe context is destroyed.
      try {
        frameWindow?.dispatchEvent(new Event("timelens-ar-stop"));
      } catch {
        /* frame already destroyed */
      }
    };
  }, [artifact.id, started, attempt]);

  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") {
        setStarted(false);
        setStatus("idle");
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  const stop = () => {
    frame.current?.contentWindow?.dispatchEvent(new Event("timelens-ar-stop"));
    setStarted(false);
    setStatus("idle");
  };
  const start = () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera cần HTTPS và trình duyệt hỗ trợ. Mở đường dẫn HTTPS trên điện thoại hoặc xem hiện vật ở chế độ 3D.",
      );
      return;
    }
    setError("");
    setStatus("loading");
    setAttempt((value) => value + 1);
    setStarted(true);
  };
  const labels: Record<string, string> = {
    idle: "Sẵn sàng khám phá",
    loading: "Đang tải AR và chờ quyền camera…",
    scanning: "Hướng camera vào thẻ di sản",
    found: `Đã nhận diện · ${artifact.name}`,
    lost: "Đưa thẻ trở lại khung hình",
    error: "Chưa thể mở camera",
    timeout: "AR tải lâu hơn dự kiến. Kiểm tra kết nối hoặc tắt và thử lại.",
  };

  return (
    <section className="ar-camera-panel" aria-label="Camera AR">
      <div ref={stage} className={`ar-camera-stage${started ? " is-active" : ""}`}>
        {started ? (
          <iframe
            key={`${artifact.id}-${attempt}`}
            ref={frame}
            title={`Camera AR ${artifact.name}`}
            src={`/ar.html?artifact=${encodeURIComponent(artifact.id)}${artifact.status === "review" ? "&review=1" : ""}`}
            onLoad={() => {
              // An older PWA worker can serve the app shell for this frame URL.
              // Do not leave a nested 404 under a misleading camera loading state.
              if (frame.current?.contentDocument?.getElementById("root")) {
                setError("Trang camera đang tải phiên bản cũ. Tải lại trang để cập nhật AR rồi bật camera lại.");
                setStatus("error");
                setStarted(false);
              }
            }}
            allow="camera; gyroscope; accelerometer"
            className="ar-camera-frame"
          />
        ) : (
          <div className="ar-camera-intro">
            <span className="ar-camera-symbol">
              <MaterialIcon name="view_in_ar" />
            </span>
            <h2>Đưa hiện vật vào không gian của bạn</h2>
            <p>
              Mở thẻ di sản trên màn hình khác hoặc in ra giấy. Sau đó cho phép
              camera và hướng vào đúng ảnh trên thẻ.
            </p>
            <button className="ar-button ar-button-yellow" onClick={start}>
              <MaterialIcon name="photo_camera" /> Bật camera AR
            </button>
            <small>
              Camera chỉ bật sau khi bạn chọn. Hình ảnh camera được xử lý trên
              thiết bị.
            </small>
          </div>
        )}
        {started && (
          <>
            <div
              className={`ar-camera-state ${status === "found" ? "is-found" : ""}`}
              role="status"
            >
              <span />
              {labels[status]}
            </div>
            <button className="ar-stop-camera" onClick={stop}>
              <MaterialIcon name="close" /> Tắt camera
            </button>
          </>
        )}
      </div>
      {started && status !== "loading" && (
        <div className="ar-presentation-controls" aria-label="Điều chỉnh hiện vật AR">
          <label>
            Kích thước hiện vật AR <output>{presentation.scale.toFixed(1)}×</output>
            <input type="range" aria-label="Kích thước hiện vật AR" min="0.5" max="2" step="0.1" value={presentation.scale} onChange={(event) => setPresentation((value) => ({ ...value, scale: Number(event.target.value) }))} />
          </label>
          <div>
            <button onClick={() => setPresentation((value) => ({ ...value, rotation: (value.rotation + 525) % 360 - 180 }))} aria-label="Xoay hiện vật AR sang trái">↶</button>
            <button onClick={() => setPresentation((value) => ({ ...value, rotation: (value.rotation + 555) % 360 - 180 }))} aria-label="Xoay hiện vật AR sang phải">↷</button>
            <button onClick={() => setPresentation((value) => ({ ...value, motion: !value.motion }))} aria-label="Chuyển động AR" aria-pressed={presentation.motion}>{presentation.motion ? "Tạm dừng" : "Chuyển động"}</button>
            <button onClick={() => setPresentation({ scale: 1, rotation: 0, motion: false })} aria-label="Đặt lại hiện vật AR">Đặt lại</button>
          </div>
        </div>
      )}
      {error && (
        <p className="ar-error" role="alert">
          {error}
        </p>
      )}
      <div className="ar-camera-guide">
        <img src={artifact.target} alt={`Ảnh cần quét: ${artifact.name}`} />
        <div>
          <strong>Quét đúng ảnh này</strong>
          <p>
            {artifact.recognitionCard}{" "}
            Giữ trọn ảnh trong khung, tránh phản sáng và di chuyển chậm. Khi mất
            ảnh, mô hình sẽ ẩn cho tới khi nhận diện lại.
          </p>
          <a
            href={`/ar-experience?artifact=${encodeURIComponent(artifact.id)}&view=target${artifact.status === "review" ? "&review=1" : ""}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Mở thẻ trên thiết bị khác / In thẻ ↗
          </a>
        </div>
      </div>
    </section>
  );
}
