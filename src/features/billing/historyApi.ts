import { getData, httpClient } from '../../shared/api/httpClient'
export type PaymentKind = 'PERSONAL' | 'ORGANIZATION'
export type PaymentItem = { id:string; kind:PaymentKind; orderCode:string; planType:string; planName:string; siteCode:string|null; organizationName:string|null; amountVnd:number|null; receivedAmountVnd:number|null; remainingAmountVnd:number|null; status:string; rawStatus:string; activationStatus:string; provider:string; transferContent:string|null; providerReferenceCode:string|null; createdAt:string; paidAt:string|null; expiresAt:string|null; updatedAt:string|null; accessStartsAt:string|null; accessEndsAt:string|null; activationMessage:string|null }
export type PaymentFilters = { type:string; status:string; q:string; from:string; to:string }
export type PaymentPage = { items:PaymentItem[]; page:number; size:number; totalItems:number; totalPages:number; summary:{totalTransactions:number;paidTransactions:number;totalReceivedVnd:number|null;activePackages:number} }
export const historyApi = {
 list:(filters:PaymentFilters,page=0,size=10)=>getData<PaymentPage>(httpClient.get('/api/billing/history',{params:{...filters,from:filters.from||undefined,to:filters.to||undefined,page,size}})),
 detail:(item:Pick<PaymentItem,'kind'|'id'>)=>getData<PaymentItem>(httpClient.get(`/api/billing/history/${item.kind}/${item.id}`)),
 refresh:(item:Pick<PaymentItem,'kind'|'id'>)=>getData<PaymentItem>(httpClient.post(`/api/billing/history/${item.kind}/${item.id}/refresh`)),
}
