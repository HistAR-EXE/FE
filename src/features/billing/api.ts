import { getData, httpClient } from '../../shared/api/httpClient'
import type { ProfileMe } from '../profile/api'

export type OrgPlanInfo = {
  planType: string
  label: string
  priceVnd: number
  maxCcu: number
  maxVerifiedAccounts: number
  maxAiQueriesPerMonth: number | null
}

export type BillingPublicPricing = {
  b2cPremiumPriceVnd: number
  b2cJourneyPassPriceVnd?: number
  chatFreeDailyLimit?: number
  orgPlans: OrgPlanInfo[]
}

export type MeQuotaStatus = {
  usedToday: number
  dailyLimit: number
  tier: string
  resetDate?: string
}

export type OrgBillingStatus = {
  organizationId: string
  orgName: string
  planType: string
  endDate: string | null
  isActive: boolean
  aiQueriesUsed: number
  aiQueriesLimit: number | null
  quotaResetsOn: string | null
  verifiedAccounts: number
  maxVerifiedAccounts: number
  accountLimitReached: boolean
  ccuCurrent: number
  maxCcu: number
  ccuLimitReached: boolean
  daysUntilExpiry: number
}

export type B2cBillingStatus = {
  tier: string
  endDate: string | null
  isActive: boolean
  priceVnd: number
  daysUntilExpiry?: number
}

export type B2cPaymentStatusCode = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'UNDERPAID'

export type B2cPaymentIntent = {
  provider: string
  orderCode: string
  transferContent: string
  amountVnd: number
  bankCode: string
  accountNumber: string
  accountName: string
  qrUrl: string
  expiresAt: string
  status: B2cPaymentStatusCode
}

export type B2cPaymentStatus = {
  orderCode: string
  status: B2cPaymentStatusCode
  expiresAt: string
  paidAt: string | null
  returnToPath: string | null
  upgraded: boolean
  amountVnd?: number
  transferContent?: string
  /** UNDERPAID: sum of transfers received so far. */
  receivedAmountVnd?: number
  /** UNDERPAID: remaining amount to top up (same transfer content). */
  remainingAmountVnd?: number
}

export type B2cSubscriptionHistoryItem = {
  id: string
  startDate: string
  endDate: string
  isActive: boolean
  priceVnd: number
  paymentMethod: string
  createdAt: string
}

export type OrgSubscriptionHistoryItem = {
  id: string
  planType: string
  startDate: string
  endDate: string
  isActive: boolean
  priceVnd: number
  paymentMethod: string
  createdAt: string
}

export type OrgPaymentIntent = {
  provider: string
  orderCode: string
  transferContent: string
  amountVnd: number
  subtotalVnd?: number
  discountPercent?: number
  discountAmountVnd?: number
  licenseCount?: number
  bankCode: string
  accountNumber: string
  accountName: string
  qrUrl: string
  expiresAt: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'UNDERPAID'
  planType: string
  organizationId: string | null
  orgName: string
}

export type OrgVolumePreview = {
  planType: string
  licenseCount: number
  unitPriceVnd: number
  subtotalVnd: number
  discountPercent: number
  discountAmountVnd: number
  totalVnd: number
}

export type B2b2cInquiryPayload = {
  siteName: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  packageType: 'ONE_TIME' | 'OPEX'
  message?: string
  website?: string
  interestSiteCode?: 'cu-chi' | 'hoang-thanh-thang-long' | 'dai-noi-hue'
}

export type OrgPaymentStatus = {
  orderCode: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'UNDERPAID'
  expiresAt: string
  paidAt: string | null
  returnToPath: string | null
  activated: boolean
  organizationId: string | null
  planType: string
  orgName: string
  amountVnd?: number | null
  transferContent?: string | null
  receivedAmountVnd?: number | null
  remainingAmountVnd?: number | null
}

