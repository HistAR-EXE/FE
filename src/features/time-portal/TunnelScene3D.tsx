// src/features/time-portal/TunnelScene3D.tsx
// Mô hình 3D "lát cắt địa đạo Củ Chi" qua 4 thời kỳ.
// Dựng theo phong cách sa bàn / lát cắt thực tế: một khối đất đá ong đỏ,
// mặt cắt phía trước phơi bày hệ thống đường hầm, hầm phòng chức năng,
// giếng nước và ống thông hơi; mặt trên là địa hình rừng Củ Chi theo thời kỳ.
// Vanilla Three.js — không phụ thuộc @react-three/*.

import { useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { EraValue } from './eraLabels'

/* ================================================================== */
/*  Hệ toạ độ                                                          */
/*  - x: ngang theo mặt cắt (1 đơn vị ≈ 1.6 m)                         */
/*  - y: 0 = mặt đất, âm dần xuống sâu (1 đơn vị ≈ 1.6 m)              */
/*  - z: +blockD/2 là mặt cắt nhìn thấy                                */
/* ================================================================== */

type Vec2 = [number, number]

type TunnelTone = 'main' | 'deep' | 'demo' | 'ghost' | 'trap'

type TunnelPath = {
  points: Vec2[]
  radius?: number
  tone?: TunnelTone
  /** Vẽ bậc thang trên các đoạn dốc. */
  steps?: boolean
}

type ChamberKind =
  | 'kitchen'
  | 'clinic'
  | 'store'
  | 'meeting'
  | 'sleep'
  | 'firing'
  | 'trap'
  | 'shelter'
  | 'display'

type Chamber = {
  x: number
  /** Cao độ nền hầm. */
  y: number
  w: number
  h: number
  label: string
  kind: ChamberKind
  /** Đặt nhãn bên dưới thay vì bên trên (tránh chồng nhãn). */
  labelBelow?: boolean
}

type Vent = {
  x: number
  yFrom: number
  kind: 'air' | 'smoke' | 'well'
  /** Với 'smoke': các toạ độ x miệng thoát khói trên mặt đất. */
  outlets?: number[]
  /** Với 'well': đáy giếng. */
  yBottom?: number
}

type SurfaceKind =
  | 'tree'
  | 'palm'
  | 'bamboo'
  | 'burnt'
  | 'bush'
  | 'hut'
  | 'flag'
  | 'tank'
  | 'person'
  | 'hatch'
  | 'crater'
  | 'sign'
  | 'pavilion'
  | 'lamp'

type SurfaceObj = {
  type: SurfaceKind
  x: number
  z: number
  scale?: number
  color?: string
}

type EraScene = {
  label: string
  caption: string
  blockW: number
  blockH: number
  blockD: number
  earthTop: string
  earthDeep: string
  grass: string
  accent: string
  ambient: string
  keyLight: string
  fillLight: string
  tunnels: TunnelPath[]
  chambers: Chamber[]
  vents: Vent[]
  surface: SurfaceObj[]
  depthMarks: { y: number; text: string }[]
  /** Dải lối đi tham quan trên mặt đất (2026). */
  walkway?: boolean
}

/* ------------------------------------------------------------------ */
/*  Dữ liệu 4 thời kỳ                                                  */
/* ------------------------------------------------------------------ */

// Quy đổi độ sâu: 3 m ≈ 1.9 · 6 m ≈ 3.95 · 10 m ≈ 6.5
const D3 = -1.9
const D6 = -3.95
const D10 = -6.5

/** Mạng hầm 3 tầng dùng chung cho 1968 & 1975 (hệ thống 250 km liên hoàn). */
function threeLevelNetwork(): TunnelPath[] {
  return [
    // Miệng hầm bí mật → tầng 1
    { points: [[-7.6, -0.14], [-7.78, -0.95], [-7.42, -1.58], [-6.9, -1.84]], radius: 0.23, steps: true },
    { points: [[4.2, -0.14], [4.38, -1.0], [4.64, -1.66], [5.0, -1.86]], radius: 0.23, steps: true },
    // Tầng 1 — 3 m: chống đạn pháo và xe tăng
    {
      points: [[-9.1, -1.92], [-6.2, -1.78], [-4.0, -2.06], [-1.0, -1.82], [2.0, -2.0], [5.0, -1.84], [8.7, -1.96]],
      radius: 0.3,
    },
    // Nhánh hầm giả — bẫy mìn (cụt)
    { points: [[2.0, -2.0], [2.62, -2.58], [3.06, -3.06]], radius: 0.21, tone: 'trap', steps: true },
    // Giếng thông tầng 1 → tầng 2
    { points: [[-6.2, -1.78], [-6.66, -2.6], [-6.26, -3.38], [-5.9, -3.9]], radius: 0.27, steps: true },
    { points: [[5.0, -1.84], [5.6, -2.68], [5.26, -3.46], [5.5, -3.92]], radius: 0.27, steps: true },
    // Tầng 2 — 6 m: chống bom nhỏ
    {
      points: [[-7.7, -3.92], [-4.5, -4.06], [-1.2, -3.86], [1.8, -4.02], [5.0, -3.9], [8.0, -4.0]],
      radius: 0.32,
      tone: 'deep',
    },
    // Giếng thông tầng 2 → tầng 3
    { points: [[-1.2, -3.86], [-1.92, -4.78], [-1.44, -5.68], [-1.0, -6.42]], radius: 0.27, tone: 'deep', steps: true },
    { points: [[5.0, -3.9], [5.52, -4.86], [5.02, -5.76], [4.6, -6.46]], radius: 0.27, tone: 'deep', steps: true },
    // Tầng 3 — hơn 10 m: chống bom hạng nặng
    {
      points: [[-6.1, -6.5], [-3.0, -6.62], [0.2, -6.42], [3.2, -6.56], [6.3, -6.46]],
      radius: 0.3,
      tone: 'deep',
    },
  ]
}

const ERA_SCENES: Record<EraValue, EraScene> = {
  /* ---------------------------- 1948 ---------------------------- */
  1948: {
    label: '1948 · Khởi dựng địa đạo',
    caption: 'Các đoạn hầm rời rạc, chưa liên thông — Tân Phú Trung & Phước Vĩnh An',
    blockW: 13,
    blockH: 6.2,
    blockD: 5,
    earthTop: '#8a5c35',
    earthDeep: '#b3552c',
    grass: '#3f6b2a',
    accent: '#f0a868',
    ambient: '#6b5a44',
    keyLight: '#ffe6c2',
    fillLight: '#ffb976',
    tunnels: [
      // Đoạn hầm A — miệng hầm bí mật rồi bò ngang
      { points: [[-4.2, -0.14], [-4.38, -0.92], [-3.96, -1.6], [-1.62, -1.78]], radius: 0.23, steps: true },
      // Đoạn hầm B — hoàn toàn tách biệt với đoạn A
      { points: [[1.9, -0.14], [2.12, -1.0], [2.62, -1.9], [5.08, -2.04]], radius: 0.23, steps: true },
    ],
    chambers: [
      { x: -0.86, y: -1.78, w: 1.4, h: 0.82, label: 'Hầm ẩn nấp', kind: 'shelter' },
      { x: 5.84, y: -2.04, w: 1.32, h: 0.78, label: 'Cất giấu tài liệu, vũ khí', kind: 'store' },
    ],
    vents: [{ x: -3.3, yFrom: -1.78, kind: 'air' }],
    surface: [
      { type: 'tree', x: -5.6, z: -0.8, scale: 1.15 },
      { type: 'bamboo', x: -3.0, z: -1.4, scale: 1 },
      { type: 'tree', x: -1.2, z: -1.6, scale: 0.95 },
      { type: 'palm', x: 0.9, z: -0.6, scale: 1 },
      { type: 'tree', x: 3.4, z: -1.5, scale: 1.1 },
      { type: 'bamboo', x: 5.4, z: -0.9, scale: 0.9 },
      { type: 'bush', x: -2.2, z: 1.0, scale: 0.8 },
      { type: 'bush', x: 4.2, z: 1.1, scale: 0.7 },
      { type: 'hut', x: -2.4, z: 0.2, scale: 0.85 },
      { type: 'hut', x: 3.1, z: 0.4, scale: 0.7 },
      { type: 'hatch', x: -4.2, z: 1.3, scale: 1 },
      { type: 'hatch', x: 1.9, z: 1.3, scale: 1 },
      { type: 'person', x: -4.9, z: 1.3, scale: 0.6, color: '#8a6b3f' },
      { type: 'person', x: -3.5, z: 1.5, scale: 0.6, color: '#7d5f38' },
      { type: 'person', x: 1.2, z: 1.4, scale: 0.6, color: '#8a6b3f' },
    ],
    depthMarks: [
      { y: 0, text: '0 m' },
      { y: -1.85, text: '−3 m' },
      { y: -2.5, text: '−4 m' },
    ],
  },

  /* ---------------------------- 1968 ---------------------------- */
  1968: {
    label: '1968 · Thành phố ngầm 3 tầng',
    caption: 'Khoảng 250 km hầm liên hoàn — bàn đạp tiến công Tết Mậu Thân',
    blockW: 19.5,
    blockH: 9.8,
    blockD: 6,
    earthTop: '#6f4e2e',
    earthDeep: '#bb5527',
    grass: '#5d6330',
    accent: '#f3b14e',
    ambient: '#4e4335',
    keyLight: '#ffdfae',
    fillLight: '#ff9d52',
    tunnels: threeLevelNetwork(),
    chambers: [
      // Tầng 1 — 3 m
      { x: -8.25, y: D3, w: 1.5, h: 0.84, label: 'Ụ chiến đấu', kind: 'firing' },
      { x: -2.7, y: -2.72, w: 1.3, h: 0.72, label: 'Hầm chông', kind: 'trap', labelBelow: true },
      { x: 0.5, y: -1.84, w: 1.85, h: 0.82, label: 'Chỗ ngủ', kind: 'sleep' },
      // Tầng 2 — 6 m
      { x: -6.4, y: D6, w: 1.95, h: 1.08, label: 'Bếp Hoàng Cầm', kind: 'kitchen' },
      { x: -2.9, y: -4.0, w: 2.05, h: 1.08, label: 'Bệnh xá dã chiến', kind: 'clinic' },
      { x: 3.2, y: -3.96, w: 1.95, h: 1.04, label: 'Phòng họp chỉ huy', kind: 'meeting' },
      // Tầng 3 — hơn 10 m
      { x: -4.4, y: D10, w: 1.8, h: 1.0, label: 'Kho vũ khí', kind: 'store' },
      { x: 1.9, y: -6.5, w: 1.95, h: 1.0, label: 'Kho lương thực dự trữ', kind: 'store' },
    ],
    vents: [
      { x: -4.9, yFrom: -2.02, kind: 'air' },
      { x: 7.4, yFrom: -1.95, kind: 'air' },
      { x: -6.4, yFrom: D6 + 0.9, kind: 'smoke', outlets: [-7.6, -6.5, -5.4] },
      { x: 8.7, yFrom: 0, kind: 'well', yBottom: -6.46 },
    ],
    surface: [
      { type: 'burnt', x: -8.6, z: -1.2, scale: 1.15 },
      { type: 'burnt', x: -5.4, z: 0.6, scale: 0.95 },
      { type: 'palm', x: -2.0, z: -1.6, scale: 0.9 },
      { type: 'burnt', x: 0.4, z: -1.9, scale: 1.05 },
      { type: 'palm', x: 2.4, z: 1.0, scale: 0.85 },
      { type: 'burnt', x: 7.8, z: -1.4, scale: 1 },
      { type: 'bush', x: -3.4, z: 1.5, scale: 0.6 },
      { type: 'bush', x: 6.2, z: 1.4, scale: 0.6 },
      { type: 'crater', x: -3.9, z: -0.2, scale: 1.25 },
      { type: 'crater', x: 2.9, z: -0.9, scale: 1 },
      { type: 'crater', x: 6.6, z: 0.9, scale: 0.8 },
      { type: 'tank', x: 5.6, z: -1.5, scale: 1 },
      { type: 'hatch', x: -7.6, z: 1.4, scale: 1 },
      { type: 'hatch', x: 4.2, z: 1.4, scale: 1 },
      { type: 'person', x: -8.25, z: 1.5, scale: 0.6, color: '#4e5c35' },
      { type: 'person', x: -7.1, z: 1.0, scale: 0.6, color: '#4e5c35' },
    ],
    depthMarks: [
      { y: 0, text: '0 m' },
      { y: D3, text: '−3 m · tầng 1' },
      { y: D6, text: '−6 m · tầng 2' },
      { y: D10, text: '−10 m · tầng 3' },
    ],
  },

  /* ---------------------------- 1975 ---------------------------- */
  1975: {
    label: '1975 · Hoàn thành sứ mệnh',
    caption: 'Hệ thống 250 km được củng cố — hậu cứ của "Đất thép thành đồng"',
    blockW: 19.5,
    blockH: 9.8,
    blockD: 6,
    earthTop: '#7a5633',
    earthDeep: '#b85c30',
    grass: '#4e7a2e',
    accent: '#fbbf4a',
    ambient: '#5a5240',
    keyLight: '#ffeec9',
    fillLight: '#ffc073',
    tunnels: threeLevelNetwork(),
    chambers: [
      { x: -8.25, y: D3, w: 1.5, h: 0.84, label: 'Ụ chiến đấu', kind: 'firing' },
      { x: 0.5, y: -1.84, w: 1.85, h: 0.82, label: 'Chỗ ngủ', kind: 'sleep' },
      { x: -6.4, y: D6, w: 1.95, h: 1.08, label: 'Bếp Hoàng Cầm', kind: 'kitchen' },
      { x: -2.9, y: -4.0, w: 2.05, h: 1.08, label: 'Trạm quân y', kind: 'clinic' },
      { x: 3.2, y: -3.96, w: 1.95, h: 1.04, label: 'Phòng họp chỉ huy', kind: 'meeting' },
      { x: -4.4, y: D10, w: 1.8, h: 1.0, label: 'Kho dự trữ', kind: 'store' },
      { x: 1.9, y: -6.5, w: 1.95, h: 1.0, label: 'Hành lang bảo vệ lực lượng', kind: 'shelter' },
    ],
    vents: [
      { x: -4.9, yFrom: -2.02, kind: 'air' },
      { x: 7.4, yFrom: -1.95, kind: 'air' },
      { x: -6.4, yFrom: D6 + 0.9, kind: 'smoke', outlets: [-7.6, -6.5, -5.4] },
      { x: 8.7, yFrom: 0, kind: 'well', yBottom: -6.46 },
    ],
    surface: [
      { type: 'burnt', x: -8.6, z: -1.3, scale: 0.9 },
      { type: 'tree', x: -6.3, z: -1.5, scale: 0.8 },
      { type: 'tree', x: -3.6, z: 0.8, scale: 0.95 },
      { type: 'palm', x: -1.4, z: -1.6, scale: 1 },
      { type: 'tree', x: 1.6, z: -1.7, scale: 0.9 },
      { type: 'burnt', x: 3.6, z: 0.9, scale: 0.75 },
      { type: 'palm', x: 6.4, z: -1.4, scale: 1 },
      { type: 'tree', x: 8.4, z: 0.6, scale: 0.85 },
      { type: 'bush', x: -5.0, z: 1.4, scale: 0.7 },
      { type: 'bush', x: 2.6, z: 1.5, scale: 0.7 },
      { type: 'crater', x: -2.4, z: -0.4, scale: 0.85 },
      { type: 'flag', x: 0.2, z: 0.9, scale: 1.1 },
      { type: 'tank', x: 7.0, z: -1.9, scale: 0.9, color: '#3c4034' },
      { type: 'hatch', x: 4.2, z: 1.4, scale: 1 },
      { type: 'person', x: 4.2, z: 1.9, scale: 0.62, color: '#5b6b3c' },
      { type: 'person', x: 5.1, z: 1.6, scale: 0.62, color: '#6b5f3c' },
      { type: 'person', x: -7.4, z: 1.4, scale: 0.6, color: '#5b6b3c' },
    ],
    depthMarks: [
      { y: 0, text: '0 m' },
      { y: D3, text: '−3 m · tầng 1' },
      { y: D6, text: '−6 m · tầng 2' },
      { y: D10, text: '−10 m · tầng 3' },
    ],
  },

  /* ---------------------------- 2026 ---------------------------- */
  2026: {
    label: '2026 · Di sản sống',
    caption: 'Di tích quốc gia đặc biệt — hơn 2 triệu lượt khách mỗi năm',
    blockW: 19.5,
    blockH: 9.8,
    blockD: 6,
    earthTop: '#7c5a38',
    earthDeep: '#b26038',
    grass: '#3f7c2f',
    accent: '#2dd4bf',
    ambient: '#5d6a66',
    keyLight: '#ffffff',
    fillLight: '#ffd9a0',
    walkway: true,
    tunnels: [
      // Đoạn hầm mở rộng phục vụ tham quan — rộng hơn, có đèn
      { points: [[-7.6, -0.14], [-7.8, -0.9], [-7.4, -1.5], [-6.9, -1.8]], radius: 0.3, tone: 'demo', steps: true },
      {
        points: [[-7.0, -1.84], [-4.0, -1.98], [-1.0, -1.8], [2.0, -1.96], [5.0, -1.82], [5.6, -1.6], [5.9, -0.9], [6.0, -0.14]],
        radius: 0.45,
        tone: 'demo',
        steps: true,
      },
      // Các tầng sâu — giữ nguyên trạng, bảo tồn
      { points: [[-6.2, -1.9], [-6.66, -2.6], [-6.26, -3.38], [-5.9, -3.9]], radius: 0.26, tone: 'ghost' },
      {
        points: [[-7.7, -3.92], [-4.5, -4.06], [-1.2, -3.86], [1.8, -4.02], [5.0, -3.9], [8.0, -4.0]],
        radius: 0.3,
        tone: 'ghost',
      },
      { points: [[-1.2, -3.86], [-1.92, -4.78], [-1.44, -5.68], [-1.0, -6.42]], radius: 0.26, tone: 'ghost' },
      {
        points: [[-6.1, -6.5], [-3.0, -6.62], [0.2, -6.42], [3.2, -6.56], [6.3, -6.46]],
        radius: 0.28,
        tone: 'ghost',
      },
    ],
    chambers: [
      { x: -2.2, y: -1.86, w: 2.3, h: 0.95, label: 'Đoạn hầm mở rộng cho khách', kind: 'display' },
      { x: 3.4, y: -1.9, w: 1.8, h: 0.88, label: 'Hầm trưng bày hiện vật', kind: 'display' },
      { x: -6.4, y: D6, w: 1.95, h: 1.08, label: 'Bếp Hoàng Cầm (phục dựng)', kind: 'kitchen' },
      { x: 3.2, y: -3.96, w: 1.95, h: 1.04, label: 'Phòng họp (nguyên trạng)', kind: 'meeting' },
      { x: 1.9, y: -6.5, w: 1.95, h: 1.0, label: 'Tầng sâu — bảo tồn nguyên trạng', kind: 'store' },
    ],
    vents: [
      { x: -4.9, yFrom: -2.02, kind: 'air' },
      { x: 8.0, yFrom: 0, kind: 'well', yBottom: -4.0 },
    ],
    surface: [
      { type: 'tree', x: -8.6, z: -1.4, scale: 1.2 },
      { type: 'palm', x: -6.2, z: -1.7, scale: 1.05 },
      { type: 'tree', x: -3.8, z: -1.8, scale: 1.1 },
      { type: 'bamboo', x: -1.0, z: -1.9, scale: 1 },
      { type: 'tree', x: 1.8, z: -1.8, scale: 1.15 },
      { type: 'palm', x: 4.6, z: -1.9, scale: 1 },
      { type: 'tree', x: 7.6, z: -1.5, scale: 1.1 },
      { type: 'bush', x: -5.0, z: -0.6, scale: 0.8 },
      { type: 'bush', x: 2.8, z: -0.7, scale: 0.75 },
      { type: 'pavilion', x: -7.4, z: 1.2, scale: 1 },
      { type: 'sign', x: -3.0, z: 1.9, scale: 1 },
      { type: 'sign', x: 2.2, z: 1.9, scale: 1 },
      { type: 'lamp', x: -0.4, z: 1.1, scale: 1 },
      { type: 'lamp', x: 5.4, z: 1.1, scale: 1 },
      { type: 'hatch', x: -7.6, z: 1.8, scale: 1 },
      { type: 'person', x: -5.6, z: 1.7, scale: 0.6, color: '#2dd4bf' },
      { type: 'person', x: -4.6, z: 2.0, scale: 0.6, color: '#f5b544' },
      { type: 'person', x: 0.8, z: 1.8, scale: 0.6, color: '#7dd3fc' },
      { type: 'person', x: 1.7, z: 2.1, scale: 0.6, color: '#f87171' },
      { type: 'person', x: 6.0, z: 1.8, scale: 0.6, color: '#a3e635' },
    ],
    depthMarks: [
      { y: 0, text: '0 m' },
      { y: -1.88, text: '−3 m · hầm tham quan' },
      { y: D6, text: '−6 m · bảo tồn' },
      { y: D10, text: '−10 m · bảo tồn' },
    ],
  },
}

/* ------------------------------------------------------------------ */
/*  Tiện ích                                                           */
/* ------------------------------------------------------------------ */

const TUNNEL_TONES: Record<TunnelTone, { color: string; emissive: string; opacity: number }> = {
  main: { color: '#e3bd8d', emissive: '#4a2f17', opacity: 1 },
  deep: { color: '#d3a877', emissive: '#3d2512', opacity: 1 },
  demo: { color: '#f3d8aa', emissive: '#6a4a22', opacity: 1 },
  ghost: { color: '#b7a08b', emissive: '#2a2018', opacity: 0.42 },
  trap: { color: '#bb835a', emissive: '#331c0d', opacity: 1 },
}

function std(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.9, metalness: 0, ...opts })
}

