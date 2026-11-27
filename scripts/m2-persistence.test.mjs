import test from 'node:test'
import assert from 'node:assert/strict'
let subject
try{subject=await import('../src/features/living-world/m2Persistence.ts')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
test('M2 legacy local progress migrates only real steps in dependency order without duplicating queued or verified actions',()=>{
 assert.ok(subject,'M2 persistence policy exists')
 const plan=subject.planM2ActivityMigration(['A03_SPREAD','A03_BATTER','A12_STRAP','A17','garbage'],[],[])
 assert.deepEqual(plan.map(x=>x.targetId),['A03_BATTER','A03_SPREAD'])
 assert.deepEqual(subject.planM2ActivityMigration(['A03_BATTER','A03_SPREAD'],['A03_BATTER'],[{intent:{actionType:'COMPLETE_ACTIVITY',targetId:'A03_SPREAD'}}]),[])
})
test('M2 account presentation cannot promote legacy server-owned local steps to acknowledged progress',()=>{
 assert.ok(subject)
 assert.deepEqual(subject.mergeM2PresentationActivities(['A03_BATTER'],['A03_SPREAD','A12_SOLE','UNKNOWN']),['A03_BATTER'])
})
