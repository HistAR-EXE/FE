// Exercise the generated production service worker, not Vite's dev server.
// No CDN requests, physical camera, check-ins or account writes are needed.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const types = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/pwa-ar-test') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<title>AR PWA regression</title>');
    return;
  }
  const file = resolve(root, '.' + path);
  if (!file.startsWith(root)) { response.writeHead(403).end(); return; }
  try {
    const bytes = await readFile(file);
    response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    response.end(bytes);
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  // Suppress external dependencies: this test verifies routing, not tracking.
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || url.pathname.startsWith('/vendor/')) return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(origin + '/pwa-ar-test');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  for (const suffix of ['?artifact=hat', '?artifact=lamp&review=1']) {
    await page.evaluate(suffix => {
      document.querySelector('iframe')?.remove();
      const frame = document.createElement('iframe');
      frame.src = '/ar.html' + suffix;
      frame.allow = 'camera';
      document.body.append(frame);
    }, suffix);
    const frame = page.frameLocator('iframe');
    await frame.locator('title').waitFor({ state: 'attached' });
    assert.equal(await frame.locator('title').textContent(), 'TimeLens · Camera AR');
    assert.equal(await frame.locator('#root').count(), 0, 'AR must not render the SPA 404');
    assert.equal(await frame.locator('script[src="/ar-runtime.js"]').count(), 1);
  }
  // Cached navigation must still open the public QR destination as an SPA.
  const response = await page.goto(origin + '/ar-experience?artifact=lamp&view=camera');
  assert.equal(response.fromServiceWorker(), true);
  assert.equal(await page.locator('#root').count(), 1);
  console.log('PASS: installed production PWA preserves AR iframe queries and QR camera deep links.');
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
