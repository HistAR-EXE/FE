export type AtmospherePhase = 'CALM' | 'NOTICE' | 'ALERT' | 'RECOVERY' | 'SETTLED'

export type AtmosphereState = { phase: AtmospherePhase; elapsed: number }

const stages = {
  CALM: { duration: 24, next: 'NOTICE' },
  NOTICE: { duration: 6, next: 'ALERT' },
  ALERT: { duration: 8, next: 'RECOVERY' },
  RECOVERY: { duration: 8, next: 'SETTLED' },
} as const

export function initialAtmosphere(): AtmosphereState {
  return { phase: 'CALM', elapsed: 0 }
}

export function advanceAtmosphere(state: AtmosphereState, seconds: number, paused = false): AtmosphereState {
  if (paused || state.phase === 'SETTLED' || !Number.isFinite(seconds) || seconds <= 0) return state
  const stage = stages[state.phase]
  const elapsed = state.elapsed + Math.min(seconds, 1)
  return elapsed >= stage.duration
    ? { phase: stage.next, elapsed: stage.next === 'SETTLED' ? 0 : elapsed - stage.duration }
    : { phase: state.phase, elapsed }
}

export function skipAtmosphere(_state: AtmosphereState): AtmosphereState {
  return { phase: 'SETTLED', elapsed: 0 }
}

export function atmosphereEligible(zone: string): boolean {
  return zone === 'S1' || zone === 'L1-C' || zone === 'S3' || zone === 'S4'
}
