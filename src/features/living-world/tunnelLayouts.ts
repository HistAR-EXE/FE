// G3 Chặng B · WS6: per-zone underground layouts (RECONSTRUCTED · THEMATIC — gameplay layouts, not surveyed plans).
// One data source for both the walk grid (worldModel) and the carved shell / X-ray casts (r2/r2Tunnel, r2/r2Xray).
// Each layer has its own topology so L1 / L2 / L3 are never one shared corridor recoloured (G3-SCOPE-CORRECTION-LOCK):
//  · L1-A  Y-shaped entry: shaft + steps, a junction chamber, two branches (air side / structure side).
//  · L1-B  long ventilation gallery: vent niche at the west dead end, living chamber at the east end.
//  · L1-D  zigzag, staggered passages ending at the hatch down to the middle layer.
//  · L2-A  central chamber with spokes; west spoke ends in the L2-D interpretive niche (THEMATIC, not a new zone).
//  · L3-A  narrow, lower serpentine passage ending at the well chamber (RECONSTRUCTED, Ch.5 L3-C).
// Historical reference (UNESCO 7038, Bến Dược, R01): passages ~62 × 104 cm (L1/L2), 75 × 95 cm (L3). Gameplay sizes
// below are widened for the third-person camera; the adaptation is recorded in SCENE-HISTORICAL-REGISTER.csv.
// Walk centrelines are axis-aligned on the 0.5 m walk grid; only the visual carve meanders.

export type LP = [number, number]
export type LSeg = { a: LP; b: LP }
export type LRoom = { c: LP; r: number; h: number }
export type Spot = { at: LP; approach: LP }
export type TunnelLayout = {
 depth: 'L1' | 'L2' | 'L3'
 half: number; high: number; meander: number; tone: string
 /** Safe spawn: inside a passage with open space BEHIND for the follow camera, facing along the passage (QC-CAMERA). */
 spawn: { at: LP; heading: number }
 segs: LSeg[]; rooms: LRoom[]; lamps: [number, number, number, number][]
 /** Route signposts, in the order routes are declared from this zone (worldContinuity). */
 routes: Spot[]
 /** Observation targets (worldModel ids). */
 targets: Record<string, Spot>
}
const SHAFT: LSeg = { a: [0, 3.5], b: [0, 2] }
const ENTRY: LRoom = { c: [0, 3.3], r: .62, h: 1.5 }
const UP: Spot = { at: [.65, 3.35], approach: [0, 3] }

