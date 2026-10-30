import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('../src/features/gamification/questStepAction.ts', import.meta.url), 'utf8')
const compiled = ts.transpile(source.replace(/^import .*$/gm, ''), { module: ts.ModuleKind.CommonJS })
const exports = {}
new Function('exports', 'SA_BAN_QUEST_KEY', 'timePortalPath', 'SA_BAN_FRAGMENT_CODE', compiled)(exports, 'tour:sa-ban', () => '', 'SABAN-3T')
test('Sa bàn opens an inline quiz instead of AI chat', () => {
  const action = exports.questStepAction({ key: 'tour:sa-ban', actionType: 'quiz', state: 'TODO' }, { questId: 'quest', locationId: 'location' })
  assert.equal(action.kind, 'sa-ban-quiz')
  assert.equal(action.locationId, 'location')
})

