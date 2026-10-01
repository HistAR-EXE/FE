import { getData, httpClient } from '../../shared/api/httpClient'

export type PasswordResetRequestResult = {
  message: string
  debugOtp?: string | null
}

export type PasswordResetVerifyResult = {
  message: string
  resetToken: string
}

export const passwordResetApi = {
  request: (email: string) =>
    getData<PasswordResetRequestResult>(httpClient.post('/api/auth/password-reset/request', { email })),
  verifyOtp: (email: string, code: string) =>
    getData<PasswordResetVerifyResult>(
      httpClient.post('/api/auth/password-reset/verify-otp', { email, code }),
    ),
  confirm: (resetToken: string, password: string) =>
    getData<null>(httpClient.post('/api/auth/password-reset/confirm', { resetToken, password })),
}
