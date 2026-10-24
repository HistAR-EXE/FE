// src/features/time-portal/tunnel3d/build.ts
// Dựng sa bàn lát cắt địa đạo: khối đất đá ong, mặt cắt khoét lõm (texture
// có lỗ + lòng hầm nửa ống phía sau), hầm phòng có khung gỗ & đồ đạc,
// nhân vật hoạt động, khói bếp Hoàng Cầm, rừng cây, nhãn có đường chỉ dẫn.

import * as THREE from 'three'
import { Kit, mulberry32 } from './kit'
import { applyPose, crawlAnimator, makeFigure, poseAnimator } from './figures'
import type { Chamber, Cut, CutKind, EraScene, FigureSpec, InfoItem, SurfaceObj, Vec2 } from './scenes'

export type Animator = (t: number, dt: number) => void

export type BuiltScene = {
  root: THREE.Group
  animators: Animator[]
  pickables: THREE.Object3D[]
  semanticTargets: ReadonlyMap<string, { info: InfoItem; focus: THREE.Vector3 }>
  labelLayer: THREE.Group
  /** Khung nội dung (đơn vị cục bộ) để viewer canh camera. */
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
  /** Chỉ riêng khối đất (dùng cho màn hình dọc). */
  blockBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
  /** Chiều cao nhãn (đơn vị thế giới) ở tỉ lệ gốc. */
  labelWorldH: number
  dispose: () => void
}

/* ------------------------------------------------------------------ */
/*  Tiện ích hình học                                                  */
/* ------------------------------------------------------------------ */

function cutCurve(points: Vec2[], z = 0): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, z)),
    false,
    'catmullrom',
    0.12,
  )
}

function curveSamples(points: Vec2[]): THREE.Vector3[] {
  const c = cutCurve(points)
  const n = Math.max(24, Math.round(c.getLength() * 14))
  return c.getSpacedPoints(n)
}

const GROOVE_COLORS: Record<CutKind, (s: EraScene) => string> = {
  tunnel: (s) => s.palette.groove,
  deep: (s) => shade(s.palette.groove, 0.93),
  demo: () => '#fde4b8',
  trap: () => '#c98f5c',
  vent: () => '#7d4b28',
  flue: () => '#3f2f24',
  well: () => '#a36c3c',
}

function shade(hex: string, k: number): string {
  const c = new THREE.Color(hex)
  c.multiplyScalar(k)
  return `#${c.getHexString()}`
}

/* ------------------------------------------------------------------ */
/*  Texture mặt cắt                                                    */
/* ------------------------------------------------------------------ */

type FaceMapper = { ppu: number; X: (x: number) => number; Y: (y: number) => number; cw: number; ch: number }

function roomPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rt: number, rb: number) {
  c.beginPath()
  c.moveTo(x + rt, y)
  c.lineTo(x + w - rt, y)
  c.quadraticCurveTo(x + w, y, x + w, y + rt)
  c.lineTo(x + w, y + h - rb)
  c.quadraticCurveTo(x + w, y + h, x + w - rb, y + h)
  c.lineTo(x + rb, y + h)
  c.quadraticCurveTo(x, y + h, x, y + h - rb)
  c.lineTo(x, y + rt)
  c.quadraticCurveTo(x, y, x + rt, y)
  c.closePath()
}

function strokeSamples(c: CanvasRenderingContext2D, pts: THREE.Vector3[], m: FaceMapper) {
  c.beginPath()
  pts.forEach((p, i) => {
    if (i === 0) c.moveTo(m.X(p.x), m.Y(p.y))
    else c.lineTo(m.X(p.x), m.Y(p.y))
  })
  c.stroke()
}

function chamberRect(ch: Chamber, m: FaceMapper, grow = 0) {
  const x = m.X(ch.x - ch.w / 2 - grow)
  const y = m.Y(ch.y + ch.h + grow)
  const w = (ch.w + grow * 2) * m.ppu
  const h = (ch.h + grow * 2) * m.ppu
  return { x, y, w, h, rt: Math.min(0.34, ch.h * 0.36) * m.ppu, rb: 0.1 * m.ppu }
}

function paintEarth(c: CanvasRenderingContext2D, s: EraScene, m: FaceMapper, seed: number, detail: number) {
  const { cw, ch } = m
  const g = c.createLinearGradient(0, 0, 0, ch)
  const topFrac = Math.min(0.12, 0.42 / s.blockH)
  g.addColorStop(0, s.palette.topsoil)
  g.addColorStop(topFrac * 0.7, s.palette.topsoil)
  g.addColorStop(topFrac * 1.35, s.palette.laterite)
  g.addColorStop(0.55, shade(s.palette.laterite, 0.95))
  g.addColorStop(1, s.palette.deep)
  c.fillStyle = g
  c.fillRect(0, 0, cw, ch)

  const rnd = mulberry32(seed)
  // Vân tầng đất
  for (let i = 0; i < 18 * detail; i++) {
    const y0 = (0.08 + rnd() * 0.92) * ch
    c.strokeStyle = rnd() > 0.5 ? 'rgba(120,40,10,0.13)' : 'rgba(255,190,120,0.09)'
    c.lineWidth = (2 + rnd() * 9) * (m.ppu / 100)
    c.beginPath()
    for (let x = 0; x <= cw; x += cw / 30) {
      const y = y0 + Math.sin(x * 0.004 + i) * 6 * (m.ppu / 100) + (rnd() - 0.5) * 3
      if (x === 0) c.moveTo(x, y)
      else c.lineTo(x, y)
    }
    c.stroke()
  }
  // Hạt đá ong / sỏi
  for (let i = 0; i < 2200 * detail; i++) {
    const x = rnd() * cw
    const y = (0.04 + rnd() * 0.96) * ch
    const r = (0.5 + rnd() * 2.2) * (m.ppu / 100)
    const dark = rnd() > 0.45
    c.fillStyle = dark ? `rgba(110,35,8,${0.18 + rnd() * 0.22})` : `rgba(255,205,150,${0.1 + rnd() * 0.18})`
    c.beginPath()
    c.ellipse(x, y, r * 1.4, r, rnd() * Math.PI, 0, Math.PI * 2)
    c.fill()
  }
  // Lớp đất mùn sát mặt + rễ cỏ
  const humus = 0.32 * m.ppu
  c.fillStyle = s.palette.topsoil
  c.beginPath()
  c.moveTo(0, 0)
  for (let x = 0; x <= cw; x += cw / 60) c.lineTo(x, humus * (0.75 + rnd() * 0.5))
  c.lineTo(cw, 0)
  c.closePath()
  c.fill()
  c.strokeStyle = 'rgba(40,24,10,0.55)'
  c.lineWidth = Math.max(1, 0.012 * m.ppu)
  for (let i = 0; i < 160 * detail; i++) {
    const x = rnd() * cw
    c.beginPath()
    c.moveTo(x, humus * 0.5)
    c.quadraticCurveTo(x + (rnd() - 0.5) * 20, humus * 1.1, x + (rnd() - 0.5) * 30, humus * (1.2 + rnd() * 0.8))
    c.stroke()
  }
  c.fillStyle = s.palette.grass
  c.fillRect(0, 0, cw, 0.07 * m.ppu)
}

