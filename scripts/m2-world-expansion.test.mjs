import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as contract from '../src/features/living-world/m2WorldExpansion.ts'
import * as T from 'three'
import { Kit } from '../src/features/time-portal/tunnel3d/kit.ts'
import { createVietnameseOilLamp } from '../src/features/living-world/r2/vietnameseOilLamp.ts'
import { zones, initialShell, enterZone, startApproach, advanceShell, arrivedInteraction } from '../src/features/living-world/worldModel.ts'
import { performLivingAction, livingSpaces } from '../src/features/living-world/livingSpaces.ts'
import { nextRouteStep } from '../src/features/living-world/worldContinuity.ts'
import {
  ACTIVITY_CATALOG_24,
  CEDAR_FALLS_SECTIONS,
  CROSS_ACTIVITY_CHAINS_8,
  ZONE_NPC_PROFILES,
  clearM2PersonalCreations,
  initialM2OwnerState,
  m2SurfaceTargets,
  readM2OwnerState,
  saveM2OwnerState,
} from '../src/features/living-world/m2WorldExpansion.ts'

const imageDataUrl = () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0WQAAAAASUVORK5CYII='
const context = (m2 = initialM2OwnerState()) => ({ facts: [], livingDone: [], riceProcessed: 0, m2 })
const activity = code => ACTIVITY_CATALOG_24.find(entry => entry.code === code)
const postcard = () => ({ id: 'PC_1', zone: 'S3', zoneTitle: 'Đồng ruộng', caption: 'Ký ức', frameStyle: 'LANTERN_GLOW', watermark: 'TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO · TIMELENS', createdAt: '2026-11-24T10:00:00Z', imageDataUrl: imageDataUrl() })
const film = () => ({ title: 'Hành trình', momentIds: ['DC_M1_ENTRANCE', 'DC_M4_HEARTH_CARE', 'DC_M5_EPILOGUE'], narrationStyle: 'COMMUNITY', durationSeconds: 45, completed: true, rendered: true, playbackVerified: true, updatedAt: '2026-11-24T10:00:00Z' })
const exhibition = () => ({ themeTitle: 'Ký ức', curatorNote: 'Củ Chi', itemIds: ['EX_HATCH_Q1', 'EX_MORTAR_A04', 'EX_HEARTH_A02_Q4'], previewVerified: true, updatedAt: '2026-11-24T10:00:00Z' })

test('A17 stays locked when its disclaimer was read or synthesis finished; C06 stays 2/3', () => {
  const ctx = { ...context(), facts: ['MS_SYNTHESIS_COMPLETE', 'STRUCT_MEANING_CONFIRMED'], livingDone: ['A23_CAMPAIGN'], m2: { ...initialM2OwnerState(), cedarFallsSections: ['TIME_LAYER_GATE'] } }
  assert.equal(activity('A17').isCompleted(ctx), false)
  const chain = CROSS_ACTIVITY_CHAINS_8.find(entry => entry.code === 'C06')
  assert.equal(chain.isUnlocked(ctx), false)
  assert.deepEqual(chain.progressCount(ctx), { done: 2, total: 3 })
})

test('catalog status distinguishes locked sources, drafts, available actions and complete work', () => {
  assert.equal(typeof contract.getActivityStatus, 'function')
  assert.equal(contract.getActivityStatus('A17', context()), 'LOCKED')
  assert.equal(contract.getActivityStatus('A03', context()), 'AVAILABLE')
  assert.equal(contract.getActivityStatus('A03', { ...context(), livingDone: ['A03_BATTER'] }), 'PARTIAL')
  assert.equal(contract.getActivityStatus(activity('A03'), { ...context(), livingDone: ['A03_BATTER', 'A03_SPREAD'] }), 'COMPLETE')
  assert.equal(contract.getActivityStatus('A18', context({ ...initialM2OwnerState(), consentAccepted: true, postcards: [{ ...postcard(), imageDataUrl: undefined }] })), 'PARTIAL')
  assert.equal(contract.getActivityStatus('A24', { ...context(), modelCompared: true }), 'PARTIAL')
  assert.equal(contract.getActivityStatus('A21', { ...context(), livingDone: ['L2B_LETTER'] }), 'PARTIAL')
  assert.equal(activity('A21').isCompleted({ ...context(), livingDone: ['L2B_LETTER'] }), false)
  const letter = { promptId: 'LETTER_PEACE', recipient: 'Mai sau', message: 'Hòa bình', savedAt: '2026-11-24T10:00:00Z' }
  assert.equal(activity('A21').isCompleted(context({ ...initialM2OwnerState(), futureLetter: letter })), false)
  assert.equal(activity('A21').isCompleted(context({ ...initialM2OwnerState(), futureLetter: letter, consentAccepted: true })), true)
})

