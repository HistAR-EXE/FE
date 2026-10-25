import assert from 'node:assert/strict'
import test from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { access, mkdtemp, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { validateHeritageCatalog } from './lib/heritageCatalogValidation.mjs'
import { heritageRoleTemplates } from '../src/features/heritage-studio/roleTemplates.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('approved catalog publishes all 12 roles from canonical public assets', async () => {
  const result = await validateHeritageCatalog({ templates: heritageRoleTemplates, publicRoot: path.join(root, 'public') })
  assert.deepEqual(result, { published: 12, drafts: 0 })
  await access(path.join(root, 'public/images/photo-roles/cu-chi/st01/st01-can-bo-lien-lac-nam-bg.webp'))
  await access(path.join(root, 'public/images/photo-roles/cu-chi/st01/st01-can-bo-lien-lac-nam-overlay.webp'))
  await assert.rejects(access(path.join(root, 'heritage-drafts/cu-chi/st01/st01-can-bo-lien-lac-nam-background.draft.webp')))
})

test('published template requires approved reviewer metadata before asset inspection', async () => {
  const invalid = {
    ...heritageRoleTemplates[0],
    published: true,
    assets: null,
    review: {
      status: 'pending_historical_review',
      reviewer: null,
      reviewedAt: null,
      note: 'Chưa duyệt.',
    },
  }
  await assert.rejects(
    validateHeritageCatalog({ templates: [invalid], publicRoot: path.join(root, 'public') }),
    /approved review metadata/,
  )
})

test('published template requires existing WebP background and transparent overlay', async () => {
  const draft = heritageRoleTemplates[0]
  const invalid = {
    ...draft,
    published: true,
    review: { status: 'approved', reviewer: 'Reviewer', reviewedAt: '2026-10-25', note: 'Approved.' },
    assets: {
      background: { url: '/images/photo-roles/cu-chi/st01/missing-bg.webp', width: 1080, height: 1920 },
      overlay: { url: '/images/photo-roles/cu-chi/st01/missing-overlay.webp', width: 1080, height: 1920, hasAlpha: true },
    },
  }
  await assert.rejects(
    validateHeritageCatalog({ templates: [invalid], publicRoot: path.join(root, 'public') }),
    /missing background asset/,
  )
})

test('published template rejects an opaque overlay even when both WebP files exist', async () => {
  const publicRoot = await mkdtemp(path.join(tmpdir(), 'heritage-catalog-'))
  const assetDir = path.join(publicRoot, 'images/photo-roles/cu-chi/st01')
  await mkdir(assetDir, { recursive: true })
  const backgroundUrl = '/images/photo-roles/cu-chi/st01/test-role-nam-1968-bg.webp'
  const overlayUrl = '/images/photo-roles/cu-chi/st01/test-role-nam-1968-overlay.webp'
  await Promise.all([
    sharp({ create: { width: 1080, height: 1920, channels: 3, background: '#45321f' } }).webp().toFile(path.join(publicRoot, `.${backgroundUrl}`)),
    sharp({ create: { width: 1080, height: 1920, channels: 3, background: '#23170e' } }).webp().toFile(path.join(publicRoot, `.${overlayUrl}`)),
  ])
  const draft = heritageRoleTemplates[0]
  const invalid = {
    ...draft,
    published: true,
    review: { status: 'approved', reviewer: 'Reviewer', reviewedAt: '2026-10-25', note: 'Approved.' },
    assets: {
      background: { url: backgroundUrl, width: 1080, height: 1920 },
      overlay: { url: overlayUrl, width: 1080, height: 1920, hasAlpha: true },
    },
  }
  await assert.rejects(
    validateHeritageCatalog({ templates: [invalid], publicRoot, requireCompleteCatalog: false }),
    /overlay asset must contain transparency/,
  )
})