function makeFaceTexture(s: EraScene, kit: Kit): THREE.CanvasTexture {
  const ppu = Math.min(112, 2048 / s.blockW)
  const cw = Math.round(s.blockW * ppu)
  const chh = Math.round(s.blockH * ppu)
  const m: FaceMapper = { ppu, cw, ch: chh, X: (x) => (x + s.blockW / 2) * ppu, Y: (y) => -y * ppu }

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = chh
  const c = canvas.getContext('2d')!
  paintEarth(c, s, m, Math.round(s.blockW * 100 + s.blockH), 1)

  // Hầm bảo tồn (nét đứt, không khoét)
  for (const d of s.decor) {
    if (d.kind === 'ghostCut') {
      const pts = curveSamples(d.points)
      c.lineCap = 'round'
      c.lineJoin = 'round'
      c.setLineDash([0.16 * ppu, 0.1 * ppu])
      c.strokeStyle = 'rgba(255,236,205,0.75)'
      c.lineWidth = (d.radius * 2 + 0.08) * ppu
      strokeSamples(c, pts, m)
      c.setLineDash([])
      c.strokeStyle = shade(s.palette.laterite, 1.06)
      c.lineWidth = d.radius * 2 * ppu
      strokeSamples(c, pts, m)
    } else if (d.kind === 'ghostRoom') {
      const fake: Chamber = { kind: 'store', x: d.x, y: d.y, w: d.w, h: d.h, title: '', desc: '' }
      const r = chamberRect(fake, m, 0.04)
      c.setLineDash([0.16 * ppu, 0.1 * ppu])
      c.strokeStyle = 'rgba(255,236,205,0.75)'
      c.lineWidth = 0.05 * ppu
      roomPath(c, r.x, r.y, r.w, r.h, r.rt, r.rb)
      c.stroke()
      c.setLineDash([])
      c.fillStyle = 'rgba(255,225,180,0.12)'
      c.fill()
    }
  }

  // Viền sẫm quanh miệng hầm (đổ bóng như sa bàn)
  c.save()
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.shadowColor = 'rgba(45,12,2,0.9)'
  c.shadowBlur = 0.14 * ppu
  c.strokeStyle = 'rgba(78,26,6,0.92)'
  c.fillStyle = 'rgba(78,26,6,0.92)'
  for (const cut of s.cuts) {
    c.lineWidth = (cut.radius * 2 + (cut.radius < 0.1 ? 0.06 : 0.13)) * ppu
    strokeSamples(c, curveSamples(cut.points), m)
  }
  for (const chm of s.chambers) {
    const r = chamberRect(chm, m, 0.065)
    roomPath(c, r.x, r.y, r.w, r.h, r.rt, r.rb)
    c.fill()
  }
  c.restore()

  // Gờ sáng phía trên miệng hầm
  c.save()
  c.lineCap = 'round'
  c.strokeStyle = 'rgba(255,214,160,0.35)'
  for (const cut of s.cuts) {
    if (cut.radius < 0.1) continue
    c.lineWidth = (cut.radius * 2 + 0.05) * ppu
    c.save()
    c.translate(0, -0.03 * ppu)
    strokeSamples(c, curveSamples(cut.points), m)
    c.restore()
  }
  c.restore()

  // Đường nét đứt + dấu X (chưa liên thông)
  for (const d of s.decor) {
    if (d.kind === 'dash') {
      c.setLineDash([0.12 * ppu, 0.09 * ppu])
      c.strokeStyle = 'rgba(255,240,210,0.85)'
      c.lineWidth = 0.035 * ppu
      c.beginPath()
      d.points.forEach(([x, y], i) => (i ? c.lineTo(m.X(x), m.Y(y)) : c.moveTo(m.X(x), m.Y(y))))
      c.stroke()
      c.setLineDash([])
    } else if (d.kind === 'cross') {
      const [x, y] = d.at
      const k = 0.16 * ppu
      c.strokeStyle = '#ffd7a8'
      c.lineWidth = 0.05 * ppu
      c.beginPath()
      c.moveTo(m.X(x) - k, m.Y(y) - k)
      c.lineTo(m.X(x) + k, m.Y(y) + k)
      c.moveTo(m.X(x) + k, m.Y(y) - k)
      c.lineTo(m.X(x) - k, m.Y(y) + k)
      c.stroke()
    }
  }

  // Khoét lỗ
  c.globalCompositeOperation = 'destination-out'
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.strokeStyle = '#000'
  c.fillStyle = '#000'
  for (const cut of s.cuts) {
    c.lineWidth = cut.radius * 2 * ppu
    strokeSamples(c, curveSamples(cut.points), m)
  }
  for (const chm of s.chambers) {
    const r = chamberRect(chm, m)
    roomPath(c, r.x, r.y, r.w, r.h, r.rt, r.rb)
    c.fill()
  }
  c.globalCompositeOperation = 'source-over'

  const tex = kit.track(new THREE.CanvasTexture(canvas))
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

function makeSideTexture(s: EraScene, kit: Kit, worldW: number): THREE.CanvasTexture {
  const ppu = 40
  const cw = Math.round(worldW * ppu)
  const chh = Math.round(s.blockH * ppu)
  const m: FaceMapper = { ppu, cw, ch: chh, X: (x) => x * ppu, Y: (y) => -y * ppu }
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = chh
  paintEarth(canvas.getContext('2d')!, s, m, Math.round(worldW * 37), 0.4)
  const tex = kit.track(new THREE.CanvasTexture(canvas))
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ------------------------------------------------------------------ */
/*  Khối đất                                                           */
/* ------------------------------------------------------------------ */

function makeEarthBlock(s: EraScene, kit: Kit): THREE.Group {
  const g = new THREE.Group()
  const { blockW: W, blockH: H, blockD: D } = s

  const geo = kit.track(new THREE.BoxGeometry(W, H, D))
  geo.translate(0, -H / 2, 0)
  const sideTex = makeSideTexture(s, kit, D)
  const frontTex = makeFaceTexture(s, kit)
  const backTex = makeSideTexture(s, kit, W)
  const side = kit.track(new THREE.MeshStandardMaterial({ map: sideTex, roughness: 1 }))
  const back = kit.track(new THREE.MeshStandardMaterial({ map: backTex, roughness: 1 }))
  const top = kit.std(s.palette.grass, { roughness: 1 })
  const bottom = kit.std(shade(s.palette.deep, 0.6), { roughness: 1 })
  const front = kit.track(new THREE.MeshStandardMaterial({ map: frontTex, alphaTest: 0.5, roughness: 0.95 }))
  g.add(new THREE.Mesh(geo, [side, side, top, bottom, front, back]))

  // Tấm nền tối phía sau mặt cắt (bắt các khe hở)
  const backing = new THREE.Mesh(
    kit.track(new THREE.PlaneGeometry(W - 0.02, H - 0.02)),
    kit.std('#3a160a', { roughness: 1 }),
  )
  backing.position.set(0, -H / 2, D / 2 - 1.15)
  g.add(backing)

  // Thảm cỏ + gò đất
  const grass = new THREE.Mesh(kit.track(new THREE.BoxGeometry(W, 0.08, D)), kit.std(s.palette.grass, { roughness: 1 }))
  grass.position.y = 0.04
  g.add(grass)
  const rnd = mulberry32(s.forest.seed + 7)
  for (let i = 0; i < 6; i++) {
    const r = 0.9 + rnd() * 1.1
    const mound = new THREE.Mesh(
      kit.geo('mound-geo', () => new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
      kit.std(shade(s.palette.grass, 0.9 + rnd() * 0.2), { roughness: 1, flatShading: true }),
    )
    mound.scale.set(r, 0.13 + rnd() * 0.1, r * 0.8)
    mound.position.set((rnd() - 0.5) * (W - 2.5), 0.06, -D / 2 + 0.9 + rnd() * (D - 2.4))
    g.add(mound)
  }
  return g
}

/* ------------------------------------------------------------------ */
/*  Lòng hầm: nửa ống lõm phía sau mặt cắt                             */
/* ------------------------------------------------------------------ */

type SkipFn = (x: number, y: number) => boolean

function makeHalfPipe(curve: THREE.Curve<THREE.Vector3>, r: number, segs: number, radial: number, skip?: SkipFn): THREE.BufferGeometry {
  const pos: number[] = []
  const nor: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const P = new THREE.Vector3()
  const T = new THREE.Vector3()
  const N = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const back = new THREE.Vector3(0, 0, -1)
  for (let i = 0; i <= segs; i++) {
    const u = i / segs
    curve.getPointAt(u, P)
    curve.getTangentAt(u, T)
    N.set(-T.y, T.x, 0).normalize()
    for (let j = 0; j <= radial; j++) {
      const th = (Math.PI * j) / radial
      dir.copy(N).multiplyScalar(Math.cos(th)).addScaledVector(back, Math.sin(th))
      pos.push(P.x + dir.x * r, P.y + dir.y * r, P.z + dir.z * r)
      nor.push(-dir.x, -dir.y, -dir.z)
      // Trần hầm tối, nền hầm sáng → cảm giác khoét lõm vào vách đất
      const ny = -dir.y
      let k = 0.5 + 0.5 * (0.5 + 0.5 * ny)
      if (ny < -0.55) k *= 0.82
      col.push(k, k * 0.97, k * 0.94)
    }
  }
  const row = radial + 1
  const A = new THREE.Vector3()
  const B = new THREE.Vector3()
  for (let i = 0; i < segs; i++) {
    if (skip) {
      curve.getPointAt(i / segs, A)
      curve.getPointAt((i + 1) / segs, B)
      if (skip((A.x + B.x) / 2, (A.y + B.y) / 2)) continue
    }
    for (let j = 0; j < radial; j++) {
      const a = i * row + j
      const b = (i + 1) * row + j
      const c = i * row + j + 1
      const d = (i + 1) * row + j + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  return g
}

type CutSamples = { pts: THREE.Vector3[]; r: number }

function makeGroove(cut: Cut, s: EraScene, kit: Kit, steps: THREE.Matrix4[], others: CutSamples[]): THREE.Group {
  const g = new THREE.Group()
  const zf = s.blockD / 2
  const curve = cutCurve(cut.points, zf)
  const color = GROOVE_COLORS[cut.kind](s)
  const emissive = cut.kind === 'demo' ? '#a8642a' : cut.kind === 'flue' ? '#000000' : '#5a2a0c'
  const ei = cut.kind === 'demo' ? 0.5 : 0.22
  const segs = Math.max(20, Math.round(curve.getLength() * 12))
  // Không dựng lòng hầm bên trong hầm phòng — đường hầm mở thẳng vào phòng
  const inRoom: SkipFn = (x, y) =>
    s.chambers.some((ch) => x > ch.x - ch.w / 2 + 0.03 && x < ch.x + ch.w / 2 - 0.03 && y > ch.y - 0.45 && y < ch.y + ch.h)
  // Đoạn nằm trong lòng một đường hầm lớn hơn (điểm nối) → bỏ, để hai hầm thông nhau liền mạch
  const bigger = others.filter((o) => o.r >= cut.radius * 0.9)
  const inOther: SkipFn = (x, y) => bigger.some((o) => o.pts.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < (o.r * 0.94) ** 2))
  const skip: SkipFn = (x, y) => inRoom(x, y) || inOther(x, y)
  const pipe = new THREE.Mesh(
    kit.track(makeHalfPipe(curve, cut.radius, segs, cut.radius < 0.1 ? 5 : 10, skip)),
    kit.std(color, { vertexColors: true, roughness: 0.92, emissive, emissiveIntensity: ei }),
  )
  g.add(pipe)

  const capGeo = kit.geo(`cap-${cut.radius}`, () =>
    new THREE.SphereGeometry(cut.radius, 12, 8, Math.PI, Math.PI, 0, Math.PI),
  )
  const capMat = kit.std(shade(color, 0.82), { side: THREE.BackSide, roughness: 0.95, emissive, emissiveIntensity: ei })
  const atJunction = (x: number, y: number) =>
    others.some((o) => o.pts.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < (o.r * 1.05 + 0.03) ** 2))
  for (const [x, y] of [cut.points[0], cut.points[cut.points.length - 1]]) {
    if (inRoom(x, y) || atJunction(x, y)) continue
    const cap = new THREE.Mesh(capGeo, capMat)
    cap.position.set(x, y, zf)
    g.add(cap)
  }

  // Bậc thang trên các đoạn dốc
  if (cut.steps) {
    const n = cut.points.length - 1
    const tmp = new THREE.Object3D()
    for (let i = 0; i < n; i++) {
      const dy = cut.points[i + 1][1] - cut.points[i][1]
      const dx = cut.points[i + 1][0] - cut.points[i][0]
      if (Math.abs(dy) < 0.45 || Math.abs(dy) < Math.abs(dx) * 0.6) continue
      const count = Math.max(3, Math.round(Math.abs(dy) / 0.16))
      for (let k = 0; k < count; k++) {
        const p = curve.getPoint((i + (k + 0.5) / count) / n)
        if (skip(p.x, p.y)) continue
        tmp.position.set(p.x, p.y - cut.radius * 0.6, zf - cut.radius * 0.5)
        tmp.scale.set(1, 1, cut.radius * 1.0)
        tmp.updateMatrix()
        steps.push(tmp.matrix.clone())
      }
    }
  }
  return g
}

/* ------------------------------------------------------------------ */
/*  Hầm phòng                                                          */
/* ------------------------------------------------------------------ */

const ROOM_DEPTH = 0.95

function addBox(g: THREE.Group, kit: Kit, key: string, size: [number, number, number], color: string, pos: [number, number, number], o: Parameters<Kit['std']>[1] = {}) {
  const m = new THREE.Mesh(kit.geo(`box-${key}-${size.join('x')}`, () => new THREE.BoxGeometry(...size)), kit.std(color, o))
  m.position.set(...pos)
  g.add(m)
  return m
}

function addCyl(g: THREE.Group, kit: Kit, r1: number, r2: number, h: number, color: string, pos: [number, number, number], o: Parameters<Kit['std']>[1] = {}, seg = 10) {
  const m = new THREE.Mesh(kit.geo(`cyl-${r1}-${r2}-${h}-${seg}`, () => new THREE.CylinderGeometry(r1, r2, h, seg)), kit.std(color, o))
  m.position.set(...pos)
  g.add(m)
  return m
}

function glow(g: THREE.Group, kit: Kit, pos: [number, number, number], color = '#ffe9a8', r = 0.055, intensity = 2.4) {
  const m = new THREE.Mesh(kit.geo(`glow-${r}`, () => new THREE.SphereGeometry(r, 10, 8)), kit.std('#fff7d6', { emissive: color, emissiveIntensity: intensity }))
  m.position.set(...pos)
  g.add(m)
  return m
}

function hammock(g: THREE.Group, kit: Kit, x1: number, x2: number, y: number, z: number) {
  const sag = 0.22
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(x1, y, z),
    new THREE.Vector3((x1 + x2) / 2, y - sag * 2, z),
    new THREE.Vector3(x2, y, z),
  )
  const cloth = new THREE.Mesh(kit.track(new THREE.TubeGeometry(curve, 16, 0.07, 6, false)), kit.std('#6f7d4f', { roughness: 1 }))
  cloth.scale.z = 1
  g.add(cloth)
  for (const px of [x1, x2]) addCyl(g, kit, 0.03, 0.03, 0.9, '#5a3c20', [px, y - 0.05, z], { roughness: 1 }, 6)
}

/** Đồ đạc trong hầm — toạ độ cục bộ: gốc tại (tâm x, nền, giữa chiều sâu). */
function chamberProps(ch: Chamber, kit: Kit, animators: Animator[]): THREE.Group {
  const g = new THREE.Group()
  const { w, h } = ch
  const wood = '#6d4a28'
  switch (ch.kind) {
    case 'sleep': {
      hammock(g, kit, -w / 2 + 0.12, 0.02, h * 0.72, 0)
      hammock(g, kit, -0.02, w / 2 - 0.1, h * 0.46, 0.05)
      addBox(g, kit, 'gear', [0.18, 0.14, 0.16], '#4f5b3c', [w / 2 - 0.2, 0.07, -0.25])
      break
    }
    case 'clinic': {
      // Giường tầng
      const bx = -w / 2 + 0.55
      for (const yy of [0.26, 0.62]) addBox(g, kit, 'bunk', [0.95, 0.05, 0.38], wood, [bx, yy, 0])
      for (const sx of [-0.45, 0.45]) addBox(g, kit, 'bunkpost', [0.04, 0.72, 0.04], wood, [bx + sx, 0.36, 0.16])
      addBox(g, kit, 'blanket', [0.5, 0.08, 0.3], '#8f9a73', [bx, 0.69, 0])
      // Máy phát điện xe đạp
      const bike = new THREE.Group()
      const metal = { roughness: 0.5, metalness: 0.4 }
      for (const dx of [-0.24, 0.24]) {
        const wheel = new THREE.Mesh(kit.geo('wheel', () => new THREE.TorusGeometry(0.15, 0.018, 6, 18)), kit.std('#222', metal))
        wheel.position.set(dx, 0.16, 0)
        bike.add(wheel)
        animators.push((t) => {
          wheel.rotation.z = -t * 6
        })
      }
      addBox(bike, kit, 'bikeframe', [0.5, 0.025, 0.025], '#6a6a6a', [0, 0.26, 0], metal)
      addBox(bike, kit, 'bikeseat', [0.1, 0.03, 0.06], '#222', [0.08, 0.36, 0])
      bike.position.set(w / 2 - 0.55, 0, 0.05)
      g.add(bike)
      // Dây điện + bóng đèn treo
      addCyl(g, kit, 0.006, 0.006, 0.3, '#222', [0.05, h - 0.15, 0], {}, 4)
      const bulb = glow(g, kit, [0.05, h - 0.32, 0], '#ffe9a0', 0.065, 3)
      animators.push((t) => {
        const mat = bulb.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 2.6 + Math.sin(t * 6) * 0.5
      })
      // Kệ thuốc
      addBox(g, kit, 'medshelf', [0.3, 0.04, 0.16], wood, [w / 2 - 0.25, h * 0.62, -0.35])
      for (let i = 0; i < 3; i++) addCyl(g, kit, 0.025, 0.025, 0.08, i % 2 ? '#c9e4f0' : '#e8d3a0', [w / 2 - 0.35 + i * 0.09, h * 0.62 + 0.06, -0.35], {}, 6)
      break
    }
    case 'kitchen': {
      // Bếp đất + nồi + lửa
      addBox(g, kit, 'stove', [0.55, 0.26, 0.42], '#5b3f2b', [-0.35, 0.13, -0.05], { roughness: 1, flatShading: true })
      const fire = glow(g, kit, [-0.35, 0.2, 0.17], '#ff6a1a', 0.085, 2.6)
      animators.push((t) => {
        const mat = fire.material as THREE.MeshStandardMaterial
        mat.emissiveIntensity = 2.2 + Math.sin(t * 13) * 0.6 + Math.sin(t * 7.3) * 0.4
        fire.scale.setScalar(1 + Math.sin(t * 11) * 0.12)
      })
      addCyl(g, kit, 0.15, 0.11, 0.17, '#3d4146', [-0.45, 0.34, -0.05], { roughness: 0.5, metalness: 0.4 })
      addCyl(g, kit, 0.11, 0.09, 0.13, '#2e3135', [-0.18, 0.32, -0.05], { roughness: 0.5, metalness: 0.4 })
      // Ống khói từ bếp lên trần
      addCyl(g, kit, 0.05, 0.05, h - 0.32, '#3a2c22', [-w / 2 + 0.25, 0.3 + (h - 0.32) / 2, -0.25], {}, 6)
      // Củi
      for (let i = 0; i < 4; i++) {
        const log = addCyl(g, kit, 0.03, 0.03, 0.32, '#5a3a1e', [-w / 2 + 0.3 + i * 0.05, 0.04 + (i % 2) * 0.05, 0.15], { roughness: 1 }, 6)
        log.rotation.z = Math.PI / 2
      }
      // Kệ chum vại
      addBox(g, kit, 'kshelf', [0.55, 0.04, 0.2], wood, [w / 2 - 0.4, h * 0.55, -0.3])
      for (let i = 0; i < 4; i++) addCyl(g, kit, 0.05, 0.06, 0.12, i % 2 ? '#8a5a34' : '#a8744a', [w / 2 - 0.6 + i * 0.13, h * 0.55 + 0.08, -0.3], {}, 8)
      addBox(g, kit, 'rice', [0.22, 0.2, 0.18], '#d8cfb4', [w / 2 - 0.3, 0.1, -0.2])
      break
    }
    case 'meeting': {
      addBox(g, kit, 'table', [0.8, 0.05, 0.42], wood, [0, 0.38, 0])
      for (const sx of [-0.33, 0.33]) addBox(g, kit, 'tleg', [0.05, 0.36, 0.05], wood, [sx, 0.18, 0])
      addBox(g, kit, 'map', [0.7, 0.42, 0.01], '#e4d8b6', [0, h * 0.62, -ROOM_DEPTH / 2 + 0.03])
      addBox(g, kit, 'mapmark', [0.25, 0.015, 0.012], '#c0392b', [-0.05, h * 0.65, -ROOM_DEPTH / 2 + 0.04])
      addBox(g, kit, 'flagwall', [0.26, 0.17, 0.012], '#da251d', [w / 2 - 0.3, h * 0.66, -ROOM_DEPTH / 2 + 0.03])
      glow(g, kit, [0.25, 0.46, 0.05], '#ffd27a', 0.04, 2.5)
      for (const sx of [-0.55, 0.55]) addBox(g, kit, 'stool', [0.16, 0.24, 0.16], wood, [sx, 0.12, 0.05])
      break
    }
    case 'factory': {
      addBox(g, kit, 'bench', [0.9, 0.06, 0.36], wood, [0, 0.3, -0.15])
      for (let i = 0; i < 3; i++) {
        const shell = addCyl(g, kit, 0.06, 0.06, 0.32, '#5c6650', [-0.55 + i * 0.16, 0.07, 0.2], { roughness: 0.6, metalness: 0.3 }, 10)
        shell.rotation.z = Math.PI / 2
      }
      for (let i = 0; i < 5; i++) addCyl(g, kit, 0.04, 0.04, 0.09, '#9aa0a4', [-0.25 + i * 0.12, 0.38, -0.15], { metalness: 0.6, roughness: 0.4 }, 8)
      const spark = glow(g, kit, [0.0, 0.36, 0.0], '#ffcc66', 0.03, 3)
      animators.push((t) => {
        spark.visible = Math.sin(t * 6) > 0.6
      })
      break
    }
    case 'store': {
      for (let i = 0; i < 6; i++) addBox(g, kit, 'crate', [0.3, 0.2, 0.3], i % 2 ? '#55613f' : '#6d4a28', [-w / 2 + 0.3 + (i % 3) * 0.33, 0.1 + Math.floor(i / 3) * 0.21, -0.15])
      for (let i = 0; i < 4; i++) {
        const sack = new THREE.Mesh(kit.geo('sack', () => new THREE.CapsuleGeometry(0.1, 0.18, 4, 8)), kit.std('#4f6a3a', { roughness: 1 }))
        sack.rotation.z = Math.PI / 2
        sack.position.set(w / 2 - 0.4 + (i % 2) * 0.05, 0.1 + Math.floor(i / 2) * 0.18, -0.2 + (i % 2) * 0.22)
        g.add(sack)
      }
      break
    }
    case 'shelter': {
      addBox(g, kit, 'sbench', [w * 0.8, 0.05, 0.25], wood, [0, 0.2, -0.2])
      glow(g, kit, [w / 2 - 0.2, 0.15, 0.1], '#ffb04a', 0.04, 2.2)
      addCyl(g, kit, 0.04, 0.05, 0.1, '#6a5a3a', [w / 2 - 0.2, 0.05, 0.1], {}, 8)
      break
    }
    case 'firing': {
      for (let i = 0; i < 5; i++) {
        const bag = new THREE.Mesh(kit.geo('sandbag', () => new THREE.CapsuleGeometry(0.075, 0.16, 4, 8)), kit.std('#8f7d58', { roughness: 1 }))
        bag.rotation.z = Math.PI / 2
        bag.position.set(-w / 2 + 0.25 + i * 0.3, 0.08, -0.3)
        g.add(bag)
      }
      addBox(g, kit, 'ammo', [0.22, 0.13, 0.15], '#4f5b3c', [0, 0.065, 0.1])
      break
    }
    case 'punji': {
      const spikeGeo = kit.geo('spike', () => new THREE.ConeGeometry(0.045, 0.5, 5))
      const spikeMat = kit.std('#ead29a', { roughness: 1, flatShading: true, emissive: '#3a2a10', emissiveIntensity: 0.3 })
      for (let i = 0; i < 14; i++) {
        const sp = new THREE.Mesh(spikeGeo, spikeMat)
        sp.position.set(-w / 2 + 0.1 + (i % 7) * ((w - 0.2) / 6), 0.25, -0.25 + Math.floor(i / 7) * 0.38)
        sp.rotation.z = ((i % 3) - 1) * 0.14
        g.add(sp)
      }
      // nắp tre ngụy trang phía trên miệng hố
      addBox(g, kit, 'punji-cover', [w * 0.9, 0.04, 0.5], '#7a8a3a', [0, h - 0.06, 0.15], { roughness: 1 })
      break
    }
    case 'hideout': {
      addBox(g, kit, 'hbench', [0.7, 0.05, 0.28], wood, [-0.2, 0.22, -0.15])
      addBox(g, kit, 'docbox', [0.26, 0.16, 0.2], '#6b5434', [w / 2 - 0.3, 0.08, -0.15])
      glow(g, kit, [w / 2 - 0.25, 0.26, -0.1], '#ffb04a', 0.035, 2.4)
      break
    }
    case 'display': {
      addBox(g, kit, 'plinth', [0.55, 0.32, 0.32], '#3f3f3c', [-w / 2 + 0.45, 0.16, -0.1], { roughness: 0.7 })
      addBox(g, kit, 'case', [0.55, 0.26, 0.32], '#cfefff', [-w / 2 + 0.45, 0.45, -0.1], { transparent: true, opacity: 0.22, roughness: 0.05 })
      addBox(g, kit, 'relic', [0.3, 0.05, 0.08], '#4a3a2a', [-w / 2 + 0.45, 0.35, -0.1])
      addBox(g, kit, 'panel', [0.6, 0.4, 0.02], '#0d9488', [w / 2 - 0.45, h * 0.55, -ROOM_DEPTH / 2 + 0.03], { roughness: 0.6 })
      addBox(g, kit, 'panelt', [0.48, 0.05, 0.022], '#e6fffa', [w / 2 - 0.45, h * 0.62, -ROOM_DEPTH / 2 + 0.035])
      glow(g, kit, [0, h - 0.12, 0], '#c8fff4', 0.05, 2.6)
      break
    }
  }
  return g
}

function makeChamber(ch: Chamber, s: EraScene, kit: Kit, animators: Animator[]): { group: THREE.Group; hit: THREE.Mesh } {
  const g = new THREE.Group()
  const zf = s.blockD / 2
  const cz = zf - ROOM_DEPTH / 2

  const room = new THREE.Mesh(
    kit.geo(`room-${ch.w}-${ch.h}`, () => new THREE.BoxGeometry(ch.w + 0.02, ch.h + 0.02, ROOM_DEPTH)),
    ch.kind === 'punji'
      ? kit.std('#7a4424', { side: THREE.BackSide, roughness: 1 })
      : kit.std(s.palette.room, { side: THREE.BackSide, roughness: 1, emissive: '#7a3a12', emissiveIntensity: 0.22 }),
  )
  room.position.set(ch.x, ch.y + ch.h / 2, cz)
  g.add(room)

  // Nền hầm dày — che phần lỗ hầm phía dưới sàn khi đường hầm đi vào phòng
  addBox(g, kit, 'floor', [ch.w, 0.42, ROOM_DEPTH - 0.04], shade(s.palette.room, 0.82), [ch.x, ch.y - 0.19, cz - 0.02], { roughness: 1 })

  // Dầm gỗ chống trần — đặc trưng sa bàn
  if (ch.kind !== 'punji') {
    const beamGeo = kit.geo('beam', () => new THREE.CylinderGeometry(0.05, 0.05, ROOM_DEPTH * 0.96, 6))
    const beamMat = kit.std('#4f3219', { roughness: 1, flatShading: true })
    const n = Math.max(5, Math.round(ch.w / 0.17))
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(beamGeo, beamMat)
      b.rotation.x = Math.PI / 2
      b.position.set(ch.x - ch.w / 2 + 0.07 + (i * (ch.w - 0.14)) / (n - 1), ch.y + ch.h - 0.05, cz)
      g.add(b)
    }
    for (const sx of [-1, 1]) {
      addCyl(g, kit, 0.045, 0.05, ch.h - 0.08, '#4f3219', [ch.x + sx * (ch.w / 2 - 0.05), ch.y + (ch.h - 0.08) / 2, zf - 0.1], { roughness: 1, flatShading: true }, 6)
    }
  }

  const props = chamberProps(ch, kit, animators)
  props.position.set(ch.x, ch.y, cz)
  g.add(props)

  room.userData.info = {
    title: ch.title,
    desc: ch.desc,
    heritageRoleId: ch.heritageRoleId,
    stationCode: ch.stationCode,
  } satisfies InfoItem
  room.userData.focus = new THREE.Vector3(ch.x, ch.y + ch.h / 2, zf)
  return { group: g, hit: room }
}

/* ------------------------------------------------------------------ */
/*  Nước, nắp hầm, giếng, khói                                         */
/* ------------------------------------------------------------------ */

function waterMat(kit: Kit) {
  return kit.std('#3aa6d0', { transparent: true, opacity: 0.8, roughness: 0.12, metalness: 0.1, emissive: '#145f80', emissiveIntensity: 0.45 })
}

function makeWell(cut: Cut, s: EraScene, kit: Kit): THREE.Group {
  const g = new THREE.Group()
  const zf = s.blockD / 2
  const [x, yTop] = cut.points[0]
  const yB = cut.points[cut.points.length - 1][1]
  const water = new THREE.Mesh(kit.geo('wellwater', () => new THREE.BoxGeometry(cut.radius * 1.9, 0.6, cut.radius * 0.95)), waterMat(kit))
  water.position.set(x, yB + 0.3, zf - cut.radius * 0.5)
  g.add(water)
  const ropeLen = yTop - (yB + 0.75)
  addCyl(g, kit, 0.008, 0.008, ropeLen, '#c9b48a', [x - 0.12, yTop - ropeLen / 2, zf - 0.12], {}, 4)
  addCyl(g, kit, 0.06, 0.05, 0.1, '#5a5f66', [x - 0.12, yB + 0.72, zf - 0.12], { metalness: 0.4, roughness: 0.5 }, 8)
  return g
}

function makeSmoke(x: number, z: number, kit: Kit, animators: Animator[], seed: number): THREE.Group {
  const g = new THREE.Group()
  const puffs: THREE.Sprite[] = []
  const tex = kit.memo('smoke-tex', () => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const c = canvas.getContext('2d')!
    const grd = c.createRadialGradient(32, 32, 2, 32, 32, 31)
    grd.addColorStop(0, 'rgba(235,230,222,0.95)')
    grd.addColorStop(0.5, 'rgba(215,208,198,0.55)')
    grd.addColorStop(1, 'rgba(200,195,185,0)')
    c.fillStyle = grd
    c.fillRect(0, 0, 64, 64)
    const t = new THREE.CanvasTexture(canvas)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  })
  for (let i = 0; i < 6; i++) {
    const mat = kit.track(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.6, depthWrite: false }))
    const p = new THREE.Sprite(mat)
    g.add(p)
    puffs.push(p)
  }
  g.position.set(x, 0.2, z)
  animators.push((t) => {
    puffs.forEach((p, i) => {
      const ph = (t * 0.22 + i / puffs.length + seed * 0.13) % 1
      p.position.set(Math.sin(ph * 5 + seed) * 0.15 + ph * 0.35, ph * 1.9, Math.cos(ph * 4 + i) * 0.08)
      p.scale.setScalar(0.35 + ph * 1.1)
      p.material.opacity = 0.75 * (1 - ph) * Math.min(1, ph * 6)
    })
  })
  return g
}

