import { Link } from 'react-router-dom'

import type { Hotspot, Panorama } from '../../features/panorama/api'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { MaterialIcon } from '../ui/MaterialIcon'

type Tour360HudProps = {
  locationId: string
  panoramas: Panorama[]
  activePanorama: Panorama | undefined
  activePanoramaId: string | null
  activeInfoHotspots: Hotspot[]
  viewMode: 'map' | 'panorama'
  immersive: boolean
  onSelectPanorama: (id: string) => void
  onInfoHotspot: (hotspot: Hotspot) => void
  onOpenMap: () => void
  onToggleImmersive: () => void
  menuOpen: boolean
  onToggleMenu: () => void
}

export function Tour360Hud({
  locationId,
  panoramas,
  activePanorama,
  activePanoramaId,
  activeInfoHotspots,
  viewMode,
  immersive,
  onSelectPanorama,
  onInfoHotspot,
  onOpenMap,
  onToggleImmersive,
  menuOpen,
  onToggleMenu,
}: Tour360HudProps) {
  const isCuChi = locationId === CU_CHI_LOCATION_ID

  return (
    <>
      <div className={`tour360-hud-top ${immersive ? 'tour360-hud-top--immersive' : ''}`}>
        {immersive ? (
          <Link
            to={locationId ? `/explore/${locationId}` : '/explore'}
            className="tour360-hud-btn"
            aria-label="Quay lại"
          >
            <MaterialIcon name="arrow_back" />
          </Link>
        ) : (
          <span className="w-9 shrink-0 hidden md:block" aria-hidden />
        )}
        {viewMode === 'map' ? (
          <span className="flex-1 min-w-0" aria-hidden />
        ) : (
          <p className="tour360-hud-title">{activePanorama?.title ?? 'Tour 360°'}</p>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {isCuChi && viewMode === 'panorama' && (
            <button
              type="button"
              className="tour360-hud-btn"
              onClick={onOpenMap}
              aria-label="Mở bản đồ"
              title="Bản đồ"
            >
              <MaterialIcon name="map" />
            </button>
          )}
          <button
            type="button"
            className={`tour360-hud-btn ${immersive ? 'is-active' : ''}`}
            onClick={onToggleImmersive}
            aria-label={immersive ? 'Thu nhỏ khung hình' : 'Mở rộng toàn màn hình'}
            title={immersive ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            <MaterialIcon name={immersive ? 'close_fullscreen' : 'open_in_full'} />
          </button>
          <button
            type="button"
            className={`tour360-hud-btn ${menuOpen ? 'is-active' : ''}`}
            onClick={onToggleMenu}
            aria-label="Menu tour"
            aria-expanded={menuOpen}
          >
            <MaterialIcon name="more_vert" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="tour360-menu-backdrop"
            onClick={onToggleMenu}
            aria-label="Đóng menu"
          />
          <aside className="tour360-menu" role="dialog" aria-label="Điều hướng tour">
            <p className="tour360-menu__heading">Điều hướng</p>
            <p className="tour360-menu__hint">
              {isCuChi
                ? 'Chọn điểm trên bản đồ hoặc danh sách bên dưới'
                : 'Kéo xoay · Cuộn zoom · Chọn scene'}
            </p>

            {isCuChi && viewMode === 'panorama' && (
              <button type="button" className="tour360-menu__map-cta" onClick={onOpenMap}>
                <MaterialIcon name="map" />
                Mở bản đồ khu di tích
              </button>
            )}

            <ul className="tour360-menu__list">
              {panoramas.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`tour360-menu__item ${activePanoramaId === p.id ? 'is-active' : ''}`}
                    onClick={() => {
                      onSelectPanorama(p.id)
                      onToggleMenu()
                    }}
                  >
                    <MaterialIcon name="panorama" className="text-base shrink-0" />
                    <span>{p.title}</span>
                  </button>
                </li>
              ))}
            </ul>

            {activeInfoHotspots.length > 0 && (
              <>
                <p className="tour360-menu__heading mt-md">Điểm tham quan</p>
                <ul className="tour360-menu__list">
                  {activeInfoHotspots.map((h) => (
                    <li key={h.id}>
                      <button
                        type="button"
                        className="tour360-menu__item"
                        onClick={() => {
                          onInfoHotspot(h)
                          onToggleMenu()
                        }}
                      >
                        <MaterialIcon name="info" className="text-base shrink-0" />
                        <span>{h.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </>
      )}
    </>
  )
}
