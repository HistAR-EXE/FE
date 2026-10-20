import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ArArtifact } from "./arExperience";
import { fitBoxDistance, measureAnimatedBounds } from "./viewerMath";

export function ArtifactModelViewer({ artifact }: { artifact: ArArtifact }) {
  const root = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const resetRef = useRef<() => void>(() => {});
  const rotateRef = useRef<(direction: number) => void>(() => {});
  const zoomRef = useRef<(factor: number) => void>(() => {});
  const motionRef = useRef(false);
  const [motion, setMotion] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState("");
  const [status, setStatus] = useState("Đang tải mô hình…");
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const element = host.current;
    const viewer = root.current;
    if (!element || !viewer) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setStatus("Thiết bị chưa hỗ trợ hiển thị 3D WebGL. Bạn vẫn có thể mở thẻ AR.");
      setFailed(true);
      return;
    }
    setStatus("Đang tải mô hình…");
    setFailed(false);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const changeMotion = (playing: boolean) => {
      motionRef.current = playing;
      setMotion(playing);
    };
    changeMotion(!reducedMotion.matches);
    const pause = () => changeMotion(false);
    const onMotionPreference = () => { if (reducedMotion.matches) pause(); };
    reducedMotion.addEventListener("change", onMotionPreference);
    const onFullscreen = () => {
      setFullscreen(document.fullscreenElement === viewer);
      setFullscreenMessage("");
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-label", `Mô hình 3D ${artifact.name}`);
    renderer.domElement.setAttribute("role", "img");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x64748b, 3));
    const light = new THREE.DirectionalLight(0xfff2cf, 4);
    light.position.set(3, 4, 5);
    scene.add(light);
    const fill = new THREE.DirectionalLight(0x8dbbff, 2);
    fill.position.set(-3, 1, -2);
    scene.add(fill);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.addEventListener("start", pause);
    const pivot = new THREE.Group();
    scene.add(pivot);
    let model: THREE.Object3D | undefined;
    let loadedScenes: THREE.Object3D[] = [];
    let mixer: THREE.AnimationMixer | undefined;
    let radius = 1;
    let fitDistance = 5;
    let userZoomed = false;
    const direction = new THREE.Vector3(0, 0.2, 1).normalize();
    let framingBox = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
    const projectedFit = (viewDirection: THREE.Vector3) => fitBoxDistance(THREE, framingBox.clone().applyMatrix4(new THREE.Matrix4().makeRotationY(pivot.rotation.y)), viewDirection, camera.fov, camera.aspect);
    const release = (objects: THREE.Object3D[]) => {
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      const textures = new Set<THREE.Texture>();
      for (const object of objects) object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        geometries.add(child.geometry);
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          materials.add(material);
          for (const value of Object.values(material))
            if (value instanceof THREE.Texture) textures.add(value);
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      textures.forEach((texture) => texture.dispose());
      materials.forEach((material) => material.dispose());
    };
    const refit = (resetDirection = false) => {
      const previousFit = fitDistance;
      fitDistance = projectedFit(resetDirection ? direction : camera.position.clone().normalize());
      controls.minDistance = radius * 0.5;
      controls.maxDistance = fitDistance * 3;
      camera.near = Math.max(radius / 100, 0.001);
      camera.far = controls.maxDistance + radius * 4;
      camera.updateProjectionMatrix();
      if (resetDirection) camera.position.copy(direction).multiplyScalar(fitDistance);
      else {
        const zoomRatio = userZoomed ? camera.position.length() / previousFit : 1;
        camera.position.setLength(THREE.MathUtils.clamp(fitDistance * zoomRatio, controls.minDistance, controls.maxDistance));
      }
      controls.target.set(0, 0, 0);
      controls.update();
    };
    const reset = () => {
      pivot.rotation.set(0, 0, 0);
      mixer?.setTime(0);
      userZoomed = false;
      // Clear any queued OrbitControls damping before restoring the home view.
      controls.enableDamping = false;
      controls.update();
      refit(true);
      controls.enableDamping = true;
    };
    reset();
    resetRef.current = reset;
    rotateRef.current = (sign) => {
      pause();
      pivot.rotation.y += (sign * Math.PI) / 8;
    };
    zoomRef.current = (factor) => {
      pause();
      userZoomed = true;
      camera.position.setLength(THREE.MathUtils.clamp(camera.position.length() * factor, controls.minDistance, controls.maxDistance));
      controls.update();
    };
    const noteZoom = () => { pause(); userZoomed = true; };
    renderer.domElement.addEventListener("wheel", noteZoom, { passive: true });
    const noteTouch = (event: PointerEvent) => { if (event.pointerType === "touch") userZoomed = true; };
    renderer.domElement.addEventListener("pointerdown", noteTouch);
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      renderer.setSize(width, height);
      refit();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    const loadFailed = () => {
      if (!disposed) {
        setFailed(true);
        setStatus("Chưa tải được mô hình. Kiểm tra kết nối và thử lại.");
      }
    };
    try {
      new GLTFLoader().load(artifact.model, (gltf) => {
        const resources = Array.from(new Set([gltf.scene, ...gltf.scenes]));
        if (disposed) { release(resources); return; }
        loadedScenes = resources;
        model = gltf.scene;
        const box = measureAnimatedBounds(THREE, model, gltf.animations);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const scale = 2 / Math.max(size.x, size.y, size.z, 0.001);
        // Keep the authored scene intact (including animation bindings) inside a centered pivot.
        const offset = new THREE.Group();
        offset.position.copy(center).negate();
        offset.add(model);
        pivot.add(offset);
        pivot.scale.setScalar(scale);
        framingBox = box.clone().translate(center.clone().negate());
        framingBox.min.multiplyScalar(scale);
        framingBox.max.multiplyScalar(scale);
        radius = Math.max(size.length() * scale / 2, 0.01);
        if (gltf.animations.length) {
          mixer = new THREE.AnimationMixer(model);
          for (const clip of gltf.animations) mixer.clipAction(clip).play();
        }
        reset();
        setStatus("");
      }, (progress) => {
        if (!disposed && progress.total)
          setStatus(`Đang tải mô hình… ${Math.round((progress.loaded / progress.total) * 100)}%`);
      }, loadFailed);
    } catch { loadFailed(); }
    let previousTime: number | undefined;
    renderer.setAnimationLoop((time) => {
      const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
      previousTime = time;
      const playing = motionRef.current && !document.hidden;
      element.dataset.motion = playing ? "playing" : "paused";
      if (playing && model) {
        pivot.rotation.y += delta * 0.18;
        mixer?.update(delta);
        // Keep authored motion and turntable rotation inside the viewport. Never
        // override a deliberate user zoom; only back away during automatic play.
        if (!userZoomed) {
          const required = projectedFit(camera.position.clone().normalize());
          if (camera.position.length() < required) camera.position.setLength(required);
        }
      }
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      disposed = true;
      observer.disconnect();
      reducedMotion.removeEventListener("change", onMotionPreference);
      document.removeEventListener("fullscreenchange", onFullscreen);
      if (document.fullscreenElement === viewer) void document.exitFullscreen().catch(() => {});
      renderer.setAnimationLoop(null);
      controls.removeEventListener("start", pause);
      renderer.domElement.removeEventListener("wheel", noteZoom);
      renderer.domElement.removeEventListener("pointerdown", noteTouch);
      controls.dispose();
      mixer?.stopAllAction();
      if (model) mixer?.uncacheRoot(model);
      release(loadedScenes);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      resetRef.current = () => {};
      rotateRef.current = () => {};
      zoomRef.current = () => {};
    };
  }, [artifact, retry]);

  const toggleFullscreen = async () => {
    const viewer = root.current;
    if (!viewer) return;
    if (!viewer.requestFullscreen || !document.fullscreenEnabled) {
      setFullscreenMessage("Trình duyệt này chưa hỗ trợ chế độ toàn màn hình.");
      return;
    }
    try {
      if (document.fullscreenElement === viewer) await document.exitFullscreen();
      else await viewer.requestFullscreen();
    } catch {
      setFullscreenMessage("Chưa thể mở toàn màn hình. Vui lòng thử lại.");
    }
  };

  return (
    <div ref={root} className="ar-model-viewer" style={fullscreen ? { background: "#ecf4ff", width: "100%", height: "100%", minHeight: 0 } : undefined}>
      <div ref={host} className="ar-model-canvas" />
      <div className="ar-viewer-badge"><span /> MÔ HÌNH 3D TƯƠNG TÁC</div>
      {status && <div className="ar-model-status" role="status"><p>{status}</p>{failed && <button className="ar-button ar-button-light" onClick={() => setRetry((value) => value + 1)}>Thử lại</button>}</div>}
      <div className="ar-model-controls" aria-label="Điều khiển mô hình">
        <button onClick={() => rotateRef.current(-1)} aria-label="Xoay trái">↶</button>
        <button onClick={() => rotateRef.current(1)} aria-label="Xoay phải">↷</button>
        <button onClick={() => zoomRef.current(0.85)} aria-label="Phóng to">+</button>
        <button onClick={() => zoomRef.current(1.15)} aria-label="Thu nhỏ">−</button>
        <button onClick={() => resetRef.current()} aria-label="Đặt lại góc nhìn">↺</button>
        <button onClick={() => { motionRef.current = !motionRef.current; setMotion(motionRef.current); }} aria-label="Chuyển động tự động" aria-pressed={motion} title={motion ? "Tạm dừng chuyển động" : "Phát chuyển động"}>{motion ? "Ⅱ" : "▶"}</button>
        <button onClick={() => void toggleFullscreen()} aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"} aria-pressed={fullscreen}>⛶</button>
      </div>
      <p className="ar-model-hint" role={fullscreenMessage ? "status" : undefined}>{fullscreenMessage || "Kéo để xoay · Cuộn để phóng to · Hoặc dùng các nút điều khiển"}</p>
    </div>
  );
}
