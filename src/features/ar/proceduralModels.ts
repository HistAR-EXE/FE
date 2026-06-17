import * as THREE from 'three'
import type { CuChiSceneSlug, EraValue } from './types'

function eraPalette(era: EraValue) {
  if (era === 1948) {
    return { earth: 0x4a3728, wood: 0x3d2e1f, metal: 0x5c5c5c, leaf: 0x2d4a22, accent: 0x8b6914 }
  }
  if (era === 2026) {
    return { earth: 0x6b5344, wood: 0x8b6914, metal: 0x9aa0a6, leaf: 0x3d6b35, accent: 0xf2bf50 }
  }
  return { earth: 0x3d2817, wood: 0x5c4033, metal: 0x4a4a4a, leaf: 0x1e3d16, accent: 0xc9a227 }
}

function mat(color: number, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05 })
}

function buildCuaHam(group: THREE.Group, era: EraValue) {
  const p = eraPalette(era)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.55), mat(p.earth))
  frame.position.y = -0.04
  group.add(frame)

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.06, 16), mat(p.leaf))
  lid.rotation.x = Math.PI / 2
  lid.position.set(0, 0.02, 0)
  group.add(lid)

  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.2, 12), mat(0x1a1208))
  hole.rotation.x = Math.PI / 2
  hole.position.set(0, -0.02, 0)
  group.add(hole)

  if (era === 1968) {
    const sandbag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), mat(p.wood))
    sandbag.position.set(0.28, 0, 0.1)
    group.add(sandbag)
  }
}

function buildBepHoangCam(group: THREE.Group, era: EraValue) {
  const p = eraPalette(era)
  const stove = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 12), mat(p.earth))
  stove.position.y = -0.02
  group.add(stove)

  const pot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(p.metal))
  pot.position.set(0, 0.08, 0)
  group.add(pot)

  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8), mat(p.wood))
  chimney.position.set(0.15, 0.12, 0)
  group.add(chimney)
}

function buildPhongHop(group: THREE.Group, era: EraValue) {
  const p = eraPalette(era)
  const table = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.28), mat(p.wood))
  table.position.y = -0.02
  group.add(table)

  const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.22), mat(p.accent))
  mapPlane.position.set(0, 0.18, -0.02)
  group.add(mapPlane)

  for (let i = 0; i < 3; i++) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.08, 8), mat(p.earth))
    stool.position.set(-0.15 + i * 0.15, 0.04, 0.1)
    group.add(stool)
  }
}

function buildThongGio(group: THREE.Group, era: EraValue) {
  const p = eraPalette(era)
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.35, 10), mat(p.metal))
  pipe.position.y = 0.05
  group.add(pipe)

  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.12, 8), mat(p.leaf))
  leaves.position.set(0, 0.22, 0)
  group.add(leaves)
}

function buildGieng(group: THREE.Group, era: EraValue) {
  const p = eraPalette(era)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 20), mat(p.wood))
  ring.rotation.x = Math.PI / 2
  ring.position.y = 0
  group.add(ring)

  const water = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), new THREE.MeshStandardMaterial({ color: 0x1a3a4a, roughness: 0.2, metalness: 0.3 }))
  water.rotation.x = -Math.PI / 2
  water.position.y = -0.01
  group.add(water)

  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), mat(p.earth))
  rope.position.set(0.08, 0.15, 0)
  group.add(rope)
}

export function createProceduralSceneModel(slug: CuChiSceneSlug, era: EraValue): THREE.Group {
  const group = new THREE.Group()
  switch (slug) {
    case 'cua-ham':
      buildCuaHam(group, era)
      break
    case 'bep-hoang-cam':
      buildBepHoangCam(group, era)
      break
    case 'phong-hop':
      buildPhongHop(group, era)
      break
    case 'thong-gio':
      buildThongGio(group, era)
      break
    case 'gieng':
      buildGieng(group, era)
      break
    default:
      buildCuaHam(group, era)
  }
  return group
}

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.geometry) mesh.geometry.dispose()
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      mats.forEach((m) => m.dispose())
    }
  })
}
