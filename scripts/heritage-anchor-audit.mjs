import sharp from 'sharp'
import { heritageRoleTemplates } from '../src/features/heritage-studio/roleTemplates.ts'

const mediaBase = (process.env.VITE_MEDIA_BASE_URL || 'https://media.timelens.asia').replace(/\/$/, '')
const threshold = 0.03

async function alphaBounds(url, declared) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${response.status} ${url}`)
  const { data, info } = await sharp(Buffer.from(await response.arrayBuffer())).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const x0 = Math.max(0, Math.floor(declared.x * info.width))
  const y0 = Math.max(0, Math.floor(declared.y * info.height))
  const x1 = Math.min(info.width, Math.ceil((declared.x + declared.width) * info.width))
  const y1 = Math.min(info.height, Math.ceil((declared.y + declared.height) * info.height))
  let minX = x1, minY = y1, maxX = x0, maxY = y0
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) {
    if (data[(y * info.width + x) * info.channels + 3] === 0) {
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
    }
  }
  if (minX >= maxX || minY >= maxY) throw new Error(`no transparent face hole in ${url}`)
  return { x: minX / info.width, y: minY / info.height, width: (maxX - minX + 1) / info.width, height: (maxY - minY + 1) / info.height }
}

const rows = []
for (const role of heritageRoleTemplates) {
  const declared = role.calibration.faceAnchor
  const overlay = `${mediaBase}${role.assets.overlay.url}`
  const measured = await alphaBounds(overlay, declared)
  const delta = ['x', 'y', 'width', 'height'].map((key) => measured[key] - declared[key])
  rows.push({ id: role.id, declared, measured, delta })
}

console.log('id | anchor khai báo | anchor đo được | Δx Δy Δw Δh')
for (const row of rows) {
  console.log(`${row.id} | ${JSON.stringify(row.declared)} | ${JSON.stringify(row.measured)} | ${row.delta.map((value) => value.toFixed(4)).join(' ')}`)
}
const failed = rows.filter((row) => row.delta.some((value) => Math.abs(value) > threshold))
if (failed.length) process.exitCode = 1
