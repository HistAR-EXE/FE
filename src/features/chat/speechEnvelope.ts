/** A short RMS envelope, sampled against the media element's playback clock.
 * This drives mouth opening, not phoneme/viseme recognition. No invented motion
 * is produced when the audio format is unavailable or the track is silent.
 */
export type SpeechEnvelope = { levels: Float32Array; frameSeconds: number; duration: number }

export function readWavEnvelope(buffer: ArrayBuffer): SpeechEnvelope | null {
  const view = new DataView(buffer)
  const text = (offset: number, size: number) => String.fromCharCode(...new Uint8Array(buffer, offset, size))
  if (view.byteLength < 44 || text(0, 4) !== 'RIFF' || text(8, 4) !== 'WAVE') return null
  let format = 0, channels = 0, rate = 0, bits = 0, align = 0, dataOffset = 0, dataSize = 0
  for (let offset = 12; offset + 8 <= view.byteLength;) {
    const size = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (size > view.byteLength - start) return null
    const id = text(offset, 4)
    if (id === 'fmt ' && size >= 16) {
      format = view.getUint16(start, true)
      channels = view.getUint16(start + 2, true)
      rate = view.getUint32(start + 4, true)
      align = view.getUint16(start + 12, true)
      bits = view.getUint16(start + 14, true)
    }
    if (id === 'data') { dataOffset = start; dataSize = size }
    offset = start + size + (size % 2)
  }
  if (!dataOffset || !channels || !rate || align !== channels * bits / 8
    || !((format === 1 && bits === 16) || (format === 3 && bits === 32))) return null
  const frames = Math.floor(dataSize / align)
  if (!frames) return null
  const samplesPerFrame = Math.max(1, Math.round(rate * .02))
  const levels = new Float32Array(Math.ceil(frames / samplesPerFrame))
  let peak = 0
  for (let frame = 0; frame < levels.length; frame++) {
    let sum = 0, count = 0
    const end = Math.min(frames, (frame + 1) * samplesPerFrame)
    for (let sample = frame * samplesPerFrame; sample < end; sample++) {
      for (let channel = 0; channel < channels; channel++) {
        const offset = dataOffset + sample * align + channel * bits / 8
        const value = format === 1 ? view.getInt16(offset, true) / 32768 : view.getFloat32(offset, true)
        if (Number.isFinite(value)) { sum += value * value; count++ }
      }
    }
    levels[frame] = count ? Math.sqrt(sum / count) : 0
    peak = Math.max(peak, levels[frame])
  }
  const gate = Math.max(.008, peak * .08)
  for (let i = 0; i < levels.length; i++) {
    levels[i] = peak <= gate || levels[i] <= gate ? 0
      : Math.min(1, Math.sqrt((levels[i] - gate) / (peak - gate)))
  }
  return { levels, frameSeconds: samplesPerFrame / rate, duration: frames / rate }
}

export function mouthOpennessAt(envelope: SpeechEnvelope | null, seconds: number): number {
  if (!envelope || !Number.isFinite(seconds) || seconds < 0 || seconds >= envelope.duration) return 0
  const index = Math.floor(seconds / envelope.frameSeconds)
  return envelope.levels[index] ?? 0
}
