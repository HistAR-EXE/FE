import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../media-r2-manifest.json', import.meta.url), 'utf8'));
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const mediaRewrite = vercel.rewrites.find(route => route.source === '/media/:path*');
if (!mediaRewrite) throw new Error('Missing production /media R2 rewrite');
const origin = new URL(mediaRewrite.destination).origin;
for (const route of vercel.rewrites.filter(route => route.destination.startsWith('https://media.'))) {
  if (new URL(route.destination).origin !== origin) throw new Error(`Mixed R2 rewrite hosts: ${route.source}`);
}

async function check(entry, method, headers = {}) {
  const url = `${origin}/${entry.key.split('/').map(encodeURIComponent).join('/')}`;
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(url, { method, headers: { 'Accept-Encoding': 'identity', ...headers }, signal: AbortSignal.timeout(45000) });
      const expectedStatus = method === 'HEAD' ? 200 : 206;
      if (response.status !== expectedStatus) throw new Error(`HTTP ${response.status}; expected ${expectedStatus}`);
      if (response.headers.get('content-type')?.split(';')[0] !== entry.contentType) throw new Error('Content-Type differs');
      if (method === 'HEAD') {
        const length = response.headers.get('content-length');
        if (length === null) {
          await response.body?.cancel();
          await check(entry, 'GET', { Range: 'bytes=0-1023' });
          return;
        }
        if (Number(length) !== entry.size) throw new Error('Content-Length differs');
      } else if (!response.headers.get('content-range')?.startsWith('bytes 0-')
        || Number(response.headers.get('content-range').split('/')[1]) !== entry.size) {
        throw new Error('Content-Range differs');
      }
      await response.body?.cancel();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  throw new Error(`${entry.key}: ${lastError?.message}`);
}

const entries = manifest.files;
if (!entries?.length || new Set(entries.map(entry => entry.key)).size !== entries.length) {
  throw new Error('R2 manifest is empty or has duplicate keys');
}
let next = 0;
let completed = 0;
const failures = [];
async function worker() {
  while (next < entries.length) {
    const entry = entries[next++];
    try {
      await check(entry, 'HEAD');
      if (entry.contentType.startsWith('video/')) await check(entry, 'GET', { Range: 'bytes=0-1023' });
    } catch (error) {
      failures.push(error.message);
    }
    completed++;
    if (completed % 50 === 0 || completed === entries.length) {
      console.log(`Public R2 media: ${completed}/${entries.length}, ${failures.length} failures`);
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
if (failures.length) throw new Error(`${failures.length}/${entries.length} R2 assets failed:\n${failures.join('\n')}`);
console.log(`Verified ${entries.length}/${entries.length} public R2 media URLs at ${origin}`);
