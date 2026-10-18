// src/features/time-portal/tunnel3d/figures.ts
// Nhân vật low-poly có khớp (tay, chân, thân) để tạo dáng & chuyển động
// trong sa bàn: du kích, dân thường, y tá, lính Mỹ, bộ đội, du khách.

import * as THREE from 'three'
import type { Kit } from './kit'
import type { Outfit, Pose, Prop } from './scenes'

type HatKind = 'taibeo' | 'nonla' | 'm1' | 'mucoi' | 'cap' | 'nursecap' | 'none'

type OutfitDef = {
  shirt: string
  pants: string
  skin: string
  hat: HatKind
  hatColor: string
}

const OUTFITS: Record<Outfit, OutfitDef> = {
  guerrilla: { shirt: '#3f5a2e', pants: '#2c3524', skin: '#c48a5e', hat: 'taibeo', hatColor: '#4d6634' },
  civilian: { shirt: '#1d1d22', pants: '#18181c', skin: '#c48a5e', hat: 'nonla', hatColor: '#e6d293' },
  farmer: { shirt: '#4a3d2a', pants: '#1f1f22', skin: '#b97e52', hat: 'nonla', hatColor: '#e6d293' },
  nurse: { shirt: '#f2f0ea', pants: '#2a2a2a', skin: '#c89066', hat: 'nursecap', hatColor: '#ffffff' },
  us: { shirt: '#626844', pants: '#555a3b', skin: '#e2b28c', hat: 'm1', hatColor: '#474d32' },
  soldier75: { shirt: '#4f6b35', pants: '#41572c', skin: '#c48a5e', hat: 'mucoi', hatColor: '#72864a' },
  tourist1: { shirt: '#f97316', pants: '#334155', skin: '#e0b08a', hat: 'cap', hatColor: '#f8fafc' },
  tourist2: { shirt: '#38bdf8', pants: '#1e3a5f', skin: '#d9a27a', hat: 'cap', hatColor: '#0f172a' },
  tourist3: { shirt: '#e11d48', pants: '#3f3f46', skin: '#e8bb94', hat: 'cap', hatColor: '#fde68a' },
  guide: { shirt: '#0d9488', pants: '#1f2937', skin: '#c89066', hat: 'mucoi', hatColor: '#72864a' },
}

export type FigureParts = {
  root: THREE.Group
  hips: THREE.Group
  torso: THREE.Group
  armL: THREE.Group
  armR: THREE.Group
  legL: THREE.Group
  legR: THREE.Group
}

