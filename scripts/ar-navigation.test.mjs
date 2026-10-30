import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Evaluate the actual Vite configuration without starting Vite or its plugins.
const source = fs.readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')
  .replace(/^import .* from .*$/gm, '')
  .replace('export default', `const defineConfig = value => value;
    const react = () => null, tailwindcss = () => null, VitePWA = options => options;
    export default`);
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { default: config } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
globalThis.self = globalThis;
const { NavigationRoute } = await import('workbox-routing/NavigationRoute.js');
const options = config({ command: 'build' }).plugins.find(plugin => plugin?.workbox).workbox;
const route = new NavigationRoute(() => new Response('app shell'), { denylist: options.navigateFallbackDenylist });
const matches = path => route.match({ url: new URL(path, 'https://timelens.test'), request: { mode: 'navigate' } });

test('PWA never replaces standalone AR frames with the SPA, including artifact and recovery queries', () => {
  for (const path of ['/ar.html', '/ar.html?artifact=hat', '/ar.html?artifact=lamp&review=1', '/ar.html?artifact=hat&v=2']) {
    assert.equal(matches(path), false, `${path} must reach the standalone camera document`);
  }
});

test('PWA still serves the app shell for QR camera deep links and target cards', () => {
  for (const path of ['/ar-experience?artifact=hat&view=camera', '/ar-experience?artifact=lamp&view=target']) {
    assert.equal(matches(path), true, path);
  }
});
