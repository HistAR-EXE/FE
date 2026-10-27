import assert from 'node:assert/strict'
import test from 'node:test'
import { isTeachingMembership, teacherRouteCapability, invitationDeliveryMessage, teacherSnapshotCsv } from '../src/features/org/teacherWorkspaceState.ts'
import { isPremium } from '../src/shared/auth/types.ts'

test('organization owners and teachers can enter the teaching workspace, students cannot', () => {
  assert.equal(isTeachingMembership('owner'), true)
  assert.equal(isTeachingMembership('TEACHER'), true)
  assert.equal(isTeachingMembership('student'), false)
})

test('direct teacher links require the capability of their feature', () => {
  assert.equal(teacherRouteCapability('/teacher/assignments'), 'assignments')
  assert.equal(teacherRouteCapability('/teacher/live-board'), 'liveBoard')
  assert.equal(teacherRouteCapability('/teacher/trips/abc/report'), 'fieldTrips')
  assert.equal(teacherRouteCapability('/teacher'), null)
})

test('local invitations never claim an email was delivered', () => {
  assert.match(invitationDeliveryMessage('LOCAL_ONLY', 'student@example.test'), /chưa gửi email/i)
  assert.match(invitationDeliveryMessage('SENT', 'student@example.test'), /đã gửi email/i)
})

test('teacher role alone does not grant Premium after organization access expires', () => {
  assert.equal(isPremium({ role: 'TEACHER', tier: 'FREE' }), false)
  assert.equal(isPremium({ role: 'TEACHER', tier: 'PREMIUM' }), true)
  assert.equal(isPremium({ role: 'USER', tier: 'PREMIUM' }), true)
  assert.equal(isPremium({ role: 'ADMIN', tier: 'FREE' }), true)
})

test('report exports retain recorded values and neutralize spreadsheet formulas', () => {
  const csv = teacherSnapshotCsv([{ displayName: '=A1', email: 'a@example.test', stationsCompleted: 2, score: 35, lastStationCode: 'ST01', lastActivityAt: null }])
  assert.match(csv, /"'=A1"/)
  assert.match(csv, /"2","35"/)
})
