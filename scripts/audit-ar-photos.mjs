import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { decode } from '@msgpack/msgpack';
const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await fs.readFile(new URL('src/features/ar/ar-catalog.json', root), 'utf8'));
const bytes = await fs.readFile(new URL('public/assets/cu-chi-targets.mind', root));
const bundle = decode(bytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const photos = [];
for (const item of catalog) {
  const original = await fs.readFile(new URL('public' + item.targetOriginal, root));
  const web = await fs.readFile(new URL('public' + item.target, root));
  const a = await sharp(original).metadata(), b = await sharp(web).metadata();
  if (sha(original) !== item.targetOriginalSha256) throw new Error('Original changed: ' + item.targetPhoto);
  const compiled = bundle.dataList[item.targetIndex];
  photos.push({ artifact: item.id, name: item.name, photo: item.targetPhoto, caption: item.targetCaption,
    targetIndex: item.targetIndex, original: item.targetOriginal, originalBytes: original.length, originalSha256: sha(original),
    sourceSize: [a.width, a.height], sourceExifOrientation: a.orientation ?? 1,
    webImage: item.target, webBytes: web.length, webSize: [b.width, b.height], webSha256: sha(web), channels: b.channels,
    processing: 'Full frame, EXIF orientation applied, longest side 1600px, JPEG quality 95 / 4:4:4; no grayscale, crop, recoloring or overlays',
    compiledSize: [compiled.targetImage.width, compiled.targetImage.height],
    matchingLevels: compiled.matchingData.length, trackingLevels: compiled.trackingData.length,
    matchingFeatures: compiled.matchingData.reduce((n, level) => n + level.maximaPoints.length + level.minimaPoints.length, 0),
    photoCredit: 'Project team, field visit at Cu Chi; supplied by the user',
  });
}
if (photos.length !== 10 || new Set(photos.map(p => p.photo)).size !== 10 || new Set(photos.map(p => p.targetIndex)).size !== 10) throw new Error('Photo mapping must be one-to-one');
await fs.writeFile(new URL('docs/ar-photos-audit.json', root), JSON.stringify({ generated: '2026-10-20', compiler: 'Locally vendored MindAR 1.2.5', bundle: '/assets/cu-chi-targets.mind', bundleBytes: bytes.length, bundleSha256: sha(bytes), photos }, null, 2) + '\n');
for (const photo of photos) console.log(photo.name + ' ← ' + photo.photo + ': ' + photo.matchingFeatures + ' matching features');
