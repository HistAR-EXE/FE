import type { Location as HeritageLocation } from '../locations/api'
import {
  HERITAGE_SITE_BY_API_ID,
  HERITAGE_SITE_BY_SLUG,
  STATIC_SLUG_TO_API_ID,
} from '../../shared/config/heritageSites'

export type DestinationRegion = 'all' | 'mien-bac' | 'mien-trung' | 'mien-nam'

export type StaticDestination = {
  id: string
  name: string
  city: string
  region: DestinationRegion
  desc: string
  image: string
  fallback: string
  isReady: boolean
  latitude: number
  longitude: number
  formattedAddress?: string
  googleMapsUrl?: string
}

export type MergedDestination = StaticDestination & {
  locationId: string
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function coordDistance(aLat: number, aLng: number, bLat: number, bLng: number): number {
  return Math.hypot(aLat - bLat, aLng - bLng)
}

function resolveGeo(dest: StaticDestination) {
  return HERITAGE_SITE_BY_SLUG[dest.id] ?? HERITAGE_SITE_BY_API_ID[dest.id]
}

function findApiMatch(
  dest: StaticDestination,
  apiLocations: HeritageLocation[],
  usedApiIds: Set<string>,
): HeritageLocation | undefined {
  const geo = resolveGeo(dest)
  const mappedId = geo?.apiId ?? STATIC_SLUG_TO_API_ID[dest.id] ?? dest.id
  const byId = apiLocations.find((loc) => loc.id === mappedId && !usedApiIds.has(loc.id))
  if (byId) return byId

  const destNorm = normalizeName(dest.name)
  for (const loc of apiLocations) {
    if (usedApiIds.has(loc.id)) continue
    if (loc.id === dest.id) return loc
    const locNorm = normalizeName(loc.name)
    if (locNorm === destNorm) return loc
  }

  for (const loc of apiLocations) {
    if (usedApiIds.has(loc.id)) continue
    const locNorm = normalizeName(loc.name)
    if (locNorm.includes(destNorm) || destNorm.includes(locNorm)) return loc
  }

  const refLat = geo?.latitude ?? dest.latitude
  const refLng = geo?.longitude ?? dest.longitude
  for (const loc of apiLocations) {
    if (usedApiIds.has(loc.id)) continue
    if (
      Number.isFinite(loc.latitude) &&
      Number.isFinite(loc.longitude) &&
      coordDistance(refLat, refLng, loc.latitude, loc.longitude) < 0.03
    ) {
      return loc
    }
  }

  return undefined
}

function pickCoord(apiValue: number | undefined | null, fallback: number): number {
  return Number.isFinite(apiValue) ? (apiValue as number) : fallback
}

export function mergeDestinations(
  staticDestinations: StaticDestination[],
  apiLocations: HeritageLocation[],
): MergedDestination[] {
  const usedApiIds = new Set<string>()

  return staticDestinations.map((dest) => {
    const geo = resolveGeo(dest)
    const api = apiLocations.length > 0 ? findApiMatch(dest, apiLocations, usedApiIds) : undefined
    if (api) usedApiIds.add(api.id)
    const locationId = api?.id ?? geo?.apiId ?? STATIC_SLUG_TO_API_ID[dest.id] ?? dest.id
    const baseLat = geo?.latitude ?? dest.latitude
    const baseLng = geo?.longitude ?? dest.longitude

    return {
      ...dest,
      id: locationId,
      locationId,
      latitude: pickCoord(api?.latitude, baseLat),
      longitude: pickCoord(api?.longitude, baseLng),
      name: api?.name ?? geo?.name ?? dest.name,
      city: api?.city ?? geo?.city ?? dest.city,
      image: api?.coverImage ?? dest.image,
      formattedAddress: api?.formattedAddress ?? geo?.formattedAddress ?? dest.formattedAddress,
      googleMapsUrl: api?.googleMapsUrl ?? geo?.googleMapsUrl ?? dest.googleMapsUrl,
    }
  })
}

export function mergedToMapLocations(merged: MergedDestination[]): HeritageLocation[] {
  return merged.map((d) => ({
    id: d.locationId,
    name: d.name,
    city: d.city,
    description: d.desc,
    coverImage: d.image,
    latitude: d.latitude,
    longitude: d.longitude,
    formattedAddress: d.formattedAddress,
    googleMapsUrl: d.googleMapsUrl,
    isArAvailable: d.isReady,
    createdAt: new Date().toISOString(),
  }))
}

export function findMergedByLocationId(
  merged: MergedDestination[],
  locationId: string,
): MergedDestination | undefined {
  return merged.find((d) => d.locationId === locationId || d.id === locationId)
}
