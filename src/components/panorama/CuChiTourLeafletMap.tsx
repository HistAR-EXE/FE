// src/components/panorama/CuChiTourLeafletMap.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import type { Panorama } from '../../features/panorama/api'
import type { CuChiLandmark } from '../../features/panorama/cuChiTourMapLayout'
import {
  CU_CHI_LANDMARKS,
  CU_CHI_SITE_BOUNDS,
  CU_CHI_SITE_POLYGON,
  CU_CHI_TOUR_CENTER,
  CU_CHI_TOUR_MAP_PINS,
  CU_CHI_TOUR_ZOOM,
} from '../../features/panorama/cuChiTourMapLayout'
import { addCuChiRouteStopMarkers, addCuChiTourRouteLayers } from '../../features/panorama/cuChiTourRouteLayer'
import { MaterialIcon } from '../ui/MaterialIcon'

const VOYAGER_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const LABELS_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
const TERRAIN_TILE_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
const SATELLITE_ATTRIBUTION = 'Ảnh &copy; Esri, Maxar, Earthstar Geographics'
const TERRAIN_ATTRIBUTION =
  '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; OpenStreetMap'

const PIN_RED = '#dc2626'

type MapLayer = 'hybrid' | 'satellite' | 'terrain' | 'street'

type MapMarker = {
  panorama: Panorama
  lat: number
  lng: number
  shortLabel: string
  detail: string
}

type CuChiTourLeafletMapProps = {
  panoramas: Panorama[]
  activePanoramaId: string | null
  onSelectPanorama: (id: string) => void
  layoutRevision?: number
  className?: string
}

function panoramaThumbUrl(imageUrl: string): string {
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
  return path.replace(/\.png$/i, '.jpg')
}

