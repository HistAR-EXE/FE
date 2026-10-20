import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

const runtime = fs.readFileSync(new URL('../public/ar-runtime.js', import.meta.url), 'utf8');
const origin = 'https://timelens.test';
const hat = { id: 'hat', model: '/assets/hat.glb', targetIndex: 1, status: 'published' };
const canteen = { id: 'canteen', model: '/assets/artifacts/canteen.glb', targetIndex: 1, status: 'published' };
const review = { ...canteen, id: 'flashlight', status: 'review' };
const settle = () => new Promise((resolve) => setImmediate(resolve));

async function createFrame({ search = '?artifact=canteen', catalog = [hat, canteen, review], loadModel = true, fetchOk = true } = {}) {
  const events = {}, documentEvents = {}, modelEvents = {}, targetEvents = {}, sceneEvents = {};
  const messages = [], frames = new Map();
  const counters = { geometry: 0, material: 0, texture: 0, track: 0, stop: 0, pause: 0, clearTimer: 0 };
  let nextFrame = 0, rendererLoop = 'running';
  const anchor = new THREE.Group(), entity = new THREE.Group();
  // This is the real MindAR hidden-anchor failure mode: an ancestor matrix is NaN.
  anchor.matrixAutoUpdate = false;
  anchor.matrix.elements.fill(NaN);
  anchor.add(entity);
  const texture = new THREE.Texture();
  const geometry = new THREE.BoxGeometry(2, 4, 2);
  const material = new THREE.MeshStandardMaterial({ map: texture });
  geometry.addEventListener('dispose', () => counters.geometry++);
  material.addEventListener('dispose', () => counters.material++);
  texture.addEventListener('dispose', () => counters.texture++);
  const authored = new THREE.Mesh(geometry, material);
  authored.position.set(7, 3, -2);
  authored.animations = [new THREE.AnimationClip('Authored tilt', 1, [new THREE.NumberKeyframeTrack('.rotation[x]', [0, 1], [0, 0.5])])];
  entity.add(authored);
  let currentMesh = authored;
  const model = {
    object3D: entity,
    addEventListener(type, callback) { modelEvents[type] = callback; },
    getObject3D() { return currentMesh; },
    setObject3D(_name, object) { currentMesh = object; entity.add(object); },
    setAttribute(name, value) { if (name === 'position') entity.position.fromArray(value.split(' ').map(Number)); },
  };
  const target = { addEventListener(type, callback) { targetEvents[type] = callback; } };
  const scene = {
    systems: { 'mindar-image-system': { stop() { counters.stop++; } } },
    renderer: { setAnimationLoop(value) { rendererLoop = value; } },
    setAttribute() {},
    addEventListener(type, callback) { sceneEvents[type] = callback; },
    pause() { counters.pause++; },
    querySelector(selector) { return selector.includes('mindar') ? target : model; },
  };
  const error = { textContent: '' };
  const video = { srcObject: { getTracks: () => [{ stop() { counters.track++; } }] } };
  const parent = { postMessage(message, targetOrigin) { messages.push({ ...message, targetOrigin }); } };
  const window = { parent, AFRAME: { THREE }, MINDAR: {}, addEventListener(type, callback) { events[type] = callback; } };
  const document = {
    hidden: false,
    getElementById() { return error; },
    addEventListener(type, callback) { documentEvents[type] = callback; },
    querySelectorAll() { return [video]; },
    createElement() { return scene; },
    body: { appendChild() {} },
  };
  let signal;
  vm.runInNewContext(runtime, {
    window, document, AFRAME: { THREE }, location: { search, origin }, URLSearchParams, AbortController, console,
    setTimeout() { return 1; }, clearTimeout() { counters.clearTimer++; },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
    fetch: async (_url, options) => { signal = options.signal; return { ok: fetchOk, json: async () => catalog }; },
  });
  await settle();
  if (loadModel) modelEvents['model-loaded']?.();
  await settle();
  return {
    authored, anchor, entity, scene, error, messages, counters, frames, video, signal, document,
    get pivot() { return currentMesh; },
    get rendererLoop() { return rendererLoop; },
    command(data, source = parent, messageOrigin = origin) { events.message({ data, source, origin: messageOrigin }); },
    stop() { events['timelens-ar-stop'](); },
    ready() { sceneEvents.arReady(); },
    found() { targetEvents.targetFound(); },
    lost() { targetEvents.targetLost(); },
    hide() { document.hidden = true; documentEvents.visibilitychange(); },
    load() { modelEvents['model-loaded'](); },
    frame(time) { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(time); },
  };
}

const command = { type: 'AR_PRESENTATION', artifact: 'canteen', scale: 1.5, rotation: 45, motion: false };

test('finite detached bounds center an off-origin model without changing the hidden tracking anchor', async () => {
  const frame = await createFrame();
  assert.ok(frame.anchor.matrix.elements.every(Number.isNaN));
  assert.equal(frame.entity.parent, frame.anchor);
  assert.deepEqual(frame.entity.position.toArray(), [0, 0, 0.06]);
  assert.deepEqual(frame.authored.position.toArray(), [7, 3, -2]);
  const normalized = frame.pivot.children[0];
  assert.ok(normalized.scale.x > 0 && normalized.scale.x <= 0.65 / 4);
  for (const rotation of [0, 45, 90, 180]) {
    frame.command({ ...command, scale: 1, rotation });
    const detached = frame.pivot.clone();
    const box = new THREE.Box3().setFromObject(detached);
    assert.ok(box.getCenter(new THREE.Vector3()).length() < 1e-12, 'rotation must keep the model centered');
    assert.ok(box.getSize(new THREE.Vector3()).toArray().every(Number.isFinite));
  }
  frame.stop();
});

