import { open, stat, rename, rm, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';

export async function isLfsPointer(file) {
  const handle = await open(file, 'r');
  const header = Buffer.alloc(128);
  try { await handle.read(header, 0, header.length, 0); }
  finally { await handle.close(); }
  return header.toString().startsWith('version https://git-lfs.github.com/spec/v1');
}

export async function verifyFilm(file, expected) {
  if (await isLfsPointer(file)) {
    throw new Error(`${file}: Git LFS pointer instead of video. Run git lfs pull or enable Git LFS in Vercel Project Settings > Git, then redeploy.`);
  }
  const handle = await open(file, 'r');
  const header = Buffer.alloc(8);
  try { await handle.read(header, 0, 8, 0); }
  finally { await handle.close(); }
  if (header.toString('ascii', 4, 8) !== 'ftyp') throw new Error(`${file}: invalid MP4 header`);
  if ((await stat(file)).size !== expected.size) throw new Error(`${file}: incorrect video size`);
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  if (hash.digest('hex') !== expected.sha256) throw new Error(`${file}: SHA256 mismatch`);
}

export async function restoreFilm(file, expected, url, fetchImpl = fetch) {
  const temporary = `${file}.download`;
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(300000) });
    if (!response.ok || !response.body) throw new Error(`Film download failed: HTTP ${response.status}`);
    await pipeline(response.body, createWriteStream(temporary, { flags: 'wx' }));
    await verifyFilm(temporary, expected);
    await rename(temporary, file);
  } finally { await rm(temporary, { force: true }); }
}

export async function verifyPublicFilm(entry, url, fetchImpl = fetch) {
  const response = await fetchImpl(url, { headers: { Range: 'bytes=0-1023' }, signal: AbortSignal.timeout(45000) });
  if (response.status !== 206) throw new Error(`${entry.key}: R2 did not return HTTP 206`);
  if (response.headers.get('content-type')?.split(';')[0] !== 'video/mp4') throw new Error(`${entry.key}: wrong R2 Content-Type`);
  const range = response.headers.get('content-range');
  if (!range?.startsWith('bytes 0-') || Number(range.split('/')[1]) !== entry.size) throw new Error(`${entry.key}: wrong R2 Content-Range`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.toString('ascii', 4, 8) !== 'ftyp') throw new Error(`${entry.key}: invalid R2 MP4 header`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const manifest = JSON.parse(await readFile(new URL('../media-r2-manifest.json', import.meta.url), 'utf8'));
  const films = manifest.files.filter(entry => entry.source.startsWith('films/') && entry.contentType === 'video/mp4');
  if (films.length !== 5) throw new Error(`Expected 5 film assets in R2 manifest; found ${films.length}`);
  for (const entry of films) {
    await verifyPublicFilm(entry, `https://media.timelens.asia/${entry.key}`);
    console.log(`Verified R2 MP4: ${entry.key} (${entry.size} bytes)`);
    const file = fileURLToPath(new URL(`../public/${entry.source}`, import.meta.url));
    if (existsSync(file)) {
      await verifyFilm(file, entry);
      console.log(`Verified local MP4: ${entry.source} (${entry.size} bytes)`);
    }
  }
}
