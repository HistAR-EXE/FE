import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

import {
  getPublishedRoleTemplates,
  heritageRoleTemplates,
} from '../src/features/heritage-studio/roleTemplates.ts'

const feRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const expectedStations = {
  ST01: {
    stationName: 'Phòng họp',
    roleSlug: 'can-bo-lien-lac',
    title: 'Cán bộ liên lạc',
    actionKey: 'relay-documents',
    actionLabel: 'Chuyển tài liệu hoặc lắng nghe cuộc họp',
    source3d: {
      stationCode: 'ST01',
      targetKey: 'ST01_MEETING',
      targetKind: 'chamber',
      chamberKind: 'meeting',
      chamberTitle: 'Phòng họp chỉ huy',
      floorLabel: 'Tầng 2',
      figure: { outfit: 'guerrilla', pose: 'stand', prop: 'paper' },
    },
  },
  ST02: {
    stationName: 'Kho ngầm',
    roleSlug: 'can-bo-hau-can',
    title: 'Cán bộ hậu cần',
    actionKey: 'manage-supplies',
    actionLabel: 'Kiểm đếm, sắp xếp lương thực và vật dụng',
    source3d: {
      stationCode: 'ST02',
      targetKey: 'ST02_STORE',
      targetKind: 'chamber',
      chamberKind: 'store',
      chamberTitle: 'Kho vũ khí – lương thực',
      floorLabel: 'Tầng 3',
      figure: { outfit: 'guerrilla', pose: 'carry', prop: 'crate' },
    },
  },
  ST03: {
    stationName: 'Giếng hầm & thông gió',
    roleSlug: 'bao-dam-nuoc-thong-khi',
    title: 'Người bảo đảm nước và thông khí',
    actionKey: 'maintain-water-air',
    actionLabel: 'Lấy nước hoặc ngụy trang lỗ thông hơi',
    source3d: {
      stationCode: 'ST03',
      targetKey: 'ST03_WELL_VENT',
      targetKind: 'callouts',
      calloutTitles: ['Ống thông hơi', 'Giếng nước'],
    },
  },
  ST04: {
    stationName: 'Quân y',
    roleSlug: 'can-bo-quan-y',
    title: 'Cán bộ quân y',
    actionKey: 'provide-medical-care',
    actionLabel: 'Băng bó, chuẩn bị dụng cụ hoặc chăm sóc thương binh',
    source3d: {
      stationCode: 'ST04',
      targetKey: 'ST04_CLINIC',
      targetKind: 'chamber',
      chamberKind: 'clinic',
      chamberTitle: 'Trạm quân y',
      floorLabel: 'Tầng 2',
      figure: { outfit: 'nurse', pose: 'stand' },
    },
  },
  ST05: {
    stationName: 'Xưởng vũ khí',
    roleSlug: 'tho-quan-gioi',
    title: 'Thợ quân giới',
    actionKey: 'repair-tools',
    actionLabel: 'Sửa chữa, gia công hoặc kiểm tra dụng cụ',
    source3d: {
      stationCode: 'ST05',
      targetKey: 'ST05_FACTORY',
      targetKind: 'chamber',
      chamberKind: 'factory',
      chamberTitle: 'Xưởng vũ khí',
      floorLabel: 'Tầng 2',
      figures: [
        { outfit: 'guerrilla', pose: 'hammer', prop: 'hammer' },
        { outfit: 'civilian', pose: 'hammer', prop: 'hammer' },
      ],
    },
  },
  ST06: {
    stationName: 'Hầm phòng thủ',
    roleSlug: 'du-kich-truc-gac',
    title: 'Du kích trực gác',
    actionKey: 'stand-watch',
    actionLabel: 'Quan sát qua lỗ châu mai hoặc truyền tín hiệu cảnh giới',
    source3d: {
      stationCode: 'ST06',
      targetKey: 'ST06_FIRING',
      targetKind: 'chamber',
      chamberKind: 'firing',
      chamberTitle: 'Ụ chiến đấu',
      floorLabel: 'Tầng 1',
      figure: { outfit: 'guerrilla', pose: 'aim', prop: 'rifle' },
    },
  },
}

function expectedAssetPaths(stationCode, roleSlug, roleVariant) {
  const directory = `/images/photo-roles/cu-chi/${stationCode.toLowerCase()}`
  const stem = `${stationCode.toLowerCase()}-${roleSlug}-${roleVariant}`
  return {
    background: `${directory}/${stem}-bg.webp`,
    overlay: `${directory}/${stem}-overlay.webp`,
  }
}

function assertNormalizedRect(rect) {
  assert.ok(rect.x >= 0 && rect.x <= 1)
  assert.ok(rect.y >= 0 && rect.y <= 1)
  assert.ok(rect.width > 0 && rect.x + rect.width <= 1)
  assert.ok(rect.height > 0 && rect.y + rect.height <= 1)
}

function assertDeepFrozen(value) {
  if (value === null || typeof value !== 'object') return
  assert.equal(Object.isFrozen(value), true)
  for (const nestedValue of Object.values(value)) assertDeepFrozen(nestedValue)
}