function roundRectPath(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.lineTo(x + w - r, y)
  c.quadraticCurveTo(x + w, y, x + w, y + r)
  c.lineTo(x + w, y + h - r)
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  c.lineTo(x + r, y + h)
  c.quadraticCurveTo(x, y + h, x, y + h - r)
  c.lineTo(x, y + r)
  c.quadraticCurveTo(x, y, x + r, y)
  c.closePath()
}

const LABEL_FONT = '600 30px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'

function makeLabel(text: string, accent: string, scale = 0.0118): THREE.Sprite {
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = LABEL_FONT
  const textW = Math.ceil(probe.measureText(text).width)

  const padX = 14
  const dot = 18
  const w = textW + padX * 2 + dot
  const h = 52
  const dpr = 2

  const canvas = document.createElement('canvas')
  canvas.width = w * dpr
  canvas.height = h * dpr
  const c = canvas.getContext('2d')!
  c.scale(dpr, dpr)

  c.fillStyle = 'rgba(14,11,8,0.86)'
  roundRectPath(c, 1, 1, w - 2, h - 2, 9)
  c.fill()
  c.strokeStyle = accent
  c.globalAlpha = 0.75
  c.lineWidth = 1.5
  c.stroke()
  c.globalAlpha = 1

  c.fillStyle = accent
  c.beginPath()
  c.arc(padX + 4, h / 2, 4.5, 0, Math.PI * 2)
  c.fill()

  c.font = LABEL_FONT
  c.textBaseline = 'middle'
  c.fillStyle = '#f6ecdb'
  c.fillText(text, padX + dot, h / 2 + 1)

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.minFilter = THREE.LinearFilter
  tex.generateMipmaps = false

  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
  sprite.scale.set(w * scale, h * scale, 1)
  sprite.renderOrder = 30
  return sprite
}

function makeFlagTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 86
  const c = canvas.getContext('2d')!
  c.fillStyle = '#da251d'
  c.fillRect(0, 0, 128, 86)
  c.fillStyle = '#ffff00'
  c.beginPath()
  const cx = 64
  const cy = 43
  const R = 26
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * 0.42
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const px = cx + Math.cos(a) * r
    const py = cy + Math.sin(a) * r
    if (i === 0) c.moveTo(px, py)
    else c.lineTo(px, py)
  }
  c.closePath()
  c.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ------------------------------------------------------------------ */
/*  Khối đất + mặt cắt                                                 */
/* ------------------------------------------------------------------ */

function makeEarthBlock(s: EraScene): THREE.Group {
  const g = new THREE.Group()
  const { blockW: W, blockH: H, blockD: Dp } = s

  // Thân khối đất — gradient đất mặt → đá ong đỏ theo chiều sâu
  const geo = new THREE.BoxGeometry(W, H, Dp, 1, 16, 1)
  geo.translate(0, -H / 2, 0)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const top = new THREE.Color(s.earthTop)
  const deep = new THREE.Color(s.earthDeep)
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const t = Math.min(1, Math.max(0, -pos.getY(i) / (H * 0.55)))
    tmp.copy(top).lerp(deep, t)
    // vân đất nhẹ
    const n = 0.94 + 0.12 * Math.abs(Math.sin(pos.getX(i) * 2.3 + pos.getY(i) * 3.7))
    colors[i * 3] = tmp.r * n
    colors[i * 3 + 1] = tmp.g * n
    colors[i * 3 + 2] = tmp.b * n
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const earth = new THREE.Mesh(geo, std('#ffffff', { vertexColors: true, roughness: 1 }))
  g.add(earth)

  // Lớp đất mặt / thảm cỏ
  const grass = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.04, 0.34, Dp + 0.04),
    std(s.grass, { roughness: 1, flatShading: true }),
  )
  grass.position.y = -0.1
  g.add(grass)

  // Gờ mặt cắt (viền sáng cho mặt tiền)
  const rim = new THREE.Mesh(
    new THREE.BoxGeometry(W + 0.06, 0.1, 0.1),
    std('#f0cfa0', { emissive: '#6b4a24', emissiveIntensity: 0.4 }),
  )
  rim.position.set(0, 0.09, Dp / 2 + 0.02)
  g.add(rim)

  // Vài gò đất nhấp nhô trên bề mặt
  for (let i = 0; i < 5; i++) {
    const r = 0.7 + (i % 3) * 0.35
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      std(s.grass, { roughness: 1, flatShading: true }),
    )
    mound.scale.y = 0.16
    mound.position.set((i - 2) * (W / 5.5) + 0.6, 0.05, -Dp / 2 + 0.9 + (i % 2) * 1.1)
    g.add(mound)
  }

  return g
}