test('personal media needs consent and real output rather than legacy metadata', () => {
  const m2 = { ...initialM2OwnerState(), consentAccepted: true, postcards: [postcard()], exhibition: exhibition(), directorsCut: film() }
  for (const code of ['A18', 'A19', 'A20']) {
    assert.equal(activity(code).isCompleted(context(m2)), true, code)
    assert.equal(activity(code).isCompleted(context({ ...m2, consentAccepted: false })), false, code)
  }
  assert.equal(activity('A18').isCompleted(context({ ...m2, postcards: [{ ...postcard(), imageDataUrl: undefined }] })), false)
  assert.equal(activity('A18').isCompleted(context({ ...m2, postcards: [{ ...postcard(), imageDataUrl: 'data:image/png;base64,not-a-picture' }] })), false)
  assert.equal(activity('A19').isCompleted(context({ ...m2, exhibition: { ...exhibition(), previewVerified: undefined } })), false)
  assert.equal(activity('A19').isCompleted(context({ ...m2, exhibition: { ...exhibition(), itemIds: ['EX_HATCH_Q1', 'EX_HATCH_Q1', 'EX_HATCH_Q1'] } })), false)
  assert.equal(activity('A20').isCompleted(context({ ...m2, directorsCut: { ...film(), playbackVerified: undefined } })), false)
  assert.equal(activity('A20').isCompleted(context({ ...m2, directorsCut: { ...film(), rendered: undefined } })), false)
  assert.equal(activity('A20').isCompleted(context({ ...m2, directorsCut: { ...film(), durationSeconds: 0 } })), false)
})

test('artifact validators reject malformed shapes, duplicate and unknown media references', () => {
  for (const name of ['isValidPostcard', 'isValidDirectorsCut', 'isValidHeritageExhibition']) {
    assert.equal(typeof contract[name], 'function', name)
    for (const malformed of [null, 0, [], {}, { itemIds: {} }, { momentIds: null }]) assert.equal(contract[name](malformed), false, name)
  }
  assert.equal(contract.isValidPostcard(postcard()), true)
  assert.equal(contract.isValidDirectorsCut(film()), true)
  assert.equal(contract.isValidHeritageExhibition(exhibition()), true)
  assert.equal(contract.isValidPostcard({ ...postcard(), watermark: 'missing label' }), false)
  assert.equal(contract.isValidPostcard({ ...postcard(), frameStyle: { toString: {} } }), false)
  assert.equal(contract.isValidDirectorsCut({ ...film(), narrationStyle: { toString: {} } }), false)
  assert.equal(contract.isValidPostcard({ ...postcard(), imageDataUrl: `data:image/png;base64,${'A'.repeat(4 * 1024 * 1024)}` }), false)
  assert.equal(contract.isValidDirectorsCut({ ...film(), momentIds: ['DC_M1_ENTRANCE', 'DC_M1_ENTRANCE', 'unknown'] }), false)
  assert.equal(contract.isValidHeritageExhibition({ ...exhibition(), itemIds: [...exhibition().itemIds, 'unknown'] }), false)
})

test('read normalizes hostile storage and migrates safe legacy metadata to drafts', () => {
  const legacyFilm = { ...film(), rendered: undefined, playbackVerified: undefined }
  const legacyCard = { ...postcard(), imageDataUrl: undefined }
  const storage = { getItem: () => JSON.stringify({ ...initialM2OwnerState(), consentAccepted: true, activities: ['A03_BATTER', null, 'A03_BATTER'], postcards: [null, {}, { caption: {} }, legacyCard], exhibition: { itemIds: {} }, directorsCut: legacyFilm, futureLetter: { message: [] } }) }
  const loaded = readM2OwnerState('a', storage)
  assert.equal(loaded.postcards.length, 1)
  assert.equal(loaded.postcards[0].id, 'PC_1')
  assert.equal(loaded.exhibition, null)
  assert.equal(loaded.futureLetter, null)
  assert.equal(loaded.directorsCut.completed, false)
  assert.deepEqual(loaded.activities, ['A03_BATTER'])
  for (const entry of ACTIVITY_CATALOG_24) assert.doesNotThrow(() => entry.isCompleted(context(loaded)))
  for (const chain of CROSS_ACTIVITY_CHAINS_8) assert.doesNotThrow(() => chain.progressCount(context(loaded)))
  assert.deepEqual(readM2OwnerState('a', { getItem: () => '{' }), initialM2OwnerState())
  const corruptCard = { ...postcard(), frameStyle: { toString: {} } }
  const retained = readM2OwnerState('a', { getItem: () => JSON.stringify({ ...initialM2OwnerState(), activities: ['A03_BATTER'], postcards: [corruptCard] }) })
  assert.deepEqual(retained.activities, ['A03_BATTER'])
  assert.equal(retained.postcards.length, 0)
})