/* ------------------------------------------------------------------ */
/*  Vật thể trên mặt đất                                               */
/* ------------------------------------------------------------------ */

function makeHeli(kit: Kit, animators: Animator[]): THREE.Group {
  const g = new THREE.Group()
  const olive = kit.std('#4b5320', { roughness: 0.6, metalness: 0.25 })
  const dark = kit.std('#1e211a', { roughness: 0.6 })
  const cabin = new THREE.Mesh(kit.geo('heli-cabin', () => new THREE.CapsuleGeometry(0.34, 0.75, 6, 12)), olive)
  cabin.rotation.z = Math.PI / 2
  g.add(cabin)
  const glass = new THREE.Mesh(
    kit.geo('heli-glass', () => new THREE.SphereGeometry(0.3, 12, 8, -Math.PI / 2, Math.PI, 0, Math.PI)),
    kit.std('#9fc6d6', { roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.75 }),
  )
  glass.position.set(0.55, 0.02, 0)
  glass.rotation.y = Math.PI / 2
  g.add(glass)
  const boom = addCyl(g, kit, 0.09, 0.05, 1.6, '#4b5320', [-1.15, 0.1, 0], { roughness: 0.6, metalness: 0.25 }, 8)
  boom.rotation.z = Math.PI / 2
  addBox(g, kit, 'heli-fin', [0.22, 0.42, 0.04], '#4b5320', [-1.9, 0.28, 0], { roughness: 0.6, metalness: 0.25 })
  addBox(g, kit, 'heli-star', [0.22, 0.02, 0.4], '#4b5320', [-1.7, 0.08, 0], { roughness: 0.6 })
  for (const sz of [-0.28, 0.28]) {
    const skid = addCyl(g, kit, 0.025, 0.025, 1.3, '#2a2d24', [0.05, -0.48, sz], {}, 6)
    skid.rotation.z = Math.PI / 2
    for (const sx of [-0.3, 0.35]) addBox(g, kit, 'heli-strut', [0.03, 0.18, 0.03], '#2a2d24', [sx, -0.38, sz])
  }
  addCyl(g, kit, 0.06, 0.06, 0.16, '#2a2d24', [0, 0.42, 0], {}, 8)
  const rotor = new THREE.Group()
  for (const r of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(kit.geo('heli-blade', () => new THREE.BoxGeometry(3.4, 0.02, 0.12)), dark)
    blade.rotation.y = r
    rotor.add(blade)
  }
  rotor.position.y = 0.5
  g.add(rotor)
  const tail = new THREE.Group()
  const tb = new THREE.Mesh(kit.geo('heli-tblade', () => new THREE.BoxGeometry(0.5, 0.05, 0.02)), dark)
  tail.add(tb)
  tail.position.set(-1.95, 0.3, 0.05)
  g.add(tail)
  // lính trong khoang
  for (const sz of [-0.12, 0.12]) addBox(g, kit, 'heli-crew', [0.14, 0.2, 0.12], '#5f6542', [0.05, 0.05, sz])
  animators.push((t, dt) => {
    rotor.rotation.y += dt * 22
    tail.rotation.z += dt * 30
    g.position.y = Math.sin(t * 1.3) * 0.12
    g.rotation.z = Math.sin(t * 0.8) * 0.04 - 0.06
  })
  const wrap = new THREE.Group()
  wrap.add(g)
  return wrap
}

