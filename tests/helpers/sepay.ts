import crypto from 'node:crypto'
import { type APIRequestContext, test } from '@playwright/test'
import { BE_URL } from './constants'
import { unwrap } from './api'
import { sepayWebhookFixture } from './contracts'

/** Khớp BE `.env` local dev — dùng cho ký webhook trong test. */
export const SEPAY_WEBHOOK_SECRET =
  process.env.SEPAY_WEBHOOK_SECRET ?? 'whsec_d4bUZa4YPpiArwc3LluZarMQRCh4vQNV'

export function signSepay(secret: string, timestamp: string, rawBody: string) {
  return `sha256=${crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`
}

export type SepayWebhookPayload = {
  id: number
  gateway: string
  transactionDate: string
  accountNumber: string
  subAccount: string
  code: string
  content: string
  transferType: 'in' | 'out'
  description: string
  transferAmount: number
  accumulated: number
  referenceCode: string
}

export function buildSepayWebhookPayload(
  orderCode: string,
  transferAmount: number,
  opts: { gateway?: string; accountNumber?: string } = {},
): SepayWebhookPayload {
  return sepayWebhookFixture({
    id: Date.now(),
    gateway: opts.gateway ?? 'MBBank',
    accountNumber: opts.accountNumber ?? '0815330544',
    code: orderCode,
    content: `${orderCode} chuyen tien`,
    transferAmount,
    referenceCode: `FT${Date.now()}`,
  })
}

export async function postSepayWebhook(
  request: APIRequestContext,
  payload: SepayWebhookPayload,
  opts: { secret?: string; signature?: string; timestamp?: string } = {},
) {
  const timestamp = opts.timestamp ?? Math.floor(Date.now() / 1000).toString()
  const rawBody = JSON.stringify(payload)
  const signature =
    opts.signature ??
    signSepay(opts.secret ?? SEPAY_WEBHOOK_SECRET, timestamp, rawBody)

  return request.post(`${BE_URL}/api/billing/webhooks/sepay`, {
    headers: {
      'Content-Type': 'application/json',
      'X-SePay-Timestamp': timestamp,
      'X-SePay-Signature': signature,
    },
    data: payload,
    failOnStatusCode: false,
  })
}

/** Skip test nếu SePay chưa bật trên BE đang chạy. */
export async function skipIfSepayDisabled(request: APIRequestContext, userToken: string) {
  const createRes = await request.post(`${BE_URL}/api/billing/b2c/payment`, {
    headers: { Authorization: `Bearer ${userToken}` },
    data: { returnToPath: '/settings' },
    failOnStatusCode: false,
  })
  if (createRes.status() >= 400) {
    test.skip(true, 'SePay chưa được enable/cấu hình trên backend local đang chạy')
  }
}

export async function createB2cPaymentIntent(
  request: APIRequestContext,
  token: string,
  returnToPath = '/settings',
) {
  const createRes = await request.post(`${BE_URL}/api/billing/b2c/payment`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { returnToPath },
    failOnStatusCode: false,
  })
  if (createRes.status() >= 400) {
    test.skip(true, 'SePay chưa được enable/cấu hình trên backend local đang chạy')
  }
  return unwrap<{
    orderCode: string
    transferContent: string
    amountVnd: number
    qrUrl: string
  }>(createRes)
}

export async function createOrgPaymentIntent(
  request: APIRequestContext,
  token: string,
  data: {
    orgName: string
    planType: string
    contactEmail: string
    returnToPath?: string
    organizationId?: string
  },
) {
  const createRes = await request.post(`${BE_URL}/api/billing/org/payment`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { ...data, returnToPath: data.returnToPath ?? '/teacher' },
    failOnStatusCode: false,
  })
  if (createRes.status() >= 400) {
    test.skip(true, 'SePay chưa được enable/cấu hình trên backend local đang chạy')
  }
  return unwrap<{
    orderCode: string
    transferContent: string
    amountVnd: number
    qrUrl: string
  }>(createRes)
}

export async function confirmB2cPaymentViaWebhook(
  request: APIRequestContext,
  intent: { orderCode: string; amountVnd: number },
  token: string,
) {
  const payload = buildSepayWebhookPayload(intent.orderCode, intent.amountVnd)
  await unwrap(await postSepayWebhook(request, payload))

  const paymentStatus = await unwrap<{ status: string; upgraded: boolean }>(
    await request.get(`${BE_URL}/api/billing/b2c/payment/${intent.orderCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  )
  return paymentStatus
}

export async function confirmOrgPaymentViaWebhook(
  request: APIRequestContext,
  intent: { orderCode: string; amountVnd: number },
  token: string,
) {
  const payload = buildSepayWebhookPayload(intent.orderCode, intent.amountVnd)
  await unwrap(await postSepayWebhook(request, payload))

  return unwrap<{ status: string; activated: boolean; organizationId: string | null }>(
    await request.get(`${BE_URL}/api/billing/org/payment/${intent.orderCode}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  )
}
