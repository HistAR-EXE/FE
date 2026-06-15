import L from 'leaflet'

import { CU_CHI_TOUR_ROUTE, CU_CHI_WALKING_PATHS } from './cuChiTourMapLayout'

/** Vẽ lộ trình vàng nhiều lớp + đường mòn phụ — gần thực tế hơn trên vệ tinh */
export function addCuChiTourRouteLayers(group: L.LayerGroup): void {
  CU_CHI_WALKING_PATHS.forEach((path) => {
    group.addLayer(
      L.polyline(path, {
        color: '#e8dcc8',
        weight: 2.5,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '2 6',
      }),
    )
  })

  const shadow = L.polyline(CU_CHI_TOUR_ROUTE, {
    color: '#1c1408',
    weight: 9,
    opacity: 0.38,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 1.2,
  })
  const border = L.polyline(CU_CHI_TOUR_ROUTE, {
    color: '#fff7ed',
    weight: 6,
    opacity: 0.82,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 1.2,
  })
  const main = L.polyline(CU_CHI_TOUR_ROUTE, {
    color: '#f59e0b',
    weight: 4,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 1.2,
  })
  const highlight = L.polyline(CU_CHI_TOUR_ROUTE, {
    color: '#fde68a',
    weight: 2,
    opacity: 0.75,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 1.2,
    dashArray: '10 14',
  })

  group.addLayer(shadow)
  group.addLayer(border)
  group.addLayer(main)
  group.addLayer(highlight)
}

/** Ghim số thứ tự trên lộ trình */
export function addCuChiRouteStopMarkers(
  group: L.LayerGroup,
  stops: { lat: number; lng: number; order: number }[],
): void {
  stops.forEach(({ lat, lng, order }) => {
    const icon = L.divIcon({
      className: 'tour360-route-stop-wrap',
      html: `<span class="tour360-route-stop">${order}</span>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    })
    group.addLayer(L.marker([lat, lng], { icon, interactive: false }))
  })
}
