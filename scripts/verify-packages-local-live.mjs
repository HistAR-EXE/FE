import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
const base='http://localhost:5173'
async function api(path,token,body){const r=await fetch(base+path,{...(body?{method:'POST',body:JSON.stringify(body)}:{}),headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})}});return{status:r.status,...await r.json()}}
const checks=[]
const pricing=await api('/api/billing/public-pricing');assert.equal(pricing.status,200)
const expected={MICRO:[8000000,100,15,5000],STANDARD:[15000000,400,40,30000],PREMIUM:[25000000,1000,80,null]}
for(const plan of pricing.data.orgPlans)assert.deepEqual([plan.priceVnd,plan.maxVerifiedAccounts,plan.maxCcu,plan.maxAiQueriesPerMonth],expected[plan.planType])
checks.push('Public organization prices and limits match canonical offer')
for(const plan of ['micro','standard','premium']){
 const auth=await api('/api/auth/login',null,{email:`teacher-${plan}@histar.local`,password:'B2BTest@2026!'})
 assert.equal(auth.status,200)
 const token=auth.data.accessToken
 const me=await api('/api/profile/me',token);assert.equal(me.status,200)
 const rights=await api(`/api/org/${me.data.orgId}/capabilities`,token);assert.equal(rights.status,200)
 assert.equal(rights.data.assignments,plan!=='micro');assert.equal(rights.data.liveBoard,plan!=='micro');assert.equal(rights.data.reports,plan!=='micro')
 const single=await api('/api/billing/org/volume-preview?planType=STANDARD&licenseCount=1',token);assert.equal(single.status,200);assert.equal(single.data.licenseCount,1)
 const multiple=await api('/api/billing/org/volume-preview?planType=STANDARD&licenseCount=3',token);assert.ok(multiple.status>=400,'Multiple licenses must not be offered')
 checks.push(`${plan}: capabilities verified; multiple-license preview rejected`)
}
await writeFile('../docs/package-audit/live-verification.json',JSON.stringify({checks,verifiedAt:new Date().toISOString(),backendPort:18080,frontendPort:5173,noPaymentCreated:true},null,2))
console.log(checks.join('\n'))