function makeTank(kit: Kit, color: string, wreck: boolean): THREE.Group {
  const g = new THREE.Group()
  const o = { roughness: 0.75, metalness: wreck ? 0.05 : 0.3, flatShading: wreck }
  addBox(g, kit, `tank-hull-${color}`, [1.6, 0.52, 1.0], color, [0, 0.42, 0], o)
  const front = addBox(g, kit, `tank-front-${color}`, [0.42, 0.42, 1.0], color, [0.86, 0.36, 0], o)
  front.rotation.z = -0.5
  addBox(g, kit, `tank-hatch-${color}`, [0.42, 0.18, 0.42], color, [-0.2, 0.77, 0.1], o)
  if (!wreck) {
    const gun = addCyl(g, kit, 0.025, 0.025, 0.55, '#222', [0.1, 0.9, 0.1], {}, 6)
    gun.rotation.z = Math.PI / 2
  }
  for (const sz of [-1, 1]) addBox(g, kit, 'track', [1.68, 0.3, 0.18], '#1f1f1b', [0, 0.16, sz * 0.5], { roughness: 1 })
  if (wreck) {
    g.rotation.z = 0.12
    g.rotation.x = -0.08
    const vine = new THREE.Mesh(kit.geo('vine', () => new THREE.IcosahedronGeometry(0.22, 0)), kit.std('#4a8a35', { flatShading: true }))
    vine.position.set(-0.6, 0.65, 0.4)
    g.add(vine)
  }
  return g
}