function makeWalkway(s: EraScene): THREE.Mesh {
  const path = new THREE.Mesh(
    new THREE.BoxGeometry(s.blockW - 1.6, 0.08, 0.85),
    std('#d6cbb4', { roughness: 0.95 }),
  )
  path.position.set(0, 0.11, s.blockD / 2 - 1.2)
  return path
}

/* ------------------------------------------------------------------ */
/*  Đường hầm (phù điêu trên mặt cắt)                                  */
/* ------------------------------------------------------------------ */

function makeTunnel(path: TunnelPath, s: EraScene): THREE.Group {
  const g = new THREE.Group()
  const r = path.radius ?? 0.3
  const tone = TUNNEL_TONES[path.tone ?? 'main']
  const zf = s.blockD / 2 - r * 0.34

  const pts = path.points.map(([x, y]) => new THREE.Vector3(x, y, zf))
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.12)
  const seg = Math.max(28, path.points.length * 12)

  // Bóng đổ của lòng hầm trong đất
  const shadow = new THREE.Mesh(
    new THREE.TubeGeometry(curve, seg, r * 1.3, 12, false),
    std('#7d3317', { roughness: 1, transparent: tone.opacity < 1, opacity: tone.opacity }),
  )
  shadow.position.z = -0.14
  g.add(shadow)

  // Lòng hầm
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, seg, r, 16, false),
    std(tone.color, {
      roughness: 0.82,
      emissive: new THREE.Color(tone.emissive),
      emissiveIntensity: path.tone === 'demo' ? 0.55 : 0.28,
      transparent: tone.opacity < 1,
      opacity: tone.opacity,
    }),
  )
  g.add(tube)

  // Bịt hai đầu ống
  const capGeo = new THREE.SphereGeometry(r, 14, 10)
  for (const p of [pts[0], pts[pts.length - 1]]) {
    const cap = new THREE.Mesh(
      capGeo.clone(),
      std(tone.color, { roughness: 0.85, transparent: tone.opacity < 1, opacity: tone.opacity }),
    )
    cap.position.copy(p)
    g.add(cap)
  }
  capGeo.dispose()

  // Bậc thang trên đoạn dốc
  if (path.steps) {
    const stepMat = std('#a9743f', { roughness: 1 })
    for (let i = 0; i < path.points.length - 1; i++) {
      const [x1, y1] = path.points[i]
      const [x2, y2] = path.points[i + 1]
      const dx = x2 - x1
      const dy = y2 - y1
      if (Math.abs(dy) < 0.45) continue
      const n = Math.max(3, Math.round(Math.abs(dy) / 0.2))
      const ang = Math.atan2(dy, dx)
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, r * 1.5), stepMat)
        step.position.set(x1 + dx * t, y1 + dy * t - r * 0.4, zf + r * 0.25)
        step.rotation.z = ang
        g.add(step)
      }
    }
  }

  // Đèn chiếu sáng trong đoạn hầm tham quan
  if (path.tone === 'demo' && path.points.length > 4) {
    const bulbMat = std('#fff3c4', { emissive: '#ffd27a', emissiveIntensity: 1.4 })
    for (let k = 1; k < path.points.length - 1; k += 2) {
      const [x, y] = path.points[k]
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), bulbMat)
      bulb.position.set(x, y + r * 0.72, zf + r * 0.45)
      g.add(bulb)
    }
  }

  return g
}

