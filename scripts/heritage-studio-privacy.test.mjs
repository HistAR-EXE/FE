import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  appendHeritageEntrySource,
  buildDioramaReturnPath,
  readHeritageEntrySource,
} from '../src/features/stations/stationRoutes.ts'

test('entry source is a closed union and external return targets are ignored', () => {
  assert.equal(readHeritageEntrySource('battle-diorama'), 'battle-diorama')
  assert.equal(readHeritageEntrySource('time-portal-3d'), 'time-portal-3d')
  assert.equal(readHeritageEntrySource('https://evil.example'), 'station')
  assert.equal(buildDioramaReturnPath('https://evil.example'), '/diorama')
  assert.equal(
    buildDioramaReturnPath('11111111-1111-1111-1111-111111111111'),
    '/diorama/11111111-1111-1111-1111-111111111111',
  )
})

test('heritage source is preserved using a controlled query value', () => {
  assert.equal(
    appendHeritageEntrySource('/share?creationId=1', 'battle-diorama'),
    '/share?creationId=1&source=battle-diorama',
  )
})

test('only final output is uploaded and heritage mode never sends a frame id', () => {
  const source = readFileSync(new URL('../src/pages/PhotoFramePage.tsx', import.meta.url), 'utf8')
  assert.equal(source.match(/viralApi\.uploadCreation/g)?.length, 1)
  assert.match(source, /frameId: photoMode === 'heritage' \? null/)
  assert.match(source, /uploadFile = photoMode === 'heritage' \? heritageComposite : file/)
  assert.doesNotMatch(source, /detectFaceCandidates[\s\S]*uploadCreation/)
})

test('share page exposes station return and Cedar Falls return only for that source', () => {
  const source = readFileSync(new URL('../src/pages/SharePage.tsx', import.meta.url), 'utf8')
  assert.match(source, /Về Sa bàn Cedar Falls/)
  assert.match(source, /entrySource === 'battle-diorama'/)
  assert.match(source, /buildStationPagePath\(stationContext\)/)
})

