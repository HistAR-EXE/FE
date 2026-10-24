import test from 'node:test'
import assert from 'node:assert/strict'
import { heritageRoleTemplates } from '../src/features/heritage-studio/roleTemplates.ts'
import {
  buildHeritageRolePhotoFramePath,
  getHeritageSemanticTarget,
  heritageSemanticTargets,
} from '../src/features/heritage-studio/heritageRoleSources.ts'
import { ERA_SCENES } from '../src/features/time-portal/tunnel3d/scenes.ts'

const EXPECTED_TARGETS = {
  ST01: { targetId: 'ST01_MEETING', kind: 'chamber', titles: ['Phòng họp chỉ huy'] },
  ST02: { targetId: 'ST02_STORE', kind: 'chamber', titles: ['Kho vũ khí – lương thực'] },
  ST03: { targetId: 'ST03_WELL_VENT', kind: 'callout', titles: ['Ống thông hơi', 'Giếng nước'] },
  ST04: { targetId: 'ST04_CLINIC', kind: 'chamber', titles: ['Trạm quân y'] },
  ST05: { targetId: 'ST05_FACTORY', kind: 'chamber', titles: ['Xưởng vũ khí'] },
  ST06: { targetId: 'ST06_FIRING', kind: 'chamber', titles: ['Ụ chiến đấu'] },
}

test('all catalog roles resolve to matching 1968 semantic targets without publishing drafts', () => {
  assert.equal(heritageRoleTemplates.length, 12)
  assert.equal(heritageRoleTemplates.some((role) => role.published), false)
  assert.equal(heritageSemanticTargets.length, 6)

  for (const role of heritageRoleTemplates) {
    const expected = EXPECTED_TARGETS[role.stationCode]
    const target = getHeritageSemanticTarget(role.source3d.targetKey)
    assert.ok(target, `${role.id} must resolve ${role.source3d.targetKey}`)
    assert.equal(target.targetId, expected.targetId)
    assert.equal(target.stationCode, role.stationCode)
    assert.equal(target.targetKind, expected.kind)
    assert.equal(target.publishedRole, null, `${role.stationCode} must not expose an unpublished CTA`)

    const sceneItems = [
      ...ERA_SCENES[1968].chambers,
      ...ERA_SCENES[1968].callouts,
    ].filter((item) => item.heritageRoleId === expected.targetId)
    assert.deepEqual(sceneItems.map((item) => item.title), expected.titles)
    assert.ok(sceneItems.every((item) => item.stationCode === role.stationCode))
  }
})

test('invalid focus returns no semantic target and valid CTA paths carry closed station context', () => {
  assert.equal(getHeritageSemanticTarget('ST99_UNKNOWN'), null)
  assert.equal(
    buildHeritageRolePhotoFramePath('ST04', '11111111-1111-1111-1111-111111111111'),
    '/photo-frame?site=cu-chi&station=ST04&locationId=11111111-1111-1111-1111-111111111111&era=1968&source=tunnel3d',
  )
})
