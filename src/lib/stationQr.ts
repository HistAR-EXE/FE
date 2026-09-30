// Station QR payloads:
// - Static print: `siteCode:stationCode:0:sig`
// - Site dynamic: `siteCode:stationCode:timestamp:sig`
// - Legacy: `stationCode:timestamp:sig` (assumes cu-chi)

export type ParsedStationQr = {
  siteCode: string
  stationCode: string
  timestamp: number
  signature: string
  /** Raw payload to send as `qrPayload`. */
  payload: string
  staticQr: boolean
}

const STATION_CODE = /^[A-Za-z0-9_-]{1,64}$/
const SITE_CODE = /^[a-z0-9][a-z0-9-]{0,63}$/

export function parseStationQr(raw: string): ParsedStationQr | null {
  const payload = raw.trim()
  if (!payload) return null
  const parts = payload.split(':')
  if (parts.length === 4) {
    const [site, code, ts, sig = ''] = parts
    if (!SITE_CODE.test(site.toLowerCase())) return null
    if (!STATION_CODE.test(code)) return null
    if (!/^\d{1,13}$/.test(ts)) return null
    if (sig && !/^[0-9a-fA-F]+$/.test(sig)) return null
    const timestamp = Number(ts)
    return {
      siteCode: site.toLowerCase(),
      stationCode: code.toUpperCase(),
      timestamp,
      signature: sig,
      payload,
      staticQr: timestamp === 0,
    }
  }
  if (parts.length < 2 || parts.length > 3) return null
  const [code, ts, sig = ''] = parts
  if (!STATION_CODE.test(code)) return null
  if (!/^\d{1,13}$/.test(ts)) return null
  if (sig && !/^[0-9a-fA-F]+$/.test(sig)) return null
  if (code.toLowerCase() === 'timelens') return null
  return {
    siteCode: 'cu-chi',
    stationCode: code.toUpperCase(),
    timestamp: Number(ts),
    signature: sig,
    payload,
    staticQr: Number(ts) === 0,
  }
}

export function isStationQr(raw: string): boolean {
  return parseStationQr(raw) !== null
}
