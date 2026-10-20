// Repack embedded textures only; geometry, animation and attribution stay intact.
// Usage: node scripts/optimize-ar-glb.mjs original.glb optimized.glb
import fs from 'node:fs/promises';
import sharp from 'sharp';

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Provide input and output GLB paths');
const bytes = await fs.readFile(input);
if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2) throw new Error('Expected GLB v2');
const length = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + length));
if (gltf.buffers.length !== 1 || gltf.buffers[0].uri) throw new Error('Expected one embedded buffer');
const binary = bytes.subarray(28 + length);
const replacements = new Map();
for (const image of gltf.images ?? []) {
  if (image.bufferView === undefined) throw new Error('External images unsupported');
  const view = gltf.bufferViews[image.bufferView];
  const raw = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  const opaque = (await sharp(raw).stats()).isOpaque;
  const pipeline = sharp(raw).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true });
  replacements.set(image.bufferView, await (opaque ? pipeline.removeAlpha().jpeg({ quality: 90 }) : pipeline.png()).toBuffer());
  image.mimeType = opaque ? 'image/jpeg' : 'image/png';
}
const chunks = [];
let offset = 0;
for (const [index, view] of gltf.bufferViews.entries()) {
  const content = replacements.get(index) ?? binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
  view.byteOffset = offset;
  view.byteLength = content.length;
  chunks.push(content);
  const padding = (4 - content.length % 4) % 4;
  if (padding) chunks.push(Buffer.alloc(padding));
  offset += content.length + padding;
}
gltf.buffers[0].byteLength = offset;
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset); binHeader.writeUInt32LE(0x004e4942, 4);
const optimized = Buffer.concat([header, json, binHeader, ...chunks]);
await fs.writeFile(output, optimized);
console.log(`${bytes.length} -> ${optimized.length} bytes`);
