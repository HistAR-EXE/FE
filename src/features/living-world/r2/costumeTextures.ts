import * as T from 'three'

/**
 * Họa tiết vải truyền thống và cách mạng dựng bằng DataTexture thuần (chạy được cả trong WebGL lẫn Node test):
 * 1. Khăn rằn Nam Bộ: sọc caro đen – trắng ngà dệt đan thớ vải, có hai đường chỉ đỏ mảnh đặc trưng gần gấu khăn.
 * 2. Áo choàng vải dù cách mạng: mảng ngụy trang lá rừng hữu cơ (xanh rêu, nâu đất, vàng đất trầm, xám đen rừng).
 */

let khanRanBodyBytes: Uint8Array | null = null
let khanRanTailBytes: Uint8Array | null = null
let camoCapeBytes: Uint8Array | null = null

function ensureKhanRanBytes() {
  if (khanRanBodyBytes && khanRanTailBytes) return { body: khanRanBodyBytes, tail: khanRanTailBytes }
  const w = 128, h = 256
  const body = new Uint8Array(w * h * 4)
  const tail = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const v = y / (h - 1)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const warpDark = Math.floor(x / 8) % 2 === 0
      const weftDark = Math.floor(y / 8) % 2 === 0
      const threadGrain = ((x * 7 + y * 13) % 9) - 4
      // Dệt caro truyền thống: ô đen đậm, ô trắng ngà, và ô giao thoa sợi dọc-ngang màu xám dệt
      let r: number, g: number, b: number
      if (warpDark && weftDark) {
        r = 24 + threadGrain; g = 24 + threadGrain; b = 23 + threadGrain
      } else if (!warpDark && !weftDark) {
        r = 236 + threadGrain; g = 232 + threadGrain; b = 221 + threadGrain
      } else {
        const checkerThread = (x + y) % 2 === 0
        r = (checkerThread ? 42 : 210) + threadGrain
        g = (checkerThread ? 42 : 206) + threadGrain
        b = (checkerThread ? 40 : 196) + threadGrain
      }
      body[i] = Math.max(0, Math.min(255, r))
      body[i + 1] = Math.max(0, Math.min(255, g))
      body[i + 2] = Math.max(0, Math.min(255, b))
      body[i + 3] = 255

      // Phần đuôi vạt khăn (v < 0.24): hai đường chỉ đỏ thẫm + sọc dọc đen trắng ở gấu khăn như ảnh tư liệu thực tế
      let tr = r, tg = g, tb = b
      if (v < 0.13) {
        tr = warpDark ? 24 : 234
        tg = warpDark ? 24 : 230
        tb = warpDark ? 23 : 220
      } else if ((v >= 0.135 && v <= 0.16) || (v >= 0.185 && v <= 0.208)) {
        tr = warpDark ? 156 : 204
        tg = warpDark ? 28 : 42
        tb = warpDark ? 26 : 36
      }
      tail[i] = Math.max(0, Math.min(255, tr))
      tail[i + 1] = Math.max(0, Math.min(255, tg))
      tail[i + 2] = Math.max(0, Math.min(255, tb))
      tail[i + 3] = 255
    }
  }
  khanRanBodyBytes = body
  khanRanTailBytes = tail
  return { body, tail }
}

function fbmCamo(u: number, v: number): number {
  const a = Math.sin(u * Math.PI * 4 + Math.cos(v * Math.PI * 4) * 1.4) * Math.cos(v * Math.PI * 4 - Math.sin(u * Math.PI * 2) * 1.2)
  const b = Math.sin(u * Math.PI * 8 + 1.7 + Math.sin(v * Math.PI * 6) * 0.9) * Math.cos(v * Math.PI * 8 - 0.8)
  const c = Math.sin((u + v) * Math.PI * 12) * 0.22
  return a * 0.55 + b * 0.32 + c
}

function ensureCamoCapeBytes(): Uint8Array {
  if (camoCapeBytes) return camoCapeBytes
  const w = 256, h = 256
  const data = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) {
    const v = y / w
    for (let x = 0; x < w; x++) {
      const u = x / w
      const i = (y * w + x) * 4
      const n1 = fbmCamo(u, v)
      const n2 = fbmCamo(u * 1.5 + 0.37, v * 1.5 - 0.21)
      const ripstop = ((x % 4 === 0 || y % 4 === 0) ? -5 : 0)
      // 4 tông màu vải dù cách mạng trong rừng Củ Chi: xanh lá rêu, vàng đất trầm, nâu đỏ đất, đen lá mục
      let r: number, g: number, b: number
      if (n1 > 0.28) {
        // Vàng đất / cát rừng trầm
        r = 158; g = 126; b = 62
      } else if (n2 < -0.3) {
        // Mảng đen rừng đậm
        r = 34; g = 37; b = 28
      } else if (n1 < -0.18 && n2 > 0.02) {
        // Nâu đất đỏ trầm
        r = 108; g = 63; b = 36
      } else {
        // Nền xanh lá rêu chủ đạo
        r = 79; g = 99; b = 49
      }
      data[i] = Math.max(0, Math.min(255, r + ripstop))
      data[i + 1] = Math.max(0, Math.min(255, g + ripstop))
      data[i + 2] = Math.max(0, Math.min(255, b + ripstop))
      data[i + 3] = 255
    }
  }
  camoCapeBytes = data
  return data
}

export function createKhanRanTexture(withTailStripe = true, repeat: [number, number] = [1, 1]): T.DataTexture {
  const { body, tail } = ensureKhanRanBytes()
  const tex = new T.DataTexture(withTailStripe ? tail : body, 128, 256, T.RGBAFormat)
  tex.wrapS = T.RepeatWrapping
  tex.wrapT = withTailStripe ? T.ClampToEdgeWrapping : T.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.colorSpace = T.SRGBColorSpace
  tex.magFilter = T.LinearFilter
  tex.minFilter = T.LinearFilter
  tex.needsUpdate = true
  return tex
}

export function createCamoParachuteTexture(repeat: [number, number] = [2.2, 2.2]): T.DataTexture {
  const tex = new T.DataTexture(ensureCamoCapeBytes(), 256, 256, T.RGBAFormat)
  tex.wrapS = T.RepeatWrapping
  tex.wrapT = T.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.colorSpace = T.SRGBColorSpace
  tex.magFilter = T.LinearFilter
  tex.minFilter = T.LinearFilter
  tex.needsUpdate = true
  return tex
}