function makeFlag(kit: Kit, animators: Animator[]): THREE.Group {
  const g = new THREE.Group()
  addCyl(g, kit, 0.025, 0.03, 2.2, '#d6d0c2', [0, 1.1, 0], { metalness: 0.3, roughness: 0.4 }, 8)
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 128
  const c = canvas.getContext('2d')!
  c.fillStyle = '#da251d'
  c.fillRect(0, 0, 192, 128)
  c.fillStyle = '#ffff00'
  c.beginPath()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 40 : 16
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const px = 96 + Math.cos(a) * r
    const py = 66 + Math.sin(a) * r
    if (i === 0) c.moveTo(px, py)
    else c.lineTo(px, py)
  }
  c.closePath()
  c.fill()
  const tex = kit.track(new THREE.CanvasTexture(canvas))
  tex.colorSpace = THREE.SRGBColorSpace
  const geo = kit.track(new THREE.PlaneGeometry(0.95, 0.63, 14, 2))
  geo.translate(0.475, 0, 0)
  const base = (geo.attributes.position.array as Float32Array).slice()
  const flag = new THREE.Mesh(geo, kit.track(new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 })))
  flag.position.set(0.02, 1.85, 0)
  g.add(flag)
  const pos = geo.attributes.position as THREE.BufferAttribute
  animators.push((t) => {
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3]
      pos.setZ(i, Math.sin(x * 6 - t * 5) * 0.07 * x)
      pos.setY(i, base[i * 3 + 1] - x * x * 0.04)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  return g
}

