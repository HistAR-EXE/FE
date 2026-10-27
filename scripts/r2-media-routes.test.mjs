import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../media-r2-manifest.json', import.meta.url), 'utf8'));
const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const r2Routes = config.rewrites.filter(route => route.destination.startsWith('https://media.timelens.asia/'));

function rewriteFor(path) {
  return r2Routes.find(route => route.source.endsWith('/:path*')
    ? path.startsWith(route.source.slice(0, -7) + '/')
    : path === route.source);
}

test('every inventoried public media key has a same-origin R2 rewrite', () => {
  for (const entry of manifest.files) {
    const path = `/${entry.key}`;
    const route = rewriteFor(path);
    assert.ok(route, `Missing R2 rewrite for ${path}`);
    if (route.source.endsWith('/:path*')) {
      assert.equal(route.destination, `https://media.timelens.asia${route.source}`);
    } else {
      assert.equal(route.destination, `https://media.timelens.asia${path}`);
    }
  }
});

test('mixed assets keep their model and Vite build paths outside media rewrites', () => {
  for (const path of ['/assets/artifacts/hat.glb', '/assets/hat.mind', '/assets/index-a1b2c3.js', '/artifacts', '/artifacts/artifact-id']) {
    assert.equal(rewriteFor(path), undefined, path);
  }
  const spaFallback = config.rewrites.at(-1).source;
  assert.ok(spaFallback.includes('artifacts/cu-chi/'));
  assert.ok(!spaFallback.includes('|artifacts/|'));
});

test('the versioned map image follows the manifest key', () => {
  const hero = manifest.files.find(entry => entry.source === 'media/cu-chi/map/hero.jpg');
  assert.ok(hero);
  const mapSource = readFileSync(new URL('../src/features/panorama/cuChiTourMapLayout.ts', import.meta.url), 'utf8');
  assert.ok(mapSource.includes(`CU_CHI_MAP_HERO = '/${hero.key}'`));
});

test('diorama sound paths point to uploaded audio', () => {
  const source = readFileSync(new URL('../src/features/diorama/BattleDioramaViewer.tsx', import.meta.url), 'utf8');
  const uploaded = new Set(manifest.files.map(entry => `/${entry.key}`));
  for (const [, path] of source.matchAll(/src="(\/huy\/[^" ]+\.mp3)"/g)) {
    assert.ok(uploaded.has(path), `Missing R2 audio: ${path}`);
  }
});