test('approved catalog exposes canonical runtime assets and keeps variant calibration separate', () => {
  assert.equal(heritageRoleTemplates.length, 12)
  assert.equal(new Set(heritageRoleTemplates.map(({ id }) => id)).size, 12)

  for (const [stationCode, expected] of Object.entries(expectedStations)) {
    const variants = heritageRoleTemplates.filter((template) => template.stationCode === stationCode)
    assert.deepEqual(variants.map(({ roleVariant }) => roleVariant).sort(), ['nam', 'nu'])
    assert.notStrictEqual(variants[0].calibration, variants[1].calibration)

    for (const template of variants) {
      assert.equal(template.id, `${stationCode.toLowerCase()}-${expected.roleSlug}-${template.roleVariant}`)
      assert.equal(template.siteCode, 'cu-chi')
      assert.equal(template.era, 1968)
      assert.equal(template.stationName, expected.stationName)
      assert.equal(template.title, expected.title)
      assert.equal(template.actionKey, expected.actionKey)
      assert.equal(template.actionLabel, expected.actionLabel)
      assert.deepEqual(template.source3d, expected.source3d)
      assert.equal(template.published, true)
      const expectedPaths = expectedAssetPaths(stationCode, expected.roleSlug, template.roleVariant)
      assert.equal(template.assets.background.url, expectedPaths.background)
      assert.equal(template.assets.overlay.url, expectedPaths.overlay)
      assert.equal(template.assets.overlay.hasAlpha, true)
      assert.equal(template.review.status, 'approved')
      assert.equal(template.review.reviewer, 'Chủ dự án TimeLens')
      assert.equal(template.review.reviewedAt, '2026-10-26')
      assert.ok(template.review.note.trim())
      assert.equal('backgroundUrl' in template, false)
      assert.equal('overlayUrl' in template, false)
      assert.deepEqual(template.calibration.canvasSize, { width: 1080, height: 1920 })
      assertNormalizedRect(template.calibration.faceAnchor)
      assert.ok(template.calibration.faceFeather >= 0 && template.calibration.faceFeather <= 1)
    }
  }
})

test('catalog and nested values are immutable at runtime', () => {
  assertDeepFrozen(heritageRoleTemplates)

  assert.throws(() => heritageRoleTemplates.push({}), TypeError)
  assert.throws(() => {
    heritageRoleTemplates[0].title = 'mutated'
  }, TypeError)
})

test('approval JSON agrees exactly with every template publication decision', async () => {
  for (const [stationCode, expected] of Object.entries(expectedStations)) {
    const variants = heritageRoleTemplates.filter((template) => template.stationCode === stationCode)
    const approvalPath = path.join(
      feRoot,
      'public/images/photo-roles/cu-chi',
      stationCode.toLowerCase(),
      'approval.json',
    )
    const approval = JSON.parse(await readFile(approvalPath, 'utf8'))

    assert.equal(approval.stationCode, stationCode)
    assert.deepEqual([...approval.templateIds].sort(), variants.map(({ id }) => id).sort())
    assert.deepEqual(
      approval.templates.map(({ id }) => id).sort(),
      variants.map(({ id }) => id).sort(),
    )
    assert.equal(new Set(variants.map(({ published }) => published)).size, 1)
    assert.equal(
      approval.status,
      variants.every(({ published }) => published) ? 'approved' : 'pending_historical_review',
    )
    if (approval.status === 'pending_historical_review') {
      assert.equal(approval.reviewer, null)
      assert.equal(approval.reviewedAt, null)
    } else {
      assert.ok(approval.reviewer.trim(), `${stationCode} is missing a reviewer signature`)
      assert.match(approval.reviewedAt, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(approval.note.trim())
    }

    for (const template of variants) {
      const templateApproval = approval.templates.find(({ id }) => id === template.id)
      assert.ok(templateApproval, `Missing approval for ${template.id}`)
      assert.deepEqual(
        {
          published: templateApproval.published,
          status: templateApproval.status,
          reviewer: templateApproval.reviewer,
          reviewedAt: templateApproval.reviewedAt,
          note: templateApproval.note,
        },
        {
          published: template.published,
          status: template.review.status,
          reviewer: template.review.reviewer,
          reviewedAt: template.review.reviewedAt,
          note: template.review.note,
        },
      )

      if (!template.published) {
        assert.equal(template.assets, null)
        assert.equal(template.review.status, 'pending_historical_review')
        continue
      }

      assert.equal(template.review.status, 'approved')
      assert.ok(template.review.reviewer.trim(), `${template.id} is missing a reviewer signature`)
      assert.match(template.review.reviewedAt, /^\d{4}-\d{2}-\d{2}$/)
      assert.ok(template.review.note.trim())

      const expectedPaths = expectedAssetPaths(stationCode, expected.roleSlug, template.roleVariant)
      assert.equal(template.assets.background.url, expectedPaths.background)
      assert.equal(template.assets.overlay.url, expectedPaths.overlay)
      assert.equal(template.assets.overlay.hasAlpha, true)

      const backgroundPath = path.join(feRoot, 'public', template.assets.background.url)
      const overlayPath = path.join(feRoot, 'public', template.assets.overlay.url)
      await access(backgroundPath)
      await access(overlayPath)
      const [backgroundMetadata, overlayMetadata] = await Promise.all([
        sharp(backgroundPath).metadata(),
        sharp(overlayPath).metadata(),
      ])
      const expectedSize = template.calibration.canvasSize
      assert.deepEqual(
        { width: backgroundMetadata.width, height: backgroundMetadata.height },
        expectedSize,
      )
      assert.deepEqual(
        { width: overlayMetadata.width, height: overlayMetadata.height },
        expectedSize,
      )
      assert.deepEqual(
        { width: template.assets.background.width, height: template.assets.background.height },
        expectedSize,
      )
      assert.deepEqual(
        { width: template.assets.overlay.width, height: template.assets.overlay.height },
        expectedSize,
      )
      assert.equal(overlayMetadata.hasAlpha, true)
    }
  }

  assert.equal(getPublishedRoleTemplates('cu-chi').length, 12)
  assert.equal(getPublishedRoleTemplates('cu-chi', 'ST01').length, 2)
  assert.deepEqual(getPublishedRoleTemplates('unknown'), [])
})
