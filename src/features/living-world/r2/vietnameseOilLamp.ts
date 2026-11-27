import * as T from 'three'
import type { Kit } from '../../time-portal/tunnel3d/kit'

/**
 * Đèn dầu truyền thống Việt Nam (bầu thủy tinh tối đựng dầu hỏa, cổ đồng đục lỗ có núm vặn tim bấc,
 * bóng thủy tinh thổi phình bầu tròn quanh ngọn lửa rồi thắt thon thành ống khói cao thanh thoát).
 * Toàn bộ geometry được dùng chung qua Kit; vật liệu tránh transmission nhiều lượt để giữ tốc độ khung hình.
 */
export type VietnameseOilLamp = {
  group: T.Group
  light: T.PointLight | null
  flame: T.Group
  update: (timeSeconds: number, reducedMotion: boolean) => void
}

export type OilLampOptions = {
  scale?: number
  intensity?: number
  distance?: number
  decay?: number
  color?: string
  lightOffset?: [number, number, number]
  phase?: number
}

let burnerSlotPixels: Uint8Array | null = null
let burnerEmissivePixels: Uint8Array | null = null

function ensureBurnerPixels() {
  if (burnerSlotPixels && burnerEmissivePixels) return { map: burnerSlotPixels, emissive: burnerEmissivePixels }
  const w = 128, h = 64
  const color = new Uint8Array(w * h * 4)
  const glow = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      // Brass base tone with subtle vertical brushing and horizontal thread rings at bottom
      const thread = v < 0.28 ? Math.sin(v * Math.PI * 18) * 14 : 0
      let r = 166 + thread, g = 122 + thread * 0.75, b = 52 + thread * 0.35
      let er = 0, eg = 0, eb = 0
      // Lower row of vertical air-intake slots (như ảnh đèn dầu truyền thống)
      const col24 = (x / w) * 24
      const frac24 = col24 - Math.floor(col24)
      const inLowerSlot = v >= 0.34 && v <= 0.56 && frac24 > 0.28 && frac24 < 0.72
      // Upper row of teardrop crown vents right under the glass chimney base
      const col16 = (x / w) * 16
      const frac16 = col16 - Math.floor(col16)
      const inUpperSlot = v >= 0.68 && v <= 0.88 && frac16 > 0.3 && frac16 < 0.7
      if (inLowerSlot || inUpperSlot) {
        r = 255; g = 190; b = 96
        er = 255; eg = 168; eb = 62
      }
      color[i] = Math.max(0, Math.min(255, r))
      color[i + 1] = Math.max(0, Math.min(255, g))
      color[i + 2] = Math.max(0, Math.min(255, b))
      color[i + 3] = 255
      glow[i] = er; glow[i + 1] = eg; glow[i + 2] = eb; glow[i + 3] = 255
    }
  }
  burnerSlotPixels = color
  burnerEmissivePixels = glow
  return { map: color, emissive: glow }
}

function makeDataTex(pixels: Uint8Array, w: number, h: number, srgb: boolean): T.DataTexture {
  const tex = new T.DataTexture(pixels, w, h, T.RGBAFormat)
  tex.wrapS = T.RepeatWrapping
  tex.wrapT = T.ClampToEdgeWrapping
  if (srgb) tex.colorSpace = T.SRGBColorSpace
  tex.magFilter = T.LinearFilter
  tex.minFilter = T.LinearFilter
  tex.needsUpdate = true
  return tex
}

