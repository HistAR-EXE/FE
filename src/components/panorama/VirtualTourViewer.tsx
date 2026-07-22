// src/components/panorama/VirtualTourViewer.tsx
import { useEffect, useRef } from 'react'
import { images } from '../../assets/images'
import type { Hotspot, MarkerStyle, Panorama } from '../../features/panorama/api'
import { resolveAreaSlug } from '../../features/panorama/cuChiAreaMeta'
import { isHotspotInView } from '../../features/panorama/panoAngles'
import { computeArrivalView } from '../../features/panorama/panoArrivalView'
import { markerHtmlForStyle, type SceneMarkerData } from '../../features/panorama/tour360Markers'
import { resolveSceneLinkNodeId } from '../../features/gamification/discoveryLayer'

const CU_CHI_ENTRANCE_ID = '22222222-2222-2222-2222-222222222221'

type MarkerSelectData = Hotspot | SceneMarkerData

function hotspotPosition(yaw: number, pitch: number) {
    return { yaw, pitch }
}

function resolvePanoramaUrl(imageUrl: string | undefined): string {
    const trimmed = imageUrl?.trim()
    if (!trimmed || trimmed.includes('placeholder') || trimmed.endsWith('.txt')) {
        return images.tour360Panorama
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed
    }
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
    const normalized = path.replace(/\.png$/i, '.jpg')
    return `${window.location.origin}${normalized}`
}

function resolveMarkerStyle(
    hotspot: Hotspot,
    currentAreaSlug: string,
    targetAreaSlug: string,
): MarkerStyle {
    if (hotspot.markerStyle === 'near' || hotspot.markerStyle === 'far') {
        return hotspot.markerStyle
    }
    if (hotspot.pitch <= -0.3) return 'far'
    return currentAreaSlug === targetAreaSlug ? 'near' : 'far'
}

type NearMarkerMeta = {
    id: string
    yaw: number
    areaSlug: string
}

type VirtualTourViewerProps = {
    panoramas: Panorama[]
    hotspotsByPanorama: Record<string, Hotspot[]>
    initialPanoramaId?: string | null
    activePanoramaId?: string | null
    layoutRevision?: number
    calibrateMode?: boolean
    onCalibrateClick?: (yaw: number, pitch: number) => void
    onHotspotSelect?: (hotspot: Hotspot) => void
    onPanoramaEnter?: (panoramaId: string) => void
    onLoadError?: (message: string) => void
    className?: string
}

