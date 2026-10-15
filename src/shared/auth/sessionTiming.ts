type SessionTimingStorage = Pick<Storage, 'getItem'>

export function getAccessTokenExpiryState(storage: SessionTimingStorage, now = Date.now()) {
  const issuedAt = Number(storage.getItem('timelens_token_issued_at'))
  const expiresInSeconds = Number(storage.getItem('timelens_token_expires_in'))
  if (!Number.isFinite(issuedAt) || issuedAt <= 0 || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    return { expiresAt: null, remainingMs: null, expiringSoon: false }
  }
  const expiresAt = issuedAt + expiresInSeconds * 1000
  const remainingMs = Math.max(0, expiresAt - now)
  return { expiresAt, remainingMs, expiringSoon: remainingMs > 0 && remainingMs <= 5 * 60 * 1000 }
}
