import test from 'node:test'
import assert from 'node:assert/strict'
let story
try { story = await import('../src/features/living-world/worldNarrative.ts') } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error }

test('story chapters cover every existing zone exactly once without claiming completion from a visit', () => {
  assert.ok(story, 'story presentation module exists')
  const chapters = story.describeStory([], 'L1-C', false)
  assert.deepEqual(chapters.map(c => c.state), ['UNDISCOVERED', 'UNDISCOVERED', 'CURRENT', 'UNDISCOVERED'])
  const zones = chapters.flatMap(c => c.zones)
  assert.equal(zones.length, 18)
  assert.equal(new Set(zones).size, 18)
  assert.ok(zones.includes('S0') && zones.includes('S5') && zones.includes('L3-D'))
})

test('only confirmed foundations complete chapters, and a return alone is not an epilogue', () => {
  assert.ok(story)
  const facts = ['ENTRANCE_CONFIRMED', 'AIR_MEANING_CONFIRMED', 'STRUCT_MEANING_CONFIRMED', 'KITCHEN_MEANING_CONFIRMED', 'CARE_MEANING_CONFIRMED']
  const before = [...facts]
  assert.deepEqual(story.describeStory(facts, 'S5', true).map(c => c.state), ['UNDERSTOOD', 'UNDERSTOOD', 'UNDERSTOOD', 'CURRENT'])
  assert.equal(story.describeStory([...facts, 'MS_SYNTHESIS_COMPLETE'], 'S5', false)[3].state, 'CURRENT')
  assert.equal(story.describeStory([...facts, 'MS_SYNTHESIS_COMPLETE'], 'S0', true)[3].state, 'UNDERSTOOD')
  assert.deepEqual(facts, before)
  assert.notEqual(story.describeStory(['A17', 'C06', 'A24', 'KITCHEN_HEARTH_INSPECTED'], 'S0', false)[2].state, 'UNDERSTOOD')
})

test('Kha dialogue changes perspective with evidence and keeps the observer role explicit', () => {
  assert.ok(story)
  assert.match(story.khaReply('OBSERVE', []), /quan sát|quan sát viên/)
  assert.match(story.khaReply('RETURN', []), /trở về|hiện tại/)
  assert.notEqual(story.khaReply('MEMORY', []), story.khaReply('MEMORY', ['MS_SYNTHESIS_COMPLETE']))
  assert.equal(story.storySources.length, 2)
  assert.ok(story.storySources.every(s => s.url.startsWith('https://')))
})
