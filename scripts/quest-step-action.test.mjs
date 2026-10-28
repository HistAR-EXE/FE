import assert from 'node:assert/strict'
import { test } from 'node:test'
import { questStepAction } from '../src/features/gamification/questStepAction.ts'

test('Sa bàn quest opens the first-party quiz instead of the unobservable embedded tour', () => {
  const action = questStepAction({
    key: 'tour:sa-ban',
    actionType: 'tour',
    state: 'TODO',
    actionLabel: 'Giải câu hỏi Sa bàn',
  }, { questId: 'quest-id', locationId: 'location-id' })
  assert.equal(action.kind, 'link')
  const url = new URL(action.href, 'https://example.test')
  assert.equal(url.pathname, '/chat')
  assert.equal(url.searchParams.get('questRecord'), 'tour:sa-ban')
  assert.equal(url.searchParams.get('autoSend'), '1')
})

test('dialogue quest waits for the visitor to send the relevant question', () => {
  const action = questStepAction({
    key: 'dialogue:anh-ba', actionType: 'dialogue', state: 'TODO',
    actionLabel: 'Hỏi Chrono', chatPrompt: 'Chrono ơi, địa đạo Củ Chi có mấy tầng?',
  }, { questId: 'quest-id', locationId: 'location-id' })
  assert.equal(action.kind, 'link')
  const url = new URL(action.href, 'https://example.test')
  assert.equal(url.searchParams.get('questRecord'), 'dialogue:anh-ba')
  assert.equal(url.searchParams.get('questPrompt'), 'Chrono ơi, địa đạo Củ Chi có mấy tầng?')
  assert.equal(url.searchParams.has('autoSend'), false)
})

test('Xưa & Nay quest opens the real interactive spot', () => {
  const action = questStepAction({
    key: 'xuanay:thong-hoi', actionType: 'xuanay', state: 'TODO', actionLabel: null,
  }, { questId: 'quest-id', locationId: 'location-id' })
  assert.equal(action.kind, 'link')
  const url = new URL(action.href, 'https://example.test')
  assert.equal(url.searchParams.get('view'), 'xua-nay')
  assert.equal(url.searchParams.get('spot'), 'thong-hoi')
})

test('an obsolete tour-only step never links to the embedded iframe as proof of completion', () => {
  const action = questStepAction({ key: 'scene:obsolete', actionType: 'tour', state: 'TODO', actionLabel: null },
    { questId: 'quest-id', locationId: 'location-id' })
  assert.equal(action.kind, 'unavailable')
})