export const tunnelLayouts: Record<'L1-A' | 'L1-B' | 'L1-D' | 'L2-A' | 'L3-A' | 'L2-D' | 'L3-D', TunnelLayout> = {
 'L2-D':{depth:'L2',half:.4,high:1.3,meander:.03,tone:'#927051',spawn:{at:[0,2],heading:Math.PI},segs:[{a:[0,3.5],b:[0,.5]}],rooms:[{c:[0,-.3],r:2.15,h:2.15}],lamps:[[-1.6,.2,-1.1,1.6],[1.6,.2,-1.1,1.5],[.4,.1,2,1]],routes:[],targets:{}},
 'L3-D':{depth:'L3',half:.4,high:1.3,meander:.03,tone:'#80644f',spawn:{at:[0,2],heading:Math.PI},segs:[{a:[0,3.5],b:[0,.5]}],rooms:[{c:[0,-.3],r:2.15,h:2.15}],lamps:[[-1.6,.2,-1.1,1.6],[1.6,.2,-1.1,1.5],[.4,.1,2,1]],routes:[],targets:{}},
 'L1-A': { depth: 'L1', half: .375, high: 1.2, meander: .05, tone: '#a87951', spawn: { at: [0, 2], heading: Math.PI },
  segs: [SHAFT, { a: [0, 2], b: [0, .5] }, { a: [0, .5], b: [-2.5, .5] }, { a: [-2.5, .5], b: [-2.5, -1] }, { a: [0, .5], b: [2.5, .5] }, { a: [2.5, .5], b: [2.5, -1] }, { a: [0, 2], b: [-1.5, 2] }],
  rooms: [ENTRY, { c: [0, .5], r: .72, h: 1.45 }, { c: [-2.5, -1.2], r: .5, h: 1.25 }, { c: [2.5, -1.2], r: .5, h: 1.25 }],
  lamps: [[.45, .02, .1, 1.5], [-2.85, .02, -1.35, 1.2], [2.85, .02, -1.35, 1.2], [-1.75, .02, 2.25, 1]],
  routes: [UP, { at: [-2.5, -1.75], approach: [-2.5, -1] }, { at: [2.5, -1.75], approach: [2.5, -1] }, { at: [-2.1, 2.3], approach: [-1.5, 2] }],
  targets: {} },
 'L1-B': { depth: 'L1', half: .375, high: 1.2, meander: .06, tone: '#9b6646', spawn: { at: [0, 2], heading: Math.PI },
  segs: [SHAFT, { a: [0, 2], b: [0, -.5] }, { a: [-3.5, -.5], b: [2, -.5] }, { a: [0, 1], b: [-2.5, 1] }, { a: [3, -.5], b: [3, 1.5] }, { a: [0, 2], b: [-1.5, 2] }],
  rooms: [ENTRY, { c: [3, -.65], r: 1.05, h: 1.6 }, { c: [-3.5, -.55], r: .48, h: 1.3 }],
  lamps: [[-1.2, .02, -.82, 1.2], [3.55, .02, -1.25, 1.4], [-2.8, .02, 1.3, 1], [.3, .02, 1.25, 1]],
  routes: [UP, { at: [-3.1, 1], approach: [-2.5, 1] }, { at: [3.6, 1.6], approach: [3, 1.5] }, { at: [-2.1, 2.3], approach: [-1.5, 2] }],
  targets: { AIR_SURFACE_OPENING: { at: [-3.5, -.95], approach: [-3.5, -.5] }, AIR_PASSAGE: { at: [-1, -.95], approach: [-1, -.5] }, AIR_INTERIOR: { at: [3, -1.35], approach: [3, -.5] } } },
 'L1-D': { depth: 'L1', half: .375, high: 1.2, meander: .07, tone: '#956044', spawn: { at: [0, 1], heading: -Math.PI / 2 },
  segs: [SHAFT, { a: [0, 2], b: [0, 1] }, { a: [0, 1], b: [-2.5, 1] }, { a: [-2.5, 1], b: [-2.5, -.5] }, { a: [-2.5, -.5], b: [1, -.5] }, { a: [1, -.5], b: [1, -1.5] }, { a: [1, -1.5], b: [3, -1.5] }, { a: [0, 1], b: [2.5, 1] }, { a: [-2.5, 1], b: [-2.5, 2] }],
  rooms: [ENTRY, { c: [-1, -1.1], r: .66, h: 1.3 }, { c: [3.25, -1.5], r: .55, h: 1.3 }],
  lamps: [[-1.5, .02, -1.5, 1.3], [3.55, .02, -1.1, 1.3], [-2.85, .02, .3, 1], [2.8, .02, 1.3, 1]],
  routes: [UP, { at: [2, -2.05], approach: [2, -1.5] }, { at: [3.1, 1], approach: [2.5, 1] }, { at: [-3.1, 2.2], approach: [-2.5, 2] }],
  targets: { STRUCT_LAYER_1: { at: [-1, -1.3], approach: [-1, -.5] }, STRUCT_LINK_12: { at: [3.5, -1.5], approach: [3, -1.5] } } },
 'L2-A': { depth: 'L2', half: .4, high: 1.25, meander: .05, tone: '#8a5a40', spawn: { at: [0, 2], heading: Math.PI },
  segs: [SHAFT, { a: [0, 2], b: [0, .8] }, { a: [1, -.5], b: [3, -.5] }, { a: [3, -.5], b: [3, -1.5] }, { a: [-1, -.5], b: [-3, -.5] }, { a: [0, 1.5], b: [2.5, 1.5] }, { a: [0, 1.5], b: [-2, 1.5] }],
  rooms: [ENTRY, { c: [0, -.35], r: 1.45, h: 1.75 }, { c: [3, -1.7], r: .5, h: 1.3 }, { c: [-3.3, -.5], r: .66, h: 1.4 }],
  lamps: [[-1.1, .02, -1.35, 1.5], [1.1, .02, -1.35, 1.3], [3.35, .02, -1.95, 1.1], [-3.6, .02, -.95, 1.2], [2.1, .02, 1.8, 1]],
  routes: [{ at: [3.6, -1], approach: [3, -1] }, UP, { at: [3.1, 1.5], approach: [2.5, 1.5] }, { at: [-2.6, 1.7], approach: [-2, 1.5] }],
  targets: { STRUCT_LAYER_2: { at: [-.6, -1.4], approach: [-.5, -.5] }, STRUCT_LINK_23: { at: [3, -1.95], approach: [3, -1.5] }, L2D_NICHE: { at: [-3.65, -.5], approach: [-3, -.5] } } },
 'L3-A': { depth: 'L3', half: .36, high: 1.08, meander: .06, tone: '#6e4a37', spawn: { at: [-1, 2], heading: -Math.PI / 2 },
  segs: [SHAFT, { a: [0, 2], b: [-3, 2] }, { a: [-3, 2], b: [-3, .5] }, { a: [-3, .5], b: [3, .5] }, { a: [3, .5], b: [3, -1] }, { a: [3, -1], b: [.5, -1] }],
  rooms: [ENTRY, { c: [0, -1.2], r: .85, h: 1.25 }],
  lamps: [[-.75, .02, -1.6, 1.1], [-3.3, .02, 1.25, .8], [3.3, .02, -.2, .8], [-1.8, .02, 2.3, .9], [.4, .02, .85, .8]],
  routes: [UP, { at: [3.6, -1.2], approach: [3, -1] }, { at: [-3.6, 2.2], approach: [-3, 2] }],
  targets: { STRUCT_LAYER_3: { at: [0, -1.45], approach: [0, -1] } } },
}
export const isTunnelZone = (z: string): z is keyof typeof tunnelLayouts => z in tunnelLayouts
const segDist = (x: number, z: number, s: LSeg) => { const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L)) : 0; return Math.hypot(x - s.a[0] - dx * t, z - s.a[1] - dz * t) }
/** Walk grid membership: on a passage centreline (±0.26 m) or well inside a chamber. */
export const inLayout = (zone: keyof typeof tunnelLayouts, x: number, z: number) => {
 const l = tunnelLayouts[zone]
 if((zone==='L2-D'||zone==='L3-D')&&Math.abs(x)<1.3&&z<0&&z> -1.65)return false
 return l.segs.some(s => segDist(x, z, s) <= .26) || l.rooms.some(r => Math.hypot(x - r.c[0], z - r.c[1]) <= r.r - .3)
}
/** Interpretive targets that never count as quest progress (THEMATIC corners). */
export const isQuestTarget = (id: string) => !id.startsWith('ROUTE_') && !id.startsWith('L2D_') && !id.startsWith('S1_DECOY_')
