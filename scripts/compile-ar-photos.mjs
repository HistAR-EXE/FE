// Compile with the same locally vendored MindAR 1.2.5 used by the camera runtime.
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { decode } from '@msgpack/msgpack';
const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const catalog = JSON.parse(await fs.readFile(path.join(publicDir, 'ar-catalog.json'), 'utf8'));
if (catalog.length !== 10 || new Set(catalog.map(x => x.target)).size !== 10 || catalog.some((x, i) => x.targetIndex !== i)) throw new Error('Expected ten unique ordered photo targets');
const mime = { '.js': 'application/javascript', '.jpg': 'image/jpeg', '.JPG': 'image/jpeg', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><html><head><script src="/vendor/ar/aframe-1.5.0.min.js"></script><script src="/vendor/ar/mindar-image-aframe-1.2.5.js"></script></head><body>Local target compiler</body></html>'); return; }
  try {
    const file = path.resolve(publicDir, '.' + decodeURIComponent(pathname));
    if (!file.startsWith(publicDir)) throw new Error('Invalid path');
    const data = await fs.readFile(file); res.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream'); res.end(data);
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(1200000);
  page.on('console', msg => { if (msg.text().startsWith('[compile]')) console.log(msg.text()); });
  page.on('pageerror', error => console.error(error.message));
  await page.goto('http://127.0.0.1:' + server.address().port);
  const encoded = await page.evaluate(async targets => {
    const images = [];
    for (const item of targets) {
      const image = new Image(); image.src = item.target; await image.decode();
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      images.push(canvas);
    }
    const compiler = new window.MINDAR.IMAGE.Compiler(); let last = -1;
    await compiler.compileImageTargets(images, progress => {
      const value = Math.floor(progress / 5) * 5;
      if (value !== last) { last = value; console.log('[compile] ' + value + '%'); }
    });
    const bytes = new Uint8Array(await compiler.exportData());
    let binary = ''; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return btoa(binary);
  }, catalog);
  const bytes = Buffer.from(encoded, 'base64');
  const compiled = decode(bytes);
  if (compiled.dataList.length !== catalog.length || compiled.dataList.some(x => !x.matchingData.length || !x.trackingData.length)) throw new Error('Incomplete compiled targets');
  await fs.writeFile(path.join(publicDir, 'assets/cu-chi-targets.mind'), bytes);
  console.log('Compiled ' + catalog.length + ' unique field photos: ' + bytes.length + ' bytes');
} finally {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
}
