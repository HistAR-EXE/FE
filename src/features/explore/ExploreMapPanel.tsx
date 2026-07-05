// src/features/explore/ExploreMapPanel.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  VIETNAM_SOVEREIGN_ARCHIPELAGOS,
} from './vietnamMap'
import { REGION_META, type VietnamRegion } from './vietnamGeo'
import {
  EXPLORE_MAP_LAYERS,
  exploreLayerHint,
  HYBRID_ATTRIBUTION,
  REFERENCE_LABELS_TILE_URL,
  SATELLITE_TILE_URL,
  TILE_COMMON,
  VI_ATTRIBUTION,
  VOYAGER_MAP_URL,
  type ExploreMapLayer,
} from './exploreMapTiles'
import { isLocationLocked } from './locationUnlock'
import type { ContentAccessUser } from '../../shared/access/contentAccess'

type ExploreMapPanelProps = {
  locations: HeritageLocation[]
  visitedIds?: Set<string>
  user?: ContentAccessUser
  onLockedLocationClick?: (location: HeritageLocation) => void
  className?: string
}

function RegionLegend() {
  const regions: VietnamRegion[] = ['north', 'central', 'south']
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container/92 backdrop-blur-md px-3 py-2.5 shadow-lg">
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm mb-0.5">Vùng miền</p>
      {regions.map((key) => (
        <div key={key} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/40"
            style={{ backgroundColor: REGION_META[key].marker }}
          />
          <span className="text-xs text-on-surface">{REGION_META[key].label}</span>
        </div>
      ))}
      <div className="border-t border-outline-variant/50 pt-1.5 mt-0.5">
        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm mb-1">Biển đảo</p>
        {VIETNAM_SOVEREIGN_ARCHIPELAGOS.map((arch) => (
          <div key={arch.id} className="flex items-center gap-2">
            <span className="text-xs text-[#da251d] shrink-0">★</span>
            <span className="text-xs text-on-surface">{arch.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function createSovereignIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: 'vn-sovereign-pin-wrap',
    html: `
      <div class="vn-sovereign-pin">
        <span class="vn-sovereign-pin__star">★</span>
        <span class="vn-sovereign-pin__label">${label}</span>
      </div>
    `,
    iconSize: [168, 28],
    iconAnchor: [7, 14],
  })
}

function fitVietnamView(map: L.Map, markerList: MapMarker[], animate: boolean) {
  const points = buildVietnamFitPoints(markerList)
  if (points.length === 0) {
    map.setView(VIETNAM_MAP_CENTER, VIETNAM_DEFAULT_ZOOM, { animate })
    return
  }
  const bounds = L.latLngBounds(points)
  map.fitBounds(bounds.pad(0.1), { animate, maxZoom: 6 })
}

function createPinIcon(region: VietnamRegion, active: boolean, visited: boolean, locked: boolean): L.DivIcon {
  const color = locked ? '#6b7280' : REGION_META[region].marker
  const size = 32
  const visitedClass = visited ? ' heritage-map-pin--visited' : ''
  const lockedClass = locked ? ' heritage-map-pin--locked' : ''
  return L.divIcon({
    className: 'heritage-map-pin-wrap',
    html: `
      <div class="heritage-map-pin ${active ? 'heritage-map-pin--active' : ''}${visitedClass}${lockedClass}" style="--pin-color:${color};${locked ? 'opacity:0.45;' : ''}">
        <span class="heritage-map-pin__glow"></span>
        <span class="heritage-map-pin__head"></span>
        <span class="heritage-map-pin__tail"></span>
        ${locked ? '<span class="heritage-map-pin__visited-badge">🔒</span>' : visited ? '<span class="heritage-map-pin__visited-badge">✓</span>' : ''}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  })
}

export function ExploreMapPanel({ locations, visitedIds, user, onLockedLocationClick, className = '' }: ExploreMapPanelProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const sovereignLayerRef = useRef<L.LayerGroup | null>(null)
  const viMapLayerRef = useRef<L.TileLayer | null>(null)
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const referenceLabelsRef = useRef<L.TileLayer | null>(null)
  const markerRefs = useRef<Map<string, L.Marker>>(new Map())

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mapLayer, setMapLayer] = useState<ExploreMapLayer>('vi')

  const markers = useMemo(() => buildMapMarkers(locations), [locations])
  const markerCount = markers.length
  const hoveredMarker = markers.find((m) => m.location.id === hoveredId)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: VIETNAM_MAP_CENTER,
      zoom: VIETNAM_DEFAULT_ZOOM,
      minZoom: 5,
      maxZoom: 19,
      maxBounds: VIETNAM_MAP_BOUNDS,
      maxBoundsViscosity: 0.35,
      zoomControl: false,
      attributionControl: true,
    })

    viMapLayerRef.current = L.tileLayer(VOYAGER_MAP_URL, {
      ...TILE_COMMON,
      attribution: VI_ATTRIBUTION,
    })
    satelliteLayerRef.current = L.tileLayer(SATELLITE_TILE_URL, {
      ...TILE_COMMON,
      attribution: HYBRID_ATTRIBUTION,
    })
    referenceLabelsRef.current = L.tileLayer(REFERENCE_LABELS_TILE_URL, {
      ...TILE_COMMON,
      attribution: '',
      pane: 'overlayPane',
    })

    viMapLayerRef.current.addTo(map)

    const sovereignLayer = L.layerGroup().addTo(map)
    VIETNAM_SOVEREIGN_ARCHIPELAGOS.forEach((arch) => {
      const marker = L.marker([arch.lat, arch.lng], {
        icon: createSovereignIcon(arch.label),
      })
      marker.bindTooltip(arch.hoverText, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.95,
        className: 'vn-sovereign-tooltip',
      })
      marker.addTo(sovereignLayer)
    })
    sovereignLayerRef.current = sovereignLayer

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
      sovereignLayerRef.current = null
      viMapLayerRef.current = null
      satelliteLayerRef.current = null
      referenceLabelsRef.current = null
      markerRefs.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const viMap = viMapLayerRef.current
    const satellite = satelliteLayerRef.current
    const refLabels = referenceLabelsRef.current
    if (!map || !viMap || !satellite || !refLabels) return

    ;[viMap, satellite, refLabels].forEach((layer) => {
      if (map.hasLayer(layer)) map.removeLayer(layer)
    })

    if (mapLayer === 'vi') {
      viMap.addTo(map)
    } else {
      satellite.addTo(map)
      refLabels.addTo(map)
    }
  }, [mapLayer])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    markerRefs.current.clear()

    markers.forEach((marker) => {
      const name = normalizeHeritageName(marker.location.name)
      const visited = visitedIds?.has(marker.location.id) ?? false
      const locked = isLocationLocked(marker.location, user)
      const icon = createPinIcon(marker.region, false, visited, locked)
      const leafletMarker = L.marker([marker.lat, marker.lng], { icon })

      leafletMarker.on('mouseover', () => setHoveredId(marker.location.id))
      leafletMarker.on('mouseout', () => setHoveredId(null))
      leafletMarker.on('click', () => {
        if (locked) {
          onLockedLocationClick?.(marker.location)
          return
        }
        navigate(`/explore/${marker.location.id}`)
      })

      const tooltipSuffix = locked ? '<br/><em>🔒 Hoàn thành quest trước để mở khoá</em>' : ''
      leafletMarker.bindTooltip(
        `<strong>${name}</strong><br/><span>${marker.location.city}</span>${tooltipSuffix}`,
        {
          direction: 'top',
          offset: [0, -34],
          opacity: 0.95,
          className: 'heritage-map-tooltip',
        },
      )

      leafletMarker.addTo(layer)
      markerRefs.current.set(marker.location.id, leafletMarker)
    })

    if (markers.length > 0) {
      fitVietnamView(map, markers, false)
    }
  }, [markers, navigate, visitedIds, onLockedLocationClick, user])

  useEffect(() => {
    markers.forEach((marker) => {
      const leafletMarker = markerRefs.current.get(marker.location.id)
      if (!leafletMarker) return
      const visited = visitedIds?.has(marker.location.id) ?? false
      const locked = isLocationLocked(marker.location, user)
      leafletMarker.setIcon(createPinIcon(marker.region, hoveredId === marker.location.id, visited, locked))
    })
  }, [hoveredId, markers, visitedIds, user])

  const zoomIn = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const resetView = () => {
    const map = mapRef.current
    if (!map) return
    fitVietnamView(map, markers, true)
  }

  return (
    <section className={`flex-1 h-64 lg:h-full min-h-[16rem] lg:min-h-0 rounded-2xl overflow-hidden border border-outline-variant relative shadow-inner bg-[#0b1628] ${className}`}>
      <div ref={containerRef} className="heritage-leaflet-map absolute inset-0 z-0" />

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#091420]/50 via-transparent to-transparent z-[1]" />

      {hoveredMarker && (
        <div className="absolute top-14 right-md z-[500] w-[min(260px,45%)] rounded-xl border border-outline-variant bg-surface-container/95 backdrop-blur-md shadow-2xl overflow-hidden pointer-events-none">
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
            <p className="text-[10px] text-primary mt-1.5">{REGION_META[hoveredMarker.region].label}</p>
          </div>
        </div>
      )}

      <div className="absolute right-md bottom-md flex flex-col items-end gap-sm z-[500] pointer-events-auto">
        <RegionLegend />

        <div className="grid grid-cols-2 gap-1.5 w-full min-w-[168px]">
          {EXPLORE_MAP_LAYERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setMapLayer(id)}
              className={`tour360-map-layer-btn ${mapLayer === id ? 'is-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-sm">
          <button
            type="button"
            onClick={resetView}
            className="w-10 h-10 bg-surface/95 border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:border-primary hover:text-primary transition-colors shadow-lg"
            aria-label="Xem toàn bộ Việt Nam"
            title="Xem toàn bộ"
          >
            <MaterialIcon name="my_location" />
          </button>
          <button
            type="button"
            onClick={zoomIn}
            className="w-10 h-10 bg-surface/95 border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:border-secondary hover:text-secondary transition-colors shadow-lg"
            aria-label="Phóng to bản đồ"
          >
            <MaterialIcon name="add" />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="w-10 h-10 bg-surface/95 border border-outline-variant rounded-full flex items-center justify-center text-on-surface hover:border-secondary hover:text-secondary transition-colors shadow-lg"
            aria-label="Thu nhỏ bản đồ"
          >
            <MaterialIcon name="remove" />
          </button>
        </div>
      </div>

      <div className="absolute top-md left-md bg-surface-container-high/92 backdrop-blur-md border border-primary/30 px-4 py-2 rounded-full flex items-center gap-2 z-[500] max-w-[90%] shadow-lg pointer-events-none">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15">
          <MaterialIcon name="map" className="text-primary text-base" />
        </span>
        <div className="min-w-0">
          <span className="font-title-md text-on-surface text-sm block truncate">Bản đồ di tích Việt Nam</span>
          <span className="text-[10px] text-on-surface-variant">
            {markerCount} điểm • {exploreLayerHint(mapLayer)}
          </span>
        </div>
      </div>

      <div className="absolute bottom-md left-md bg-surface-container-high/88 backdrop-blur-sm border border-outline-variant/70 px-3 py-2 rounded-lg z-[500] hidden sm:block max-w-[260px] pointer-events-none">
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          Chế độ <strong className="text-on-surface">Bản đồ</strong> giữ tên đường, phường khi phóng to tối đa. Chọn{' '}
          <strong className="text-on-surface">Vệ tinh</strong> để xem ảnh thật.
        </p>
      </div>
    </section>
  )
}