function makeSurfaceObj(o: SurfaceObj, s: EraScene, kit: Kit, animators: Animator[]): THREE.Object3D {
  const g = new THREE.Group()
  const wood = '#6d4a28'
  switch (o.type) {
    case 'hut': {
      addBox(g, kit, 'hut-floor', [1.3, 0.12, 1.0], '#8a6a40', [0, 0.06, 0], { roughness: 1 })
      addBox(g, kit, 'hut-wall', [1.2, 0.6, 0.9], '#b08a52', [0, 0.42, 0], { roughness: 1 })
      const roof = new THREE.Mesh(kit.geo('hut-roof', () => new THREE.ConeGeometry(1.05, 0.7, 4)), kit.std('#8a7442', { roughness: 1, flatShading: true }))
      roof.position.y = 1.06
      roof.rotation.y = Math.PI / 4
      roof.scale.set(1.15, 1, 0.95)
      g.add(roof)
      addBox(g, kit, 'hut-door', [0.26, 0.42, 0.02], '#3a2a18', [0, 0.33, 0.46])
      break
    }
    case 'flag':
      g.add(makeFlag(kit, animators))
      break
    case 'tank':
      g.add(makeTank(kit, '#4a5230', false))
      break
    case 'wreck':
      g.add(makeTank(kit, '#3b3d33', true))
      break
    case 'heli':
      g.add(makeHeli(kit, animators))
      break
    case 'hatch': {
      addBox(g, kit, 'hatch-rim', [0.5, 0.05, 0.42], '#5a3c22', [0, 0.03, 0], { roughness: 1 })
      const lid = addBox(g, kit, 'hatch-lid', [0.46, 0.05, 0.38], '#6b5a34', [0.0, 0.2, -0.22], { roughness: 1 })
      lid.rotation.x = -1.1
      const leaves = new THREE.Mesh(kit.geo('leafball', () => new THREE.IcosahedronGeometry(0.14, 0)), kit.std('#5a7a2c', { flatShading: true }))
      leaves.position.set(0.05, 0.38, -0.32)
      g.add(leaves)
      break
    }
    case 'lid': {
      const lid = addBox(g, kit, 'punji-lid', [1.0, 0.05, 0.7], s.palette.grass, [0, 0.25, -0.2], { roughness: 1 })
      lid.rotation.x = -0.9
      for (let i = 0; i < 5; i++) addBox(g, kit, 'punji-slat', [0.03, 0.06, 0.7], '#c8a46a', [-0.4 + i * 0.2, 0.27, -0.2]).rotation.x = -0.9
      break
    }
    case 'mound': {
      const dome = new THREE.Mesh(kit.geo('mound-dome', () => new THREE.SphereGeometry(0.85, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2)), kit.std(shade(s.palette.grass, 0.85), { roughness: 1, flatShading: true }))
      dome.scale.y = 0.38
      g.add(dome)
      for (let i = 0; i < 5; i++) {
        const tuft = new THREE.Mesh(kit.geo('leafball', () => new THREE.IcosahedronGeometry(0.14, 0)), kit.std('#5a7a2c', { flatShading: true }))
        tuft.position.set(Math.cos(i * 1.3) * 0.5, 0.22, Math.sin(i * 1.3) * 0.4)
        g.add(tuft)
      }
      break
    }
    case 'termite': {
      const cone = new THREE.Mesh(kit.geo('termite', () => new THREE.ConeGeometry(0.24, 0.5, 7)), kit.std('#9a6a3a', { roughness: 1, flatShading: true }))
      cone.position.y = 0.25
      g.add(cone)
      const bump = new THREE.Mesh(kit.geo('termite2', () => new THREE.ConeGeometry(0.12, 0.3, 6)), kit.std('#8a5e34', { flatShading: true }))
      bump.position.set(0.16, 0.15, 0.05)
      g.add(bump)
      break
    }
    case 'bushy': {
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(kit.geo('bush', () => new THREE.IcosahedronGeometry(0.22, 0)), kit.std(i % 2 ? '#2f6a26' : '#3d7a2e', { flatShading: true, roughness: 1 }))
        b.position.set(Math.cos(i * 1.7) * 0.18, 0.18 + (i % 2) * 0.12, Math.sin(i * 1.7) * 0.14)
        b.scale.setScalar(0.85 + (i % 3) * 0.15)
        g.add(b)
      }
      break
    }
    case 'crater': {
      const decal = new THREE.Mesh(kit.geo('crater-decal', () => new THREE.CircleGeometry(1.15, 18)), kit.std('#3a2a1c', { roughness: 1, transparent: true, opacity: 0.75, depthWrite: false }))
      decal.rotation.x = -Math.PI / 2
      decal.position.y = 0.09
      g.add(decal)
      const bowl = new THREE.Mesh(kit.geo('crater-bowl', () => new THREE.SphereGeometry(0.75, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), kit.std('#5e3a1e', { side: THREE.BackSide, roughness: 1, flatShading: true }))
      bowl.scale.y = 0.35
      bowl.position.y = 0.12
      g.add(bowl)
      const rim = new THREE.Mesh(kit.geo('crater-rim', () => new THREE.TorusGeometry(0.78, 0.12, 6, 20)), kit.std('#7a5232', { roughness: 1, flatShading: true }))
      rim.rotation.x = Math.PI / 2
      rim.position.y = 0.11
      rim.scale.z = 0.6
      g.add(rim)
      break
    }
    case 'sign': {
      addCyl(g, kit, 0.03, 0.03, 0.62, '#6a5a44', [0, 0.31, 0], {}, 6)
      const board = addBox(g, kit, 'sign-board', [0.66, 0.38, 0.04], '#0d9488', [0, 0.74, 0], { roughness: 0.6 })
      board.rotation.x = -0.2
      addBox(g, kit, 'sign-text', [0.5, 0.05, 0.045], '#e6fffa', [0, 0.8, 0.01]).rotation.x = -0.2
      break
    }
    case 'pavilion': {
      const roof = new THREE.Mesh(kit.geo('pav-roof', () => new THREE.ConeGeometry(1.25, 0.6, 4)), kit.std('#a0522d', { roughness: 0.9, flatShading: true }))
      roof.position.y = 1.18
      roof.rotation.y = Math.PI / 4
      g.add(roof)
      for (const [px, pz] of [[-0.65, -0.65], [0.65, -0.65], [-0.65, 0.65], [0.65, 0.65]] as const) {
        addCyl(g, kit, 0.05, 0.05, 0.9, wood, [px, 0.45, pz], {}, 6)
      }
      addBox(g, kit, 'pav-floor', [1.5, 0.08, 1.5], '#b9a07a', [0, 0.04, 0])
      addBox(g, kit, 'pav-bench', [0.9, 0.06, 0.25], wood, [0, 0.3, -0.35])
      break
    }
    case 'lamp': {
      addCyl(g, kit, 0.03, 0.04, 0.95, '#3d3d3a', [0, 0.47, 0], { metalness: 0.4 }, 6)
      glow(g, kit, [0, 0.98, 0], '#ffe9a8', 0.1, 1.6)
      break
    }
    case 'wellring': {
      const ring = new THREE.Mesh(kit.geo('wellring', () => new THREE.TorusGeometry(0.33, 0.07, 6, 16)), kit.std('#7a6a52', { roughness: 1 }))
      ring.rotation.x = Math.PI / 2
      ring.position.y = 0.1
      g.add(ring)
      for (const sx of [-0.38, 0.38]) addBox(g, kit, 'well-post', [0.05, 0.6, 0.05], wood, [sx, 0.35, 0])
      const roller = addCyl(g, kit, 0.04, 0.04, 0.8, wood, [0, 0.6, 0], {}, 6)
      roller.rotation.z = Math.PI / 2
      break
    }
    case 'basket': {
      addCyl(g, kit, 0.15, 0.11, 0.16, '#a8834c', [0, 0.08, 0], { flatShading: true }, 10)
      const soil = new THREE.Mesh(kit.geo('bsoil', () => new THREE.SphereGeometry(0.14, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), kit.std('#9a4e22', { roughness: 1 }))
      soil.position.y = 0.15
      soil.scale.y = 0.6
      g.add(soil)
      break
    }
    case 'fence': {
      for (let i = 0; i < 9; i++) addCyl(g, kit, 0.02, 0.02, 0.5, '#9a8a4a', [-0.8 + i * 0.2, 0.25, 0], {}, 5)
      for (const yy of [0.18, 0.38]) {
        const rail = addCyl(g, kit, 0.015, 0.015, 1.7, '#8a7a40', [0, yy, 0.02], {}, 5)
        rail.rotation.z = Math.PI / 2
      }
      break
    }
  }
  g.position.set(o.x, (o.y ?? 0) + 0.07, o.z)
  g.rotation.y = o.rot ?? 0
  if (o.scale) g.scale.setScalar(o.scale)
  return g
}

/* ------------------------------------------------------------------ */
/*  Rừng cây (instanced)                                               */
/* ------------------------------------------------------------------ */

type KeepOut = [number, number, number][]

function addForest(root: THREE.Group, s: EraScene, kit: Kit, keepOut: KeepOut) {
  const f = s.forest
  const rnd = mulberry32(f.seed)
  const W = s.blockW
  const D = s.blockD
  const xMin = -W / 2 + 0.35
  const xMax = W / 2 - 0.35
  const zMin = -D / 2 + 0.35
  const zFront = D / 2 - 0.55
  const placed: [number, number][] = []

  const sample = (zMax: number, minDist: number): [number, number] | null => {
    for (let tries = 0; tries < 60; tries++) {
      const x = xMin + rnd() * (xMax - xMin)
      const z = zMin + rnd() * (zMax - zMin)
      if (keepOut.some(([kx, kz, kr]) => (x - kx) ** 2 + (z - kz) ** 2 < kr * kr)) continue
      if (placed.some(([px, pz]) => (x - px) ** 2 + (z - pz) ** 2 < minDist * minDist)) continue
      placed.push([x, z])
      return [x, z]
    }
    return null
  }

  const tmp = new THREE.Object3D()
  const color = new THREE.Color()
  const leafyZ = Math.min(zFront, f.leafyZMax ?? zFront)

  // Cây lá rộng
  if (f.broadleaf > 0) {
    const trunks: THREE.Matrix4[] = []
    const blobs: { m: THREE.Matrix4; c: string }[] = []
    for (let i = 0; i < f.broadleaf; i++) {
      const p = sample(leafyZ, 0.75)
      if (!p) continue
      const h = 0.9 + rnd() * 0.8
      tmp.position.set(p[0], h / 2 + 0.05, p[1])
      tmp.rotation.set(0, 0, (rnd() - 0.5) * 0.12)
      tmp.scale.set(1, h, 1)
      tmp.updateMatrix()
      trunks.push(tmp.matrix.clone())
      const nb = 3 + Math.floor(rnd() * 2)
      const base = f.leafColors[Math.floor(rnd() * f.leafColors.length)]
      for (let k = 0; k < nb; k++) {
        const r = 0.38 + rnd() * 0.3
        tmp.position.set(p[0] + (rnd() - 0.5) * 0.6, h + 0.15 + rnd() * 0.45, p[1] + (rnd() - 0.5) * 0.5)
        tmp.rotation.set(rnd() * 3, rnd() * 3, 0)
        tmp.scale.set(r, r * 0.85, r)
        tmp.updateMatrix()
        blobs.push({ m: tmp.matrix.clone(), c: base })
      }
    }
    const trunkMesh = new THREE.InstancedMesh(kit.geo('tree-trunk', () => new THREE.CylinderGeometry(0.06, 0.1, 1, 6)), kit.std('#5a3e26', { roughness: 1 }), trunks.length)
    trunks.forEach((m, i) => trunkMesh.setMatrixAt(i, m))
    root.add(trunkMesh)
    const blobMesh = new THREE.InstancedMesh(kit.geo('tree-blob', () => new THREE.IcosahedronGeometry(1, 1)), kit.std('#ffffff', { roughness: 1, flatShading: true }), blobs.length)
    blobs.forEach((b, i) => {
      blobMesh.setMatrixAt(i, b.m)
      color.set(b.c).offsetHSL((rnd() - 0.5) * 0.03, 0, (rnd() - 0.5) * 0.08)
      blobMesh.setColorAt(i, color)
    })
    root.add(blobMesh)
  }

  // Cây cau / dừa
  if (f.palms > 0) {
    const trunks: THREE.Matrix4[] = []
    const fronds: THREE.Matrix4[] = []
    for (let i = 0; i < f.palms; i++) {
      const p = sample(Math.min(zFront, leafyZ + 0.8), 0.7)
      if (!p) continue
      const h = 1.5 + rnd() * 0.8
      const lean = (rnd() - 0.5) * 0.25
      tmp.position.set(p[0] + Math.sin(lean) * h * 0.5, h / 2 + 0.05, p[1])
      tmp.rotation.set(0, 0, -lean)
      tmp.scale.set(1, h, 1)
      tmp.updateMatrix()
      trunks.push(tmp.matrix.clone())
      const topX = p[0] + Math.sin(lean) * h
      const topY = h * Math.cos(lean) + 0.05
      const nf = 7
      for (let k = 0; k < nf; k++) {
        const a = (k / nf) * Math.PI * 2 + rnd() * 0.4
        const droop = 0.25 + rnd() * 0.45
        const len = 0.45
        tmp.position.set(topX + Math.cos(droop) * Math.cos(a) * len, topY - Math.sin(droop) * len, p[1] - Math.cos(droop) * Math.sin(a) * len)
        tmp.rotation.set(0, a, -(Math.PI / 2 + droop), 'YXZ')
        tmp.scale.set(1, 1, 0.28)
        tmp.updateMatrix()
        fronds.push(tmp.matrix.clone())
      }
    }
    tmp.rotation.set(0, 0, 0, 'XYZ')
    const tm = new THREE.InstancedMesh(kit.geo('palm-trunk', () => new THREE.CylinderGeometry(0.05, 0.08, 1, 6)), kit.std('#7a6040', { roughness: 1 }), trunks.length)
    trunks.forEach((m, i) => tm.setMatrixAt(i, m))
    root.add(tm)
    const fm = new THREE.InstancedMesh(kit.geo('palm-frond', () => new THREE.ConeGeometry(0.14, 0.95, 4)), kit.std('#3a8f3a', { roughness: 1, flatShading: true, side: THREE.DoubleSide }), fronds.length)
    fronds.forEach((m, i) => {
      fm.setMatrixAt(i, m)
      color.set('#3a8f3a').offsetHSL((rnd() - 0.5) * 0.04, 0, (rnd() - 0.5) * 0.1)
      fm.setColorAt(i, color)
    })
    root.add(fm)
  }

  // Bụi tre
  if (f.bamboo > 0) {
    const canes: THREE.Matrix4[] = []
    const leaves: THREE.Matrix4[] = []
    for (let i = 0; i < f.bamboo; i++) {
      const p = sample(leafyZ, 0.6)
      if (!p) continue
      const n = 5 + Math.floor(rnd() * 3)
      for (let k = 0; k < n; k++) {
        const h = 1.4 + rnd() * 1.0
        const a = rnd() * Math.PI * 2
        const lean = 0.05 + rnd() * 0.18
        const ox = Math.cos(a) * 0.1
        const oz = Math.sin(a) * 0.1
        tmp.position.set(p[0] + ox + Math.cos(a) * Math.sin(lean) * h * 0.5, h / 2, p[1] + oz + Math.sin(a) * Math.sin(lean) * h * 0.5)
        tmp.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean)
        tmp.scale.set(1, h, 1)
        tmp.updateMatrix()
        canes.push(tmp.matrix.clone())
        for (let j = 0; j < 3; j++) {
          const t = 0.65 + j * 0.15
          tmp.position.set(p[0] + ox + Math.cos(a) * Math.sin(lean) * h * t, h * t, p[1] + oz + Math.sin(a) * Math.sin(lean) * h * t)
          tmp.rotation.set(rnd() * 3, rnd() * 3, 0)
          const r = 0.13 + rnd() * 0.08
          tmp.scale.set(r * 1.6, r * 0.6, r)
          tmp.updateMatrix()
          leaves.push(tmp.matrix.clone())
        }
      }
    }
    const cm = new THREE.InstancedMesh(kit.geo('bamboo', () => new THREE.CylinderGeometry(0.028, 0.034, 1, 5)), kit.std('#7f9a3e', { roughness: 0.8 }), canes.length)
    canes.forEach((m, i) => cm.setMatrixAt(i, m))
    root.add(cm)
    const lm = new THREE.InstancedMesh(kit.geo('bamboo-leaf', () => new THREE.IcosahedronGeometry(1, 0)), kit.std('#5ea345', { roughness: 1, flatShading: true }), leaves.length)
    leaves.forEach((m, i) => lm.setMatrixAt(i, m))
    root.add(lm)
  }

  // Cây cháy trụi (bom napalm, chất độc hoá học)
  if (f.burnt > 0) {
    const trunks: THREE.Matrix4[] = []
    for (let i = 0; i < f.burnt; i++) {
      const p = sample(zFront - 0.3, 0.6)
      if (!p) continue
      const h = 0.8 + rnd() * 0.9
      const lean = (rnd() - 0.5) * 0.4
      tmp.position.set(p[0], h / 2, p[1])
      tmp.rotation.set((rnd() - 0.5) * 0.2, 0, lean)
      tmp.scale.set(1, h, 1)
      tmp.updateMatrix()
      trunks.push(tmp.matrix.clone())
      const nb = 1 + Math.floor(rnd() * 2)
      for (let k = 0; k < nb; k++) {
        tmp.position.set(p[0] + (rnd() - 0.5) * 0.2, h * (0.6 + rnd() * 0.3), p[1])
        tmp.rotation.set(0, rnd() * 3, (rnd() > 0.5 ? 1 : -1) * (0.7 + rnd() * 0.4))
        tmp.scale.set(0.6, 0.45, 0.6)
        tmp.updateMatrix()
        trunks.push(tmp.matrix.clone())
      }
    }
    const bm = new THREE.InstancedMesh(kit.geo('burnt', () => new THREE.CylinderGeometry(0.03, 0.09, 1, 6)), kit.std('#2b231c', { roughness: 1 }), trunks.length)
    trunks.forEach((m, i) => bm.setMatrixAt(i, m))
    root.add(bm)
  }

  // Cỏ
  if (f.tufts > 0) {
    const tm = new THREE.InstancedMesh(kit.geo('tuft', () => new THREE.ConeGeometry(0.07, 0.26, 4)), kit.std('#ffffff', { roughness: 1, flatShading: true }), f.tufts)
    for (let i = 0; i < f.tufts; i++) {
      const x = xMin + rnd() * (xMax - xMin)
      const z = zMin + rnd() * (D / 2 - 0.15 - zMin)
      const sc = 0.6 + rnd() * 0.9
      tmp.position.set(x, 0.08 + 0.13 * sc, z)
      tmp.rotation.set((rnd() - 0.5) * 0.4, rnd() * 3, (rnd() - 0.5) * 0.4)
      tmp.scale.set(sc, sc, sc)
      tmp.updateMatrix()
      tm.setMatrixAt(i, tmp.matrix)
      color.set(f.tuftColors[Math.floor(rnd() * f.tuftColors.length)]).offsetHSL(0, 0, (rnd() - 0.5) * 0.08)
      tm.setColorAt(i, color)
    }
    root.add(tm)
  }
}