export function VirtualTourViewer({
    panoramas,
    hotspotsByPanorama,
    initialPanoramaId,
    activePanoramaId,
    layoutRevision = 0,
    calibrateMode = false,
    onCalibrateClick,
    onHotspotSelect,
    onPanoramaEnter,
    onLoadError,
    className = '',
}: VirtualTourViewerProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const viewerRef = useRef<{
        destroy: () => void
        resize: (size: { width: string; height: string }) => void
        getPosition: () => { yaw: number; pitch: number }
        rotate: (p: { yaw?: number; pitch?: number }) => void
        state: { hFov: number }
    } | null>(null)
    const markersPluginRef = useRef<{
        showMarker: (id: string) => void
        hideMarker: (id: string) => void
    } | null>(null)
    const startNodeIdRef = useRef<string | null>(initialPanoramaId ?? null)
    const tourPluginRef = useRef<{ setCurrentNode: (id: string) => Promise<boolean> } | null>(null)
    const lastNodeRef = useRef<string | null>(null)
    const rafRef = useRef<number | null>(null)
    const disposedRef = useRef(false)
    const nearMarkersRef = useRef<NearMarkerMeta[]>([])
    const panoramaByIdRef = useRef<Map<string, Panorama>>(new Map())
    const pendingArrivalRef = useRef<{ yaw: number; pitch: number } | null>(null)

    const onPanoramaEnterRef = useRef(onPanoramaEnter)
    const onHotspotSelectRef = useRef(onHotspotSelect)
    const onLoadErrorRef = useRef(onLoadError)
    const onCalibrateClickRef = useRef(onCalibrateClick)

    useEffect(() => {
        onPanoramaEnterRef.current = onPanoramaEnter
        onHotspotSelectRef.current = onHotspotSelect
        onLoadErrorRef.current = onLoadError
        onCalibrateClickRef.current = onCalibrateClick
    }, [onPanoramaEnter, onHotspotSelect, onLoadError, onCalibrateClick])

    useEffect(() => {
        if (startNodeIdRef.current === null && initialPanoramaId) {
            startNodeIdRef.current = initialPanoramaId
        }
    }, [initialPanoramaId])

    useEffect(() => {
        panoramaByIdRef.current = new Map(panoramas.map((p) => [p.id, p]))
    }, [panoramas])

    const resizeViewer = () => {
        const el = containerRef.current
        const viewer = viewerRef.current
        if (!el || !viewer) return
        const { width, height } = el.getBoundingClientRect()
        if (width < 1 || height < 1) return
        viewer.resize({ width: `${width}px`, height: `${height}px` })
    }

    const refreshNearMarkerVisibility = (viewerYaw: number, hFovRad: number, currentAreaSlug: string) => {
        const mp = markersPluginRef.current
        if (!mp) return
        for (const meta of nearMarkersRef.current) {
            const visible =
                meta.areaSlug === currentAreaSlug && isHotspotInView(meta.yaw, viewerYaw, hFovRad)
            if (visible) mp.showMarker(meta.id)
            else mp.hideMarker(meta.id)
        }
    }

    useEffect(() => {
        if (!containerRef.current || panoramas.length === 0) return

        let cancelled = false
        disposedRef.current = false

        const init = async () => {
            const [{ Viewer, EquirectangularAdapter }, { VirtualTourPlugin }, { MarkersPlugin }] =
                await Promise.all([
                    import('@photo-sphere-viewer/core'),
                    import('@photo-sphere-viewer/virtual-tour-plugin'),
                    import('@photo-sphere-viewer/markers-plugin'),
                ])

            await Promise.all([
                import('@photo-sphere-viewer/core/index.css'),
                import('@photo-sphere-viewer/markers-plugin/index.css'),
                import('@photo-sphere-viewer/virtual-tour-plugin/index.css'),
            ])

            if (cancelled || !containerRef.current) return

            const panoramaIds = panoramas.map((p) => p.id)
            const panoMap = new Map(panoramas.map((p) => [p.id, p]))
            nearMarkersRef.current = []

            const nodes = panoramas.map((panorama) => {
                const currentArea = resolveAreaSlug(panorama.id, panorama.areaSlug)
                const hotspots = hotspotsByPanorama[panorama.id] ?? []

                const nodeMarkers = hotspots
                    .filter((h) => h.type !== 'info')
                    .map((h) => {
                    const nodeId = resolveSceneLinkNodeId(h.contentRef, panoramaIds)
                    const target = panoMap.get(nodeId)
                    const targetArea = target
                        ? resolveAreaSlug(target.id, target.areaSlug)
                        : 'unknown'
                    const style = resolveMarkerStyle(h, currentArea, targetArea)
                    const markerId = `scene:${h.id}`

                    if (style === 'near') {
                        nearMarkersRef.current.push({
                            id: markerId,
                            yaw: h.yaw,
                            areaSlug: currentArea,
                        })
                    }

                    return {
                        id: markerId,
                        position: hotspotPosition(h.yaw, h.pitch),
                        html: markerHtmlForStyle(style),
                        anchor: 'center bottom' as const,
                        size: { width: 96, height: 96 },
                        data: {
                            kind: 'scene',
                            targetId: nodeId,
                            hotspot: h,
                            style,
                        } satisfies SceneMarkerData,
                    }
                })

                return {
                    id: panorama.id,
                    panorama: resolvePanoramaUrl(panorama.imageUrl),
                    name: panorama.title,
                    links: [],
                    markers: nodeMarkers,
                }
            })

            const preferredStart =
                startNodeIdRef.current && panoramas.some((p) => p.id === startNodeIdRef.current)
                    ? startNodeIdRef.current
                    : null
            const startNodeId =
                preferredStart ??
                (panoramas.find((p) => p.id === CU_CHI_ENTRANCE_ID)?.id ?? panoramas[0]?.id)

            const viewer = new Viewer({
                container: containerRef.current,
                adapter: EquirectangularAdapter.withConfig({ resolution: 128, useXmpData: false }),
                navbar: false,
                defaultYaw: 0,
                defaultZoomLvl: 35,
                minFov: 38,
                maxFov: 90,
                touchmoveTwoFingers: true,
                mousewheelCtrlKey: false,
                rendererParameters: { antialias: true, alpha: true, powerPreference: 'high-performance' },
                plugins: [
                    [MarkersPlugin, { clickEventOnMarker: true }],
                    [
                        VirtualTourPlugin,
                        {
                            nodes,
                            startNodeId,
                            showLinkTooltip: false,
                            linksOnCompass: false,
                            transitionOptions: { showLoader: true, speed: '20rpm' },
                        },
                    ],
                ],
            })

            viewer.addEventListener('panorama-error', () => {
                onLoadErrorRef.current?.('Không tải được ảnh panorama. Kiểm tra file media.')
            })

            if (calibrateMode) {
                viewer.addEventListener('click', (event: { data?: { yaw?: number; pitch?: number } }) => {
                    const yaw = event.data?.yaw
                    const pitch = event.data?.pitch
                    if (yaw != null && pitch != null) {
                        onCalibrateClickRef.current?.(yaw, pitch)
                    }
                })
            }

            const markers = viewer.getPlugin(MarkersPlugin) as unknown as {
                addEventListener: (type: string, fn: (e: { marker: { data?: MarkerSelectData } }) => void) => void
                showMarker: (id: string) => void
                hideMarker: (id: string) => void
            } | null

            markersPluginRef.current = markers

            if (markers) {
                markers.addEventListener('select-marker', ({ marker }: { marker: { data?: MarkerSelectData } }) => {
                    const data = marker?.data
                    if (!data) return
                    if ('kind' in data && data.kind === 'scene') {
                        const fromId = lastNodeRef.current
                        const targetId = data.targetId
                        const destPano = panoramaByIdRef.current.get(targetId)
                        const destHotspots = hotspotsByPanorama[targetId] ?? []
                        if (fromId && destPano) {
                            pendingArrivalRef.current = computeArrivalView(
                                fromId,
                                data.hotspot,
                                destHotspots,
                                panoramaIds,
                                destPano,
                            )
                        } else {
                            pendingArrivalRef.current = null
                        }
                        void tourPluginRef.current?.setCurrentNode(targetId).catch(() => {
                            onLoadErrorRef.current?.('Không chuyển được scene.')
                        })
                        return
                    }
                    onHotspotSelectRef.current?.(data as Hotspot)
                })
            }

            const onPositionUpdated = () => {
                if (disposedRef.current || cancelled) return
                if (rafRef.current !== null) return
                rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = null
                    if (disposedRef.current || cancelled) return
                    const v = viewerRef.current
                    if (!v) return
                    const { yaw } = v.getPosition()
                    const nodeId = lastNodeRef.current
                    const pano = nodeId ? panoramaByIdRef.current.get(nodeId) : undefined
                    const area = pano ? resolveAreaSlug(pano.id, pano.areaSlug) : ''
                    refreshNearMarkerVisibility(yaw, v.state.hFov, area)
                })
            }

            viewer.addEventListener('position-updated', onPositionUpdated)

            const tour = viewer.getPlugin(VirtualTourPlugin) as unknown as {
                addEventListener: (type: string, fn: (e: { node: { id: string } }) => void) => void
                setCurrentNode: (id: string) => Promise<boolean>
            } | null

            const applyDefaultView = (nodeId: string) => {
                const pano = panoramaByIdRef.current.get(nodeId)
                if (!pano) return
                const yaw = pano.defaultYaw ?? 0
                const pitch = pano.defaultPitch ?? 0
                viewer.rotate({ yaw, pitch })
            }

            if (tour) {
                tourPluginRef.current = tour
                tour.addEventListener('node-changed', (event) => {
                    if (event?.node?.id) {
                        lastNodeRef.current = event.node.id
                        const pending = pendingArrivalRef.current
                        if (pending) {
                            pendingArrivalRef.current = null
                            viewer.rotate({ yaw: pending.yaw, pitch: pending.pitch })
                        } else {
                            applyDefaultView(event.node.id)
                        }
                        onPanoramaEnterRef.current?.(event.node.id)
                        const { yaw } = viewer.getPosition()
                        const pano = panoramaByIdRef.current.get(event.node.id)
                        const area = pano ? resolveAreaSlug(pano.id, pano.areaSlug) : ''
                        refreshNearMarkerVisibility(yaw, viewer.state.hFov, area)
                    }
                })
                if (startNodeId) {
                    lastNodeRef.current = startNodeId
                    applyDefaultView(startNodeId)
                    onPanoramaEnterRef.current?.(startNodeId)
                }
            }

            viewerRef.current = viewer as typeof viewerRef.current

            requestAnimationFrame(() => {
                if (!cancelled) resizeViewer()
            })

            return () => {
                disposedRef.current = true
                if (rafRef.current !== null) {
                    cancelAnimationFrame(rafRef.current)
                    rafRef.current = null
                }
                viewer.removeEventListener('position-updated', onPositionUpdated)
            }
        }

        let cleanupPosition: (() => void) | undefined

        init()
            .then((cleanup) => {
                cleanupPosition = cleanup
            })
            .catch(() => {
                onLoadErrorRef.current?.('Không khởi tạo được trình xem 360°.')
            })

        return () => {
            cancelled = true
            disposedRef.current = true
            cleanupPosition?.()
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current)
                rafRef.current = null
            }
            tourPluginRef.current = null
            markersPluginRef.current = null
            lastNodeRef.current = null
            nearMarkersRef.current = []
            pendingArrivalRef.current = null
            viewerRef.current?.destroy()
            viewerRef.current = null
            if (containerRef.current) {
                containerRef.current.replaceChildren()
            }
        }
    }, [panoramas, hotspotsByPanorama, calibrateMode])

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const observer = new ResizeObserver(() => {
            resizeViewer()
        })
        observer.observe(el)
        resizeViewer()

        return () => observer.disconnect()
    }, [layoutRevision])

    useEffect(() => {
        if (!activePanoramaId || !tourPluginRef.current) return
        if (lastNodeRef.current === activePanoramaId) return
        void tourPluginRef.current.setCurrentNode(activePanoramaId).catch(() => {
            onLoadErrorRef.current?.('Không chuyển được scene.')
        })
    }, [activePanoramaId])

    return <div ref={containerRef} className={`tour360-viewer ${className}`} />
}
