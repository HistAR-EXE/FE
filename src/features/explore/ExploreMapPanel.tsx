// src/features/explore/ExploreMapPanel.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { Location as HeritageLocation } from '../locations/api'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import {
    buildMapMarkers,
    buildVietnamFitPoints,
    normalizeHeritageName,
    type MapMarker,
    VIETNAM_DEFAULT_ZOOM,
    VIETNAM_MAP_BOUNDS,
    VIETNAM_MAP_CENTER,
} from './vietnamMap'
import { REGION_META, type VietnamRegion } from './vietnamGeo'
import {
    EXPLORE_MAP_LAYER_IDS,
    exploreLayerHintKey,
    exploreLayerLabelKey,
    googleTileUrl,
    TILE_COMMON,
    type ExploreMapLayer,
} from './exploreMapTiles'
import { isLocationLocked } from './locationUnlock'
import type { ContentAccessUser } from '../../shared/access/contentAccess'

type ExploreMapPanelProps = {
    locations: HeritageLocation[]
    visitedIds?: Set<string>
    user?: ContentAccessUser
    onLockedLocationClick?: (location: HeritageLocation) => void
    onPinClick?: (location: HeritageLocation) => void
    selectedLocationId?: string
    /** Khoá pin chưa số hoá (mode-select): dùng isArAvailable thay vì quest lock. */
    digitizationLock?: boolean
    className?: string
}

function RegionLegend() {
    const { t } = useTranslation()
    const regions: VietnamRegion[] = ['north', 'central', 'south']
    return (
        <div className="flex flex-col gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container/92 backdrop-blur-md px-3 py-2.5 shadow-lg">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm mb-0.5">{t('map.regionLegend')}</p>
            {regions.map((key) => (
                <div key={key} className="flex items-center gap-2">
                    <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/40"
                        style={{ backgroundColor: REGION_META[key].marker }}
                    />
                    <span className="text-xs text-on-surface">{t(`regions.${key}`)}</span>
                </div>
            ))}
        </div>
    )
}

function createHeritagePinIcon(active: boolean, visited: boolean, locked: boolean, color: string): L.DivIcon {
    const visitedClass = visited ? ' heritage-map-pin--visited' : ''
    const lockedClass = locked ? ' heritage-map-pin--locked' : ''
    const activeClass = active ? ' heritage-map-pin--active' : ''
    const badge = locked ? '🔒' : visited ? '✓' : ''
    const badgeHtml = badge
        ? `<span class="heritage-map-pin__visited-badge">${badge}</span>`
        : ''
    return L.divIcon({
        className: 'heritage-map-pin-wrap',
        html: `
      <div class="heritage-map-pin${activeClass}${visitedClass}${lockedClass}" style="--pin-color:${color};opacity:${locked ? 0.45 : 1}">
        <span class="heritage-map-pin__glow"></span>
        <span class="heritage-map-pin__head"></span>
        <span class="heritage-map-pin__tail"></span>
        ${badgeHtml}
      </div>
    `,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
    })
}