test('AR normalization includes the authored animation envelope', async () => {
  const frame = await createFrame();
  for (let i = 0; i <= 24; i++) {
    frame.authored.rotation.x = i * 0.5 / 24;
    const box = new THREE.Box3().setFromObject(frame.pivot.clone());
    const size = box.getSize(new THREE.Vector3());
    assert.ok(Math.max(size.x, size.y, size.z) <= 0.650001, 'animated pose must fit normalized envelope');
  }
  frame.stop();
});

test('presentation messages require the same origin, parent source, exact artifact and finite numeric values', async () => {
  const frame = await createFrame();
  frame.command(command);
  assert.equal(frame.pivot.scale.x, 1.5);
  assert.equal(frame.pivot.rotation.y, Math.PI / 4);
  for (const invalid of [
    { ...command, artifact: 'hat' }, { ...command, scale: Infinity }, { ...command, scale: '2' },
    { ...command, rotation: NaN }, { ...command, motion: 'true' }, null,
  ]) frame.command(invalid);
  frame.command({ ...command, scale: 2 }, {});
  frame.command({ ...command, scale: 2 }, undefined, 'https://foreign.test');
  assert.equal(frame.pivot.scale.x, 1.5);
  frame.command({ ...command, scale: 99, rotation: 1000 });
  assert.equal(frame.pivot.scale.x, 2);
  assert.equal(frame.pivot.rotation.y, Math.PI * 2);
  frame.command({ ...command, scale: -99, rotation: -1000 });
  assert.equal(frame.pivot.scale.x, 0.5);
  assert.equal(frame.pivot.rotation.y, -Math.PI * 2);
  frame.stop();
});

test('catalog selects published models, gates review entries, and falls back to hat', async () => {
  for (const [search, expected] of [
    ['?artifact=canteen', 'canteen.glb'], ['?artifact=flashlight', 'hat.glb'],
    ['?artifact=flashlight&review=1', 'canteen.glb'], ['?artifact=unknown', 'hat.glb'],
  ]) {
    const frame = await createFrame({ search });
    assert.ok(frame.scene.innerHTML.includes(expected));
    frame.ready();
    assert.equal(frame.messages.at(-1).artifact, expected === 'hat.glb' ? 'hat' : search.includes('flashlight') ? 'flashlight' : 'canteen');
    assert.equal(frame.messages.at(-1).targetOrigin, origin);
    frame.stop();
  }
});

test('invalid catalog paths, indexes, and failed catalog requests fail clearly and stop', async () => {
  const cases = [
    { ...hat, model: 'https://foreign.test/model.glb' }, { ...hat, model: '/assets/../secret.glb' },
    { ...hat, model: '/assets/x.glb" onclick="x' }, { ...hat, targetIndex: 2 }, { ...hat, targetIndex: '1' },
  ];
  for (const entry of cases) {
    const frame = await createFrame({ search: '?artifact=hat', catalog: [entry] });
    assert.equal(frame.messages.at(-1).type, 'AR_ERROR');
    assert.ok(frame.error.textContent.includes('danh mục'));
    assert.equal(frame.signal.aborted, true);
    assert.equal(frame.video.srcObject, null);
  }
  const frame = await createFrame({ fetchOk: false });
  assert.equal(frame.messages.at(-1).type, 'AR_ERROR');
  assert.equal(frame.signal.aborted, true);
});

test('authored animation and turntable run only for a visible target and cleanup cancels work and disposes resources once', async () => {
  const frame = await createFrame();
  assert.equal(frame.frames.size, 0, 'AR motion defaults off');
  frame.command({ ...command, rotation: 0, motion: true });
  assert.equal(frame.frames.size, 0, 'an untracked model must not animate');
  frame.found();
  frame.frame(0); frame.frame(50);
  assert.ok(frame.pivot.rotation.y > 0);
  assert.ok(frame.authored.rotation.x > 0, 'the actual GLTF animation clip must advance');
  frame.lost();
  assert.equal(frame.frames.size, 0);
  frame.found();
  assert.equal(frame.frames.size, 1);
  frame.hide();
  assert.equal(frame.frames.size, 0);
  assert.equal(frame.rendererLoop, null);
  assert.equal(frame.video.srcObject, null);
  assert.equal(frame.signal.aborted, true);
  assert.ok(frame.counters.stop > 0 && frame.counters.pause > 0);
  assert.deepEqual([frame.counters.geometry, frame.counters.material, frame.counters.texture, frame.counters.track], [1, 1, 1, 1]);
  frame.stop();
  frame.command(command);
  assert.deepEqual([frame.counters.geometry, frame.counters.material, frame.counters.texture, frame.counters.track], [1, 1, 1, 1]);
  assert.equal(frame.frames.size, 0);
});

test('a model callback arriving after stop releases its resources without scheduling animation', async () => {
  const frame = await createFrame({ loadModel: false });
  frame.stop();
  frame.load();
  await settle();
  assert.deepEqual([frame.counters.geometry, frame.counters.material, frame.counters.texture], [1, 1, 1]);
  assert.equal(frame.frames.size, 0);
});


test('the tenth photo target is accepted and anchored to its own index', async () => {
  const catalog = Array.from({length: 10}, (_, index) => ({ ...hat, id: index === 9 ? 'hat' : 'photo-' + index, targetIndex: index }))
  const frame = await createFrame({ search: '?artifact=hat', catalog })
  assert.ok(frame.scene.innerHTML.includes('targetIndex: 9'))
  frame.stop()
})
