export const CHRONO_PERSONA = 'chrono' as const

export type ChatPersona = typeof CHRONO_PERSONA

/** Legacy persona links remain valid but always open the Chrono assistant. */
export function normalizeChatPersona(_persona?: string | null): ChatPersona {
  return CHRONO_PERSONA
}
