import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePortalEra } from '../src/features/time-portal/eraLabels.ts'
test('opens at1948 by default and preserves explicit chapter links', () => {
 assert.equal(resolvePortalEra(null),1948)
 assert.equal(resolvePortalEra(''),1948)
 assert.equal(resolvePortalEra('invalid'),1948)
 assert.equal(resolvePortalEra('2026'),2026)
 assert.equal(resolvePortalEra('1968'),1968)
})