function makeHat(kind: HatKind, color: string, kit: Kit): THREE.Object3D | null {
  const m = kit.std(color, { roughness: 0.85, flatShading: true })
  const g = new THREE.Group()
  switch (kind) {
    case 'taibeo': {
      const crown = new THREE.Mesh(kit.geo('hat-tb-crown', () => new THREE.CylinderGeometry(0.075, 0.088, 0.06, 10)), m)
      crown.position.y = 0.06
      const brim = new THREE.Mesh(kit.geo('hat-tb-brim', () => new THREE.CylinderGeometry(0.15, 0.15, 0.012, 14)), m)
      brim.position.y = 0.035
      g.add(crown, brim)
      break
    }
    case 'nonla': {
      const cone = new THREE.Mesh(kit.geo('hat-nonla', () => new THREE.ConeGeometry(0.19, 0.13, 14)), m)
      cone.position.y = 0.09
      g.add(cone)
      break
    }
    case 'm1': {
      const dome = new THREE.Mesh(
        kit.geo('hat-m1', () => new THREE.SphereGeometry(0.108, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
        m,
      )
      dome.position.y = 0.01
      dome.scale.y = 0.9
      g.add(dome)
      break
    }
    case 'mucoi': {
      const dome = new THREE.Mesh(
        kit.geo('hat-mucoi', () => new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
        m,
      )
      dome.position.y = 0.02
      const brim = new THREE.Mesh(kit.geo('hat-mucoi-brim', () => new THREE.CylinderGeometry(0.135, 0.135, 0.012, 14)), m)
      brim.position.y = 0.02
      g.add(dome, brim)
      break
    }
    case 'cap': {
      const dome = new THREE.Mesh(
        kit.geo('hat-cap', () => new THREE.SphereGeometry(0.092, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2)),
        m,
      )
      dome.position.y = 0.02
      const visor = new THREE.Mesh(kit.geo('hat-cap-visor', () => new THREE.BoxGeometry(0.1, 0.012, 0.09)), m)
      visor.position.set(0, 0.025, 0.1)
      g.add(dome, visor)
      break
    }
    case 'nursecap': {
      const cap = new THREE.Mesh(kit.geo('hat-nurse', () => new THREE.BoxGeometry(0.12, 0.05, 0.1)), m)
      cap.position.y = 0.08
      g.add(cap)
      break
    }
    case 'none':
      return null
  }
  return g
}

function makeProp(prop: Prop, kit: Kit): { obj: THREE.Object3D; on: 'armR' | 'torso' } | null {
  const dark = kit.std('#2a2118', { roughness: 0.7 })
  const wood = kit.std('#7a5530', { roughness: 0.95 })
  switch (prop) {
    case 'rifle': {
      const g = new THREE.Group()
      const body = new THREE.Mesh(kit.geo('prop-rifle', () => new THREE.BoxGeometry(0.035, 0.56, 0.04)), dark)
      body.position.y = -0.3
      const stock = new THREE.Mesh(kit.geo('prop-stock', () => new THREE.BoxGeometry(0.04, 0.14, 0.06)), wood)
      stock.position.y = -0.08
      g.add(body, stock)
      return { obj: g, on: 'armR' }
    }
    case 'hoe': {
      const g = new THREE.Group()
      const handle = new THREE.Mesh(kit.geo('prop-hoe', () => new THREE.CylinderGeometry(0.014, 0.014, 0.75, 5)), wood)
      handle.position.y = -0.3
      const blade = new THREE.Mesh(kit.geo('prop-hoe-blade', () => new THREE.BoxGeometry(0.12, 0.025, 0.14)), kit.std('#8a8f94', { metalness: 0.5, roughness: 0.5 }))
      blade.position.set(0, -0.66, 0.06)
      g.add(handle, blade)
      return { obj: g, on: 'armR' }
    }
    case 'ladle': {
      const ladle = new THREE.Mesh(kit.geo('prop-ladle', () => new THREE.CylinderGeometry(0.012, 0.012, 0.36, 5)), wood)
      ladle.position.y = -0.3
      return { obj: ladle, on: 'armR' }
    }
    case 'hammer': {
      const g = new THREE.Group()
      const handle = new THREE.Mesh(kit.geo('prop-ham', () => new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5)), wood)
      handle.position.y = -0.27
      const head = new THREE.Mesh(kit.geo('prop-ham-head', () => new THREE.BoxGeometry(0.08, 0.04, 0.04)), dark)
      head.position.y = -0.37
      g.add(handle, head)
      return { obj: g, on: 'armR' }
    }
    case 'flashlight': {
      const g = new THREE.Group()
      const body = new THREE.Mesh(kit.geo('prop-fl', () => new THREE.CylinderGeometry(0.022, 0.022, 0.13, 6)), dark)
      body.position.y = -0.25
      const tip = new THREE.Mesh(
        kit.geo('prop-fl-tip', () => new THREE.SphereGeometry(0.03, 8, 6)),
        kit.std('#fff6c8', { emissive: '#fff1a8', emissiveIntensity: 2.2 }),
      )
      tip.position.y = -0.33
      g.add(body, tip)
      return { obj: g, on: 'armR' }
    }
    case 'crate': {
      const crate = new THREE.Mesh(kit.geo('prop-crate', () => new THREE.BoxGeometry(0.24, 0.16, 0.2)), kit.std('#55613f', { roughness: 0.9 }))
      crate.position.set(0, 0.24, 0.22)
      return { obj: crate, on: 'torso' }
    }
    case 'paper': {
      const paper = new THREE.Mesh(kit.geo('prop-paper', () => new THREE.BoxGeometry(0.16, 0.012, 0.12)), kit.std('#efe6cf'))
      paper.position.set(0, 0.2, 0.2)
      paper.rotation.x = -0.6
      return { obj: paper, on: 'torso' }
    }
    case 'basket': {
      // Đòn gánh với hai thúng đất
      const g = new THREE.Group()
      const pole = new THREE.Mesh(kit.geo('prop-pole', () => new THREE.CylinderGeometry(0.014, 0.014, 0.9, 5)), wood)
      pole.rotation.z = Math.PI / 2
      pole.position.y = 0.4
      g.add(pole)
      const basketMat = kit.std('#a8834c', { roughness: 1, flatShading: true })
      const soilMat = kit.std('#8a4a22', { roughness: 1 })
      for (const sx of [-1, 1]) {
        const b = new THREE.Mesh(kit.geo('prop-basket', () => new THREE.CylinderGeometry(0.12, 0.09, 0.13, 10)), basketMat)
        b.position.set(sx * 0.42, 0.04, 0)
        const soil = new THREE.Mesh(kit.geo('prop-soil', () => new THREE.SphereGeometry(0.11, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), soilMat)
        soil.position.set(sx * 0.42, 0.1, 0)
        soil.scale.y = 0.5
        g.add(b, soil)
      }
      return { obj: g, on: 'torso' }
    }
    case 'none':
      return null
  }
}

export function makeFigure(outfit: Outfit, kit: Kit, opts: { hat?: boolean; prop?: Prop } = {}): FigureParts {
  const o = OUTFITS[outfit]
  const shirt = kit.std(o.shirt, { roughness: 0.92 })
  const pants = kit.std(o.pants, { roughness: 0.95 })
  const skin = kit.std(o.skin, { roughness: 0.8 })

  const legGeo = kit.geo('fig-leg', () => new THREE.CapsuleGeometry(0.055, 0.3, 3, 8))
  const torsoGeo = kit.geo('fig-torso', () => new THREE.CapsuleGeometry(0.105, 0.2, 4, 10))
  const armGeo = kit.geo('fig-arm', () => new THREE.CapsuleGeometry(0.041, 0.24, 3, 8))
  const headGeo = kit.geo('fig-head', () => new THREE.SphereGeometry(0.086, 12, 10))

  const root = new THREE.Group()
  const hips = new THREE.Group()
  hips.position.y = 0.43
  root.add(hips)

  const legL = new THREE.Group()
  const legR = new THREE.Group()
  legL.position.x = -0.058
  legR.position.x = 0.058
  for (const leg of [legL, legR]) {
    const m = new THREE.Mesh(legGeo, pants)
    m.position.y = -0.205
    leg.add(m)
    hips.add(leg)
  }

  const torso = new THREE.Group()
  hips.add(torso)
  const chest = new THREE.Mesh(torsoGeo, shirt)
  chest.position.y = 0.2
  torso.add(chest)

  const armL = new THREE.Group()
  const armR = new THREE.Group()
  armL.position.set(-0.145, 0.355, 0)
  armR.position.set(0.145, 0.355, 0)
  for (const arm of [armL, armR]) {
    const sleeve = new THREE.Mesh(armGeo, shirt)
    sleeve.position.y = -0.14
    const hand = new THREE.Mesh(kit.geo('fig-hand', () => new THREE.SphereGeometry(0.038, 8, 6)), skin)
    hand.position.y = -0.28
    arm.add(sleeve, hand)
    torso.add(arm)
  }

  const head = new THREE.Mesh(headGeo, skin)
  head.position.y = 0.53
  torso.add(head)
  if (opts.hat !== false) {
    const hat = makeHat(o.hat, o.hatColor, kit)
    if (hat) {
      hat.position.y = 0.53 + 0.04
      torso.add(hat)
    }
  }

  const prop = makeProp(opts.prop ?? 'none', kit)
  if (prop) (prop.on === 'armR' ? armR : torso).add(prop.obj)

  return { root, hips, torso, armL, armR, legL, legR }
}

export function applyPose(p: FigureParts, pose: Pose) {
  switch (pose) {
    case 'walk':
      p.legL.rotation.x = 0.35
      p.legR.rotation.x = -0.35
      p.armL.rotation.x = -0.3
      p.armR.rotation.x = 0.3
      break
    case 'aim':
      p.torso.rotation.x = 0.12
      p.armR.rotation.x = -1.7
      p.armL.rotation.x = -1.55
      p.armL.rotation.z = 0.45
      break
    case 'sit':
    case 'read':
    case 'pedal':
    case 'hammer':
      p.hips.position.y = 0.27
      p.legL.rotation.x = -1.3
      p.legR.rotation.x = -1.3
      p.armL.rotation.x = -0.65
      p.armR.rotation.x = -0.65
      if (pose === 'read') {
        p.armL.rotation.x = -1.0
        p.armR.rotation.x = -1.0
      }
      if (pose === 'hammer') {
        p.torso.rotation.x = 0.3
        p.armR.rotation.x = -1.5
      }
      break
    case 'kneel':
      p.hips.position.y = 0.3
      p.legL.rotation.x = -1.5
      p.legR.rotation.x = 0.3
      p.torso.rotation.x = 0.25
      p.armR.rotation.x = -1.35
      p.armL.rotation.x = -0.8
      break
    case 'cook':
      p.hips.position.y = 0.2
      p.legL.rotation.x = -1.75
      p.legR.rotation.x = -1.75
      p.legL.rotation.z = 0.3
      p.legR.rotation.z = -0.3
      p.torso.rotation.x = 0.28
      p.armR.rotation.x = -1.1
      p.armL.rotation.x = -0.9
      break
    case 'climb':
      p.armL.rotation.z = 2.8
      p.armR.rotation.z = -2.8
      p.legL.rotation.x = -0.7
      break
    case 'dig':
      p.torso.rotation.x = 0.2
      p.armL.rotation.x = -2.2
      p.armR.rotation.x = -2.2
      break
    case 'carry':
      p.armL.rotation.x = -1.15
      p.armR.rotation.x = -1.15
      p.armL.rotation.z = 0.25
      p.armR.rotation.z = -0.25
      break
    case 'wave':
      p.armR.rotation.z = -2.7
      break
    case 'lie':
      p.armL.rotation.z = 0.25
      p.armR.rotation.z = -0.25
      break
    case 'stand':
      p.armL.rotation.z = 0.08
      p.armR.rotation.z = -0.08
      break
  }
}

/** Trả về hàm chuyển động theo dáng (hoặc null nếu tĩnh). */
export function poseAnimator(p: FigureParts, pose: Pose, seed: number): ((t: number) => void) | null {
  const ph = seed * 1.7
  switch (pose) {
    case 'walk':
      return (t) => {
        const s = Math.sin(t * 6 + ph)
        p.legL.rotation.x = s * 0.45
        p.legR.rotation.x = -s * 0.45
        p.armL.rotation.x = -s * 0.35
        p.armR.rotation.x = s * 0.2 - 0.1
      }
    case 'cook':
      return (t) => {
        p.armR.rotation.x = -1.1 + Math.sin(t * 3 + ph) * 0.28
        p.armR.rotation.z = Math.sin(t * 3 + ph + 1.2) * 0.25
      }
    case 'pedal':
      return (t) => {
        const s = Math.sin(t * 6 + ph)
        p.legL.rotation.x = -1.2 + s * 0.38
        p.legR.rotation.x = -1.2 - s * 0.38
      }
    case 'dig':
      return (t) => {
        const s = Math.sin(t * 2.6 + ph)
        p.armL.rotation.x = -1.6 + s * 0.95
        p.armR.rotation.x = -1.6 + s * 0.95
        p.torso.rotation.x = 0.22 + Math.max(0, s) * 0.25
      }
    case 'hammer':
      return (t) => {
        p.armR.rotation.x = -1.35 - Math.abs(Math.sin(t * 6 + ph)) * 0.65
      }
    case 'wave':
      return (t) => {
        p.armR.rotation.z = -2.6 + Math.sin(t * 7 + ph) * 0.35
      }
    case 'climb':
      return (t) => {
        const s = Math.sin(t * 4 + ph)
        p.armL.rotation.z = 2.8 + s * 0.2
        p.armR.rotation.z = -2.8 + s * 0.2
        p.legL.rotation.x = -0.4 - Math.max(0, s) * 0.6
        p.legR.rotation.x = -0.4 - Math.max(0, -s) * 0.6
      }
    case 'aim':
      return (t) => {
        p.torso.rotation.y = Math.sin(t * 0.7 + ph) * 0.12
      }
    case 'read':
    case 'sit':
    case 'stand':
      return (t) => {
        p.torso.rotation.z = Math.sin(t * 0.9 + ph) * 0.03
      }
    default:
      return null
  }
}

/** Dáng bò: tay vươn ra trước, chân đạp so le. */
export function crawlAnimator(p: FigureParts, seed: number): (t: number) => void {
  p.armL.rotation.x = Math.PI
  p.armR.rotation.x = Math.PI
  return (t) => {
    const s = Math.sin(t * 6 + seed)
    p.armL.rotation.x = Math.PI + s * 0.35
    p.armR.rotation.x = Math.PI - s * 0.35
    p.legL.rotation.x = s * 0.3
    p.legR.rotation.x = -s * 0.3
  }
}
