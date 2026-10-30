// Read-only deployment check. Validate bytes, not just HTTP 200 (SPA fallbacks
// and stale CDN targets can otherwise masquerade as healthy AR resources).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const origin = process.env.AR_VERIFY_ORIGIN || 'https://www.timelens.asia';
assert.equal(new URL(origin).protocol, 'https:');
const catalogText = await readFile(new URL('../src/features/ar/ar-catalog.json', import.meta.url), 'utf8');
const catalog = JSON.parse(catalogText);
const manifest = JSON.parse(await readFile(new URL('../media-r2-manifest.json', import.meta.url), 'utf8'));
const paths = new Set(['/assets/cu-chi-targets.mind', '/vendor/ar/aframe-1.5.0.min.js', '/vendor/ar/mindar-image-aframe-1.2.5.js']);
for (const entry of catalog) for (const key of ['model', 'target', 'thumbnail']) paths.add(entry[key]);
const get = async path => {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, path);
  return Buffer.from(await response.arrayBuffer());
};
assert.deepEqual(JSON.parse((await get('/ar-catalog.json')).toString()), catalog, 'Deployed catalog must match the source');
const frame = (await get('/ar.html?artifact=hat')).toString();
assert.match(frame, /<title>TimeLens · Camera AR<\/title>/);
assert.ok(!frame.includes('id="root"'), 'Camera document must not be the SPA');
const queue = [...paths];
let checked = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (queue.length) {
    const path = queue.shift();
    const expected = manifest.files.find(entry => '/' + entry.source === path);
    assert.ok(expected, `Missing manifest entry: ${path}`);
    const bytes = await get(path);
    assert.equal(bytes.length, expected.size, `${path}: size`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, `${path}: SHA-256`);
    checked++;
  }
}));
console.log(`PASS: deployed camera HTML, catalog and ${checked} AR assets match the manifest (SHA-256).`);
