import test from 'node:test'
import assert from 'node:assert/strict'
import {pendingCoreFacts,canSynthesize,canConfirmCare,foundationFacts} from '../src/features/living-world/coreProofs.ts'
test('pending core evidence comes only from recognized queued interactions, never payload claims',()=>{
 const row=(intent,status='PENDING')=>({intent,status})
 assert.deepEqual(pendingCoreFacts([row({actionType:'STRUCTURED_INTERACTION',targetId:'A02_PREPARE',payload:{quest:'Q4',action:'INSPECT_TARGET',facts:['MS_SYNTHESIS_COMPLETE']}})]),['KITCHEN_HEARTH_INSPECTED'])
 assert.deepEqual(pendingCoreFacts([row({actionType:'COMPLETE_ACTIVITY',targetId:'A02_PREPARE',payload:{}})]),[])
 assert.deepEqual(pendingCoreFacts([row({actionType:'STRUCTURED_INTERACTION',targetId:'',payload:{quest:'Q6',action:'CONFIRM_SYNTHESIS'}},'REJECTED_REQUIRES_ACTION')]),[])
})
test('synthesis and CARE UI never unlock from a single branch or fewer than five foundations',()=>{
 for(const missing of foundationFacts)assert.equal(canSynthesize(foundationFacts.filter(f=>f!==missing)),false)
 assert.equal(canSynthesize(foundationFacts),true)
 assert.equal(canConfirmCare(['WATER_STORAGE_INSPECTED','WATER_USES_CONNECTED']),false)
 assert.equal(canConfirmCare(['WATER_STORAGE_INSPECTED','WATER_USES_CONNECTED','MEDICAL_PREPARATION_INSPECTED','MEDICAL_SUPPORT_CONNECTED']),true)
})