function createRedPinIcon(active: boolean): L.DivIcon {
  const size = 32
  return L.divIcon({
    className: 'heritage-map-pin-wrap',
    html: `
      <div class="heritage-map-pin tour360-map-pin ${active ? 'heritage-map-pin--active' : ''}" style="--pin-color:${PIN_RED}">
        <span class="heritage-map-pin__glow"></span>
        <span class="heritage-map-pin__head"></span>
        <span class="heritage-map-pin__tail"></span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  })
}

function createLandmarkIcon(color: string, kind: CuChiLandmark['kind']): L.DivIcon {
  const ring = kind === 'water' ? 'tour360-landmark--water' : kind === 'road' ? 'tour360-landmark--road' : ''
  return L.divIcon({
    className: 'tour360-landmark-wrap',
    html: `<span class="tour360-landmark ${ring}" style="--lm-color:${color}"></span>`,
    iconSize: kind === 'water' ? [16, 16] : [13, 13],
    iconAnchor: kind === 'water' ? [8, 8] : [6.5, 6.5],
  })
}

export function CuChiTourLeafletMap({
  panoramas,
  activePanoramaId,
  onSelectPanorama,
  layoutRevision = 0,
  className = '',
}: CuChiTourLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const landmarkLayerRef = useRef<L.LayerGroup | null>(null)
  const overlayLayerRef = useRef<L.LayerGroup | null>(null)
  const routeStopLayerRef = useRef<L.LayerGroup | null>(null)
  const streetLayerRef = useRef<L.TileLayer | null>(null)
  const satelliteLayerRef = useRef<L.TileLayer | null>(null)
  const labelsLayerRef = useRef<L.TileLayer | null>(null)
  const terrainLayerRef = useRef<L.TileLayer | null>(null)
  const markerRefs = useRef<Map<string, L.Marker>>(new Map())

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoverAnchor, setHoverAnchor] = useState<{ x: number; y: number } | null>(null)
  const [mapLayer, setMapLayer] = useState<MapLayer>('hybrid')

  const markers = useMemo<MapMarker[]>(
    () =>
      panoramas
        .map((panorama) => {
          const pin = CU_CHI_TOUR_MAP_PINS[panorama.id]
          if (!pin) return null
          return { panorama, ...pin }
        })
        .filter(Boolean) as MapMarker[],
    [panoramas],
  )

  const updateHoverAnchor = useCallback(
    (id: string | null) => {
      const map = mapRef.current
      if (!map || !id) {
        setHoverAnchor(null)
        return
      }
      const marker = markers.find((m) => m.panorama.id === id)
      if (!marker) {
        setHoverAnchor(null)
        return
      }
      const point = map.latLngToContainerPoint([marker.lat, marker.lng])
      setHoverAnchor({ x: point.x, y: point.y })
    },
    [markers],
  )

  const hoveredMarker = markers.find((m) => m.panorama.id === hoveredId)
  const isImageryLayer = mapLayer === 'hybrid' || mapLayer === 'satellite'
  const hoverCardBelow = hoverAnchor !== null && hoverAnchor.y < 200

  useEffect(() => {
    updateHoverAnchor(hoveredId)
  }, [hoveredId, updateHoverAnchor, layoutRevision])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !hoveredId) return
    const refresh = () => updateHoverAnchor(hoveredId)
    map.on('move zoom resize', refresh)
    return () => {
      map.off('move zoom resize', refresh)
    }
  }, [hoveredId, updateHoverAnchor])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: CU_CHI_TOUR_CENTER,
      zoom: CU_CHI_TOUR_ZOOM,
      minZoom: 15,
      maxZoom: 20,
      maxBounds: CU_CHI_SITE_BOUNDS,
      maxBoundsViscosity: 0.85,
      zoomControl: false,
      attributionControl: true,
    })

    const street = L.tileLayer(VOYAGER_TILE_URL, {
      attribution: OSM_ATTRIBUTION,
      subdomains: 'abcd',
      maxZoom: 20,
    })
    const satellite = L.tileLayer(SATELLITE_TILE_URL, {
      attribution: SATELLITE_ATTRIBUTION,
      maxZoom: 20,
    })
    const labels = L.tileLayer(LABELS_TILE_URL, {
      attribution: '',
      maxZoom: 20,
      pane: 'overlayPane',
    })
    const terrain = L.tileLayer(TERRAIN_TILE_URL, {
      attribution: TERRAIN_ATTRIBUTION,
      subdomains: 'abc',
      maxZoom: 17,
    })

    satellite.addTo(map)
    labels.addTo(map)

    streetLayerRef.current = street
    satelliteLayerRef.current = satellite
    labelsLayerRef.current = labels
    terrainLayerRef.current = terrain

    overlayLayerRef.current = L.layerGroup().addTo(map)
    routeStopLayerRef.current = L.layerGroup().addTo(map)
    landmarkLayerRef.current = L.layerGroup().addTo(map)
    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    const siteArea = L.polygon(CU_CHI_SITE_POLYGON, {
      color: '#15803d',
      weight: 2,
      fillColor: '#4ade80',
      fillOpacity: 0.08,
      dashArray: '6 4',
    })
    overlayLayerRef.current.addLayer(siteArea)
    addCuChiTourRouteLayers(overlayLayerRef.current)

    CU_CHI_LANDMARKS.forEach((lm) => {
      const m = L.marker([lm.lat, lm.lng], {
        icon: createLandmarkIcon(lm.color, lm.kind),
        interactive: true,
        zIndexOffset: -100,
      })
      m.bindTooltip(`<strong>${lm.label}</strong>`, {
        direction: 'top',
        offset: [0, -8],
        className: 'tour360-landmark-tooltip',
      })
      m.addTo(landmarkLayerRef.current!)
    })

    const t = window.setTimeout(() => map.invalidateSize(), 120)

    return () => {
      window.clearTimeout(t)
      map.remove()
      mapRef.current = null
      markerLayerRef.current = null
      landmarkLayerRef.current = null
      overlayLayerRef.current = null
      routeStopLayerRef.current = null
      streetLayerRef.current = null
      satelliteLayerRef.current = null
      labelsLayerRef.current = null
      terrainLayerRef.current = null
      markerRefs.current.clear()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const street = streetLayerRef.current
    const satellite = satelliteLayerRef.current
    const labels = labelsLayerRef.current
    const terrain = terrainLayerRef.current
    if (!map || !street || !satellite || !labels || !terrain) return

    ;[street, satellite, labels, terrain].forEach((layer) => {
      if (map.hasLayer(layer)) map.removeLayer(layer)
    })

    if (mapLayer === 'street') {
      street.addTo(map)
    } else if (mapLayer === 'terrain') {
      terrain.addTo(map)
    } else if (mapLayer === 'satellite') {
      satellite.addTo(map)
    } else {
      satellite.addTo(map)
      labels.addTo(map)
    }
  }, [mapLayer])

  useEffect(() => {
    const layer = routeStopLayerRef.current
    if (!layer) return
    layer.clearLayers()
    const routeStops = markers
      .map((m) => {
        const pin = CU_CHI_TOUR_MAP_PINS[m.panorama.id]
        return pin ? { lat: pin.lat, lng: pin.lng, order: pin.routeOrder } : null
      })
      .filter(Boolean) as { lat: number; lng: number; order: number }[]
    addCuChiRouteStopMarkers(layer, routeStops)
  }, [markers])

  useEffect(() => {
    const layer = markerLayerRef.current
    if (!layer) return

    layer.clearLayers()
    markerRefs.current.clear()

    markers.forEach((marker) => {
      const { panorama, lat, lng } = marker
      const active = panorama.id === activePanoramaId
      const leafletMarker = L.marker([lat, lng], { icon: createRedPinIcon(active) })

      leafletMarker.on('mouseover', () => setHoveredId(panorama.id))
      leafletMarker.on('mouseout', () => setHoveredId(null))
      leafletMarker.on('click', () => onSelectPanorama(panorama.id))

      leafletMarker.addTo(layer)
      markerRefs.current.set(panorama.id, leafletMarker)
    })

    const map = mapRef.current
    if (map && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]))
      map.fitBounds(bounds.pad(0.14), { animate: false, maxZoom: 18 })
    }
  }, [markers, onSelectPanorama, activePanoramaId])

  useEffect(() => {
    markers.forEach((marker) => {
      const leafletMarker = markerRefs.current.get(marker.panorama.id)
      if (!leafletMarker) return
      const active = marker.panorama.id === activePanoramaId || hoveredId === marker.panorama.id
      leafletMarker.setIcon(createRedPinIcon(active))
    })
  }, [hoveredId, activePanoramaId, markers])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const t = window.setTimeout(() => map.invalidateSize(), 150)
    return () => window.clearTimeout(t)
  }, [layoutRevision, className])

  const zoomIn = () => mapRef.current?.zoomIn()
  const zoomOut = () => mapRef.current?.zoomOut()
  const resetView = () => {
    const map = mapRef.current
    if (!map) return
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng] as [number, number]))
      map.fitBounds(bounds.pad(0.14), { animate: true, maxZoom: 18 })
      return
    }
    map.setView(CU_CHI_TOUR_CENTER, CU_CHI_TOUR_ZOOM, { animate: true })
  }

  return (
    <section
      className={`tour360-leaflet-shell ${isImageryLayer ? 'tour360-leaflet-shell--imagery' : ''} ${className}`}
    >
      <div ref={containerRef} className="heritage-leaflet-map tour360-leaflet-map absolute inset-0 z-0" />
      <div className="absolute inset-0 pointer-events-none tour360-map-vignette z-[1]" />

      {hoveredMarker && hoverAnchor && (
        <div
          className={`tour360-pin-hover-card z-[480] ${hoverCardBelow ? 'tour360-pin-hover-card--below' : ''}`}
          style={{ left: hoverAnchor.x, top: hoverAnchor.y }}
        >
          <div className="h-24 w-full overflow-hidden bg-surface-container rounded-t-xl">
            <img
              src={panoramaThumbUrl(hoveredMarker.panorama.imageUrl)}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
          <div className="px-3 py-2 border-l-4 border-[#dc2626] bg-surface-container/95 backdrop-blur-md rounded-b-xl">
            <p className="font-title-md text-sm text-on-surface leading-snug">
              {hoveredMarker.panorama.title}
            </p>
            <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{hoveredMarker.detail}</p>
            <p className="text-[10px] text-secondary mt-1 flex items-center gap-1">
              <MaterialIcon name="panorama" className="text-sm" />
              Nhấn ghim để mở 360°
            </p>
          </div>
        </div>
      )}

      <div className="absolute right-4 bottom-4 flex flex-col items-end gap-3 z-[500] pointer-events-auto">
        <div className="flex flex-col gap-1.5 rounded-xl border border-outline-variant/60 bg-surface-container/92 backdrop-blur-md px-3 py-2.5 shadow-lg min-w-[168px]">
          <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm mb-0.5">
            Khu Bến Dược
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white/40 bg-[#dc2626]" />
            <span className="text-xs text-on-surface">{markers.length} điểm 360°</span>
          </div>
          {CU_CHI_LANDMARKS.filter((lm) => lm.kind === 'site').slice(0, 5).map((lm) => (
            <div key={lm.label} className="flex items-center gap-2 mt-0.5">
              <span
                className="w-2 h-2 rounded-full shrink-0 ring-1 ring-white/50"
                style={{ backgroundColor: lm.color }}
              />
              <span className="text-[10px] text-on-surface-variant truncate">{lm.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-outline-variant/40">
            <span className="w-5 h-5 rounded-full shrink-0 bg-gradient-to-br from-amber-300 to-amber-600 text-[9px] font-bold text-amber-950 flex items-center justify-center ring-1 ring-white/50">
              1
            </span>
            <span className="text-[10px] text-on-surface-variant">Lộ trình 360° (1→{markers.length})</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 w-full min-w-[168px]">
          {(
            [
              ['hybrid', 'Vệ tinh+'],
              ['satellite', 'Vệ tinh'],
              ['terrain', 'Địa hình'],
              ['street', 'Bản đồ'],
            ] as const
          ).map(([id, label]) => (
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

        <div className="flex flex-col gap-2">
          <button type="button" onClick={resetView} className="tour360-map-ctrl" aria-label="Xem toàn khu">
            <MaterialIcon name="my_location" />
          </button>
          <button type="button" onClick={zoomIn} className="tour360-map-ctrl" aria-label="Phóng to">
            <MaterialIcon name="add" />
          </button>
          <button type="button" onClick={zoomOut} className="tour360-map-ctrl" aria-label="Thu nhỏ">
            <MaterialIcon name="remove" />
          </button>
        </div>
      </div>

      <div className="absolute top-14 left-4 bg-surface-container-high/92 backdrop-blur-md border border-primary/30 px-4 py-2 rounded-full flex items-center gap-2 z-[500] max-w-[min(420px,92%)] shadow-lg pointer-events-none">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 shrink-0">
          <MaterialIcon name="map" className="text-primary text-base" />
        </span>
        <div className="min-w-0">
          <span className="font-title-md text-on-surface text-sm block truncate">
            Bản đồ Địa đạo Củ Chi — Bến Dược
          </span>
          <span className="text-[10px] text-on-surface-variant">
            {markers.length} điểm 360° • Vệ tinh Esri / OpenTopoMap
          </span>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-surface-container-high/88 backdrop-blur-sm border border-outline-variant/70 px-3 py-2 rounded-lg z-[500] max-w-[min(320px,88vw)] pointer-events-none">
        <p className="text-[11px] text-on-surface-variant leading-relaxed">
          Mặc định <strong className="text-on-surface">Vệ tinh+</strong> — ảnh thật kèm tên đường. Chấm màu là
          điểm tham quan; ghim đỏ mở ảnh 360°.
        </p>
      </div>
    </section>
  )
}
