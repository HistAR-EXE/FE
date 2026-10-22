import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyFilm } from './verify-film-assets.mjs';

test('rejects a Git LFS pointer even when named mp4', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'film-check-'));
  try {
    const file = join(dir, 'film.mp4');
    await writeFile(file, 'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 1000\n');
    await assert.rejects(verifyFilm(file, { size: 1000, sha256: 'abc' }), /Git LFS/);
  } finally { await rm(dir, { recursive: true }); }
});

test('accepts verified MP4 and rejects corrupted bytes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'film-check-'));
  try {
    const file = join(dir, 'film.mp4');
    const bytes = Buffer.from('0000ftypisom0000');
    const expected = { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    await writeFile(file, bytes);
    await verifyFilm(file, expected);
    await writeFile(file, Buffer.from('0000ftypisom0001'));
    await assert.rejects(verifyFilm(file, expected), /SHA256/);
  } finally { await rm(dir, { recursive: true }); }
});

test('restores a pointer atomically and never replaces it with an invalid download', async () => {
  const { restoreFilm } = await import('./verify-film-assets.mjs');
  const { readFile } = await import('node:fs/promises');
  const dir = await mkdtemp(join(tmpdir(), 'film-check-'));
  try {
    const file = join(dir, 'film.mp4');
    const pointer = 'version https://git-lfs.github.com/spec/v1\n';
    const bytes = Buffer.from('0000ftypisom0000');
    const expected = { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    await writeFile(file, pointer);
    await assert.rejects(restoreFilm(file, expected, 'https://example.test/film', async () => new Response('bad')));
    assert.equal(await readFile(file, 'utf8'), pointer);
    await restoreFilm(file, expected, 'https://example.test/film', async () => new Response(bytes));
    assert.deepEqual(await readFile(file), bytes);
  } finally { await rm(dir, { recursive: true }); }
});
