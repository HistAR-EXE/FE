import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CedarFallsTablePanel, CreativeMemoryStudio, FutureLetterPanel } from '../src/features/living-world/M2ExperiencePanels.tsx'
import { initialM2OwnerState } from '../src/features/living-world/m2WorldExpansion.ts'

const nothing = () => {}
test('postcard capture is disabled until the owner explicitly consents', () => {
  const html = renderToStaticMarkup(React.createElement(CreativeMemoryStudio, {
    currentZone: 'S1', currentZoneTitle: 'Rừng', ctx: { m2: initialM2OwnerState() },
    onToggleConsent: nothing, onSavePostcard: nothing, onSaveExhibition: nothing,
    onSaveDirectorsCut: nothing, onSaveLetter: nothing, onClearPersonalData: nothing,
  }))
  assert.match(html, /<button[^>]*disabled=""[^>]*>Chụp/)
})
test('future letter requires consent even when opened outside the studio', () => {
  const html = renderToStaticMarkup(React.createElement(FutureLetterPanel, { m2: initialM2OwnerState(), onSaveLetter: nothing }))
  assert.match(html, /<button[^>]*disabled=""[^>]*>Lưu lá thư/)
})
test('Cedar Falls completion waits for all four individually inspected sections', () => {
  const html = renderToStaticMarkup(React.createElement(CedarFallsTablePanel, { m2: initialM2OwnerState(), onInspectSection: nothing, onCompleteActivity: nothing }))
  assert.match(html, /<button[^>]*disabled=""[^>]*>Đánh dấu/)
  assert.doesNotMatch(html, /Đã ghi nhận[^<]*A17/)
})
