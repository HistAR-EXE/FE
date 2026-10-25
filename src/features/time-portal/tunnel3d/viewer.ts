// src/features/time-portal/tunnel3d/viewer.ts
// Trình xem sa bàn 3D: renderer, camera, điều khiển xoay/zoom, chọn nhãn/hầm
// để bay camera tới và hiện mô tả, đổi thời kỳ, bật/tắt nhãn.

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { EraValue } from '../eraLabels'
import { ERA_SCENES, type InfoItem } from './scenes'
import { buildScene, type BuiltScene } from './build'

export type TunnelViewer = {
  setEra: (era: EraValue) => void
  setLabelsVisible: (visible: boolean) => void
  resetView: () => void
  focusSemanticTarget: (targetId: string) => boolean
  dispose: () => void
}

export type ViewerOptions = {
  onSelect?: (info: InfoItem | null) => void
}

type Tween = {
  p0: THREE.Vector3
  p1: THREE.Vector3
  t0: THREE.Vector3
  t1: THREE.Vector3
  start: number
  dur: number
}

const VIEW_DIR = new THREE.Vector3(0.1, 0.24, 1).normalize()
/** Chiều cao mong muốn của nhãn trên màn hình (px). */
const LABEL_PX = 22

function easeInOut(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export function createTunnelViewer(host: HTMLElement, era: EraValue, opts: ViewerOptions = {}): TunnelViewer {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.setClearColor(0x000000, 0)
  const el = renderer.domElement
  el.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;outline:none'
  host.appendChild(el)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 500)

  const hemi = new THREE.HemisphereLight('#fff3dc', '#6a3216', 1.3)
  const sun = new THREE.DirectionalLight('#fff0d6', 2.1)
  sun.position.set(8, 16, 10)
  const front = new THREE.DirectionalLight('#ffe2c0', 1.0)
  front.position.set(-3, 2, 14)
  scene.add(hemi, sun, front)

  const controls = new OrbitControls(camera, el)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = true
  controls.screenSpacePanning = true
  controls.panSpeed = 0.8
  controls.zoomToCursor = true
  controls.rotateSpeed = 0.55
  controls.zoomSpeed = 0.8
  controls.minAzimuthAngle = -Math.PI / 2.5
  controls.maxAzimuthAngle = Math.PI / 2.5
  controls.minPolarAngle = 0.32
  controls.maxPolarAngle = Math.PI / 2 + 0.2

  let built: BuiltScene | null = null
  let currentEra: EraValue | null = null
  let labelsVisible = true
  let tween: Tween | null = null
  let homeTarget = new THREE.Vector3()
  let homeDist = 20
  let userMoved = false
  let disposed = false
  let labelK = 1
  let pendingSemanticTarget: string | null = null

  let last = performance.now()
  let elapsed = 0

  /** Tìm khoảng cách & tâm sao cho toàn bộ sa bàn + nhãn nằm gọn trong khung hình. */
  function computeHome() {
    if (!built) return
    const portrait = camera.aspect < 0.9
    const b = portrait ? built.blockBounds : built.bounds
    const corners: THREE.Vector3[] = []
    for (const x of [b.minX, b.maxX]) for (const y of [b.minY, b.maxY]) for (const z of [b.minZ, b.maxZ]) corners.push(new THREE.Vector3(x, y, z))
    const savedPos = camera.position.clone()
    const savedQuat = camera.quaternion.clone()
    const p = new THREE.Vector3()
    const place = (target: THREE.Vector3, d: number) => {
      camera.position.copy(target).addScaledVector(VIEW_DIR, d)
      camera.lookAt(target)
      camera.updateMatrixWorld()
    }
    const ndcBox = () => {
      let x0 = Infinity
      let x1 = -Infinity
      let y0 = Infinity
      let y1 = -Infinity
      for (const c of corners) {
        p.copy(c).project(camera)
        x0 = Math.min(x0, p.x)
        x1 = Math.max(x1, p.x)
        y0 = Math.min(y0, p.y)
        y1 = Math.max(y1, p.y)
      }
      return { x0, x1, y0, y1 }
    }
    const X_LIM = portrait ? 1.0 : 0.97
    const Y_LIM = portrait ? 0.7 : 0.86
    const target = new THREE.Vector3((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, 0)
    let dist = 20
    for (let pass = 0; pass < 3; pass++) {
      let lo = 2
      let hi = 400
      for (let i = 0; i < 26; i++) {
        const mid = (lo + hi) / 2
        place(target, mid)
        const r = ndcBox()
        if (r.x0 >= -X_LIM && r.x1 <= X_LIM && r.y0 >= -Y_LIM && r.y1 <= Y_LIM) hi = mid
        else lo = mid
      }
      dist = hi
      place(target, dist)
      const r = ndcBox()
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
      target.addScaledVector(right, ((r.x0 + r.x1) / 2) * halfH * camera.aspect)
      target.addScaledVector(up, ((r.y0 + r.y1) / 2) * halfH)
    }
    camera.position.copy(savedPos)
    camera.quaternion.copy(savedQuat)
    camera.updateMatrixWorld()
    homeDist = dist
    homeTarget = target
    controls.minDistance = Math.min(4, homeDist * 0.25)
    controls.maxDistance = homeDist * 1.4
  }

  function flyTo(target: THREE.Vector3, dist: number, dir?: THREE.Vector3, dur = 0.75) {
    const d = (dir ?? camera.position.clone().sub(controls.target)).clone().normalize()
    tween = {
      p0: camera.position.clone(),
      p1: target.clone().addScaledVector(d, dist),
      t0: controls.target.clone(),
      t1: target.clone(),
      start: elapsed,
      dur,
    }
  }

  /** Giữ tâm xoay trong phạm vi sa bàn khi kéo/di chuyển. */
  const _off = new THREE.Vector3()
  function clampTarget() {
    if (!built || tween) return
    const b = built.blockBounds
    const t = controls.target
    const cx = THREE.MathUtils.clamp(t.x, b.minX, b.maxX)
    const cy = THREE.MathUtils.clamp(t.y, b.minY, b.maxY + 1)
    const cz = THREE.MathUtils.clamp(t.z, b.minZ, b.maxZ)
    if (cx !== t.x || cy !== t.y || cz !== t.z) {
      _off.set(cx - t.x, cy - t.y, cz - t.z)
      t.add(_off)
      camera.position.add(_off)
    }
  }

  function snapHome() {
    tween = null
    controls.target.copy(homeTarget)
    camera.position.copy(homeTarget).addScaledVector(VIEW_DIR, homeDist)
    controls.update()
  }

  function disposeBuilt(b: BuiltScene) {
    scene.remove(b.root)
    b.root.traverse((o) => {
      const im = o as THREE.InstancedMesh
      if (im.isInstancedMesh) im.dispose()
    })
    b.dispose()
  }

  function setEra(next: EraValue) {
    if (disposed || next === currentEra) return
    const first = currentEra === null
    currentEra = next
    if (built) disposeBuilt(built)
    built = buildScene(ERA_SCENES[next])
    built.labelLayer.visible = labelsVisible
    labelK = -1
    scene.add(built.root)
    computeHome()
    userMoved = false
    if (first) snapHome()
    else flyTo(homeTarget, homeDist, VIEW_DIR, 0.6)
    opts.onSelect?.(null)
    if (next === 1968 && pendingSemanticTarget) applySemanticTarget(pendingSemanticTarget)
  }

  function applySemanticTarget(targetId: string): boolean {
    if (!built || currentEra !== 1968) return false
    const target = built.semanticTargets.get(targetId)
    if (!target) return false
    pendingSemanticTarget = null
    userMoved = true
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const distance = THREE.MathUtils.clamp(3.4 / (half * camera.aspect), controls.minDistance + 0.5, homeDist * 0.7)
    flyTo(built.root.localToWorld(target.focus.clone()), distance, VIEW_DIR)
    opts.onSelect?.(target.info)
    return true
  }

  function focusSemanticTarget(targetId: string): boolean {
    const known = ERA_SCENES[1968].chambers.some((item) => item.heritageRoleId === targetId) ||
      ERA_SCENES[1968].callouts.some((item) => item.heritageRoleId === targetId)
    if (!known) {
      pendingSemanticTarget = null
      userMoved = false
      flyTo(homeTarget, homeDist, VIEW_DIR, 0.7)
      opts.onSelect?.(null)
      return false
    }
    pendingSemanticTarget = targetId
    if (currentEra === 1968 && built) applySemanticTarget(targetId)
    return true
  }

  // Kích thước
  function resize() {
    const w = host.clientWidth
    const h = host.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    computeHome()
    if (!userMoved) snapHome()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(host)

  // Chọn nhãn / hầm
  const ray = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let down: { x: number; y: number } | null = null

  function pickAt(clientX: number, clientY: number): THREE.Object3D | null {
    if (!built) return null
    const rect = el.getBoundingClientRect()
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    const targets = labelsVisible ? built.pickables : built.pickables.filter((o) => !(o as THREE.Sprite).isSprite)
    const hit = ray.intersectObjects(targets, false)[0]
    return hit ? hit.object : null
  }

  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY }
    tween = null
  }
  const onUp = (e: PointerEvent) => {
    if (!down) return
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y)
    down = null
    if (moved > 6) {
      userMoved = true
      return
    }
    const obj = pickAt(e.clientX, e.clientY)
    if (!obj || !built) {
      opts.onSelect?.(null)
      return
    }
    const info = obj.userData.info as InfoItem | undefined
    const focus = obj.userData.focus as THREE.Vector3 | undefined
    if (focus) {
      userMoved = true
      const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const d = THREE.MathUtils.clamp(3.4 / (half * camera.aspect), controls.minDistance + 0.5, homeDist * 0.7)
      flyTo(built.root.localToWorld(focus.clone()), d, VIEW_DIR)
    }
    opts.onSelect?.(info ?? null)
  }
  let hoverRaf = 0
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || down) return
    if (hoverRaf) return
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0
      el.style.cursor = pickAt(e.clientX, e.clientY) ? 'pointer' : 'grab'
    })
  }
  const onWheel = () => {
    userMoved = true
    tween = null
  }
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('wheel', onWheel, { passive: true })

  // Vòng lặp
  let raf = 0
  const loop = () => {
    raf = requestAnimationFrame(loop)
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    elapsed += dt
    if (built) for (const a of built.animators) a(elapsed, dt)
    if (tween) {
      const k = Math.min(1, (elapsed - tween.start) / tween.dur)
      const e = easeInOut(k)
      camera.position.lerpVectors(tween.p0, tween.p1, e)
      controls.target.lerpVectors(tween.t0, tween.t1, e)
      if (k >= 1) tween = null
    }
    controls.update()
    // Nhãn giữ cỡ chữ cố định trên màn hình; tự ẩn khi khung nhìn quá chật
    if (built && labelsVisible) {
      const dist = camera.position.distanceTo(controls.target)
      const hPx = el.clientHeight || 1
      const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / hPx
      const k = Math.max(0.3, (LABEL_PX * worldPerPx) / built.labelWorldH)
      const show = k <= 1.6
      built.labelLayer.visible = show
      if (show && Math.abs(k - labelK) > 0.01) {
        labelK = k
        built.labelLayer.traverse((o) => {
          const base = o.userData.baseScale as THREE.Vector3 | undefined
          if (base) o.scale.set(base.x * k, base.y * k, 1)
        })
      }
    }
    clampTarget()
    renderer.render(scene, camera)
  }

  resize()
  setEra(era)
  resize()
  loop()

  return {
    setEra,
    focusSemanticTarget,
    setLabelsVisible(v) {
      labelsVisible = v
      labelK = -1
      if (built) built.labelLayer.visible = v
    },
    resetView() {
      userMoved = false
      flyTo(homeTarget, homeDist, VIEW_DIR, 0.7)
      opts.onSelect?.(null)
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      if (hoverRaf) cancelAnimationFrame(hoverRaf)
      ro.disconnect()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('wheel', onWheel)
      controls.dispose()
      if (built) disposeBuilt(built)
      built = null
      renderer.dispose()
      if (el.parentNode === host) host.removeChild(el)
    },
  }
}
