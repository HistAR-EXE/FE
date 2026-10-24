import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePortalEra } from '../src/features/time-portal/eraLabels.ts'
import { resolveInitialPortalMode } from '../src/features/time-portal/portalNavigation.ts'
test('opens at1948 by default and preserves explicit chapter links', () => {
 assert.equal(resolvePortalEra(null),1948)
 assert.equal(resolvePortalEra(''),1948)
 assert.equal(resolvePortalEra('invalid'),1948)
 assert.equal(resolvePortalEra('2026'),2026)
 assert.equal(resolvePortalEra('1968'),1968)
})

test('view 3d initializes 3d mode while legacy compare links remain xua-nay', () => {
 assert.equal(resolveInitialPortalMode('3d'),'3d')
 assert.equal(resolveInitialPortalMode('compare'),'xua-nay')
 assert.equal(resolveInitialPortalMode('xua-nay'),'xua-nay')
 assert.equal(resolveInitialPortalMode('unknown'),'timeline')
 assert.equal(resolveInitialPortalMode(null),'timeline')
})
