import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../', import.meta.url);
const catalog = JSON.parse(await fs.readFile(new URL('src/features/ar/ar-catalog.json', root), 'utf8'));
const assets = [];
for (const item of catalog) {
  const bytes = await fs.readFile(new URL(`public${item.model}`, root));
  const length = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + length));
  const triangles = gltf.meshes.flatMap(mesh => mesh.primitives).reduce((sum, primitive) => {
    const count = gltf.accessors[primitive.indices ?? primitive.attributes.POSITION].count;
    return sum + ((primitive.mode ?? 4) === 4 ? count / 3 : 0);
  }, 0);
  assets.push({
    id: item.id, name: item.name, status: item.status, model: item.model,
    bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'),
    triangles, meshes: gltf.meshes.length, animations: (gltf.animations ?? []).map(clip => clip.name ?? 'Unnamed clip'),
    embeddedTextures: gltf.images?.length ?? 0, source: item.source,
    displayAuthor: item.author, embeddedAttribution: gltf.asset.extras ?? {}, license: item.license,
    acquisition: ['hat', 'lamp'].includes(item.id) ? 'Existing project asset' : 'Sketchfab official download dialog, GLB 1K, 2026-10-20',
    modifications: item.id === 'lamp' ? 'Existing web texture optimization; geometry retained'
      : 'None; downloaded GLB unchanged',
    historicalVerification: 'Illustrative model; not authenticated as a Cu Chi museum artifact',
  });
}
await fs.writeFile(new URL('docs/ar-assets-audit.json', root), JSON.stringify({ generated: '2026-10-20', assets }, null, 2) + '\n');
for (const item of assets) console.log(`${item.id}: ${(item.bytes / 1048576).toFixed(2)} MiB, ${item.triangles} triangles, ${item.animations.length} clips`);