export function ExploreMapPanel({
    locations,
    visitedIds,
    user,
    onLockedLocationClick,
    onPinClick,
    selectedLocationId,
    digitizationLock = false,
    className = '',
}: ExploreMapPanelProps) {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [mapLayer, setMapLayer] = useState<ExploreMapLayer>('vi')

    const mapContainerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)
    const tileLayerRef = useRef<L.TileLayer | null>(null)
    const markersLayerRef = useRef<L.LayerGroup | null>(null)
    const hasFittedRef = useRef(false)

    const onPinClickRef = useRef(onPinClick)
    const onLockedLocationClickRef = useRef(onLockedLocationClick)
    const userRef = useRef(user)
    const navigateRef = useRef(navigate)

    useEffect(() => { onPinClickRef.current = onPinClick }, [onPinClick])
    useEffect(() => { onLockedLocationClickRef.current = onLockedLocationClick }, [onLockedLocationClick])
    useEffect(() => { userRef.current = user }, [user])
    useEffect(() => { navigateRef.current = navigate }, [navigate])

    const markers = useMemo(() => buildMapMarkers(locations), [locations])
    const markerCount = markers.length
    const hoveredMarker = markers.find((m) => m.location.id === hoveredId)

    const handleMarkerClick = useCallback((marker: MapMarker) => {
        if (digitizationLock && !marker.location.isArAvailable) {
            onLockedLocationClickRef.current?.(marker.location)
            return
        }
        const locked = isLocationLocked(marker.location, userRef.current)
        if (locked) {
            onLockedLocationClickRef.current?.(marker.location)
            return
        }
        if (onPinClickRef.current) {
            onPinClickRef.current(marker.location)
        } else {
            navigateRef.current(`/explore/${marker.location.id}`)
        }
    }, [digitizationLock])

    const fitVietnamView = useCallback((map: L.Map, markerList: MapMarker[]) => {
        const points = buildVietnamFitPoints(markerList)
        if (points.length > 0) {
            const bounds = L.latLngBounds(points)
            map.fitBounds(bounds, { padding: [48, 48], maxZoom: 6 })
        } else {
            map.setView(VIETNAM_MAP_CENTER, VIETNAM_DEFAULT_ZOOM)
        }
    }, [])

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return

        const map = L.map(mapContainerRef.current, {
            center: VIETNAM_MAP_CENTER,
            zoom: VIETNAM_DEFAULT_ZOOM,
            zoomControl: false,
            attributionControl: true,
            maxBounds: L.latLngBounds(VIETNAM_MAP_BOUNDS),
            maxBoundsViscosity: 0.85,
        })

        const tile = L.tileLayer(googleTileUrl('vi', 'vi'), TILE_COMMON).addTo(map)
        const markersLayer = L.layerGroup().addTo(map)

        mapRef.current = map
        tileLayerRef.current = tile
        markersLayerRef.current = markersLayer

        return () => {
            map.remove()
            mapRef.current = null
            tileLayerRef.current = null
            markersLayerRef.current = null
            hasFittedRef.current = false
        }
    }, [])

    useEffect(() => {
        const map = mapRef.current
        const tile = tileLayerRef.current
        if (!map || !tile) return
        tile.setUrl(googleTileUrl(mapLayer, 'vi'))
    }, [mapLayer])

    useEffect(() => {
        const map = mapRef.current
        const markersLayer = markersLayerRef.current
        if (!map || !markersLayer) return

        markersLayer.clearLayers()

        markers.forEach((marker) => {
            const visited = visitedIds?.has(marker.location.id) ?? false
            const digitizationLocked = digitizationLock && !marker.location.isArAvailable
            const questLocked = !digitizationLock && isLocationLocked(marker.location, user)
            const locked = digitizationLocked || questLocked
            const active = hoveredId === marker.location.id || selectedLocationId === marker.location.id
            const color = locked ? '#6b7280' : REGION_META[marker.region].marker

            const leafletMarker = L.marker([marker.lat, marker.lng], {
                icon: createHeritagePinIcon(active, visited, locked, color),
                riseOnHover: true,
            })

            leafletMarker.on('click', () => handleMarkerClick(marker))
            leafletMarker.on('mouseover', () => setHoveredId(marker.location.id))
            leafletMarker.on('mouseout', () => setHoveredId((id) => (id === marker.location.id ? null : id)))
            leafletMarker.addTo(markersLayer)
        })

        if (!hasFittedRef.current && markers.length > 0) {
            fitVietnamView(map, markers)
            hasFittedRef.current = true
        }
    }, [markers, visitedIds, user, hoveredId, selectedLocationId, handleMarkerClick, fitVietnamView, digitizationLock])

    const resetView = () => {
        const map = mapRef.current
        if (!map) return
        fitVietnamView(map, markers)
    }

    const zoomBy = (delta: number) => {
        const map = mapRef.current
        if (!map) return
        map.setZoom(Math.max(5, Math.min(19, map.getZoom() + delta)))
    }

    return (
        <section className={`flex-1 h-64 lg:h-full min-h-[16rem] lg:min-h-0 rounded-2xl overflow-hidden border border-outline-variant relative shadow-inner bg-[#0b1628] ${className}`}>
            <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

            <div className="absolute right-md bottom-md flex flex-col items-end gap-sm z-[500] pointer-events-none">
                <div className="pointer-events-auto">
                    <RegionLegend />
                </div>
                <div className="grid grid-cols-2 gap-1.5 w-full min-w-[168px] pointer-events-auto">
                    {EXPLORE_MAP_LAYER_IDS.map((id) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setMapLayer(id)}
                            className={`tour360-map-layer-btn ${mapLayer === id ? 'is-active' : ''}`}
                        >
                            {t(exploreLayerLabelKey(id))}
                        </button>
                    ))}
                </div>
                <div className="flex flex-col gap-sm pointer-events-auto">
                    <button
                        type="button"
                        onClick={resetView}
                        className="w-10 h-10 bg-surface/95 border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:border-primary hover:text-primary transition-colors shadow-lg cursor-pointer"
                        aria-label={t('map.resetView')}
                        title={t('map.resetView')}
                    >
                        <MaterialIcon name="my_location" />
                    </button>
                    <button
                        type="button"
                        onClick={() => zoomBy(1)}
                        className="w-10 h-10 bg-surface/95 border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:border-secondary hover:text-secondary transition-colors shadow-lg cursor-pointer"
                        aria-label={t('map.zoomIn')}
                    >
                        <MaterialIcon name="add" />
                    </button>
                    <button
                        type="button"
                        onClick={() => zoomBy(-1)}
                        className="w-10 h-10 bg-surface/95 border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:border-secondary hover:text-secondary transition-colors shadow-lg cursor-pointer"
                        aria-label={t('map.zoomOut')}
                    >
                        <MaterialIcon name="remove" />
                    </button>
                </div>
            </div>

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#091420]/50 via-transparent to-transparent z-[1]" />

            {hoveredMarker && (
                <div className="absolute bottom-4 left-4 z-[600] w-[min(260px,45%)] rounded-xl border border-outline-variant bg-surface-container/95 backdrop-blur-md shadow-2xl overflow-hidden pointer-events-none animate-[fadeIn_0.15s_ease-out]">
                    {hoveredMarker.location.coverImage && (
                        <div className="h-24 w-full overflow-hidden">
                            <img src={hoveredMarker.location.coverImage} alt="" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div
                        className="px-3 py-2.5 border-l-4"
                        style={{ borderLeftColor: REGION_META[hoveredMarker.region].marker }}
                    >
                        <p className="font-title-md text-sm text-on-surface leading-snug">
                            {normalizeHeritageName(hoveredMarker.location.name)}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-1 flex items-center gap-1">
                            <MaterialIcon name="location_on" className="text-sm text-secondary" />
                            {hoveredMarker.location.city}
                        </p>
                        <p className="text-[10px] text-primary mt-1.5">{t(`regions.${hoveredMarker.region}`)}</p>
                    </div>
                </div>
            )}

            <div className="absolute top-md left-md bg-surface-container-high/92 backdrop-blur-md border border-primary/30 px-4 py-2 rounded-full flex items-center gap-2 z-[500] max-w-[90%] shadow-lg pointer-events-none">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15">
                    <MaterialIcon name="map" className="text-primary text-base" />
                </span>
                <div className="min-w-0">
                    <span className="font-title-md text-on-surface text-sm block truncate">{t('map.title')}</span>
                    <span className="text-[10px] text-on-surface-variant">
                        {t('map.points', { count: markerCount })} • {t(exploreLayerHintKey(mapLayer))}
                    </span>
                </div>
            </div>
        </section>
    )
}
