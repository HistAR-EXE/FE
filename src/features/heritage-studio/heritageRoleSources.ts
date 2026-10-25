import { heritageRoleTemplates } from './roleTemplates.ts'
import type {
  Heritage3dSource,
  HeritageRoleTemplate,
  HeritageStationCode,
  PublishedHeritageRoleTemplate,
} from './types.ts'

export type HeritageSemanticTarget = {
  readonly targetId: Heritage3dSource['targetKey']
  readonly stationCode: HeritageStationCode
  readonly targetKind: 'chamber' | 'callout'
  readonly source3d: Heritage3dSource
  readonly publishedRole: PublishedHeritageRoleTemplate | null
}

const STATION_CODES = ['ST01', 'ST02', 'ST03', 'ST04', 'ST05', 'ST06'] as const

function stationTemplates(stationCode: HeritageStationCode): readonly HeritageRoleTemplate[] {
  return heritageRoleTemplates.filter((template) => template.stationCode === stationCode)
}

export const heritageSemanticTargets: readonly HeritageSemanticTarget[] = Object.freeze(
  STATION_CODES.map((stationCode) => {
    const templates = stationTemplates(stationCode)
    const source3d = templates[0]?.source3d
    if (!source3d || templates.some((template) => template.source3d.targetKey !== source3d.targetKey)) {
      throw new Error(`Heritage semantic source mismatch for ${stationCode}`)
    }

    return Object.freeze({
      targetId: source3d.targetKey,
      stationCode,
      targetKind: source3d.targetKind === 'callouts' ? 'callout' : 'chamber',
      source3d,
      publishedRole: templates.find(
        (template): template is PublishedHeritageRoleTemplate => template.published,
      ) ?? null,
    })
  }),
)

const TARGETS_BY_ID = new Map<string, HeritageSemanticTarget>(
  heritageSemanticTargets.map((target) => [target.targetId, target]),
)

export function getHeritageSemanticTarget(targetId: string | null | undefined): HeritageSemanticTarget | null {
  return targetId ? TARGETS_BY_ID.get(targetId) ?? null : null
}

export function buildHeritageRolePhotoFramePath(
  stationCode: HeritageStationCode,
  locationId: string,
): string {
  const target = heritageSemanticTargets.find((item) => item.stationCode === stationCode)
  if (!target) throw new Error(`Unknown heritage station: ${stationCode}`)

  return `/photo-frame?${new URLSearchParams({
    site: 'cu-chi',
    station: stationCode,
    locationId,
    era: '1968',
    source: 'time-portal-3d',
  })}`
}