test('owner state reports storage failure and never claims failed deletion succeeded', () => {
  assert.equal(saveM2OwnerState('a', initialM2OwnerState(), { setItem() {} }), true)
  assert.equal(saveM2OwnerState('a', initialM2OwnerState(), { setItem() { throw new Error('quota') } }), false)
  assert.equal(saveM2OwnerState('a', initialM2OwnerState(), undefined), false)
  assert.throws(() => clearM2PersonalCreations('a', { getItem: () => null, setItem() { throw new Error('blocked') } }), /lưu|storage|xóa/i)
})

test('FE canonical activity and checkpoint sets equal the existing BE allow lists', () => {
  const source = readFileSync(new URL('../../BE/src/main/java/com/histar/be/quest/narrative/WorldService.java', import.meta.url), 'utf8')
  const checkpointCase = source.slice(source.indexOf('case "SAVE_CHECKPOINT"'), source.indexOf('case "COMPLETE_ACTIVITY"'))
  const checkpointList = checkpointCase.match(/require\(Set\.of\(([^)]+)\)\.contains\(request.targetId\(\)\)/)[1]
  const activityList = source.slice(source.indexOf('case "COMPLETE_ACTIVITY"')).match(/var allowed=Set\.of\(([^)]+)\)/)[1]
  const strings = value => [...value.matchAll(/"([^"]+)"/g)].map(match => match[1]).sort()
  assert.deepEqual([...contract.SERVER_CHECKPOINT_ZONES].sort(), strings(checkpointList))
  assert.equal(contract.SERVER_CHECKPOINT_ZONES.size, 18)
  assert.deepEqual([...contract.SERVER_ACTIVITY_TARGETS].sort(), strings(activityList))
})

test('M2 world model defines all 18 zones and every target in S2, S3, S4, L2-B is walkable and reachable', () => {
  const allZones = Object.keys(zones).sort()
  assert.equal(allZones.length, 18)
  assert.deepEqual(
    allZones,
    ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'L1-A', 'L1-B', 'L1-C', 'L1-D', 'L2-A', 'L2-B', 'L2-C', 'L2-D', 'L3-A', 'L3-B', 'L3-C', 'L3-D'].sort()
  )

  for (const zone of ['S1', 'S2', 'S3', 'S4', 'L2-B', 'L3-B']) {
    const start = enterZone(initialShell(), zone)
    for (const target of zones[zone].targets) {
      let s = startApproach(start, target.id)
      for (let step = 0; step < 300 && s.path.length; step++) s = advanceShell(s, 0.05)
      assert.equal(arrivedInteraction(s), target.id, `${zone}:${target.id} unreachable from spawn`)
    }
  }

  // BFS routing reaches new M2 zones S3, S4, L2-B
  assert.equal(nextRouteStep('S1', 'S3')?.id, 'FOREST_FIELD')
  assert.equal(nextRouteStep('S2', 'S3')?.id, 'LABOR_FIELD')
  assert.equal(nextRouteStep('S2', 'S4')?.id, 'LABOR_COMMUNITY')
  assert.equal(nextRouteStep('S3', 'S4')?.id, 'FIELD_COMMUNITY')
  assert.equal(nextRouteStep('L2-C', 'L2-B')?.id, 'REST_MEETING')
  assert.equal(nextRouteStep('L2-B', 'L2-C')?.id, 'MEETING_REST')
  assert.equal(nextRouteStep('L2-A', 'L2-B')?.id, 'MIDDLE_REST')
})

test('M2 two-step activities in S2, S3, S4, and L2-B enforce prerequisite order and idempotency', () => {
  const pairs = [
    ['A03_BATTER', 'A03_SPREAD'],
    ['A12_SOLE', 'A12_STRAP'],
    ['A05_STRIPS', 'A05_WEAVE'],
    ['A06_DIG', 'A06_BASKET'],
    ['A10_LISTEN', 'A10_CHANT'],
    ['A07_WATCH', 'A07_CHORUS'],
    ['A09_LISTEN', 'A09_FAREWELL'],
    ['A11_BROWSE', 'A11_CONNECT'],
    ['L2B_RECORDS', 'L2B_LETTER'],
  ]
  for (const [first, second] of pairs) {
    // Out-of-order attempt is rejected
    assert.deepEqual(performLivingAction([], second), [], `${second} must require ${first}`)
    // Step 1 then Step 2 succeeds and is idempotent
    const afterFirst = performLivingAction([], first)
    assert.deepEqual(afterFirst, [first])
    const afterSecond = performLivingAction(afterFirst, second)
    assert.deepEqual(afterSecond, [first, second])
    assert.deepEqual(performLivingAction(afterSecond, second), [first, second])
  }
  assert.equal(Object.keys(livingSpaces).length, 5)
  assert.equal(Object.keys(m2SurfaceTargets).length, 16)
})

