// src/features/panorama/tour360Markers.ts
import type { MarkerStyle } from './api'

const CHEVRON_SVG = `<svg class="tour360-ground-arrow__chevron" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M6 16 L12 8 L18 16 Z" fill="currentColor"/>
</svg>`

function groundArrowBlock(style: MarkerStyle): string {
    return `<div class="tour360-ground-arrow" data-marker-style="${style}"><span class="tour360-ground-arrow__hitbox"><span class="tour360-ground-arrow__visual"><span class="tour360-ground-arrow__disc">${CHEVRON_SVG}</span></span></span></div>`
}

export function markerHtmlForStyle(style: MarkerStyle): string {
    return groundArrowBlock(style)
}

export function createNearMarkerElement(): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.innerHTML = markerHtmlForStyle('near')
  return wrap.firstElementChild as HTMLDivElement
}

export function createFarMarkerElement(): HTMLDivElement {
  const wrap = document.createElement('div')
  wrap.innerHTML = markerHtmlForStyle('far')
  return wrap.firstElementChild as HTMLDivElement
}

export function markerElementForStyle(style: MarkerStyle): HTMLElement {
  return style === 'near' ? createNearMarkerElement() : createFarMarkerElement()
}

export function fallbackCopyText(text: string): boolean {
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  document.body.appendChild(ta)
  ta.focus()
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    ok = false
  }
  document.body.removeChild(ta)
  return ok
}

export function buildLinkJsonSnippet(link: {
  from: string
  to: string
  markerStyle: string
  yaw: number
  pitch: number
  label?: string
}): string {
  return JSON.stringify(link, null, 2)
}

export type SceneMarkerData = {
  kind: 'scene'
  targetId: string
  hotspot: import('./api').Hotspot
  style: MarkerStyle
}
