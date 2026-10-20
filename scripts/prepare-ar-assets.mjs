// Recover the exact grayscale tracking images embedded in the existing MindAR bundle.
// Do not invent replacement images: they must match the compiled descriptors.
import fs from "node:fs/promises";
import { decode } from "@msgpack/msgpack";
import sharp from "sharp";

const root = new URL("../public/assets/", import.meta.url);
const decoded = decode(await fs.readFile(new URL("targets.mind", root)));
for (const [index, id] of ["lamp", "hat"].entries()) {
  const target = decoded.dataList[index].trackingData.reduce((a, b) =>
    a.width > b.width ? a : b,
  );
  const pixels = Buffer.from(target.data.data ?? target.data);
  await fs.writeFile(
    new URL(`target-${id}.png`, root),
    await sharp(pixels, {
      raw: { width: target.width, height: target.height, channels: 1 },
    })
      .png()
      .toBuffer(),
  );
  console.log(
    `target-${id}: ${target.width} × ${target.height}, original index ${index}`,
  );
}

// Resize embedded textures while retaining geometry, materials and buffer view references.
const original = await fs.readFile(new URL("lamp.glb", root));
const jsonLength = original.readUInt32LE(12);
const gltf = JSON.parse(original.subarray(20, 20 + jsonLength).toString());
const binary = original.subarray(28 + jsonLength);
const replacements = new Map();
for (const image of gltf.images ?? []) {
  if (image.bufferView === undefined) continue;
  const view = gltf.bufferViews[image.bufferView];
  const input = binary.subarray(
    view.byteOffset ?? 0,
    (view.byteOffset ?? 0) + view.byteLength,
  );
  const pipeline = sharp(input).resize({
    width: 1024,
    height: 1024,
    fit: "inside",
    withoutEnlargement: true,
  });
  const alpha = (await sharp(input).metadata()).hasAlpha;
  const encoded = await (
    alpha ? pipeline.png() : pipeline.jpeg({ quality: 85 })
  ).toBuffer();
  replacements.set(image.bufferView, encoded);
  image.mimeType = alpha ? "image/png" : "image/jpeg";
}
const chunks = [];
let offset = 0;
for (const [index, view] of gltf.bufferViews.entries()) {
  const content =
    replacements.get(index) ??
    binary.subarray(
      view.byteOffset ?? 0,
      (view.byteOffset ?? 0) + view.byteLength,
    );
  view.byteOffset = offset;
  view.byteLength = content.length;
  chunks.push(content);
  const padding = (4 - (content.length % 4)) % 4;
  if (padding) chunks.push(Buffer.alloc(padding));
  offset += content.length + padding;
}
gltf.buffers[0].byteLength = offset;
let json = Buffer.from(JSON.stringify(gltf));
json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 32)]);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + offset, 8);
header.writeUInt32LE(json.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(offset, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
const optimized = Buffer.concat([header, json, binHeader, ...chunks]);
await fs.writeFile(new URL("lamp-web.glb", root), optimized);
console.log(`lamp: ${original.length} → ${optimized.length} bytes`);
