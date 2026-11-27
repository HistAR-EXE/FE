import test from 'node:test'
import assert from 'node:assert/strict'
import {pendingCoreFacts,canSynthesize,canConfirmCare,foundationFacts,reconcileRoomActivities,describeCareProgress} from '../src/features/living-world/coreProofs.ts'
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
test('Q5 care progress explains prerequisites, branch status, pending boundary, and knowledge-aware next steps',()=>{
 // Out-of-order check: step 2 in L3-C and L3-B requires step 1
 const beforeWater=describeCareProgress([],[],'A14_SHARE')
 assert.equal(beforeWater.prerequisiteFact,'WATER_STORAGE_INSPECTED')
 assert.equal(beforeWater.prerequisiteMet,false)
 assert.equal(beforeWater.prerequisiteTarget,'A14_WATER')

 const beforeMed=describeCareProgress([],[],'A15_CARE')
 assert.equal(beforeMed.prerequisiteFact,'MEDICAL_PREPARATION_INSPECTED')
 assert.equal(beforeMed.prerequisiteMet,false)
 assert.equal(beforeMed.prerequisiteTarget,'A15_CLOTH')

 // After step 1 in L3-B, guides player to step 2 in same room
 const afterCloth=describeCareProgress(['MEDICAL_PREPARATION_INSPECTED'],[],'A15_CLOTH')
 assert.equal(afterCloth.nextTarget,'A15_CARE')
 assert.equal(afterCloth.medicalDone,false)

 // After completing L3-B branch only, guides player to L3-C water branch
 const medOnly=describeCareProgress(['MEDICAL_PREPARATION_INSPECTED','MEDICAL_SUPPORT_CONNECTED'],[],'A15_CARE')
 assert.equal(medOnly.medicalDone,true)
 assert.equal(medOnly.waterDone,false)
 assert.equal(medOnly.canConfirm,false)
 assert.equal(medOnly.nextZone,'L3-C')

 // Pending CARE_MEANING_CONFIRMED never promotes to confirmed foundation on client
 const fourFacts=['WATER_STORAGE_INSPECTED','WATER_USES_CONNECTED','MEDICAL_PREPARATION_INSPECTED','MEDICAL_SUPPORT_CONNECTED']
 const pendingCare=describeCareProgress(fourFacts,['CARE_MEANING_CONFIRMED'],'A14_SHARE')
 assert.equal(pendingCare.carePending,true)
 assert.equal(pendingCare.careConfirmed,false)

 // Confirmed CARE without STRUCTURE does not assume structure turning point; with KITCHEN unlocks callback to L1-C
 const careAndKitchen=describeCareProgress([...fourFacts,'CARE_MEANING_CONFIRMED','KITCHEN_MEANING_CONFIRMED'],[],'A14_SHARE')
 assert.equal(careAndKitchen.careConfirmed,true)
 assert.equal(careAndKitchen.hasStructure,false)
 assert.equal(careAndKitchen.kitchenCallbackStatus,'AVAILABLE')
 assert.equal(careAndKitchen.nextZone,'L1-C')

 // Confirmed CARE with STRUCTURE and all 5 foundations points to L3-D synthesis
 const allFive=describeCareProgress([...fourFacts,...foundationFacts,'KITCHEN_CARE_REFLECTED'],[],'A15_CARE')
 assert.equal(allFive.hasStructure,true)
 assert.equal(allFive.kitchenCallbackStatus,'VIEWED')
 assert.equal(allFive.nextZone,'L3-D')
})

test('server A23 activity survives reconciliation and its queued intent is presentation-only',()=>{
 assert.deepEqual(reconcileRoomActivities(['A23_CAMPAIGN','UNKNOWN'],[]),['A23_CAMPAIGN'])
 assert.deepEqual(reconcileRoomActivities([],[{intent:{actionType:'COMPLETE_ACTIVITY',targetId:'A23_CAMPAIGN',payload:{}},status:'PENDING',createdAt:1}]),['A23_CAMPAIGN'])
 assert.deepEqual(reconcileRoomActivities([],[{intent:{actionType:'COMPLETE_ACTIVITY',targetId:'A23_CAMPAIGN',payload:{}},status:'REJECTED_REQUIRES_ACTION',createdAt:1}]),[])
})
