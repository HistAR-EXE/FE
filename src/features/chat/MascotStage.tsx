import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { MascotMode } from './MascotAvatar'

const FRAME_URLS = Array.from({ length: 11 }, (_, index) => `/mascot/mascot-${index + 1}.png`)

type MascotStageProps = {
  mode?: MascotMode
  paused?: boolean
  className?: string
}

export function MascotStage({ mode = 'idle', paused = false, className }: MascotStageProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef(mode)
  const pausedRef = useRef(paused)
  modeRef.current = mode
  pausedRef.current = paused

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30)
    camera.position.set(0, 0.15, 5.4)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.domElement.style.width = '100%'
    renderer.domElement.style.height = '100%'
    renderer.domElement.style.touchAction = 'none'
    host.appendChild(renderer.domElement)

    const geometry = new THREE.PlaneGeometry(2.35, 2.35)
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const mascot = new THREE.Mesh(geometry, material)
    scene.add(mascot)

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 48),
      new THREE.MeshBasicMaterial({
        color: 0x06101f,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = -1.15
    scene.add(shadow)

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.72, 0.86, 48),
      new THREE.MeshBasicMaterial({
        color: 0xfdb438,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -1.14
    scene.add(ring)

    const textures: Array<THREE.Texture | undefined> = []
    const loader = new THREE.TextureLoader()
    FRAME_URLS.forEach((url, index) => {
      loader.load(url, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        textures[index] = texture
        if (!material.map) {
          material.map = texture
          material.needsUpdate = true
        }
      })
    })

    let x = 0
    let facing = 1
    let frame = 0
    let frameClock = 0
    const clock = new THREE.Clock()
    let raf = 0

    const resize = () => {
      const width = host.clientWidth || 1
      const height = host.clientHeight || 1
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)

    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05)
      if (!pausedRef.current) {
        const elapsed = clock.elapsedTime
        const current = modeRef.current
        const range = current === 'listening' ? 0.25 : 1.05
        const travel = current === 'speaking' ? 0.85 : current === 'thinking' ? 0.28 : 0.48
        x += facing * dt * travel
        if (x > range || x < -range) {
          facing *= -1
          x = Math.max(-range, Math.min(range, x))
        }

        const bob = Math.sin(elapsed * (current === 'speaking' ? 4.2 : 2.4)) * 0.1
        mascot.position.set(x, bob, 0)
        mascot.rotation.y = THREE.MathUtils.damp(mascot.rotation.y, facing * 0.42, 6, dt)
        mascot.rotation.z = Math.sin(elapsed * 1.7) * 0.05
        mascot.scale.x = THREE.MathUtils.damp(mascot.scale.x, facing, 8, dt)

        shadow.position.x = x
        shadow.scale.setScalar(1.05 - bob)
        ring.position.x = x
        ring.scale.setScalar(1.05 - bob * 0.6)

        camera.position.x = Math.sin(elapsed * 0.35) * 0.18
        camera.lookAt(x * 0.35, 0.05, 0)

        const frameStep = current === 'speaking' ? 0.11 : current === 'listening' ? 0.16 : current === 'thinking' ? 0.28 : 0.55
        frameClock += dt
        if (frameClock >= frameStep) {
          frameClock = 0
          frame = (frame + 1) % FRAME_URLS.length
          const next = textures[frame]
          if (next && material.map !== next) {
            material.map = next
            material.needsUpdate = true
          }
        }
      }

      renderer.render(scene, camera)
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)

    let dragging = false
    let lastX = 0
    const onPointerDown = (event: PointerEvent) => {
      dragging = true
      lastX = event.clientX
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || pausedRef.current) return
      const delta = (event.clientX - lastX) / Math.max(host.clientWidth, 1)
      lastX = event.clientX
      if (Math.abs(delta) < 0.001) return
      facing = delta > 0 ? 1 : -1
      x = Math.max(-1.25, Math.min(1.25, x + delta * 3.2))
    }
    const onPointerUp = () => {
      dragging = false
    }
    host.addEventListener('pointerdown', onPointerDown)
    host.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.cancelAnimationFrame(raf)
      observer.disconnect()
      host.removeEventListener('pointerdown', onPointerDown)
      host.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      geometry.dispose()
      material.dispose()
      shadow.geometry.dispose()
      ;(shadow.material as THREE.Material).dispose()
      ring.geometry.dispose()
      ;(ring.material as THREE.Material).dispose()
      textures.forEach((texture) => texture?.dispose())
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={hostRef} className={className} aria-label="Mascot" />
}