test('M2 catalogs 24 entries but source pending A17 and C06 cannot complete', () => {
  assert.equal(ACTIVITY_CATALOG_24.length, 24)
  assert.deepEqual(
    ACTIVITY_CATALOG_24.map(a => a.code),
    Array.from({ length: 24 }, (_, i) => `A${String(i + 1).padStart(2, '0')}`)
  )
  assert.equal(CROSS_ACTIVITY_CHAINS_8.length, 8)
  assert.deepEqual(
    CROSS_ACTIVITY_CHAINS_8.map(c => c.code),
    ['C01', 'C02', 'C03', 'C04', 'C05', 'C06', 'C07', 'C08']
  )

  const emptyCtx = {
    facts: [],
    livingDone: [],
    riceProcessed: 0,
    memorialChoice: null,
    memorialPhase: null,
    atmosphereSeen: false,
    echoSeen: false,
    modelCompared: false,
    m2: initialM2OwnerState(),
  }
  assert.equal(ACTIVITY_CATALOG_24.filter(a => a.isCompleted(emptyCtx)).length, 0)
  assert.equal(CROSS_ACTIVITY_CHAINS_8.filter(c => c.isUnlocked(emptyCtx)).length, 0)

  const fullCtx = {
    facts: [
      'ENTRANCE_CONFIRMED',
      'AIR_MEANING_CONFIRMED',
      'STRUCT_MEANING_CONFIRMED',
      'KITCHEN_MEANING_CONFIRMED',
      'CARE_MEANING_CONFIRMED',
      'KITCHEN_CARE_REFLECTED',
      'MS_SYNTHESIS_COMPLETE',
    ],
    livingDone: [
      'A02_PREPARE', 'A02_SMOKE',
      'A03_BATTER', 'A03_SPREAD',
      'A05_STRIPS', 'A05_WEAVE',
      'A06_DIG', 'A06_BASKET',
      'A07_WATCH', 'A07_CHORUS',
      'A09_LISTEN', 'A09_FAREWELL',
      'A10_LISTEN', 'A10_CHANT',
      'A11_BROWSE', 'A11_CONNECT',
      'A12_SOLE', 'A12_STRAP',
      'A13_BELONGINGS', 'A13_REST',
      'A14_WATER', 'A14_SHARE',
      'A15_CLOTH', 'A15_CARE',
      'L2B_RECORDS', 'L2B_LETTER',
      'A23_CAMPAIGN',
    ],
    riceProcessed: 6,
    memorialChoice: 'FLOWERS',
    memorialPhase: 'OFFERED',
    atmosphereSeen: true,
    echoSeen: true,
    modelCompared: true,
    m2: {
      version: 1,
      activities: ['A23_CAMPAIGN', 'L2B_RECORDS', 'L2B_LETTER'],
      echoesHeard: ['ECHO_S2_STEAM', 'ECHO_S3_BAMBOO', 'ECHO_S4_SONG', 'ECHO_L2B_PEN'],
      npcTopicsSeen: ['S2_CRAFT_RICE', 'S3_DIG_SOIL', 'S4_ART_SPIRIT', 'L2B_ORG_COORDINATE'],
      cedarFallsSections: CEDAR_FALLS_SECTIONS.map(s => s.id),
      consentAccepted: true,
      postcards: [
        {
          id: 'PC_1',
          zone: 'S3',
          zoneTitle: 'Đồng ruộng và khu lao động',
          caption: 'Đêm trăng đan tre Củ Chi',
          frameStyle: 'LANTERN_GLOW',
          watermark: 'TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO · TIMELENS',
          createdAt: '2026-11-21T16:30:00Z',
          imageDataUrl: imageDataUrl(),
        },
      ],
      exhibition: {
        themeTitle: 'Mạch Sống Củ Chi',
        curatorNote: 'Từ mặt đất đến ba tầng hầm',
        itemIds: ['EX_HATCH_Q1', 'EX_MORTAR_A04', 'EX_HEARTH_A02_Q4'],
        updatedAt: '2026-11-21T16:31:00Z',
        previewVerified: true,
      },
      directorsCut: {
        title: 'Hành trình 45 giây',
        momentIds: ['DC_M1_ENTRANCE', 'DC_M4_HEARTH_CARE', 'DC_M5_EPILOGUE'],
        narrationStyle: 'COMMUNITY',
        durationSeconds: 45,
        completed: true,
        rendered: true,
        playbackVerified: true,
        updatedAt: '2026-11-21T16:32:00Z',
      },
      futureLetter: {
        promptId: 'LETTER_PEACE',
        recipient: 'Thế hệ mai sau',
        message: 'Lòng biết ơn từ hôm nay.',
        savedAt: '2026-11-21T16:33:00Z',
      },
    },
  }

  for (const act of ACTIVITY_CATALOG_24) {
    assert.equal(act.isCompleted(fullCtx), act.code !== 'A17', `Activity ${act.code} should respect source readiness`)
  }
  for (const chain of CROSS_ACTIVITY_CHAINS_8) {
    assert.equal(chain.isUnlocked(fullCtx), chain.code !== 'C06', `Chain ${chain.code} should respect source readiness`)
    const prog = chain.progressCount(fullCtx)
    assert.equal(prog.done, prog.total - (chain.code === 'C06' ? 1 : 0), `Chain ${chain.code} must count only complete steps`)
  }
})

