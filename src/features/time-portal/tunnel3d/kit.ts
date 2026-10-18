// src/features/time-portal/tunnel3d/kit.ts
// Bộ đệm material/geometry dùng chung trong một lần dựng cảnh — giảm số shader
// và bộ nhớ GPU; giải phóng toàn bộ khi đổi thời kỳ.

import * as THREE from 'three'

export type StdOpts = {
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  flatShading?: boolean
  side?: THREE.Side
  transparent?: boolean
  opacity?: number
  vertexColors?: boolean
  depthWrite?: boolean
}

export class Kit {
  private mats = new Map<string, THREE.Material>()
  private geos = new Map<string, THREE.BufferGeometry>()
  private extras: { dispose: () => void }[] = []

  std(color: string, o: StdOpts = {}): THREE.MeshStandardMaterial {
    const key = `${color}|${JSON.stringify(o)}`
    let m = this.mats.get(key) as THREE.MeshStandardMaterial | undefined
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...o })
      this.mats.set(key, m)
    }
    return m
  }

  geo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
    let g = this.geos.get(key) as T | undefined
    if (!g) {
      g = make()
      this.geos.set(key, g)
    }
    return g
  }

  private memos = new Map<string, unknown>()

  /** Tạo một lần trong mỗi lần dựng cảnh (ví dụ texture dùng chung). */
  memo<T extends { dispose: () => void }>(key: string, make: () => T): T {
    let v = this.memos.get(key) as T | undefined
    if (!v) {
      v = this.track(make())
      this.memos.set(key, v)
    }
    return v
  }

  /** Ghi nhận tài nguyên riêng lẻ (texture, material duy nhất…) để giải phóng sau. */
  track<T extends { dispose: () => void }>(res: T): T {
    this.extras.push(res)
    return res
  }

  dispose() {
    this.mats.forEach((m) => m.dispose())
    this.geos.forEach((g) => g.dispose())
    this.extras.forEach((r) => r.dispose())
    this.mats.clear()
    this.memos.clear()
    this.geos.clear()
    this.extras = []
  }
}

/** PRNG có seed — để rừng cây giống nhau mỗi lần dựng. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
