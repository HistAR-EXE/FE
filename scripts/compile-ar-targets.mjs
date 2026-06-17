/**
 * Optional: compile MindAR .mind targets when mind-ar + canvas are available (Linux CI).
 * Runtime FE uses Three.js overlay on camera until .mind integration is pinned.
 */
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public/ar/cu-chi/targets')
mkdirSync(outDir, { recursive: true })
console.log('AR target compile skipped — install mind-ar in CI with canvas, or use demo/sim + webcam overlay modes.')
