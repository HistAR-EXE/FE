import { useEffect, useRef, type PointerEvent, type ReactNode, type WheelEvent } from 'react'
import type { FacePlacement } from './facePlacement'
import { clampPlacement } from './facePlacement'
import { transformGesture } from './gestureMath'
import type { PublishedHeritageRoleTemplate } from './types'

type Props = { placement: FacePlacement | null; template: PublishedHeritageRoleTemplate | null; onChange: (placement: FacePlacement) => void; children?: ReactNode }
type Gesture = { ids: number[]; points: { x: number; y: number }[]; placement: FacePlacement }

export function FaceTransformCanvas({ placement, template, onChange, children }: Props) {
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)
  const currentPlacement = useRef(placement)
  useEffect(() => { currentPlacement.current = placement }, [placement])
  const restart = () => {
    const ids = [...pointers.current.keys()].slice(0, 2)
    gesture.current = currentPlacement.current && ids.length
      ? { ids, points: ids.map((id) => pointers.current.get(id)!), placement: currentPlacement.current }
      : null
  }
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (!template || !currentPlacement.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    restart()
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (!template || !pointers.current.has(event.pointerId) || !gesture.current) return
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const baseline = gesture.current
    const next = clampPlacement(transformGesture(baseline.placement, baseline.points, baseline.ids.map((id) => pointers.current.get(id)!), event.currentTarget.getBoundingClientRect()), template)
    currentPlacement.current = next
    onChange(next)
  }
  const end = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId)
    restart()
  }
  const zoom = (event: WheelEvent<HTMLDivElement>) => {
    if (!template || !currentPlacement.current) return
    event.preventDefault()
    const next = clampPlacement({ ...currentPlacement.current, scale: currentPlacement.current.scale * (event.deltaY > 0 ? 0.95 : 1.05) }, template)
    currentPlacement.current = next
    onChange(next)
  }
  return <div className={`relative h-full w-full ${placement && template ? 'touch-none' : ''}`} onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onWheel={zoom} data-testid="face-transform-canvas">{children}</div>
}