/* ------------------------------------------------------------------ */
/*  Hầm phòng chức năng (hốc âm vào mặt cắt, có khung gỗ)              */
/* ------------------------------------------------------------------ */

function chamberProps(kind: ChamberKind, w: number, h: number): THREE.Group {
  const g = new THREE.Group()
  const wood = std('#6d4a28', { roughness: 1 })
  const metal = std('#5d6b50', { roughness: 0.65, metalness: 0.25 })
  const cloth = std('#b7b19c', { roughness: 1 })

  switch (kind) {
    case 'kitchen': {
      const stove = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, h * 0.3, 0.3), std('#4d3a2a', { roughness: 1 }))
      stove.position.set(-w * 0.22, -h * 0.34, 0)
      g.add(stove)
      const fire = new THREE.Mesh(
        new THREE.SphereGeometry(h * 0.1, 8, 6),
        std('#ff8a3d', { emissive: '#ff6a1a', emissiveIntensity: 1.6 }),
      )
      fire.position.set(-w * 0.22, -h * 0.24, 0.05)
      g.add(fire)
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(h * 0.14, h * 0.11, h * 0.18, 10), metal)
      pot.position.set(-w * 0.22, -h * 0.12, 0)
      g.add(pot)
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.05, 0.22), wood)
      shelf.position.set(w * 0.22, 0, 0)
      g.add(shelf)
      for (let i = 0; i < 3; i++) {
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 8), cloth)
        jar.position.set(w * 0.08 + i * 0.14, 0.1, 0)
        g.add(jar)
      }
      break
    }
    case 'clinic': {
      for (let i = 0; i < 2; i++) {
        const bed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.07, 0.26), wood)
        bed.position.set(-w * 0.22 + i * w * 0.44, -h * 0.26 + i * 0.05, 0)
        g.add(bed)
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, w * 0.2, 4, 8), cloth)
        body.rotation.z = Math.PI / 2
        body.position.set(-w * 0.22 + i * w * 0.44, -h * 0.26 + i * 0.05 + 0.1, 0)
        g.add(body)
      }
      // máy phát điện đạp xe
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(h * 0.16, 0.025, 6, 14), metal)
      wheel.position.set(w * 0.34, -h * 0.1, 0)
      g.add(wheel)
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 6),
        std('#fff1b8', { emissive: '#ffe08a', emissiveIntensity: 1.5 }),
      )
      lamp.position.set(0, h * 0.3, 0.05)
      g.add(lamp)
      break
    }
    case 'store': {
      const crate = new THREE.BoxGeometry(w * 0.2, h * 0.18, 0.24)
      for (let i = 0; i < 6; i++) {
        const box = new THREE.Mesh(crate.clone(), i % 2 ? std('#4f5b3c', { roughness: 1 }) : wood)
        box.position.set(-w * 0.3 + (i % 3) * w * 0.3, -h * 0.34 + Math.floor(i / 3) * h * 0.2, 0)
        g.add(box)
      }
      crate.dispose()
      break
    }
    case 'meeting': {
      const table = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.06, 0.3), wood)
      table.position.set(0, -h * 0.16, 0)
      g.add(table)
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, h * 0.18, 0.05), wood)
      leg.position.set(0, -h * 0.3, 0)
      g.add(leg)
      for (let i = 0; i < 3; i++) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 8), wood)
        stool.position.set(-w * 0.26 + i * w * 0.26, -h * 0.34, 0.12)
        g.add(stool)
      }
      const map = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.3, h * 0.28), std('#d8cfb4', { roughness: 1 }))
      map.position.set(0, h * 0.22, -0.3)
      g.add(map)
      break
    }
    case 'sleep': {
      for (let i = 0; i < 2; i++) {
        const bunk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, 0.06, 0.28), wood)
        bunk.position.set(0, -h * 0.3 + i * h * 0.34, 0)
        g.add(bunk)
        const roll = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, w * 0.4, 4, 8), cloth)
        roll.rotation.z = Math.PI / 2
        roll.position.set(0, -h * 0.3 + i * h * 0.34 + 0.09, 0)
        g.add(roll)
      }
      break
    }
    case 'firing': {
      // lỗ châu mai + bao cát
      const slot = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, h * 0.16, 0.12), std('#1a1208', { roughness: 1 }))
      slot.position.set(0, h * 0.2, -0.28)
      g.add(slot)
      for (let i = 0; i < 4; i++) {
        const bag = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.14, 4, 8), std('#8a7b58', { roughness: 1 }))
        bag.rotation.z = Math.PI / 2
        bag.position.set(-w * 0.24 + (i % 2) * w * 0.34, -h * 0.34 + Math.floor(i / 2) * 0.15, 0.06)
        g.add(bag)
      }
      const rifle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.04, 0.04), std('#30271a', { roughness: 0.8 }))
      rifle.rotation.z = -0.18
      rifle.position.set(0, h * 0.02, 0.1)
      g.add(rifle)
      break
    }
    case 'trap': {
      // hầm chông — cọc nhọn hướng lên
      for (let i = 0; i < 7; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, h * 0.5, 5), std('#3d2a16', { roughness: 1 }))
        spike.position.set(-w * 0.34 + (i * w * 0.68) / 6, -h * 0.18, (i % 2) * 0.16 - 0.08)
        g.add(spike)
      }
      break
    }
    case 'shelter': {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 0.06, 0.26), wood)
      bench.position.set(0, -h * 0.28, 0)
      g.add(bench)
      const bundle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.22, h * 0.2, 0.2), cloth)
      bundle.position.set(w * 0.26, -h * 0.2, 0)
      g.add(bundle)
      break
    }
    case 'display': {
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(w * 0.26, h * 0.3, 0.24), std('#4a4a46', { roughness: 0.8 }))
      plinth.position.set(-w * 0.26, -h * 0.3, 0)
      g.add(plinth)
      const relic = new THREE.Mesh(new THREE.BoxGeometry(w * 0.16, 0.08, 0.14), std('#7e8a6b', { metalness: 0.4 }))
      relic.position.set(-w * 0.26, -h * 0.1, 0)
      g.add(relic)
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.4, h * 0.34), std('#0d9488', { roughness: 0.7 }))
      panel.position.set(w * 0.24, h * 0.04, -0.3)
      g.add(panel)
      const spot = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 6),
        std('#e9fffb', { emissive: '#8fe8db', emissiveIntensity: 1.6 }),
      )
      spot.position.set(0, h * 0.36, 0.05)
      g.add(spot)
      break
    }
  }
  return g
}

