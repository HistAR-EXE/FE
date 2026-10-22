import { open, stat, rename, rm } from 'node:fs/promises';
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const films = [
    ['cu-chi-1080p-v3.mp4', 327231485, 'e2deb168530b90f8af87f863f2b7fcf0f05b2f5357e602dd9f2117186a4f6d35'],
    ['cu-chi-v2.mp4', 64691040, 'c7de7db8e5bee59063e852961df4d88fdc8c10a2615777a20f70e2acf0a315bf'],
  ];
  for (const [name, size, sha256] of films) {
    const file = fileURLToPath(new URL(`../public/films/${name}`, import.meta.url));
    const expected = { size, sha256 };
    if (process.env.VERCEL === '1' && await isLfsPointer(file)) {
      const commit = process.env.VERCEL_GIT_COMMIT_SHA;
      if (!/^[a-f0-9]{40}$/i.test(commit || '')) throw new Error('Missing VERCEL_GIT_COMMIT_SHA: cannot restore film from an immutable commit');
      console.log(`Restoring Git LFS media for build: ${name}`);
      await restoreFilm(file, expected, `https://media.githubusercontent.com/media/HistAR-EXE/FE/${commit}/public/films/${name}`);
    }
    await verifyFilm(file, expected);
    console.log(`Verified MP4: ${name} (${size} bytes)`);
  }
}