test('M2 NPC conversation profiles (A22), sound echoes (A16), and owner-isolated personal creations (A18-A21) work cleanly', () => {
  const npcIds = Object.keys(ZONE_NPC_PROFILES)
  assert.equal(npcIds.length, 11)
  assert.ok(npcIds.includes('NPC_LIAISON'))
  const memory = new Map()
  const storage = {
    getItem: k => memory.get(k) ?? null,
    setItem: (k, v) => memory.set(k, v),
  }

  const userA = {
    ...initialM2OwnerState(),
    consentAccepted: true,
    activities: ['A03_BATTER', 'A03_SPREAD'],
    postcards: [
      {
        id: 'PC_A',
        zone: 'S2',
        zoneTitle: 'Góc lao động',
        caption: 'Bánh tráng phơi nắng',
        frameStyle: 'SEPIA_SKETCH',
        watermark: 'TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO · TIMELENS',
        createdAt: '2026-11-21T16:35:00Z',
      },
    ],
  }
  saveM2OwnerState('user-a', userA, storage)
  assert.equal(readM2OwnerState('user-a', storage).postcards.length, 1)
  assert.equal(readM2OwnerState('user-b', storage).postcards.length, 0)

  const cleared = clearM2PersonalCreations('user-a', storage)
  assert.equal(cleared.postcards.length, 0)
  assert.equal(cleared.consentAccepted, false)
  // Gameplay activities remain preserved when clearing personal creative items
  assert.deepEqual(cleared.activities, ['A03_BATTER', 'A03_SPREAD'])
})

test('legacy auto-consent is revoked until explicit current consent, without discarding drafts',()=>{
 const old={...initialM2OwnerState(),consentAccepted:true,activities:['A03_BATTER']};delete old.consentVersion
 const storage={getItem:()=>JSON.stringify(old)}
 const restored=readM2OwnerState('legacy',storage)
 assert.equal(restored.consentAccepted,false)
 assert.deepEqual(restored.activities,['A03_BATTER'])
})
test('reading four Cedar Falls sections remains partial until the completion action is acknowledged or queued',()=>{
 const ctx=context({...initialM2OwnerState(),cedarFallsSections:CEDAR_FALLS_SECTIONS.map(s=>s.id)})
 assert.equal(contract.getActivityStatus('A23',ctx),'PARTIAL')
 assert.equal(contract.getActivityStatus('A23',{...ctx,livingDone:['A23_CAMPAIGN']}),'COMPLETE')
})

test('traditional Vietnamese oil lamp builds reservoir, brass burner, tall glass chimney and respects reduced motion',()=>{
 const scene=new T.Scene(),kit=new Kit()
 const lamp=createVietnameseOilLamp(scene,kit,[0,0.48,0],{scale:0.9,intensity:1.5})
 assert.equal(lamp.group.name,'vietnamese-traditional-oil-lamp')
 assert.ok(lamp.light && lamp.light.intensity===1.5)
 lamp.update(1.3,false)
 assert.notEqual(lamp.light.intensity,1.5,'flicker modulates intensity when motion is allowed')
 lamp.update(2.7,true)
 assert.equal(lamp.light.intensity,1.5,'reduced motion holds steady lamp intensity')
 assert.equal(lamp.flame.rotation.z,0)
 kit.dispose()
})