/* ------------------------------------------------------------------ */
/*  Nhân vật                                                           */
/* ------------------------------------------------------------------ */

const FIG_SCALE = 0.9

function placeFigure(spec: FigureSpec, s: EraScene, kit: Kit, animators: Animator[], seed: number): THREE.Object3D {
  const parts = makeFigure(spec.outfit, kit, { hat: spec.hat, prop: spec.prop })
  applyPose(parts, spec.pose)
  const sc = FIG_SCALE * (spec.scale ?? 1)
  const zf = s.blockD / 2
  const root = parts.root
  root.scale.setScalar(sc)

  if (spec.pose === 'lie') {
    const dir = spec.lieDir ?? 1
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 0, dir),
      new THREE.Vector3(dir, 0, 0),
      new THREE.Vector3(0, 1, 0),
    )
    root.quaternion.setFromRotationMatrix(m)
    root.position.set(spec.x - dir * 0.5 * sc, (spec.y ?? 0) + 0.06, zf - (spec.z ?? 0.45))
  } else if (spec.surface) {
    root.position.set(spec.x, 0.08, spec.z ?? 1)
    root.rotation.y = spec.face ?? 0
  } else {
    root.position.set(spec.x, (spec.y ?? 0) + 0.04, zf - (spec.z ?? 0.45))
    root.rotation.y = spec.face ?? 0
  }

  const anim = poseAnimator(parts, spec.pose, seed)
  if (anim) animators.push((t) => anim(t))

  if (spec.patrol && spec.surface) {
    const x0 = spec.x
    const range = spec.patrol
    const baseFace = spec.face ?? Math.PI / 2
    animators.push((t) => {
      const ph = t * 0.35 + seed
      root.position.x = x0 + Math.sin(ph) * range
      root.rotation.y = Math.cos(ph) >= 0 ? Math.abs(baseFace) : -Math.abs(baseFace)
    })
  }
  if (spec.pose === 'climb') {
    const y0 = root.position.y
    const range = (spec.y ?? 0) < -2 ? 1.3 : 0.18
    animators.push((t) => {
      root.position.y = y0 + Math.sin(t * 0.5 + seed) * range
    })
  }
  return root
}

function placeCrawler(cut: Cut, outfit: FigureSpec['outfit'], s: EraScene, kit: Kit, cfg: { speed: number; from: number; to: number; phase: number }, animators: Animator[]): THREE.Object3D {
  const zf = s.blockD / 2
  const curve = cutCurve(cut.points, zf - cut.radius * 0.45)
  const parts = makeFigure(outfit, kit, { hat: false })
  const sc = Math.min(0.62, cut.radius * 1.9)
  parts.root.scale.setScalar(sc)
  const limbs = crawlAnimator(parts, cfg.phase * 10)
  const f = new THREE.Vector3()
  const d = new THREE.Vector3()
  const x = new THREE.Vector3()
  const p = new THREE.Vector3()
  const mtx = new THREE.Matrix4()
  animators.push((t) => {
    const w = 2 * Math.PI * (t * cfg.speed + cfg.phase)
    const k = 0.5 - 0.5 * Math.cos(w)
    const u = cfg.from + (cfg.to - cfg.from) * k
    const sign = Math.sin(w) >= 0 ? 1 : -1
    curve.getPointAt(u, p)
    curve.getTangentAt(u, f)
    f.z = 0
    f.normalize().multiplyScalar(sign)
    d.set(f.y, -f.x, 0)
    if (d.y > 0) d.negate()
    x.crossVectors(f, d)
    mtx.makeBasis(x, f, d)
    parts.root.quaternion.setFromRotationMatrix(mtx)
    parts.root.position.copy(p).addScaledVector(f, -0.5 * sc).addScaledVector(d, cut.radius * 0.35)
    limbs(t)
  })
  return parts.root
}

/* ------------------------------------------------------------------ */
/*  Nhãn + đường chỉ dẫn                                               */
/* ------------------------------------------------------------------ */

const LABEL_SCALE = 0.0108
const LABEL_FONT = '600 26px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'

function makeLabel(text: string, accent: string, kit: Kit, scale = LABEL_SCALE): THREE.Sprite {
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = LABEL_FONT
  const textW = Math.ceil(probe.measureText(text).width)
  const padX = 12
  const dot = 16
  const w = textW + padX * 2 + dot
  const h = 44
  const dpr = 2
  const canvas = document.createElement('canvas')
  canvas.width = w * dpr
  canvas.height = h * dpr
  const c = canvas.getContext('2d')!
  c.scale(dpr, dpr)
  c.fillStyle = 'rgba(16,11,7,0.88)'
  const r = 9
  c.beginPath()
  c.moveTo(r, 1)
  c.lineTo(w - r, 1)
  c.quadraticCurveTo(w - 1, 1, w - 1, r)
  c.lineTo(w - 1, h - r)
  c.quadraticCurveTo(w - 1, h - 1, w - r, h - 1)
  c.lineTo(r, h - 1)
  c.quadraticCurveTo(1, h - 1, 1, h - r)
  c.lineTo(1, r)
  c.quadraticCurveTo(1, 1, r, 1)
  c.closePath()
  c.fill()
  c.strokeStyle = accent
  c.globalAlpha = 0.8
  c.lineWidth = 1.5
  c.stroke()
  c.globalAlpha = 1
  c.fillStyle = accent
  c.beginPath()
  c.arc(padX + 4, h / 2, 4, 0, Math.PI * 2)
  c.fill()
  c.font = LABEL_FONT
  c.textBaseline = 'middle'
  c.fillStyle = '#f7eedd'
  c.fillText(text, padX + dot, h / 2 + 1)
  const tex = kit.track(new THREE.CanvasTexture(canvas))
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false
  const mat = kit.track(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
  const sp = new THREE.Sprite(mat)
  sp.scale.set(w * scale, h * scale, 1)
  sp.renderOrder = 40
  return sp
}

type LabelItem = { sprite: THREE.Sprite; ax: number; ay: number; x: number; y: number; w: number; h: number; info?: InfoItem }

function layoutLabels(items: LabelItem[], s: EraScene) {
  const pad = 0.06
  const xMin = -s.blockW / 2 - 0.6
  const xMax = s.blockW / 2 + 0.6
  for (let iter = 0; iter < 80; iter++) {
    let moved = false
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]
        const b = items[j]
        const ox = (a.w + b.w) / 2 + pad - Math.abs(a.x - b.x)
        const oy = (a.h + b.h) / 2 + pad - Math.abs(a.y - b.y)
        if (ox <= 0 || oy <= 0) continue
        moved = true
        if (oy < ox) {
          const dir = a.y >= b.y ? 1 : -1
          a.y += (dir * oy) / 2
          b.y -= (dir * oy) / 2
        } else {
          const dir = a.x >= b.x ? 1 : -1
          a.x += (dir * ox) / 2
          b.x -= (dir * ox) / 2
        }
      }
    }
    for (const it of items) {
      it.x = Math.min(xMax - it.w / 2, Math.max(xMin + it.w / 2, it.x))
      it.y = Math.min(s.skyRoom - 0.4, Math.max(-s.blockH + it.h / 2 + 0.1, it.y))
    }
    if (!moved) break
  }
}

