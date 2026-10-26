import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/styles/globals.css'
import { HeritageStudio } from '../../src/features/heritage-studio/HeritageStudio'
import type { PublishedHeritageRoleTemplate } from '../../src/features/heritage-studio/types'
import { viralApi } from '../../src/features/viral/api'
import { appendHeritageEntrySource, appendStationContext } from '../../src/features/stations/stationRoutes'
import { DEFAULT_LOW_LIGHT } from '../../src/lib/heritageImage'

const svgUrl = (body: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">${body}</svg>`)}`
const background = svgUrl('<rect width="1080" height="1920" fill="#5b4128"/><rect x="80" y="80" width="920" height="1760" rx="50" fill="#856846"/>')
const overlay = svgUrl('<path d="M0 0h1080v1920H0z M330 220h420v540H330z" fill="#2b1c10" fill-rule="evenodd" fill-opacity=".88"/><rect x="25" y="25" width="1030" height="1870" rx="40" fill="none" stroke="#e5b95d" stroke-width="30"/>')

function role(roleVariant: 'nam' | 'nu'): PublishedHeritageRoleTemplate {
  return {
    id: `test-st01-${roleVariant}`,
    siteCode: 'cu-chi',
    stationCode: 'ST01',
    stationName: 'Phòng họp',
    title: 'Cán bộ liên lạc',
    roleVariant,
    actionKey: 'relay-documents',
    actionLabel: 'Chuyển tài liệu hoặc lắng nghe cuộc họp',
    era: 1968,
    calibration: { canvasSize: { width: 1080, height: 1920 }, faceAnchor: { x: 0.505, y: 0.056, width: 0.182, height: 0.132 }, faceRotationDeg: 0, faceFeather: 0.16 },
    source3d: { stationCode: 'ST01', targetKey: 'ST01_MEETING', targetKind: 'chamber', chamberKind: 'meeting', chamberTitle: 'Phòng họp chỉ huy', floorLabel: 'Tầng 2', figure: { outfit: 'guerrilla', pose: 'stand', prop: 'paper' } },
    releaseStage: 'gate-a',
    published: true,
    assets: {
      background: { url: background, width: 1080, height: 1920 },
      overlay: { url: overlay, width: 1080, height: 1920, hasAlpha: true },
    },
    review: { status: 'approved', reviewer: 'Playwright fixture', reviewedAt: '2026-10-25', note: 'Synthetic browser fixture only.' },
  } as PublishedHeritageRoleTemplate
}

const templates = [role('nam'), role('nu')] as const
const context = { siteCode: 'cu-chi', stationCode: 'ST01', locationId: '11111111-1111-1111-1111-111111111111' }

export function Harness() {
  const [file, setFile] = useState<File | null>(null)
  const [composite, setComposite] = useState<File | null>(null)
  const [sharePath, setSharePath] = useState('')

  const save = async () => {
    if (!composite) return
    const creation = await viralApi.uploadCreation({ file: composite, frameId: null, variant: 'story' })
    const base = `/share?creationId=${creation.id}&outputUrl=${encodeURIComponent(creation.outputUrl)}`
    setSharePath(appendHeritageEntrySource(appendStationContext(base, context), 'battle-diorama'))
  }

  return <main style={{ maxWidth: 720, margin: '0 auto', padding: 16, overflow: 'hidden' }}>
    <h1>Heritage Studio browser harness</h1>
    <input data-testid="raw-selfie" type="file" accept="image/*" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setComposite(null) }} />
    <HeritageStudio file={file} siteCode="cu-chi" stationCode="ST01" variant="story" lowLight={DEFAULT_LOW_LIGHT} templates={templates} onComposite={(next) => setComposite(next)} />
    <button type="button" disabled={!composite} onClick={() => void save()}>Lưu và chia sẻ</button>
    {sharePath ? <a data-testid="share-path" href={sharePath}>Mở trang chia sẻ</a> : null}
  </main>
}

createRoot(document.getElementById('root')!).render(<Harness />)
