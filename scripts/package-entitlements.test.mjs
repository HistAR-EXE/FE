import test from 'node:test'
import assert from 'node:assert/strict'
import { checkoutPlanCopy, confirmedJourneyExpiry, confirmedPrice, orgPackageCopy } from '../src/features/billing/planPresentation.ts'
test('Journey Pass keeps scoped72h terms distinct from monthly Premium',()=>{
 const pass=checkoutPlanCopy('JOURNEY_PASS','Đại Nội Huế')
 assert.match(pass.title,/Journey Pass/)
 assert.match(pass.period,/72 giờ/)
 assert.ok(pass.features.some(f=>f.includes('Đại Nội Huế')))
 assert.ok(pass.features.some(f=>f.includes('không')&&f.includes('Premium')))
 assert.match(checkoutPlanCopy('PREMIUM','Củ Chi').period,/tháng/)
})
test('unconfirmed or malformed prices do not become checkout totals',()=>{
 assert.equal(confirmedPrice(29000),29000)
 for(const p of [null,undefined,-1,NaN,'49000',1.2])assert.equal(confirmedPrice(p),null)
})
test('Journey success uses an unexpired server grant rather than inventing72h',()=>{
 const now=Date.parse('2026-10-28T00:00:00Z')
 assert.equal(confirmedJourneyExpiry([{siteCode:'cu-chi',expiresAt:'2026-10-31T00:00:00Z'}],'cu-chi',now),Date.parse('2026-10-31T00:00:00Z'))
 assert.throws(()=>confirmedJourneyExpiry([],'cu-chi',now))
 assert.throws(()=>confirmedJourneyExpiry([{siteCode:'cu-chi',expiresAt:'2026-10-27T00:00:00Z'}],'cu-chi',now))
})
test('organization offers distinguish basic and advanced classroom tools',()=>{
 assert.match(orgPackageCopy('MICRO'),/Chưa bao gồm/)
 assert.match(orgPackageCopy('STANDARD'),/Bao gồm/)
 assert.match(orgPackageCopy('PREMIUM'),/Bao gồm/)
 for(const plan of ['MICRO','STANDARD','PREMIUM'])assert.match(orgPackageCopy(plan),/xác thực email/)
})
