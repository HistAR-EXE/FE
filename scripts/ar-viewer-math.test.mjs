import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const path = new URL('../src/features/ar/viewerMath.ts', import.meta.url);
const source = fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : '';
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { fitSphereDistance } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

function fit(radius, aspect) {
  assert.equal(typeof fitSphereDistance, 'function', 'viewer must provide aspect-aware sphere fitting');
  return fitSphereDistance(radius, 35, aspect);
}

function projectedFraction(radius, distance, aspect) {
  const tangent = Math.tan(35 * Math.PI / 360) * Math.min(1, aspect);
  return radius / Math.sqrt(distance * distance - radius * radius) / tangent;
}

test('sphere occupies 70% of the limiting viewport dimension across portrait and landscape', () => {
  for (const aspect of [0.35, 0.6, 1, 16 / 9, 3]) {
    const distance = fit(1.4, aspect);
    assert.ok(Math.abs(projectedFraction(1.4, distance, aspect) - 0.7) < 1e-10);
    assert.ok(distance > 1.4);
  }
});

test('portrait refit backs away while scaling the artifact preserves the same framing', () => {
  assert.ok(fit(1, 0.5) > fit(1, 2));
  assert.ok(Math.abs(fit(4, 1) / fit(1, 1) - 4) < 1e-10);
});

test('degenerate bounds and hidden viewport measurements still yield finite safe distances', () => {
  for (const radius of [0, NaN, Infinity]) {
    for (const aspect of [0, NaN, Infinity]) {
      const distance = fit(radius, aspect);
      assert.ok(Number.isFinite(distance) && distance > 0);
    }
  }
});

test('projected box fit fills 70% for broadside flat and elongated artifacts', async () => {
  const THREE = await import('three');
  const helpers = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  assert.equal(typeof helpers.fitBoxDistance, 'function');
  const direction = new THREE.Vector3(0, 0.2, 1).normalize();
  for (const dimensions of [[2, 0.5, 0.5], [0.3, 2, 0.2], [2, 0.2, 0.2]]) {
    const box = new THREE.Box3(new THREE.Vector3(...dimensions).multiplyScalar(-0.5), new THREE.Vector3(...dimensions).multiplyScalar(0.5));
    for (const aspect of [0.6, 1, 2]) {
      const distance = helpers.fitBoxDistance(THREE, box, direction, 35, aspect);
      const camera = new THREE.PerspectiveCamera(35, aspect, 0.001, 100);
      camera.position.copy(direction).multiplyScalar(distance); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
      let maximum = 0;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        maximum = Math.max(maximum, Math.abs(point.x), Math.abs(point.y));
      }
      assert.ok(Math.abs(maximum - 0.7) < 1e-10);
    }
  }
});

test('animation envelope covers keyframe expansion and restores the authored rest pose', async () => {
  const THREE = await import('three');
  const helpers = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
  assert.equal(typeof helpers.measureAnimatedBounds, 'function');
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  mesh.position.set(4, 2, -1);
  const clips = [new THREE.AnimationClip('Expand', 3, [new THREE.VectorKeyframeTrack('.scale', [0, 2.64, 3], [1, 1, 1, 2.15, 2.15, 2.15, 1, 1, 1])])];
  const box = helpers.measureAnimatedBounds(THREE, mesh, clips);
  assert.ok(box.getSize(new THREE.Vector3()).y >= 2.15 * 1.03);
  assert.deepEqual(mesh.scale.toArray(), [1, 1, 1]);
  assert.deepEqual(mesh.position.toArray(), [4, 2, -1]);
  assert.ok(box.getCenter(new THREE.Vector3()).distanceTo(mesh.position) < 1e-10);
  mesh.geometry.dispose(); mesh.material.dispose();
});