function makeChamber(c: Chamber, s: EraScene): THREE.Group {
  const g = new THREE.Group()
  const zFace = s.blockD / 2
  const depth = 0.95
  const cy = c.y + c.h / 2

  // Lòng hầm: hộp render mặt trong → trông như hốc âm vào vách đất
  const room = new THREE.Mesh(
    new THREE.BoxGeometry(c.w, c.h, depth),
    std('#5d3820', { side: THREE.BackSide, roughness: 1 }),
  )
  room.position.set(c.x, cy, zFace - depth / 2 + 0.02)
  g.add(room)

  // Nền hầm sáng hơn
  const floor = new THREE.Mesh(new THREE.BoxGeometry(c.w, 0.06, depth * 0.95), std('#c9a071', { roughness: 1 }))
  floor.position.set(c.x, c.y + 0.03, zFace - depth / 2)
  g.add(floor)

  // Khung gỗ chống đỡ miệng hầm — như trong sa bàn
  const beamMat = std('#5a3d20', { roughness: 1, flatShading: true })
  const nBeams = Math.max(4, Math.round(c.w / 0.22))
  for (let i = 0; i < nBeams; i++) {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, depth * 0.9, 6), beamMat)
    beam.rotation.x = Math.PI / 2
    beam.position.set(c.x - c.w / 2 + 0.08 + (i * (c.w - 0.16)) / (nBeams - 1), c.y + c.h + 0.05, zFace - depth / 2)
    g.add(beam)
  }
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, c.h + 0.12, 6), beamMat)
    post.position.set(c.x + (sx * c.w) / 2, cy + 0.03, zFace - 0.12)
    g.add(post)
  }

  // Đồ đạc bên trong
  const props = chamberProps(c.kind, c.w, c.h)
  props.position.set(c.x, cy, zFace - depth * 0.55)
  g.add(props)

  // Nhãn
  const label = makeLabel(c.label, s.accent)
  const ly = c.labelBelow ? c.y - 0.34 : c.y + c.h + 0.38
  label.position.set(c.x, ly, zFace + 0.5)
  g.add(label)

  return g
}

/* ------------------------------------------------------------------ */
/*  Lỗ thông hơi · ống khói bếp Hoàng Cầm · giếng nước                 */
/* ------------------------------------------------------------------ */

function makeVent(v: Vent, s: EraScene): THREE.Group {
  const g = new THREE.Group()
  const zFace = s.blockD / 2

  if (v.kind === 'well') {
    const yB = v.yBottom ?? -5
    const z = zFace - 0.28
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, Math.abs(yB), 14, 1, true),
      std('#8d5c33', { side: THREE.DoubleSide, roughness: 1 }),
    )
    shaft.position.set(v.x, yB / 2, z)
    g.add(shaft)
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.5, 14),
      std('#2b7f9e', { roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.82 }),
    )
    water.position.set(v.x, yB + 0.25, z)
    g.add(water)
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 6, 16), std('#6b4a2a', { roughness: 1 }))
    ring.rotation.x = Math.PI / 2
    ring.position.set(v.x, 0.14, z)
    g.add(ring)
    const label = makeLabel('Giếng nước', s.accent, 0.0105)
    label.position.set(v.x, 0.75, zFace + 0.5)
    g.add(label)
    return g
  }

  if (v.kind === 'smoke') {
    // Bếp Hoàng Cầm: khói được dẫn đi xa rồi toả ra nhiều miệng nhỏ
    const outlets = v.outlets ?? [v.x]
    const pipeMat = std('#6f4d2c', { roughness: 1 })
    for (const ox of outlets) {
      const pts = [
        new THREE.Vector3(v.x, v.yFrom, zFace - 0.4),
        new THREE.Vector3((v.x + ox) / 2, v.yFrom + 0.55, zFace - 0.4),
        new THREE.Vector3(ox, -0.6, zFace - 0.4),
        new THREE.Vector3(ox, -0.05, zFace - 0.4),
      ]
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2)
      g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.065, 8, false), pipeMat))
      const mound = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 7), std('#7d6a44', { flatShading: true }))
      mound.position.set(ox, 0.18, zFace - 0.4)
      g.add(mound)
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 8, 6),
        std('#cfc8bb', { transparent: true, opacity: 0.35 }),
      )
      smoke.position.set(ox, 0.5, zFace - 0.4)
      g.add(smoke)
    }
    const label = makeLabel('Ống dẫn khói toả xa', s.accent, 0.0105)
    label.position.set((outlets[0] + outlets[outlets.length - 1]) / 2, 1.0, zFace + 0.5)
    g.add(label)
    return g
  }

  // Ống thông hơi — nguỵ trang như ụ mối
  const z = zFace - 0.35
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, Math.abs(v.yFrom), 10),
    std('#6f4d2c', { roughness: 1 }),
  )
  tube.position.set(v.x, v.yFrom / 2, z)
  g.add(tube)
  const mound = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.38, 8), std('#7a6342', { flatShading: true, roughness: 1 }))
  mound.position.set(v.x, 0.22, z)
  g.add(mound)
  const label = makeLabel('Lỗ thông hơi', s.accent, 0.0105)
  label.position.set(v.x, 0.78, zFace + 0.5)
  g.add(label)
  return g
}

