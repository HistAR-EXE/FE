import assert from 'node:assert/strict'
import test from 'node:test'

import {
  DEMO_STOP_CONFIRMATION,
  getDemoStopBlock,
} from '../src/features/admin/demoEnvironmentState.ts'

test('demo shutdown is blocked while any user was recently active', () => {
  assert.match(getDemoStopBlock({ enabled: true, activeUsers: 2 }, DEMO_STOP_CONFIRMATION) ?? '', /2 người/)
})

test('demo shutdown requires the exact explicit confirmation phrase', () => {
  assert.match(getDemoStopBlock({ enabled: true, activeUsers: 0 }, 'tat demo') ?? '', /TẮT DEMO/)
  assert.equal(getDemoStopBlock({ enabled: true, activeUsers: 0 }, DEMO_STOP_CONFIRMATION), null)
})

test('an already stopped environment is not submitted for shutdown again', () => {
  assert.match(getDemoStopBlock({ enabled: false, activeUsers: 0 }, DEMO_STOP_CONFIRMATION) ?? '', /đã tắt/i)
})
