import { useEffect, useRef, useState } from 'react'
import type { Material, Object3D, Texture } from 'three'
import './landing-spatial.css'

type LandingSpatialSceneProps = { onClose: () => void }

function disposeModel(model: Object3D) {
  const textures = new Set<Texture>()
  const materials = new Set<Material>()
  model.traverse(object => {
    const mesh = object as Object3D & { geometry?: { dispose: () => void }; material?: Material | Material[] }
    mesh.geometry?.dispose()
    const entries = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []
    entries.forEach(material => {
      materials.add(material)
      Object.values(material).forEach(value => {
        if (value && typeof value === 'object' && 'isTexture' in value) textures.add(value as Texture)
      })
    })
  })
  textures.forEach(texture => texture.dispose())
  materials.forEach(material => material.dispose())
}

export default function LandingSpatialScene({ onClose }: LandingSpatialSceneProps) {
  const host = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const previousFocus = document.activeElement
    closeButton.current?.focus()
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('keydown', escape)
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [onClose])

  useEffect(() => {
    const container = host.current
    if (!container) return
    let disposed = false
    let teardown: (() => void) | undefined
    async function initialize() {
      try {
        const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
          import('three'),
          import('three/addons/loaders/GLTFLoader.js'),
          import('three/addons/controls/OrbitControls.js'),
        ])
        if (disposed || !container) return
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.setClearColor(0x0f1b33, 0)
        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100)
        camera.position.set(2.5, 1.5, 3.7)
        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enablePan = false
        controls.enableDamping = true
        controls.dampingFactor = 0.07
        controls.minDistance = 2
        controls.maxDistance = 7
        controls.maxPolarAngle = Math.PI * 0.87
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
        controls.autoRotate = !reduced.matches
        controls.autoRotateSpeed = 0.65
        const ambient = new THREE.HemisphereLight(0xffffff, 0x46536b, 2.8)
        const key = new THREE.DirectionalLight(0xfff4d4, 4)
        key.position.set(4, 6, 4)
        const rim = new THREE.DirectionalLight(0x77b5ff, 2)
        rim.position.set(-4, 2, -3)
        scene.add(ambient, key, rim)
        container.appendChild(renderer.domElement)
        const canvas = renderer.domElement
        canvas.tabIndex = 0
        canvas.setAttribute('role', 'img')
        canvas.setAttribute('aria-label', 'Mô hình minh họa mũ cối 3D. Kéo để xoay, cuộn để thu phóng; dùng phím mũi tên để xoay mô hình.')
        const modelRef: { current?: Object3D } = {}
        let frame = 0
        let inViewport = true
        let contextLost = false
        const clock = new THREE.Clock()
        function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; clock.stop() }
        function draw() {
          frame = 0
          if (disposed || contextLost || !inViewport || document.hidden) return
          controls.update(Math.min(clock.getDelta(), 0.05))
          renderer.render(scene, camera)
          frame = requestAnimationFrame(draw)
        }
        function resume() {
          if (disposed || contextLost || !inViewport || document.hidden) { stop(); return }
          if (!frame) { clock.start(); frame = requestAnimationFrame(draw) }
        }
        function resize() {
          const width = Math.max(container?.clientWidth || 1, 1)
          const height = Math.max(container?.clientHeight || 350, 1)
          renderer.setSize(width, height)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }
        const sizeObserver = new ResizeObserver(resize)
        sizeObserver.observe(container)
        const visibilityObserver = new IntersectionObserver(entries => {
          inViewport = entries[0]?.isIntersecting ?? false
          resume()
        }, { threshold: 0.01 })
        visibilityObserver.observe(container)
        function updateMotion() { controls.autoRotate = !reduced.matches }
        function loseContext(event: Event) {
          event.preventDefault()
          contextLost = true
          stop()
          if (!disposed) setStatus('error')
        }
        function keyboard(event: KeyboardEvent) {
          const model = modelRef.current
          if (!model) return
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
          event.preventDefault()
          if (event.key === 'ArrowLeft') model.rotation.y -= 0.15
          if (event.key === 'ArrowRight') model.rotation.y += 0.15
          if (event.key === 'ArrowUp') model.rotation.x -= 0.12
          if (event.key === 'ArrowDown') model.rotation.x += 0.12
        }
        document.addEventListener('visibilitychange', resume)
        reduced.addEventListener('change', updateMotion)
        canvas.addEventListener('webglcontextlost', loseContext)
        canvas.addEventListener('keydown', keyboard)
        teardown = () => {
          stop()
          sizeObserver.disconnect()
          visibilityObserver.disconnect()
          document.removeEventListener('visibilitychange', resume)
          reduced.removeEventListener('change', updateMotion)
          canvas.removeEventListener('webglcontextlost', loseContext)
          canvas.removeEventListener('keydown', keyboard)
          controls.dispose()
          if (modelRef.current) disposeModel(modelRef.current)
          scene.clear()
          renderer.dispose()
          renderer.forceContextLoss()
          canvas.remove()
        }
        resize()
        const gltf = await new GLTFLoader().loadAsync('/assets/hat.glb')
        if (disposed || contextLost) { disposeModel(gltf.scene); return }
        const model = gltf.scene
        modelRef.current = model
        const bounds = new THREE.Box3().setFromObject(model)
        const center = bounds.getCenter(new THREE.Vector3())
        const size = bounds.getSize(new THREE.Vector3())
        const scale = 2.5 / Math.max(size.x, size.y, size.z, 0.001)
        model.position.sub(center)
        const pivot = new THREE.Group()
        pivot.add(model)
        pivot.scale.setScalar(scale)
        scene.add(pivot)
        controls.target.set(0, 0, 0)
        controls.update()
        setStatus('ready')
        resume()
      } catch {
        if (!disposed) { teardown?.(); teardown = undefined; setStatus('error') }
      }
    }
    void initialize()
    return () => { disposed = true; teardown?.() }
  }, [retry])

  return <div className="tl-spatial-scene" role="region" aria-label="Không gian mô hình 3D mũ cối">
    <div className="tl-spatial-header"><span>HIỆN VẬT TRONG GÓC NHÌN MỚI</span><button ref={closeButton} type="button" onClick={onClose} aria-label="Đóng không gian 3D">Đóng <span aria-hidden="true">×</span></button></div>
    <div className="tl-spatial-stage"><div className="tl-spatial-canvas" ref={host} style={{ visibility: status === 'ready' ? 'visible' : 'hidden' }} />{status !== 'ready' && <div className="tl-spatial-fallback"><img src="/assets/artifacts/hat.webp" alt="Mô hình minh họa chiếc mũ cối" /><p role="status">{status === 'loading' ? 'Đang mở mô hình 3D…' : 'Chưa thể mở không gian 3D trên thiết bị này.'}</p>{status === 'error' && <button type="button" onClick={() => { setStatus('loading'); setRetry(value => value + 1) }}>Thử tải lại</button>}</div>}</div>
    <div className="tl-spatial-caption"><div><strong>Mũ cối</strong><span>Mô hình minh họa · Bộ sưu tập AR</span></div><p>{status === 'ready' ? 'Kéo để xoay · Cuộn để thu phóng · Phím mũi tên' : 'Hình ảnh tĩnh dự phòng'}</p></div>
  </div>
}