/* ------------------------------------------------------------------ */
/*  Vật thể trên mặt đất                                               */
/* ------------------------------------------------------------------ */

function makeSurfaceObj(o: SurfaceObj): THREE.Group {
  const g = new THREE.Group()
  const sc = o.scale ?? 1

  switch (o.type) {
    case 'tree': {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.95, 7), std('#5b4027', { roughness: 1 }))
      trunk.position.y = 0.47
      g.add(trunk)
      const leaf = std(o.color ?? '#2f7a2b', { flatShading: true, roughness: 1 })
      for (let i = 0; i < 3; i++) {
        const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34 - i * 0.06, 0), leaf)
        blob.position.set((i - 1) * 0.22, 1.05 + i * 0.2, (i % 2) * 0.16 - 0.08)
        g.add(blob)
      }
      break
    }
    case 'palm': {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.09, 1.25, 7), std('#6d5433', { roughness: 1 }))
      trunk.position.y = 0.62
      trunk.rotation.z = 0.06
      g.add(trunk)
      const frondMat = std('#2f8a3a', { flatShading: true, side: THREE.DoubleSide, roughness: 1 })
      for (let i = 0; i < 7; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.72, 4), frondMat)
        const a = (i / 7) * Math.PI * 2
        frond.position.set(Math.cos(a) * 0.3, 1.32, Math.sin(a) * 0.3)
        frond.rotation.set(Math.sin(a) * 1.15, -a, Math.cos(a) * 1.15 + Math.PI)
        frond.scale.set(1, 1, 0.3)
        g.add(frond)
      }
      break
    }
    case 'bamboo': {
      const stalk = std('#6f8f3a', { roughness: 1 })
      for (let i = 0; i < 4; i++) {
        const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5 - i * 0.18, 6), stalk)
        cane.position.set((i - 1.5) * 0.14, (1.5 - i * 0.18) / 2, (i % 2) * 0.14)
        cane.rotation.z = (i - 1.5) * 0.05
        g.add(cane)
        const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), std('#4f9140', { flatShading: true }))
        leaf.position.set((i - 1.5) * 0.18, 1.5 - i * 0.18, (i % 2) * 0.14)
        g.add(leaf)
      }
      break
    }
    case 'burnt': {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 1.05, 6), std('#3b2f24', { roughness: 1 }))
      trunk.position.y = 0.52
      trunk.rotation.z = 0.1
      g.add(trunk)
      for (let i = 0; i < 2; i++) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.5, 5), std('#3b2f24', { roughness: 1 }))
        br.position.set(i ? 0.18 : -0.16, 0.92, 0)
        br.rotation.z = i ? -0.9 : 0.85
        g.add(br)
      }
      break
    }
    case 'bush': {
      const m = std(o.color ?? '#3a7a30', { flatShading: true, roughness: 1 })
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 - i * 0.03, 0), m)
        b.position.set((i - 1) * 0.16, 0.14 + (i % 2) * 0.08, (i % 2) * 0.12)
        g.add(b)
      }
      break
    }
    case 'hut': {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.8), std('#9c7c4c', { roughness: 1 }))
      wall.position.y = 0.25
      g.add(wall)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.52, 4), std('#7d6539', { flatShading: true, roughness: 1 }))
      roof.position.y = 0.76
      roof.rotation.y = Math.PI / 4
      g.add(roof)
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.32, 0.03), std('#3e2f1d'))
      door.position.set(0, 0.16, 0.41)
      g.add(door)
      break
    }
    case 'flag': {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.7, 6), std('#c8c2b4', { metalness: 0.3 }))
      pole.position.y = 0.85
      g.add(pole)
      const flag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.72, 0.48, 8, 1),
        new THREE.MeshStandardMaterial({ map: makeFlagTexture(), side: THREE.DoubleSide, roughness: 0.85 }),
      )
      flag.position.set(0.37, 1.44, 0)
      flag.userData.isFlag = true
      g.add(flag)
      break
    }
    case 'tank': {
      const body = o.color ?? '#48522f'
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.52, 1.1), std(body, { roughness: 0.7, metalness: 0.25 }))
      hull.position.y = 0.42
      g.add(hull)
      const front = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 1.1), std(body, { roughness: 0.7, metalness: 0.25 }))
      front.position.set(0.82, 0.38, 0)
      front.rotation.z = -0.42
      g.add(front)
      const cupola = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.5), std(body, { roughness: 0.7, metalness: 0.25 }))
      cupola.position.set(-0.2, 0.8, 0)
      g.add(cupola)
      for (const sz of [-1, 1]) {
        const track = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.3, 0.2), std('#24241f', { roughness: 1 }))
        track.position.set(0, 0.17, sz * 0.52)
        g.add(track)
      }
      break
    }
    case 'person': {
      const col = o.color ?? '#5b6b3c'
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.3, 4, 8), std(col, { roughness: 1 }))
      body.position.y = 0.3
      g.add(body)
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), std('#c99b6e', { roughness: 1 }))
      head.position.y = 0.58
      g.add(head)
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.13, 10), std('#d8c48a', { flatShading: true, roughness: 1 }))
      hat.position.y = 0.68
      g.add(hat)
      break
    }
    case 'hatch': {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.42), std('#6b4a2a', { roughness: 1 }))
      rim.position.y = 0.04
      g.add(rim)
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.36), std('#4d3a22', { roughness: 1 }))
      lid.position.set(0.1, 0.2, -0.08)
      lid.rotation.z = -0.65
      g.add(lid)
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), std('#3f6b2a', { flatShading: true }))
      leaves.position.set(-0.18, 0.1, 0.14)
      g.add(leaves)
      break
    }
    case 'crater': {
      const bowl = new THREE.Mesh(
        new THREE.SphereGeometry(0.72, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        std('#6e4a2a', { side: THREE.DoubleSide, roughness: 1, flatShading: true }),
      )
      bowl.rotation.x = Math.PI
      bowl.scale.y = 0.42
      bowl.position.y = 0.12
      g.add(bowl)
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.1, 6, 18), std('#7d5833', { roughness: 1 }))
      rim.rotation.x = Math.PI / 2
      rim.position.y = 0.1
      g.add(rim)
      break
    }
    case 'sign': {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.6, 6), std('#7a6a52'))
      post.position.y = 0.3
      g.add(post)
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.04), std('#0d9488', { roughness: 0.7 }))
      board.position.y = 0.72
      board.rotation.x = -0.25
      g.add(board)
      break
    }
    case 'pavilion': {
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.5, 4), std('#a0522d', { flatShading: true, roughness: 1 }))
      roof.position.y = 1.0
      roof.rotation.y = Math.PI / 4
      g.add(roof)
      for (const [px, pz] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.78, 6), std('#6d4a28'))
        post.position.set(px, 0.39, pz)
        g.add(post)
      }
      break
    }
    case 'lamp': {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.82, 6), std('#4a4a46', { metalness: 0.3 }))
      post.position.y = 0.41
      g.add(post)
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 10, 8),
        std('#fff6d8', { emissive: '#ffe9a8', emissiveIntensity: 1.3 }),
      )
      head.position.y = 0.88
      g.add(head)
      break
    }
  }

  g.scale.setScalar(sc)
  g.position.set(o.x, 0.07, o.z)
  return g
}

