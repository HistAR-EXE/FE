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
    title: 'Cán bộ liên lạc',
    actionKey: 'relay-documents',
    actionLabel: 'Chuyển tài liệu hoặc lắng nghe cuộc họp',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST01_MEETING',
      floorLabel: 'Tầng 2',
      outfit: 'guerrilla',
      pose: 'stand',
      prop: 'paper',
    },
  },
  ST02: {
    stationName: 'Kho ngầm',
    title: 'Cán bộ hậu cần',
    actionKey: 'manage-supplies',
    actionLabel: 'Kiểm đếm, sắp xếp lương thực và vật dụng',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST02_STORE',
      floorLabel: 'Tầng 3',
      outfit: 'civilian',
      pose: 'carry',
      prop: 'crate',
    },
  },
  ST03: {
    stationName: 'Giếng hầm & thông gió',
    title: 'Người bảo đảm nước và thông khí',
    actionKey: 'maintain-water-air',
    actionLabel: 'Lấy nước hoặc ngụy trang lỗ thông hơi',
    source3d: {
      targetKind: 'callout',
      targetKey: 'ST03_WELL_VENT',
      floorLabel: 'Liên tầng',
      outfit: 'civilian',
      pose: 'stand',
    },
  },
  ST04: {
    stationName: 'Quân y',
    title: 'Cán bộ quân y',
    actionKey: 'provide-medical-care',
    actionLabel: 'Băng bó, chuẩn bị dụng cụ hoặc chăm sóc thương binh',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST04_CLINIC',
      floorLabel: 'Tầng 2',
      outfit: 'nurse',
      pose: 'stand',
    },
  },
  ST05: {
    stationName: 'Xưởng vũ khí',
    title: 'Thợ quân giới',
    actionKey: 'repair-tools',
    actionLabel: 'Sửa chữa, gia công hoặc kiểm tra dụng cụ',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST05_FACTORY',
      floorLabel: 'Tầng 2',
      outfit: 'civilian',
      pose: 'hammer',
      prop: 'hammer',
    },
  },
  ST06: {
    stationName: 'Hầm phòng thủ',
    title: 'Du kích trực gác',
    actionKey: 'stand-watch',
    actionLabel: 'Quan sát qua lỗ châu mai hoặc truyền tín hiệu cảnh giới',
    source3d: {
      targetKind: 'chamber',
      targetKey: 'ST06_FIRING',
      floorLabel: 'Tầng 1',
      outfit: 'guerrilla',
      pose: 'aim',
      prop: 'rifle',
    },
  },
}

test('catalog_has_two_reviewed_variants_for_each_cu_chi_station', async () => {
  assert.equal(heritageRoleTemplates.length, 12)
  assert.equal(new Set(heritageRoleTemplates.map(({ id }) => id)).size, 12)

  for (const [stationCode, expected] of Object.entries(expectedStations)) {
    const variants = heritageRoleTemplates.filter((template) => template.stationCode === stationCode)
    assert.deepEqual(variants.map(({ roleVariant }) => roleVariant).sort(), ['nam', 'nu'])

    for (const template of variants) {
      assert.equal(template.siteCode, 'cu-chi')
      assert.equal(template.era, 1968)
      assert.equal(template.stationName, expected.stationName)
      assert.equal(template.title, expected.title)
      assert.equal(template.actionKey, expected.actionKey)
      assert.equal(template.actionLabel, expected.actionLabel)
      assert.deepEqual(template.source3d, expected.source3d)
      assert.deepEqual(template.canvasSize, { width: 1080, height: 1920 })
      assert.match(template.backgroundUrl, /^\/images\/photo-roles\/cu-chi\/st0[1-6]\/[a-z0-9-]+-(nam|nu)-1968-bg\.webp$/)
      assert.match(template.overlayUrl, /^\/images\/photo-roles\/cu-chi\/st0[1-6]\/[a-z0-9-]+-(nam|nu)-1968-overlay\.webp$/)
      assert.equal(new URL(template.backgroundUrl, 'https://histar.local').origin, 'https://histar.local')
      assert.equal(new URL(template.overlayUrl, 'https://histar.local').origin, 'https://histar.local')
      assert.ok(template.faceAnchor.x >= 0 && template.faceAnchor.x <= 1)
      assert.ok(template.faceAnchor.y >= 0 && template.faceAnchor.y <= 1)
      assert.ok(template.faceAnchor.width > 0 && template.faceAnchor.x + template.faceAnchor.width <= 1)
      assert.ok(template.faceAnchor.height > 0 && template.faceAnchor.y + template.faceAnchor.height <= 1)
      assert.ok(template.faceFeather >= 0 && template.faceFeather <= 1)

      if (template.published) {
        assert.ok(template.review.reviewer.trim())
        assert.match(template.review.reviewedAt, /^\d{4}-\d{2}-\d{2}$/)
        assert.ok(template.review.note.trim())
        const backgroundPath = path.join(feRoot, 'public', template.backgroundUrl)
        const overlayPath = path.join(feRoot, 'public', template.overlayUrl)
        await access(backgroundPath)
        await access(overlayPath)
        const [backgroundMetadata, overlayMetadata] = await Promise.all([
          sharp(backgroundPath).metadata(),
          sharp(overlayPath).metadata(),
        ])
        assert.deepEqual(
          { width: backgroundMetadata.width, height: backgroundMetadata.height },
          template.canvasSize,
        )
        assert.deepEqual(
          { width: overlayMetadata.width, height: overlayMetadata.height },
          template.canvasSize,
        )
        assert.equal(overlayMetadata.hasAlpha, true)
      } else {
        assert.equal(template.review.status, 'pending')
        assert.equal(template.review.reviewer, null)
        assert.equal(template.review.reviewedAt, null)
        assert.ok(template.review.note.includes('Chờ'))
      }
    }

    const approvalPath = path.join(
      feRoot,
      'public/images/photo-roles/cu-chi',
      stationCode.toLowerCase(),
      'approval.json',
    )
    const approval = JSON.parse(await readFile(approvalPath, 'utf8'))
    assert.equal(approval.stationCode, stationCode)
    assert.equal(approval.status, 'pending_historical_review')
    assert.deepEqual(approval.templateIds.sort(), variants.map(({ id }) => id).sort())
    assert.equal(approval.reviewer, null)
    assert.equal(approval.reviewedAt, null)
    assert.ok(approval.note.includes('Chờ'))
    assert.deepEqual(
      approval.templates.map(({ id }) => id).sort(),
      variants.map(({ id }) => id).sort(),
    )
    for (const templateApproval of approval.templates) {
      assert.equal(templateApproval.published, false)
      assert.equal(templateApproval.status, 'pending_historical_review')
      assert.equal(templateApproval.reviewer, null)
      assert.equal(templateApproval.reviewedAt, null)
      assert.ok(templateApproval.note.includes('Chờ'))
    }
  }

  assert.deepEqual(getPublishedRoleTemplates('cu-chi'), [])
  assert.deepEqual(getPublishedRoleTemplates('cu-chi', 'ST01'), [])
})