function makeLabelWidth(text: string, scale = LABEL_SCALE): number {
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = LABEL_FONT
  return (Math.ceil(probe.measureText(text).width) + 12 * 2 + 16) * scale
}

type Extents = { minX: number; maxX: number; minY: number; maxY: number }

function grow(e: Extents, x: number, y: number, w: number, h: number) {
  e.minX = Math.min(e.minX, x - w / 2)
  e.maxX = Math.max(e.maxX, x + w / 2)
  e.minY = Math.min(e.minY, y - h / 2)
  e.maxY = Math.max(e.maxY, y + h / 2)
}

function buildLabels(s: EraScene, kit: Kit, layer: THREE.Group, pickables: THREE.Object3D[], ext: Extents) {
  const zf = s.blockD / 2
  const items: LabelItem[] = []
  const add = (text: string, ax: number, ay: number, x: number, y: number, info: InfoItem) => {
    const sprite = makeLabel(text, s.accent, kit)
    items.push({ sprite, ax, ay, x, y, w: sprite.scale.x, h: sprite.scale.y, info })
  }
  for (const ch of s.chambers) {
    const top = ch.y + ch.h
    add(ch.title, ch.x, top - 0.08, ch.x, top + 0.38, ch)
  }
  for (const co of s.callouts) {
    const [ax, ay] = co.at
    const place = co.place ?? (ay > -1.0 ? 'sky' : 'above')
    const probeW = makeLabelWidth(co.title)
    const pos: Record<string, Vec2> = {
      sky: [ax, 0.8],
      above: [ax + 0.3, ay + 0.6],
      below: [ax + 0.2, ay - 0.62],
      left: [ax - probeW / 2 - 0.45, ay],
      right: [ax + probeW / 2 + 0.45, ay],
    }
    const [lx, ly] = pos[place]
    add(co.title, ax, ay, lx, ly, co)
  }
  layoutLabels(items, s)

  const lineMat = kit.track(new THREE.LineBasicMaterial({ color: s.accent, transparent: true, opacity: 0.75, depthTest: false }))
  const dotGeo = kit.geo('anchor-dot', () => new THREE.SphereGeometry(0.05, 10, 8))
  const dotMat = kit.track(new THREE.MeshBasicMaterial({ color: s.accent, depthTest: false }))
  for (const it of items) {
    it.sprite.position.set(it.x, it.y, zf + 0.45)
    it.sprite.userData.baseScale = it.sprite.scale.clone()
    grow(ext, it.x, it.y, it.w, it.h)
    it.sprite.userData.info = it.info
    it.sprite.userData.focus = new THREE.Vector3(it.ax, it.ay, zf)
    layer.add(it.sprite)
    pickables.push(it.sprite)
    const side = Math.abs(it.y - it.ay) < it.h * 0.75
    const endX = side ? (it.x > it.ax ? it.x - it.w / 2 : it.x + it.w / 2) : it.x
    const endY = side ? it.y : it.y > it.ay ? it.y - it.h / 2 : it.y + it.h / 2
    const geo = kit.track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(it.ax, it.ay, zf + 0.02), new THREE.Vector3(endX, endY, zf + 0.45)]))
    const line = new THREE.Line(geo, lineMat)
    line.renderOrder = 39
    layer.add(line)
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(it.ax, it.ay, zf + 0.03)
    dot.renderOrder = 39
    layer.add(dot)
  }
}

function buildDepthScale(s: EraScene, kit: Kit, ext: Extents): THREE.Group {
  const g = new THREE.Group()
  const zf = s.blockD / 2
  const x = -s.blockW / 2 - 0.25
  const mat = kit.track(new THREE.MeshBasicMaterial({ color: '#f3e3c8' }))
  const axis = new THREE.Mesh(kit.track(new THREE.BoxGeometry(0.03, s.blockH * 0.78, 0.03)), mat)
  axis.position.set(x, -s.blockH * 0.39, zf)
  g.add(axis)
  for (const mk of s.depthMarks) {
    const tick = new THREE.Mesh(kit.geo('tick', () => new THREE.BoxGeometry(0.28, 0.03, 0.03)), mat)
    tick.position.set(x + 0.12, mk.y, zf)
    g.add(tick)
    const label = makeLabel(mk.text, '#f3e3c8', kit, 0.0085)
    label.position.set(x - label.scale.x / 2 - 0.08, mk.y, zf)
    label.userData.baseScale = label.scale.clone()
    grow(ext, label.position.x, mk.y, label.scale.x, label.scale.y)
    g.add(label)
  }
  return g
}

/* ------------------------------------------------------------------ */
/*  Lắp ráp                                                            */
/* ------------------------------------------------------------------ */

export function buildScene(s: EraScene): BuiltScene {
  const kit = new Kit()
  const root = new THREE.Group()
  const animators: Animator[] = []
  const pickables: THREE.Object3D[] = []
  const zf = s.blockD / 2

  root.add(makeEarthBlock(s, kit))
  if (s.walkway) {
    addBox(root, kit, 'walkway', [s.blockW - 1.4, 0.06, 0.95], '#d3c6aa', [0, 0.1, zf - 0.85], { roughness: 1 })
  }

  // Lòng hầm
  const stepMats: THREE.Matrix4[] = []
  const samples: CutSamples[] = s.cuts.map((c) => ({ pts: curveSamples(c.points), r: c.radius }))
  s.cuts.forEach((cut, i) => root.add(makeGroove(cut, s, kit, stepMats, samples.filter((_, j) => j !== i))))
  if (stepMats.length) {
    const steps = new THREE.InstancedMesh(kit.geo('step', () => new THREE.BoxGeometry(0.16, 0.045, 1)), kit.std('#a8743f', { roughness: 1 }), stepMats.length)
    stepMats.forEach((m, i) => steps.setMatrixAt(i, m))
    root.add(steps)
  }

  // Hầm phòng
  for (const ch of s.chambers) {
    const { group, hit } = makeChamber(ch, s, kit, animators)
    root.add(group)
    pickables.push(hit)
  }

  // Nắp hầm giữa các tầng
  for (const td of s.trapDoors) {
    const lid = addBox(root, kit, 'trapdoor', [0.62, 0.05, 0.36], '#6b4524', [td.at[0], td.at[1], zf - 0.2], { roughness: 1 })
    lid.rotation.z = (td.angle ?? 0) + 0.35
  }

  // Ngăn nước chống hơi độc
  for (const wt of s.waterTraps) {
    const water = new THREE.Mesh(kit.geo(`wtrap-${wt.w}-${wt.h}`, () => new THREE.BoxGeometry(wt.w, wt.h, 0.34)), waterMat(kit))
    water.position.set(wt.x, wt.y + wt.h / 2, zf - 0.17)
    root.add(water)
  }

  // Giếng & khói
  let smokeSeed = 0
  for (const cut of s.cuts) {
    if (cut.kind === 'well') root.add(makeWell(cut, s, kit))
    if (cut.kind === 'flue') {
      const [x] = cut.points[cut.points.length - 1]
      root.add(makeSmoke(x, zf - 0.15, kit, animators, smokeSeed++))
    }
  }

  // Ánh sáng trong hầm
  for (const l of s.lights) {
    const light = new THREE.PointLight(l.color, l.intensity, 3.6, 1.6)
    light.position.set(l.x, l.y, zf - (l.z ?? 0.35))
    root.add(light)
    if (l.flicker) {
      const base = l.intensity
      animators.push((t) => {
        light.intensity = base * (0.82 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.7) * 0.08)
      })
    }
  }

  // Mặt đất
  const keepOut: KeepOut = []
  for (const o of s.surface) {
    root.add(makeSurfaceObj(o, s, kit, animators))
    const r = o.type === 'tank' || o.type === 'wreck' ? 1.3 : o.type === 'hut' || o.type === 'pavilion' ? 1.1 : o.type === 'crater' ? 1.0 : o.type === 'heli' ? 0 : 0.45
    if (r > 0) keepOut.push([o.x, o.z, r * (o.scale ?? 1)])
  }
  for (const f of s.figures) if (f.surface) keepOut.push([f.x, f.z ?? 1, 0.45 + (f.patrol ?? 0)])
  for (const cut of s.cuts) {
    const top = cut.points.find(([, y]) => y >= 0)
    if (top) keepOut.push([top[0], zf - 0.4, 0.5])
  }
  if (s.walkway) for (let x = -s.blockW / 2; x <= s.blockW / 2; x += 0.8) keepOut.push([x, zf - 0.85, 0.65])
  addForest(root, s, kit, keepOut)

  // Nhân vật
  s.figures.forEach((f, i) => root.add(placeFigure(f, s, kit, animators, i)))
  for (const c of s.crawlers) {
    const cut = s.cuts[c.cut]
    if (!cut) continue
    root.add(placeCrawler(cut, c.outfit, s, kit, { speed: c.speed, from: c.from ?? 0.05, to: c.to ?? 0.95, phase: c.phase ?? 0 }, animators))
  }

  // Nhãn
  const labelLayer = new THREE.Group()
  const ext: Extents = { minX: -s.blockW / 2, maxX: s.blockW / 2, minY: -s.blockH, maxY: s.skyRoom }
  buildLabels(s, kit, labelLayer, pickables, ext)
  labelLayer.add(buildDepthScale(s, kit, ext))
  root.add(labelLayer)

  const semanticTargets = new Map<string, { info: InfoItem; focus: THREE.Vector3 }>()
  for (const pickable of pickables) {
    const info = pickable.userData.info as InfoItem | undefined
    const focus = pickable.userData.focus as THREE.Vector3 | undefined
    if (info?.heritageRoleId && focus && !semanticTargets.has(info.heritageRoleId)) {
      semanticTargets.set(info.heritageRoleId, { info, focus: focus.clone() })
    }
  }

  return {
    root,
    animators,
    pickables,
    semanticTargets,
    labelLayer,
    bounds: { ...ext, minZ: -s.blockD / 2, maxZ: zf + 0.45 },
    blockBounds: { minX: -s.blockW / 2, maxX: s.blockW / 2, minY: -s.blockH, maxY: Math.min(s.skyRoom, 2.4), minZ: -s.blockD / 2, maxZ: zf },
    labelWorldH: 44 * LABEL_SCALE,
    dispose: () => kit.dispose(),
  }
}
