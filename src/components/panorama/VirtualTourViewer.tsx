// src/components/panorama/VirtualTourViewer.tsx
import { useEffect, useRef } from 'react'
import { images } from '../../assets/images'
import type { Hotspot, Panorama } from '../../features/panorama/api'
import { resolveSceneLinkNodeId } from '../../features/gamification/discoveryLayer'

const CU_CHI_ENTRANCE_ID = '22222222-2222-2222-2222-222222222222'

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

type VirtualTourViewerProps = {
    panoramas: Panorama[]
    hotspotsByPanorama: Record<string, Hotspot[]>
    initialPanoramaId?: string | null
    activePanoramaId?: string | null
    layoutRevision?: number
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
                                      onHotspotSelect,
                                      onPanoramaEnter,
                                      onLoadError,
                                      className = '',
                                  }: VirtualTourViewerProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const viewerRef = useRef<{ destroy: () => void; resize: (size: { width: string; height: string }) => void } | null>(null)
    const startNodeIdRef = useRef<string | null>(initialPanoramaId ?? null)
    const tourPluginRef = useRef<{ setCurrentNode: (id: string) => Promise<boolean> } | null>(null)
    const lastNodeRef = useRef<string | null>(null)

    const onPanoramaEnterRef = useRef(onPanoramaEnter)
    const onHotspotSelectRef = useRef(onHotspotSelect)
    const onLoadErrorRef = useRef(onLoadError)

    // [FIX ESLINT]: Tất cả thao tác gán ref.current phải nằm trong useEffect
    useEffect(() => {
        onPanoramaEnterRef.current = onPanoramaEnter
        onHotspotSelectRef.current = onHotspotSelect
        onLoadErrorRef.current = onLoadError
    }, [onPanoramaEnter, onHotspotSelect, onLoadError])

    // [FIX ESLINT]: Thiết lập giá trị startNodeIdRef lần đầu trong useEffect
    useEffect(() => {
        if (startNodeIdRef.current === null && initialPanoramaId) {
            startNodeIdRef.current = initialPanoramaId
        }
    }, [initialPanoramaId])

    const resizeViewer = () => {
        const el = containerRef.current
        const viewer = viewerRef.current
        if (!el || !viewer) return
        const { width, height } = el.getBoundingClientRect()
        if (width < 1 || height < 1) return
        viewer.resize({ width: `${width}px`, height: `${height}px` })
    }

    useEffect(() => {
        if (!containerRef.current || panoramas.length === 0) return

        let cancelled = false

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

            const nodes = panoramas.map((panorama) => {
                const hotspots = hotspotsByPanorama[panorama.id] ?? []
                const sceneLinks = hotspots
                    .filter((h) => h.type === 'scene' && h.contentRef)
                    .map((h) => ({
                        nodeId: resolveSceneLinkNodeId(h.contentRef, panoramaIds),
                        position: hotspotPosition(h.yaw, h.pitch),
                        name: h.label?.trim() || undefined,
                    }))

                return {
                    id: panorama.id,
                    panorama: resolvePanoramaUrl(panorama.imageUrl),
                    name: panorama.title,
                    links: sceneLinks,
                    markers: hotspots
                        .filter((h) => h.type === 'info')
                        .map((h) => ({
                            id: h.id,
                            position: hotspotPosition(h.yaw, h.pitch),
                            html: `<div class="vt-info-marker"><span>${h.label}</span></div>`,
                            data: h,
                        })),
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
                            showLinkTooltip: true,
                            transitionOptions: { showLoader: true, speed: '20rpm' },
                        },
                    ],
                ],
            })

            viewer.addEventListener('panorama-error', () => {
                onLoadErrorRef.current?.('Không tải được ảnh panorama. Kiểm tra file media.')
            })

            const markers = viewer.getPlugin(MarkersPlugin)
            if (markers) {
                markers.addEventListener('select-marker', ({ marker }: { marker: { data?: Hotspot } }) => {
                    if (marker?.data) onHotspotSelectRef.current?.(marker.data)
                })
            }

            const tour = viewer.getPlugin(VirtualTourPlugin) as unknown as {
                addEventListener: (type: string, fn: (e: { node: { id: string } }) => void) => void
                setCurrentNode: (id: string) => Promise<boolean>
            } | null
            if (tour) {
                tourPluginRef.current = tour
                tour.addEventListener('node-changed', (event) => {
                    if (event?.node?.id) {
                        lastNodeRef.current = event.node.id
                        onPanoramaEnterRef.current?.(event.node.id)
                    }
                })
                if (startNodeId) {
                    lastNodeRef.current = startNodeId
                    onPanoramaEnterRef.current?.(startNodeId)
                }
            }

            viewerRef.current = viewer as typeof viewerRef.current

            requestAnimationFrame(() => {
                if (!cancelled) resizeViewer()
            })
        }

        init().catch(() => {
            onLoadErrorRef.current?.('Không khởi tạo được trình xem 360°.')
        })

        return () => {
            cancelled = true
            tourPluginRef.current = null
            lastNodeRef.current = null
            viewerRef.current?.destroy()
            viewerRef.current = null
            if (containerRef.current) {
                containerRef.current.replaceChildren()
            }
        }
    }, [panoramas, hotspotsByPanorama])

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