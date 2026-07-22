// src/features/panorama/panoArrivalView.ts
import { resolveSceneLinkNodeId } from '../gamification/discoveryLayer'
import type { Hotspot, Panorama } from './api'
import { backYaw } from './panoAngles'

function linkTargetId(hotspot: Hotspot, panoramaIds: string[]): string {
    return resolveSceneLinkNodeId(hotspot.contentRef, panoramaIds)
}

export function computeArrivalView(
    fromPanoramaId: string,
    clicked: Hotspot,
    destHotspots: Hotspot[],
    panoramaIds: string[],
    destPano: Panorama,
): { yaw: number; pitch: number } {
    const sceneLinks = destHotspots.filter((h) => h.type === 'scene')
    const fallback = {
        yaw: destPano.defaultYaw ?? 0,
        pitch: destPano.defaultPitch ?? 0,
    }
    const isBackward = clicked.label?.startsWith('←') ?? false

    if (isBackward) {
        const exitLink = sceneLinks.find(
            (h) =>
                h.label?.startsWith('←') &&
                linkTargetId(h, panoramaIds) !== fromPanoramaId,
        )
        if (exitLink) {
            return { yaw: exitLink.yaw, pitch: exitLink.pitch }
        }
    } else {
        const backFromDest = sceneLinks.find(
            (h) => linkTargetId(h, panoramaIds) === fromPanoramaId,
        )
        if (backFromDest) {
            return { yaw: backYaw(backFromDest.yaw), pitch: backFromDest.pitch }
        }
    }

    return fallback
}
