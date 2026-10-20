import { copyFileSync } from 'node:fs'

// Keep the standalone camera frame on the same metadata as the React app.
copyFileSync(
  new URL('../src/features/ar/ar-catalog.json', import.meta.url),
  new URL('../public/ar-catalog.json', import.meta.url),
)