export function createVietnameseOilLamp(
  parent: T.Object3D,
  kit: Kit,
  pos: [number, number, number],
  opts: OilLampOptions = {},
): VietnameseOilLamp {
  const scale = opts.scale ?? 0.9
  const intensity = opts.intensity ?? 1.4
  const distance = opts.distance ?? 5.6
  const decay = opts.decay ?? 1.7
  const lightColor = opts.color ?? '#ffb864'
  const phase = opts.phase ?? (pos[0] * 1.9 + pos[2] * 2.3)

  const group = new T.Group()
  group.name = 'vietnamese-traditional-oil-lamp'
  group.position.set(...pos)
  parent.add(group)

  const body = new T.Group()
  body.scale.setScalar(scale)
  group.add(body)

  // 1. Bầu dầu thủy tinh tối màu nâu hổ phách trầm, đế tròn có gờ vững chãi
  const reservoirGeo = kit.geo('vn-lamp-reservoir', () => {
    const pts = [
      [0.0, 0.0],
      [0.056, 0.0],
      [0.058, 0.008],
      [0.053, 0.015],
      [0.047, 0.021],
      [0.062, 0.032],
      [0.069, 0.045],
      [0.066, 0.057],
      [0.052, 0.066],
      [0.028, 0.072],
      [0.024, 0.075],
    ].map(([x, y]) => new T.Vector2(x, y))
    const g = new T.LatheGeometry(pts, 28)
    g.computeVertexNormals()
    return g
  })
  const reservoirMat = kit.memo('vn-lamp-reservoir-mat', () =>
    new T.MeshStandardMaterial({
      color: '#241107',
      emissive: '#3d1906',
      emissiveIntensity: 0.24,
      roughness: 0.16,
      metalness: 0.12,
    }),
  )
  const reservoir = new T.Mesh(reservoirGeo, reservoirMat)
  reservoir.castShadow = true
  reservoir.receiveShadow = true
  body.add(reservoir)

  // Lớp dầu hỏa màu hổ phách ánh lên nhẹ ở nửa dưới bầu thủy tinh
  const oilGeo = kit.geo('vn-lamp-oil-core', () => {
    const pts = [
      [0.0, 0.018],
      [0.044, 0.02],
      [0.061, 0.036],
      [0.062, 0.048],
      [0.0, 0.049],
    ].map(([x, y]) => new T.Vector2(x, y))
    return new T.LatheGeometry(pts, 20)
  })
  const oilMat = kit.memo('vn-lamp-oil-mat', () =>
    new T.MeshStandardMaterial({
      color: '#592508',
      emissive: '#7a3309',
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.05,
    }),
  )
  body.add(new T.Mesh(oilGeo, oilMat))

  // 2. Cổ đồng vặn bấc đục khe thoáng + trục núm xoay chỉnh tim đèn bên hông
  const burnerGeo = kit.geo('vn-lamp-burner', () => {
    const pts = [
      [0.024, 0.073],
      [0.026, 0.078],
      [0.025, 0.086],
      [0.031, 0.094],
      [0.034, 0.105],
      [0.031, 0.113],
      [0.027, 0.114],
    ].map(([x, y]) => new T.Vector2(x, y))
    const g = new T.LatheGeometry(pts, 24)
    g.computeVertexNormals()
    return g
  })
  const burnerMat = kit.memo('vn-lamp-burner-mat', () => {
    const px = ensureBurnerPixels()
    const map = kit.track(makeDataTex(px.map, 128, 64, true))
    const emissiveMap = kit.track(makeDataTex(px.emissive, 128, 64, true))
    return new T.MeshStandardMaterial({
      map,
      emissiveMap,
      emissive: new T.Color('#ffa83b'),
      emissiveIntensity: intensity > 0 ? 1.5 : 0,
      roughness: 0.34,
      metalness: 0.72,
    })
  })
  const burner = new T.Mesh(burnerGeo, burnerMat)
  burner.castShadow = true
  body.add(burner)

  const brassSolidMat = kit.memo('vn-lamp-brass-solid', () =>
    new T.MeshStandardMaterial({
      color: '#a87d34',
      roughness: 0.36,
      metalness: 0.74,
    }),
  )
  const stemGeo = kit.geo('vn-lamp-knob-stem', () => {
    const g = new T.CylinderGeometry(0.0024, 0.0024, 0.034, 8)
    g.rotateZ(Math.PI / 2)
    g.translate(0.028, 0.086, 0)
    return g
  })
  const wheelGeo = kit.geo('vn-lamp-knob-wheel', () => {
    const g = new T.CylinderGeometry(0.0105, 0.0105, 0.0038, 16)
    g.rotateZ(Math.PI / 2)
    g.translate(0.046, 0.086, 0)
    return g
  })
  body.add(new T.Mesh(stemGeo, brassSolidMat), new T.Mesh(wheelGeo, brassSolidMat))

  // 3. Tim bấc & Ngọn lửa 2 lớp (ngoài vàng cam ấm, trong trắng vàng rực)
  const wickGeo = kit.geo('vn-lamp-wick', () => {
    const g = new T.BoxGeometry(0.011, 0.016, 0.0035)
    g.translate(0, 0.114, 0)
    return g
  })
  const wickMat = kit.memo('vn-lamp-wick-mat', () =>
    new T.MeshStandardMaterial({ color: '#241c16', emissive: '#a83c0c', emissiveIntensity: 0.6, roughness: 0.95 }),
  )
  body.add(new T.Mesh(wickGeo, wickMat))

  const flame = new T.Group()
  flame.position.set(0, 0.119, 0)
  body.add(flame)

  const outerFlameGeo = kit.geo('vn-lamp-flame-outer', () => {
    const pts = [
      [0.0, 0.0],
      [0.0085, 0.007],
      [0.0115, 0.017],
      [0.008, 0.03],
      [0.003, 0.041],
      [0.0, 0.048],
    ].map(([x, y]) => new T.Vector2(x, y))
    return new T.LatheGeometry(pts, 14)
  })
  const innerFlameGeo = kit.geo('vn-lamp-flame-inner', () => {
    const pts = [
      [0.0, 0.002],
      [0.0052, 0.007],
      [0.0068, 0.015],
      [0.004, 0.025],
      [0.0, 0.032],
    ].map(([x, y]) => new T.Vector2(x, y))
    return new T.LatheGeometry(pts, 12)
  })
  const outerFlameMat = kit.memo('vn-lamp-flame-outer-mat', () =>
    new T.MeshStandardMaterial({
      color: '#ff9626',
      emissive: '#ff8a18',
      emissiveIntensity: 5.5,
      roughness: 0.3,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    }),
  )
  const innerFlameMat = kit.memo('vn-lamp-flame-inner-mat', () =>
    new T.MeshStandardMaterial({
      color: '#fffef2',
      emissive: '#ffecad',
      emissiveIntensity: 11,
      roughness: 0.15,
    }),
  )
  flame.add(new T.Mesh(outerFlameGeo, outerFlameMat), new T.Mesh(innerFlameGeo, innerFlameMat))
  flame.visible = intensity > 0

  // 4. Bóng thủy tinh thổi: phình bầu tròn ở bụng lửa rồi thắt thon vươn cao thành ống khói thanh thoát
  const chimneyGeo = kit.geo('vn-lamp-chimney', () => {
    const pts = [
      [0.0285, 0.106],
      [0.031, 0.114],
      [0.045, 0.128],
      [0.0525, 0.146],
      [0.0475, 0.167],
      [0.035, 0.188],
      [0.0245, 0.212],
      [0.0195, 0.238],
      [0.0178, 0.268],
      [0.0172, 0.292],
      [0.0186, 0.296],
    ].map(([x, y]) => new T.Vector2(x, y))
    const g = new T.LatheGeometry(pts, 28)
    g.computeVertexNormals()
    return g
  })
  const chimneyMat = kit.memo('vn-lamp-chimney-mat', () =>
    new T.MeshStandardMaterial({
      color: '#fff4df',
      emissive: '#ffb24f',
      emissiveIntensity: 0.22,
      roughness: 0.08,
      metalness: 0.06,
      transparent: true,
      opacity: 0.34,
      side: T.DoubleSide,
      depthWrite: false,
    }),
  )
  const chimney = new T.Mesh(chimneyGeo, chimneyMat)
  chimney.renderOrder = 2
  body.add(chimney)

  let light: T.PointLight | null = null
  if (intensity > 0) {
    light = new T.PointLight(lightColor, intensity, distance, decay)
    const offset = opts.lightOffset ?? [0, 0.16 * scale, 0]
    light.position.set(...offset)
    light.userData.base = intensity
    group.add(light)
  }

  const update = (timeSeconds: number, reducedMotion: boolean) => {
    if (reducedMotion) {
      flame.scale.set(1, 1, 1)
      flame.rotation.z = 0
      if (light) light.intensity = intensity
      return
    }
    const wave = 1 + Math.sin(timeSeconds * 8.4 + phase) * 0.055 + Math.sin(timeSeconds * 21.5 + phase * 1.7) * 0.028
    flame.scale.set(1 - (wave - 1) * 0.25, wave, 1 - (wave - 1) * 0.25)
    flame.rotation.z = Math.sin(timeSeconds * 5.2 + phase) * 0.045
    if (light) light.intensity = intensity * wave
  }

  return { group, light, flame, update }
}

