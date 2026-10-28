import { cp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { resolve, relative, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, 'public');
const stage = resolve(root, '.r2-public-build');
if (stage === root || !stage.startsWith(resolve(root) + sep)) {
  throw new Error('Refusing to replace a public staging directory outside FE');
}

const manifest = JSON.parse(await readFile(new URL('../media-r2-manifest.json', import.meta.url), 'utf8'));
const migrated = new Set(manifest.files.map(entry => entry.source));
const mediaExtension = /\.(?:jpe?g|png|webp|gif|svg|avif|mp4|webm|mov|mp3|wav|ogg|m4a)$/i;
let kept = 0;

await rm(stage, { recursive: true, force: true });
async function copyTree(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const from = join(directory, item.name);
    if (item.isDirectory()) {
      await copyTree(from);
    } else if (item.isFile()) {
      const rel = relative(source, from).replaceAll('\\', '/');
      if (migrated.has(rel)) continue;
      // Reviewed Cu Chi videos ship with the app until a CDN migration is explicitly performed.
      const bundledExploreVideo = /^videos\/cu-chi\/[a-z-]+\.(mp4|jpg)$/.test(rel);
      if (mediaExtension.test(rel) && !bundledExploreVideo) throw new Error(`Public media is missing from R2 manifest: ${rel}`);
      const to = join(stage, rel);
      await mkdir(resolve(to, '..'), { recursive: true });
      await cp(from, to);
      kept++;
    }
  }
}
await mkdir(stage, { recursive: true });
await copyTree(source);
console.log(`Staged ${kept} non-media public files for build; R2 media excluded`);
