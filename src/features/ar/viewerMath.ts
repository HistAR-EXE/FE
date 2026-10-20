/** Fit a centered sphere to 70% of the narrower viewport dimension. */
export function fitSphereDistance(radius: number, verticalFov: number, aspect: number) {
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 1;
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const halfFov = ((Number.isFinite(verticalFov) && verticalFov > 0 && verticalFov < 180 ? verticalFov : 35) * Math.PI) / 360;
  const tangent = Math.tan(halfFov) * Math.min(1, safeAspect);
  return safeRadius * Math.sqrt(1 + 1 / (0.7 * tangent) ** 2);
}

type Three = typeof import("three");

/** Fit the actual projected box; a sphere wastes space for long, flat artifacts. */
export function fitBoxDistance(THREE: Three, box: import("three").Box3, direction: import("three").Vector3, fov: number, aspect: number) {
  const forward = direction.clone().normalize();
  const right = new THREE.Vector3(0, 1, 0).cross(forward);
  if (right.lengthSq() < 0.0001) right.set(1, 0, 0);
  right.normalize();
  const up = forward.clone().cross(right).normalize();
  const tangent = Math.tan(fov * Math.PI / 360);
  let distance = 0.01;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const point = new THREE.Vector3(x, y, z);
    const depth = point.dot(forward);
    distance = Math.max(distance, depth + Math.abs(point.dot(right)) / (tangent * Math.max(aspect, 0.01) * 0.7), depth + Math.abs(point.dot(up)) / (tangent * 0.7));
  }
  return Number.isFinite(distance) ? distance : 5;
}

/** Include authored motion, then restore the bind pose before creating the live mixer. */
export function measureAnimatedBounds(THREE: Three, root: import("three").Object3D, clips: import("three").AnimationClip[]) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (!clips.length) return box;
  const mixer = new THREE.AnimationMixer(root);
  for (const clip of clips) {
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    const times = new Set([0, ...clip.tracks.flatMap(track => Array.from(track.times))]);
    for (let index = 0; index <= 24; index++) times.add(clip.duration * index / 24);
    for (const time of [...times].sort((a, b) => a - b)) {
      mixer.setTime(Math.min(time, Math.max(clip.duration - 0.000001, 0)));
      root.updateMatrixWorld(true);
      box.union(new THREE.Box3().setFromObject(root));
    }
    mixer.stopAllAction();
  }
  mixer.uncacheRoot(root);
  root.updateMatrixWorld(true);
  return box.expandByVector(box.getSize(new THREE.Vector3()).multiplyScalar(0.015));
}
