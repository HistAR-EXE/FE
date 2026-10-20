/* Standalone MindAR frame. No check-in or reward APIs. */
(() => {
  const query = new URLSearchParams(location.search);
  const requested = query.get("artifact");
  let artifact = /^[a-z0-9-]+$/.test(requested || "") ? requested : "hat";
  const send = (type, message) => {
    if (window.parent !== window)
      window.parent.postMessage({ type, artifact, message }, location.origin);
  };
  let stopped = false;
  let scene;
  let startupTimer;
  let animationFrame;
  let mixer;
  let animationRoot;
  let pivot;
  let normalizedRoot;
  let framingBox;
  let fitFrame;
  let fitPending = true;
  let fitAttempts = 0;
  let targetVisible = false;
  let previousTime;
  const presentation = { scale: 1, rotation: 0, motion: false };
  const request = new AbortController();
  // Calibrate once from the real tracking pose and camera aspect. A fixed marker
  // scale can otherwise crop tall artifacts in a landscape camera viewport.
  const fitFirstView = () => {
    fitFrame = undefined;
    if (stopped || !targetVisible || !fitPending || !normalizedRoot || !scene.camera) return;
    const THREE = AFRAME.THREE;
    const userScale = presentation.scale;
    pivot.scale.setScalar(1);
    let measured = false;
    for (let step = 0; step < 6; step++) {
      scene.object3D.updateMatrixWorld(true);
      scene.camera.updateMatrixWorld(true);
      const box = framingBox.clone().applyMatrix4(pivot.matrixWorld);
      let extent = 0;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(scene.camera);
        extent = Math.max(extent, Math.abs(point.x), Math.abs(point.y));
      }
      if (!Number.isFinite(extent) || extent <= 0) break;
      measured = true;
      if (extent <= 0.85) break;
      const factor = Math.max(0.1, 0.84 / extent);
      normalizedRoot.scale.multiplyScalar(factor);
      framingBox.min.multiplyScalar(factor);
      framingBox.max.multiplyScalar(factor);
    }
    pivot.scale.setScalar(userScale);
    if (measured) fitPending = false;
    else if (++fitAttempts < 8) fitFrame = requestAnimationFrame(fitFirstView);
  };
  const measureAnimatedBounds = (THREE, root) => {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (!root.animations?.length) return box;
    const sampler = new THREE.AnimationMixer(root);
    for (const clip of root.animations) {
      const action = sampler.clipAction(clip);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      const times = new Set([0, ...clip.tracks.flatMap(track => Array.from(track.times))]);
      for (let index = 0; index <= 24; index++) times.add(clip.duration * index / 24);
      for (const time of [...times].sort((a, b) => a - b)) {
        sampler.setTime(Math.min(time, Math.max(clip.duration - 0.000001, 0)));
        root.updateMatrixWorld(true);
        box.union(new THREE.Box3().setFromObject(root));
      }
      sampler.stopAllAction();
    }
    sampler.uncacheRoot(root);
    root.updateMatrixWorld(true);
    return box.expandByVector(box.getSize(new THREE.Vector3()).multiplyScalar(0.015));
  };
  const disposeObject = (object) => {
    const geometries = new Set(), materials = new Set(), textures = new Set();
    object?.traverse((child) => {
      if (!child.isMesh) return;
      geometries.add(child.geometry);
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        materials.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    textures.forEach((texture) => texture.dispose());
    materials.forEach((material) => material.dispose());
  };
  const stopMotion = () => {
    cancelAnimationFrame(animationFrame);
    animationFrame = undefined;
    previousTime = undefined;
  };
  const animate = (time) => {
    animationFrame = undefined;
    if (stopped || !targetVisible || !presentation.motion || !pivot) return;
    const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    pivot.rotation.y += delta * 0.18;
    mixer?.update(delta);
    animationFrame = requestAnimationFrame(animate);
  };
  const updateMotion = () => {
    if (stopped || !targetVisible || !presentation.motion) stopMotion();
    else if (animationFrame === undefined) animationFrame = requestAnimationFrame(animate);
  };
  const applyPresentation = () => {
    if (!pivot || stopped) return;
    pivot.scale.setScalar(presentation.scale);
    pivot.rotation.y = presentation.rotation * Math.PI / 180;
    updateMotion();
  };
  const stop = () => {
    stopped = true;
    clearTimeout(startupTimer);
    request.abort();
    stopMotion();
    cancelAnimationFrame(fitFrame);
    mixer?.stopAllAction();
    if (animationRoot) mixer?.uncacheRoot(animationRoot);
    try {
      Promise.resolve(scene?.systems["mindar-image-system"]?.stop()).catch(() => {});
    } catch { /* stream fallback below */ }
    document.querySelectorAll("video").forEach((video) => {
      video.srcObject?.getTracks?.().forEach((track) => track.stop());
      video.srcObject = null;
    });
    scene?.pause();
    scene?.renderer?.setAnimationLoop(null);
    if (animationRoot) {
      disposeObject(animationRoot);
      animationRoot = undefined;
    }
  };
  const fail = (message) => {
    if (stopped) return;
    document.getElementById("error").textContent = message;
    send("AR_ERROR", message);
    stop();
  };
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.source !== window.parent || !event.data || typeof event.data !== "object") return;
    if (event.data.type === "AR_STOP" && event.data.artifact === artifact) { stop(); return; }
    if (stopped || event.data.type !== "AR_PRESENTATION" || event.data.artifact !== artifact) return;
    const { scale, rotation, motion } = event.data;
    if (!Number.isFinite(scale) || !Number.isFinite(rotation) || typeof motion !== "boolean") return;
    presentation.scale = Math.max(0.5, Math.min(2, scale));
    presentation.rotation = Math.max(-360, Math.min(360, rotation));
    presentation.motion = motion;
    applyPresentation();
  });
  window.addEventListener("pagehide", stop);
  window.addEventListener("timelens-ar-stop", stop);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("[TimeLens AR] Initialization failed", event.reason);
    event.preventDefault();
    fail("Chưa khởi tạo được nhận diện ảnh. Camera đã tắt. Kiểm tra kết nối và thử lại.");
  });
  if (!window.AFRAME || !window.MINDAR) {
    fail("Chưa tải được thư viện AR. Kiểm tra kết nối rồi thử lại.");
    return;
  }
  startupTimer = setTimeout(() => fail("AR tải quá lâu. Camera đã tắt. Kiểm tra kết nối và thử lại."), 55000);
  const initialize = async () => {
    let settings;
    try {
      const response = await fetch("/ar-catalog.json", { signal: request.signal });
      if (!response.ok) throw new Error("Catalog unavailable");
      const catalog = await response.json();
      if (!Array.isArray(catalog)) throw new Error("Invalid catalog");
      const allowed = (entry) => entry && (entry.status === "published" || (entry.status === "review" && query.get("review") === "1"));
      settings = catalog.find((entry) => allowed(entry) && entry.id === requested) || catalog.find((entry) => allowed(entry) && entry.id === "hat");
      if (!settings || !/^[a-z0-9-]+$/.test(settings.id) || !/^\/assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.glb$/.test(settings.model) || !(Number.isInteger(settings.targetIndex) && settings.targetIndex >= 0 && settings.targetIndex < catalog.length)) throw new Error("Invalid artifact settings");
      artifact = settings.id;
    } catch {
      fail("Chưa tải được danh mục hiện vật AR. Camera đã tắt. Kiểm tra kết nối và thử lại.");
      return;
    }
    if (stopped) return;
    scene = document.createElement("a-scene");
    scene.setAttribute("embedded", "");
    scene.setAttribute("mindar-image", "imageTargetSrc: /assets/cu-chi-targets.mind; autoStart: false; uiLoading: no; uiScanning: no; uiError: no;");
    scene.setAttribute("renderer", "colorManagement: true; physicallyCorrectLights: true; alpha: true");
    scene.setAttribute("color-space", "sRGB");
    scene.setAttribute("vr-mode-ui", "enabled: false");
    scene.setAttribute("device-orientation-permission-ui", "enabled: false");
    scene.innerHTML = `<a-light type="ambient" intensity="3"></a-light>
      <a-light type="directional" position="1 2 1" intensity="4"></a-light>
      <a-light type="directional" position="-2 1 2" intensity="2"></a-light>
      <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
      <a-entity mindar-image-target="targetIndex: ${settings.targetIndex}">
        <a-gltf-model data-ar-presentation src="${settings.model}" position="0 0 0.06"></a-gltf-model>
      </a-entity>`;
    const target = scene.querySelector("[mindar-image-target]");
    target.addEventListener("targetFound", () => {
      if (!stopped) {
        targetVisible = true;
        if (fitPending && scene.camera && fitFrame === undefined) fitFrame = requestAnimationFrame(fitFirstView);
        updateMotion();
        send("AR_TARGET_FOUND");
      }
    });
    target.addEventListener("targetLost", () => {
      if (!stopped) { targetVisible = false; updateMotion(); send("AR_TARGET_LOST"); }
    });
    scene.addEventListener("arReady", () => {
      if (stopped) { stop(); return; }
      clearTimeout(startupTimer);
      send("AR_READY");
    });
    scene.addEventListener("arError", () => fail("Không thể mở camera. Cho phép camera trong trình duyệt, đóng ứng dụng đang dùng camera rồi thử lại."));
    const modelLoaded = new Promise((resolve, reject) => {
      const model = scene.querySelector("a-gltf-model");
      model.addEventListener("model-loaded", () => {
        const mesh = model.getObject3D("mesh");
        if (stopped) { disposeObject(mesh); resolve(); return; }
        try {
          // MindAR hides untracked anchors with non-finite transforms. Measure
          // the detached authored model; never replace the tracking anchor matrix.
          mesh.parent.remove(mesh);
          mesh.updateMatrixWorld(true);
          const THREE = AFRAME.THREE;
          const box = measureAnimatedBounds(THREE, mesh);
          const size = box.getSize(new THREE.Vector3());
          const center = box.getCenter(new THREE.Vector3());
          if (![...size.toArray(), ...center.toArray()].every(Number.isFinite)) throw new Error("Invalid model bounds");
          const normalized = new THREE.Group();
          const offset = new THREE.Group();
          normalized.scale.setScalar(0.65 / Math.max(size.x, size.y, size.z, 0.001));
          normalizedRoot = normalized;
          framingBox = box.clone().translate(center.clone().negate());
          framingBox.min.multiplyScalar(normalized.scale.x);
          framingBox.max.multiplyScalar(normalized.scale.x);
          offset.position.copy(center).negate();
          offset.add(mesh);
          normalized.add(offset);
          pivot = new THREE.Group();
          pivot.add(normalized);
          model.setObject3D("mesh", pivot);
          model.setAttribute("position", "0 0 0.06");
          animationRoot = mesh;
          if (mesh.animations?.length) {
            mixer = new THREE.AnimationMixer(mesh);
            for (const clip of mesh.animations) mixer.clipAction(clip).play();
          }
          applyPresentation();
          resolve();
        } catch (error) { disposeObject(mesh); reject(error); }
      }, { once: true });
      model.addEventListener("model-error", reject, { once: true });
    });
    // Register rejection handling before the model can finish loading.
    modelLoaded.catch(() => fail("Chưa tải được mô hình. Camera đã tắt. Kiểm tra kết nối và thử lại."));
    scene.addEventListener("loaded", async () => {
      try {
        await modelLoaded;
        if (stopped) return;
        await scene.systems["mindar-image-system"].start();
        if (stopped) stop();
      } catch { fail("Chưa tải được mô hình hoặc chưa mở được camera. Kiểm tra kết nối và quyền camera rồi thử lại."); }
    }, { once: true });
    document.body.appendChild(scene);
  };
  void initialize().catch(() => fail("Chưa khởi tạo được AR. Camera đã tắt. Vui lòng thử lại."));
})();
