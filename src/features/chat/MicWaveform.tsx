import { useEffect, useRef } from 'react'

const BAR_COUNT = 48

type MicWaveformProps = {
  analyser: AnalyserNode | null
  className?: string
}

function barColor(index: number, count: number): string {
  const t = index / Math.max(count - 1, 1)
  if (t < 0.33) return '#fdb438'
  if (t < 0.55) return '#fe951c'
  if (t < 0.78) return '#a855f7'
  return '#38bdf8'
}

export function MicWaveform({ analyser, className }: MicWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !analyser) return
    const context = canvas.getContext('2d')
    if (!context) return

    const samples = new Uint8Array(analyser.fftSize)
    const history = new Array<number>(BAR_COUNT).fill(0)
    let frame = 0

    const draw = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.max(1, Math.floor(width * ratio))
        canvas.height = Math.max(1, Math.floor(height * ratio))
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)

      analyser.getByteTimeDomainData(samples)
      let energy = 0
      for (let i = 0; i < samples.length; i += 1) {
        const centered = (samples[i] - 128) / 128
        energy += centered * centered
      }
      const level = Math.min(1, Math.sqrt(energy / samples.length) * 5)
      history.push(level)
      history.shift()

      const gap = 3
      const barWidth = Math.max(2, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT)
      const mid = height / 2
      history.forEach((value, index) => {
        const half = Math.max(1.5, value * (height * 0.46))
        context.fillStyle = barColor(index, BAR_COUNT)
        context.beginPath()
        context.roundRect(index * (barWidth + gap), mid - half, barWidth, half * 2, 2)
        context.fill()
      })

      frame = window.requestAnimationFrame(draw)
    }
    frame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(frame)
  }, [analyser])

  return <canvas ref={canvasRef} className={className ?? 'h-10 flex-1'} aria-label="Sóng âm micro" />
}
