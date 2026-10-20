// Preserve originals byte-for-byte; web copies keep color, full framing and EXIF orientation.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
const sourceDir = process.argv[2];
if (!sourceDir) throw new Error('Usage: node scripts/prepare-ar-photos.mjs <source-directory>');
const root = new URL('../', import.meta.url);
const mapping = [
  ['hat', 'DSCF9675.JPG', 'Mô hình chiến sĩ bên võng tại khu di tích'],
  ['lamp', 'DSCF9765.JPG', 'Không gian sinh hoạt được tái hiện trong nhà'],
  ['canteen', 'DSCF9786.JPG', 'Cảnh chuẩn bị thực phẩm và tiếp tế'],
  ['compass', 'DSCF9770.JPG', 'Cảnh người dân trên lối đi trong khu di tích'],
  ['binoculars', 'DSCF9691.JPG', 'Cảnh người dân và chiến sĩ tại khu tái hiện'],
  ['shovel', 'DSCF9805.JPG', 'Cảnh lao động với công cụ thủ công'],
  ['pot', 'DSCF9792.JPG', 'Khu tái hiện bếp Hoàng Cầm'],
  ['rifle', 'DSCF9756.JPG', 'Mô hình chiến sĩ chào trong khu tái hiện'],
  ['flashlight', 'DSCF9806.JPG', 'Cảnh người dân tại cửa hầm'],
  ['firstaid', 'DSCF9803.JPG', 'Cảnh chăm sóc người bị thương'],
];
const catalogPath = new URL('src/features/ar/ar-catalog.json', root);
const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
if (catalog.length !== mapping.length || mapping.some(([id], i) => catalog[i].id !== id)) throw new Error('Unexpected catalog order; review mapping before regenerating');
await fs.mkdir(new URL('public/assets/ar-targets/originals/', root), { recursive: true });
for (const [index, [id, file, caption]] of mapping.entries()) {
  const bytes = await fs.readFile(path.join(sourceDir, file));
  await fs.writeFile(new URL('public/assets/ar-targets/originals/' + file, root), bytes);
  const target = '/assets/ar-targets/' + file.replace('.JPG', '.jpg');
  await sharp(bytes).autoOrient().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(fileURLToPath(new URL('public' + target, root)));
  Object.assign(catalog[index], {
    target, targetIndex: index, targetOriginal: '/assets/ar-targets/originals/' + file,
    targetOriginalSha256: createHash('sha256').update(bytes).digest('hex'), targetPhoto: file,
    targetCaption: caption,
    recognitionCard: 'Ảnh màu thực địa do nhóm chụp tại Củ Chi · ' + file + '. Chỉ ảnh này mở mô hình ' + catalog[index].name + '; quét toàn bộ ảnh, không quét vật thể thật.',
  });
  console.log(id + ' ← ' + file);
}
await fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
await import('./sync-ar-catalog.mjs');
