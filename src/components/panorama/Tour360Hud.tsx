// src/components/panorama/Tour360Hud.tsx
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Hotspot, Panorama } from '../../features/panorama/api'
import { groupPanoramasByArea } from '../../features/panorama/cuChiAreaMeta'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { buildArUrl } from '../../features/ar/arDeepLink'
import { getArSceneByPanoramaId } from '../../features/ar/cuChiArScenes'
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
  const areaGroups = useMemo(
    () => (isCuChi ? groupPanoramasByArea(panoramas) : null),
    [isCuChi, panoramas],
  )
  const [openAreas, setOpenAreas] = useState<Set<string>>(() => new Set())

  const toggleArea = (slug: string) => {
    setOpenAreas((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const isAreaOpen = (slug: string, routeOrder: number) =>
    openAreas.has(slug) || routeOrder <= 2 || slug === activePanorama?.areaSlug

  const handleSelectScene = (id: string) => {
    onSelectPanorama(id)
    onToggleMenu()
  }

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
          {isCuChi && viewMode === 'panorama' && activePanoramaId && getArSceneByPanoramaId(activePanoramaId) && (
            <Link
              to={buildArUrl({
                locationId,
                mode: 'sim',
                scene: getArSceneByPanoramaId(activePanoramaId)!.slug,
              })}
              className="tour360-hud-btn"
              aria-label="Xem AR"
              title="Cổng AR"
            >
              <MaterialIcon name="view_in_ar" />
            </Link>
          )}
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

            {isCuChi && areaGroups ? (
              <ul className="tour360-menu__list tour360-menu__list--areas">
                {areaGroups.map((group) => {
                  const expanded = isAreaOpen(group.areaSlug, group.routeOrder)
                  const multiScene = group.scenes.length > 1
                  return (
                    <li key={group.areaSlug} className="tour360-menu__area">
                      <button
                        type="button"
                        className={`tour360-menu__area-head ${expanded ? 'is-open' : ''}`}
                        onClick={() => (multiScene ? toggleArea(group.areaSlug) : handleSelectScene(group.scenes[0]!.id))}
                        aria-expanded={multiScene ? expanded : undefined}
                      >
                        <span className="tour360-menu__station">{group.routeOrder}</span>
                        <span className="flex-1 min-w-0 text-left">
                          <span className="block font-bold truncate">{group.label}</span>
                          {multiScene && (
                            <span className="block text-[10px] text-gray-400 font-medium">
                              {group.scenes.length} góc nhìn
                            </span>
                          )}
                        </span>
                        {multiScene && (
                          <MaterialIcon
                            name={expanded ? 'expand_less' : 'expand_more'}
                            className="text-base shrink-0 opacity-70"
                          />
                        )}
                      </button>
                      {multiScene && expanded && (
                        <ul className="tour360-menu__sublist">
                          {group.scenes.map((p) => (
                            <li key={p.id}>
                              <button
                                type="button"
                                className={`tour360-menu__item tour360-menu__item--sub ${activePanoramaId === p.id ? 'is-active' : ''}`}
                                onClick={() => handleSelectScene(p.id)}
                              >
                                <MaterialIcon name="panorama" className="text-base shrink-0" />
                                <span>{p.title}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <ul className="tour360-menu__list">
                {panoramas.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className={`tour360-menu__item ${activePanoramaId === p.id ? 'is-active' : ''}`}
                      onClick={() => handleSelectScene(p.id)}
                    >
                      <MaterialIcon name="panorama" className="text-base shrink-0" />
                      <span>{p.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

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