/** Đèn dầu Việt Nam thu nhỏ cho lát cắt mặt đứng diễn giải (zoneEnvironments fallback). */
export function createMiniatureVietnameseOilLamp(
  parent: T.Object3D,
  kit: Kit,
  pos: [number, number, number],
  scale = 0.72,
): T.Group {
  const g = new T.Group()
  g.position.set(...pos)
  g.scale.setScalar(scale)
  parent.add(g)

  const base = new T.Mesh(
    kit.geo('lw-vn-lamp-base', () => new T.CylinderGeometry(0.032, 0.052, 0.055, 12)),
    kit.memo('lw-vn-lamp-base-mat', () => new T.MeshBasicMaterial({ color: '#3b1c0b' })),
  )
  base.position.y = 0.028
  const collar = new T.Mesh(
    kit.geo('lw-vn-lamp-collar', () => new T.CylinderGeometry(0.024, 0.028, 0.025, 10)),
    kit.memo('lw-vn-lamp-collar-mat', () => new T.MeshBasicMaterial({ color: '#b5883b' })),
  )
  collar.position.y = 0.068
  const flame = new T.Mesh(
    kit.geo('lw-vn-lamp-flame', () => new T.ConeGeometry(0.016, 0.042, 10)),
    kit.memo('lw-vn-lamp-flame-mat', () => new T.MeshBasicMaterial({ color: '#ffd37d' })),
  )
  flame.position.y = 0.102
  const glass = new T.Mesh(
    kit.geo('lw-vn-lamp-glass', () => {
      const pts = [
        [0.026, 0.08],
        [0.046, 0.11],
        [0.022, 0.155],
        [0.016, 0.205],
      ].map(([x, y]) => new T.Vector2(x, y))
      return new T.LatheGeometry(pts, 14)
    }),
    kit.memo('lw-vn-lamp-glass-mat', () =>
      new T.MeshBasicMaterial({ color: '#fff0d1', transparent: true, opacity: 0.36, side: T.DoubleSide, depthWrite: false }),
    ),
  )
  g.add(base, collar, flame, glass)
  return g
}