export type BillingStatus = {
  tier: string
  chatUsedToday: number
  chatDailyLimit: number
  b2c: B2cBillingStatus
  org: OrgBillingStatus | null
}

export const billingApi = {
  subscribeB2C: (paymentMethod = 'DEMO') =>
    getData<ProfileMe>(httpClient.post('/api/billing/b2c/subscribe', { paymentMethod })),
  createB2CPayment: (
    returnToPath?: string,
    opts?: { planType?: 'PREMIUM' | 'JOURNEY_PASS'; siteCode?: string },
  ) =>
    getData<B2cPaymentIntent>(
      httpClient.post('/api/billing/b2c/payment', {
        returnToPath,
        planType: opts?.planType ?? 'PREMIUM',
        siteCode: opts?.siteCode,
      }),
    ),
  getB2CPaymentStatus: (orderCode: string) =>
    getData<B2cPaymentStatus>(httpClient.get(`/api/billing/b2c/payment/${orderCode}`)),
  createOrgPayment: (payload: {
    orgName: string
    planType: string
    contactEmail: string
    organizationId?: string
    returnToPath?: string
    licenseCount?: number
  }) => getData<OrgPaymentIntent>(httpClient.post('/api/billing/org/payment', payload)),
  getOrgVolumePreview: (planType: string, licenseCount: number) =>
    getData<OrgVolumePreview>(
      httpClient.get('/api/billing/org/volume-preview', { params: { planType, licenseCount } }),
    ),
  submitB2b2cInquiry: (payload: B2b2cInquiryPayload) =>
    getData<{ id: string; status: string; createdAt: string }>(
      httpClient.post('/api/billing/b2b2c-inquiry', payload),
    ),
  /** @deprecated Prefer adminApi.listB2b2cInquiries — ADMIN-only `/api/admin/b2b2c-inquiries`. */
  listB2b2cInquiries: () =>
    getData<
      Array<{
        id: string
        siteName: string
        contactName: string
        contactEmail: string
        contactPhone: string | null
        packageType: string
        message: string | null
        status: string
        createdAt: string
      }>
    >(httpClient.get('/api/admin/b2b2c-inquiries')),
  getOrgPaymentStatus: (orderCode: string) =>
    getData<OrgPaymentStatus>(httpClient.get(`/api/billing/org/payment/${orderCode}`)),
  cancelB2C: () => getData<B2cBillingStatus>(httpClient.delete('/api/billing/b2c/cancel')),
  getB2CStatus: () => getData<B2cBillingStatus>(httpClient.get('/api/billing/b2c/status')),
  getB2CHistory: () => getData<B2cSubscriptionHistoryItem[]>(httpClient.get('/api/billing/b2c/history')),
  /**
   * DEMO free org upgrade — blocked by BE when demo.enabled=false.
   * Prefer createOrgPayment (SePay QR) for production.
   */
  subscribeOrg: (payload: {
    orgName: string
    planType: string
    contactEmail: string
    organizationId?: string
  }) => getData<OrgBillingStatus>(httpClient.post('/api/billing/org/subscribe', payload)),
  createOrgTrial: (payload: { orgName: string; contactEmail?: string }) =>
    getData<OrgBillingStatus>(httpClient.post('/api/billing/org/trial', payload)),
  getStatus: () => getData<BillingStatus>(httpClient.get('/api/billing/status')),
  getPublicPricing: () => getData<BillingPublicPricing>(httpClient.get('/api/billing/public-pricing')),
  getMeQuota: () => getData<MeQuotaStatus>(httpClient.get('/api/me/quota')),
  getOrgPlans: () => getData<OrgPlanInfo[]>(httpClient.get('/api/billing/org/plans')),
  getOrgStatus: () => getData<OrgBillingStatus>(httpClient.get('/api/billing/org/status')),
  getOrgHistory: () => getData<OrgSubscriptionHistoryItem[]>(httpClient.get('/api/billing/org/history')),
}
