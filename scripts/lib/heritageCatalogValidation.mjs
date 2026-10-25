import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const ASSET_URL = /^\/images\/photo-roles\/cu-chi\/(st0[1-6])\/[a-z0-9-]+-(?:bg|overlay)\.webp$/
const STATIONS = ['ST01', 'ST02', 'ST03', 'ST04', 'ST05', 'ST06']
const STAGE_ORDER = ['gate-a', 'gate-b', 'gate-c']

function fail(template, message) {
  throw new Error(`${template.id}: ${message}`)
}

function approvedReview(template) {
  const review = template.review
  return review?.status === 'approved'
    && typeof review.reviewer === 'string' && review.reviewer.trim().length > 0
    && typeof review.reviewedAt === 'string' && DATE_ONLY.test(review.reviewedAt)
    && !Number.isNaN(Date.parse(`${review.reviewedAt}T00:00:00Z`))
    && typeof review.note === 'string' && review.note.trim().length > 0
}

function resolveAsset(publicRoot, template, kind) {
  const asset = template.assets?.[kind]
  if (!asset || typeof asset.url !== 'string' || !ASSET_URL.test(asset.url)) {
    fail(template, `${kind} asset must use a canonical same-origin WebP URL`)
  }
  const expectedDir = `/images/photo-roles/cu-chi/${template.stationCode.toLowerCase()}/`
  if (!asset.url.startsWith(expectedDir)) fail(template, `${kind} asset belongs to the wrong station`)
  const publicPath = path.resolve(publicRoot)
  const assetPath = path.resolve(publicPath, `.${asset.url}`)
  if (!assetPath.startsWith(`${publicPath}${path.sep}`)) fail(template, `${kind} asset escapes public root`)
  return { asset, assetPath }
}

async function validateImage(template, publicRoot, kind) {
  const { asset, assetPath } = resolveAsset(publicRoot, template, kind)
  try {
    await access(assetPath)
  } catch {
    fail(template, `missing ${kind} asset: ${asset.url}`)
  }
  const metadata = await sharp(assetPath).metadata()
  if (metadata.format !== 'webp') fail(template, `${kind} asset is not WebP`)
  const expected = template.calibration.canvasSize
  if (metadata.width !== expected.width || metadata.height !== expected.height) {
    fail(template, `${kind} asset must be ${expected.width}x${expected.height}`)
  }
  if (asset.width !== expected.width || asset.height !== expected.height) {
    fail(template, `${kind} metadata dimensions do not match calibration`)
  }
  if (kind === 'overlay' && (asset.hasAlpha !== true || metadata.hasAlpha !== true)) {
    fail(template, 'overlay asset must contain transparency')
  }
}

async function validateDraftImage(template, draftRoot, kind) {
  const suffix = kind === 'background' ? 'background.draft.webp' : 'overlay.draft.webp'
  const assetPath = path.join(
    draftRoot,
    'cu-chi',
    template.stationCode.toLowerCase(),
    `${template.id}-${suffix}`,
  )
  try {
    await access(assetPath)
  } catch {
    fail(template, `missing ${kind} draft asset`)
  }
  const metadata = await sharp(assetPath).metadata()
  const expected = template.calibration.canvasSize
  if (metadata.format !== 'webp' || metadata.width !== expected.width || metadata.height !== expected.height) {
    fail(template, `${kind} draft asset must be ${expected.width}x${expected.height} WebP`)
  }
  if (kind === 'overlay' && metadata.hasAlpha !== true) {
    fail(template, 'overlay draft asset must contain transparency')
  }
}

async function validateApproval(publicRoot, stationCode, templates) {
  const approvalPath = path.join(publicRoot, 'images', 'photo-roles', 'cu-chi', stationCode.toLowerCase(), 'approval.json')
  const approval = JSON.parse(await readFile(approvalPath, 'utf8'))
  const published = templates.every((template) => template.published)
  if (approval.stationCode !== stationCode) throw new Error(`${stationCode}: approval stationCode mismatch`)
  if (approval.status !== (published ? 'approved' : 'pending_historical_review')) throw new Error(`${stationCode}: approval status mismatch`)
  if (!Array.isArray(approval.historicalCaveats) || approval.historicalCaveats.length === 0 || approval.historicalCaveats.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new Error(`${stationCode}: historical caveats are required`)
  }
  const expectedIds = templates.map((template) => template.id).sort()
  if (JSON.stringify([...approval.templateIds].sort()) !== JSON.stringify(expectedIds)) throw new Error(`${stationCode}: approval templateIds mismatch`)
  if (JSON.stringify(approval.templates.map((item) => item.id).sort()) !== JSON.stringify(expectedIds)) throw new Error(`${stationCode}: per-template approval mismatch`)
  for (const template of templates) {
    const item = approval.templates.find((entry) => entry.id === template.id)
    for (const key of ['published', 'status', 'reviewer', 'reviewedAt', 'note']) {
      const expected = key === 'published' ? template.published : template.review[key]
      if (item[key] !== expected) throw new Error(`${template.id}: approval ${key} mismatch`)
    }
  }
}

export async function validateHeritageCatalog({
  templates,
  publicRoot,
  draftRoot = path.resolve(publicRoot, '..', 'heritage-drafts'),
  requireCompleteCatalog = true,
}) {
  const ids = new Set()
  for (const template of templates) {
    if (ids.has(template.id)) fail(template, 'duplicate template id')
    ids.add(template.id)
    if (!template.published) {
      if (template.assets !== null) fail(template, 'draft template must not expose runtime assets')
      if (template.review?.status !== 'pending_historical_review' || template.review.reviewer !== null || template.review.reviewedAt !== null) {
        fail(template, 'draft template must remain pending historical review')
      }
      await validateDraftImage(template, draftRoot, 'background')
      await validateDraftImage(template, draftRoot, 'overlay')
      continue
    }
    if (!approvedReview(template)) fail(template, 'published template requires approved review metadata')
    await validateImage(template, publicRoot, 'background')
    await validateImage(template, publicRoot, 'overlay')
  }

  if (requireCompleteCatalog) {
    if (templates.length !== 12) throw new Error('heritage catalog must contain exactly 12 templates')
    for (const stationCode of STATIONS) {
      const stationTemplates = templates.filter((template) => template.stationCode === stationCode)
      if (stationTemplates.length !== 2 || stationTemplates.map((template) => template.roleVariant).sort().join(',') !== 'nam,nu') {
        throw new Error(`${stationCode}: catalog requires nam and nu variants`)
      }
      if (new Set(stationTemplates.map((template) => template.published)).size !== 1) {
        throw new Error(`${stationCode}: both variants must publish together`)
      }
      await validateApproval(publicRoot, stationCode, stationTemplates)
    }
    const stageState = new Map(STAGE_ORDER.map((stage) => [stage, templates.filter((template) => template.releaseStage === stage).every((template) => template.published)]))
    if (stageState.get('gate-b') && !stageState.get('gate-a')) throw new Error('gate-b cannot publish before gate-a')
    if (stageState.get('gate-c') && (!stageState.get('gate-a') || !stageState.get('gate-b'))) throw new Error('gate-c cannot publish before earlier gates')
  }

  return {
    published: templates.filter((template) => template.published).length,
    drafts: templates.filter((template) => !template.published).length,
  }
}
