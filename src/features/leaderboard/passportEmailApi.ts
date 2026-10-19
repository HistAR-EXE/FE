import { getData, httpClient } from '../../shared/api/httpClient'

export type PassportEmailStatus = { available: boolean; verified: boolean; email: string | null; cooldownSeconds: number; remainingToday: number }
export type PassportEmailAccepted = { status: 'ACCEPTED'; cooldownSeconds: number; remainingToday: number }
const quota = (data: { cooldownSeconds: number; remainingToday: number }) => Number.isSafeInteger(data.cooldownSeconds)
  && data.cooldownSeconds >= 0 && Number.isSafeInteger(data.remainingToday) && data.remainingToday >= 0 && data.remainingToday <= 3

export async function loadPassportEmailStatus(): Promise<PassportEmailStatus> {
  const data = await getData<PassportEmailStatus>(httpClient.get('/api/leaderboard/passport/email/status', { timeout: 15000 }))
  if (!data || typeof data.available !== 'boolean' || typeof data.verified !== 'boolean'
    || !(data.email === null || typeof data.email === 'string') || !quota(data)) throw new Error('Invalid passport email status')
  return data
}

export async function sendPassportEmail(blob: Blob, requestId: string): Promise<PassportEmailAccepted> {
  if (blob.type !== 'image/png' || blob.size === 0 || blob.size > 2 * 1024 * 1024) throw new Error('INVALID_IMAGE')
  const form = new FormData()
  form.append('image', blob, 'TimeLens-passport.png')
  form.append('requestId', requestId)
  const data = await getData<PassportEmailAccepted>(httpClient.post('/api/leaderboard/passport/email', form,
    { timeout: 75000, headers: { 'Content-Type': undefined } }))
  if (!data || data.status !== 'ACCEPTED' || !quota(data)) throw new Error('UNCONFIRMED_DELIVERY')
  return data
}
