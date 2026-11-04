import test from 'node:test'
import assert from 'node:assert/strict'
test('proof routes reach every existing scene and return without inventing physical links',async()=>{
 const {worldRoutes}=await import('../src/features/living-world/worldContinuity.ts')
 const seen=new Set(['S0']);for(let i=0;i<10;i++)for(const r of worldRoutes)if(seen.has(r.from))seen.add(r.to)
 assert.deepEqual([...seen].sort(),['S0','S1','S2','L1-A','L1-B','L1-C','L1-D','L2-A','L2-C','L3-A','L3-B','L3-C'].sort()) // S0, S1 (P5 slice, G3 immersive), S2, L1-B, L1-D, L2-A, L3-A
 for(const z of seen)if(z!=='S0')assert.ok(worldRoutes.some(r=>r.from===z&&r.to==='S0'))
 assert.ok(worldRoutes.every(r=>r.type!=='PHYSICAL_VERIFIED'))
 assert.equal(new Set(worldRoutes.map(r=>r.id)).size,worldRoutes.length)
})
test('every route has a safe reachable approach, and signposts never share a position',async()=>{
 const {worldRoutes}=await import('../src/features/living-world/worldContinuity.ts')
 const {planPath,isSafeWorldPoint}=await import('../src/features/living-world/worldModel.ts')
 for(const r of worldRoutes){assert.ok(isSafeWorldPoint(r.spawn,r.to),r.id);assert.ok(planPath([0,2],r.approach,r.from).length>0,r.id)}
 for(const zone of new Set(worldRoutes.map(r=>r.from))){const routes=worldRoutes.filter(r=>r.from===zone);assert.equal(new Set(routes.map(r=>r.at.join(','))).size,routes.length)}
})
test('resume and offline display caches isolate owners, reject bad poses and cannot acknowledge business actions',async()=>{
 const memory=new Map(),session=new Map()
 globalThis.localStorage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}
 globalThis.sessionStorage={getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v)}
 const {saveNavigation,readNavigation,resumeShell,saveVerifiedState,readVerifiedState}=await import('../src/features/living-world/worldContinuity.ts')
 const {initialShell,isSafeWorldPoint}=await import('../src/features/living-world/worldModel.ts')
 const nav={version:1,zone:'S2',position:[2,2],heading:1,rice:2,last:'RIGHT'}
 saveNavigation('A',nav);saveNavigation('guest',nav)
 assert.deepEqual(readNavigation('A'),nav);assert.equal(readNavigation('B'),null);assert.ok(session.size===1&&memory.size===1)
 assert.deepEqual(resumeShell(initialShell(),nav,'S2',isSafeWorldPoint).position,[2,2])
 assert.deepEqual(resumeShell(initialShell(),{...nav,position:[100,100]},'S2',isSafeWorldPoint).position,[0,2])
 memory.set('timelens-proof-nav:A',JSON.stringify({...nav,rice:-1}));assert.equal(readNavigation('A'),null)
 saveVerifiedState('A',{releaseVersion:1,revision:2,facts:['AIR_OPENING_INSPECTED']})
 assert.equal(readVerifiedState('B'),null);assert.equal(readVerifiedState('A').revision,2)
 assert.equal([...memory.keys()].some(k=>k.includes('actions')),false)
})
test('profile network/server failures preserve a stored session; explicit authentication denial invalidates it',async()=>{
 const {invalidatesStoredSession}=await import('../src/shared/auth/bootstrapSessionPolicy.ts')
 const {ApiError}=await import('../src/shared/api/contracts.ts')
 for(const status of [401,403])assert.equal(invalidatesStoredSession(new ApiError({status,code:'UNAUTHORIZED',message:'denied'})),true)
 for(const status of [400,404,500,503])assert.equal(invalidatesStoredSession(new ApiError({status,code:'INTERNAL_ERROR',message:'unavailable'})),false)
 assert.equal(invalidatesStoredSession(new TypeError('Failed to fetch')),false)
})
