import type { FaceGeometry, HeritageCompositorCalibration, HeritagePoint } from './types.ts'
import { clampPlacement, type FacePlacement } from './facePlacement.ts'
import type { PublishedHeritageRoleTemplate } from './types.ts'

export type FaceAlignment = {
  readonly roll: number
  readonly scale: number
  readonly center: HeritagePoint
}

function distance(a: HeritagePoint, b: HeritagePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function alignFaceGeometry(
  geometry: FaceGeometry,
  calibration: HeritageCompositorCalibration,
): FaceAlignment {
  const anchor = calibration.faceAnchor
  const eyeMidpoint = {
    x: (geometry.eyeLeft.x + geometry.eyeRight.x) / 2,
    y: (geometry.eyeLeft.y + geometry.eyeRight.y) / 2,
  }
  const interocular = Math.max(distance(geometry.eyeLeft, geometry.eyeRight), 0.0001)
  const roll = Math.atan2(
    geometry.eyeRight.y - geometry.eyeLeft.y,
    geometry.eyeRight.x - geometry.eyeLeft.x,
  ) * 180 / Math.PI
  const scale = (anchor.width * calibration.faceInterocular) / interocular
  const targetEye = {
    x: anchor.x + anchor.width / 2,
    y: anchor.y + anchor.height * calibration.faceEyeLine,
  }
  return {
    roll,
    scale,
    center: {
      x: targetEye.x + (eyeMidpoint.x - 0.5) * anchor.width,
      y: targetEye.y + (eyeMidpoint.y - 0.5) * anchor.height,
    },
  }
}

export function placementFromGeometry(geometry: FaceGeometry, template: PublishedHeritageRoleTemplate): FacePlacement {
  const calibration = template.calibration
  const anchor = calibration.faceAnchor
  const eyes = { x: (geometry.eyeLeft.x + geometry.eyeRight.x) / 2, y: (geometry.eyeLeft.y + geometry.eyeRight.y) / 2 }
  const distanceBetweenEyes = Math.max(0.0001, distance(geometry.eyeLeft, geometry.eyeRight))
  const scale = calibration.faceInterocular * geometry.box.width / distanceBetweenEyes
  const targetEye = { x: anchor.x + anchor.width / 2, y: anchor.y + anchor.height * calibration.faceEyeLine }
  const eyeFraction = {
    x: (eyes.x - geometry.box.x) / Math.max(0.0001, geometry.box.width),
    y: (eyes.y - geometry.box.y) / Math.max(0.0001, geometry.box.height),
  }
  const aligned = alignFaceGeometry(geometry, calibration)
  return clampPlacement({
    x: targetEye.x - eyeFraction.x * anchor.width * scale,
    y: targetEye.y - eyeFraction.y * anchor.height * scale,
    scale,
    rotationDeg: calibration.faceRotationDeg - aligned.roll,
  }, template)
}
