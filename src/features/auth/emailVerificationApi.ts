import { getData, httpClient } from '../../shared/api/httpClient'

export type VerifyEmailStatus = {
  emailVerified: boolean
  message: string
  /** Present when BE runs with MAIL_ENABLED=false (local/dev). */
  debugToken?: string | null
}

export const emailVerificationApi = {
  resend: () =>
    getData<VerifyEmailStatus>(httpClient.post('/api/auth/verify-email/resend')),
  confirm: (token: string) =>
    getData<VerifyEmailStatus>(httpClient.post('/api/auth/verify-email/confirm', { token })),
}