/* ------------------------------------------------------------------ */
/*  Thước đo độ sâu                                                    */
/* ------------------------------------------------------------------ */

function makeDepthScale(s: EraScene): THREE.Group {
  const g = new THREE.Group()
  const x = -s.blockW / 2 - 0.28
  const zFace = s.blockD / 2

  const axis = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, s.blockH * 0.82, 6),
    std('#e6d2b0', { emissive: '#7a6038', emissiveIntensity: 0.4 }),
  )
  axis.position.set(x, -s.blockH * 0.41, zFace)
  g.add(axis)

  for (const m of s.depthMarks) {
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.025, 0.025), std('#e6d2b0'))
    tick.position.set(x + 0.15, m.y, zFace)
    g.add(tick)
    const label = makeLabel(m.text, s.accent, 0.0098)
    label.position.set(x - label.scale.x / 2 - 0.1, m.y, zFace)
    g.add(label)
  }
  return g
}

/* ------------------------------------------------------------------ */
/*  Dựng toàn cảnh                                                     */
/* ------------------------------------------------------------------ */

function buildScene(s: EraScene): THREE.Group {
  const root = new THREE.Group()

  root.add(makeEarthBlock(s))
  if (s.walkway) root.add(makeWalkway(s))

  for (const t of s.tunnels) root.add(makeTunnel(t, s))
  for (const c of s.chambers) root.add(makeChamber(c, s))
  for (const v of s.vents) root.add(makeVent(v, s))
  for (const o of s.surface) root.add(makeSurfaceObj(o))
  root.add(makeDepthScale(s))

  // Tiêu đề + chú thích nổi phía trên khối
  const title = makeLabel(s.label, s.accent, 0.016)
  title.position.set(0, 2.5, s.blockD / 2 + 0.6)
  root.add(title)
  const caption = makeLabel(s.caption, '#cbbfa8', 0.0098)
  caption.position.set(0, 2.05, s.blockD / 2 + 0.6)
  root.add(caption)

  // Canh tâm theo chiều dọc để khung hình cân đối
  root.position.y = s.blockH * 0.38
  return root
}

function disposeGroup(obj: THREE.Object3D) {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh & { material?: THREE.Material | THREE.Material[] }
    if (mesh.geometry) mesh.geometry.dispose()
    const mat = mesh.material
    if (!mat) return
    const list = Array.isArray(mat) ? mat : [mat]
    for (const m of list) {
      const anyMat = m as THREE.Material & { map?: THREE.Texture | null }
      if (anyMat.map) anyMat.map.dispose()
      m.dispose()
    }
  })
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

type Props = {
  era: EraValue
  className?: string
}

export function TunnelScene3D({ era, className = '' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const rootRef = useRef<THREE.Group | null>(null)
  const lightsRef = useRef<{
    hemi: THREE.HemisphereLight
    key: THREE.DirectionalLight
    fill: THREE.PointLight
    rim: THREE.DirectionalLight
  } | null>(null)
  const frameRef = useRef<number | null>(null)
  const clockRef = useRef(new THREE.Clock())
  const eraRef = useRef<EraValue>(era)

  const rebuild = useCallback((next: EraValue) => {
    const scene = sceneRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    const lights = lightsRef.current
    if (!scene || !camera || !controls || !lights) return

    if (rootRef.current) {
      scene.remove(rootRef.current)
      disposeGroup(rootRef.current)
    }

    const s = ERA_SCENES[next]
    const root = buildScene(s)
    scene.add(root)
    rootRef.current = root

    scene.background = new THREE.Color(s.ambient).multiplyScalar(0.22)
    scene.fog = new THREE.Fog(new THREE.Color(s.ambient).multiplyScalar(0.22), s.blockW * 1.6, s.blockW * 3.4)

    lights.hemi.color.set(s.keyLight)
    lights.hemi.groundColor.set(s.earthDeep)
    lights.key.color.set(s.keyLight)
    lights.fill.color.set(s.fillLight)
    lights.fill.position.set(0, s.blockH * 0.38 - s.blockH * 0.35, s.blockD / 2 + 4.5)
    lights.rim.color.set(s.accent)

    // Khung hình theo kích thước khối
    const host = hostRef.current
    const aspect = host && host.clientHeight > 0 ? host.clientWidth / host.clientHeight : 16 / 9
    const dist = s.blockW * (aspect < 1 ? 1.5 : aspect < 1.5 ? 1.15 : 0.92)
    camera.position.set(dist * 0.18, s.blockH * 0.14, dist)
    controls.target.set(0, -s.blockH * 0.05, 0)
    controls.minDistance = s.blockW * 0.55
    controls.maxDistance = s.blockW * 2.1
    controls.update()
  }, [])

  // Khởi tạo
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(host.clientWidth || 640, host.clientHeight || 400)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'
    host.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 400)
    cameraRef.current = camera

    const hemi = new THREE.HemisphereLight('#ffffff', '#5a3018', 0.75)
    hemi.position.set(0, 12, 0)
    scene.add(hemi)

    const key = new THREE.DirectionalLight('#ffffff', 1.5)
    key.position.set(6, 12, 14)
    scene.add(key)

    const fill = new THREE.PointLight('#ffb673', 55, 40, 2)
    scene.add(fill)

    const rim = new THREE.DirectionalLight('#ffffff', 0.5)
    rim.position.set(-10, 4, -8)
    scene.add(rim)

    lightsRef.current = { hemi, key, fill, rim }

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.enablePan = false
    controls.rotateSpeed = 0.55
    controls.zoomSpeed = 0.7
    // Chỉ cho xoay quanh mặt cắt — không để lộ mặt sau rỗng
    controls.minAzimuthAngle = -Math.PI / 2.6
    controls.maxAzimuthAngle = Math.PI / 2.6
    controls.minPolarAngle = 0.5
    controls.maxPolarAngle = Math.PI / 2 + 0.22
    controlsRef.current = controls

    rebuild(eraRef.current)

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)
      const t = clockRef.current.getElapsedTime()
      const root = rootRef.current
      if (root) {
        // đu đưa nhẹ cho sinh động
        root.rotation.y = Math.sin(t * 0.17) * 0.07
        root.traverse((o) => {
          if (o.userData.isFlag) {
            o.rotation.y = Math.sin(t * 2.4) * 0.22
            o.scale.x = 1 + Math.sin(t * 3.1) * 0.05
          }
        })
      }
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      ro.disconnect()
      controls.dispose()
      if (rootRef.current) disposeGroup(rootRef.current)
      renderer.dispose()
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement)
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      controlsRef.current = null
      rootRef.current = null
      lightsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Đổi thời kỳ
  useEffect(() => {
    if (eraRef.current === era) return
    eraRef.current = era
    rebuild(era)
  }, [era, rebuild])

  return <div ref={hostRef} className={`relative w-full ${className}`} />
}
