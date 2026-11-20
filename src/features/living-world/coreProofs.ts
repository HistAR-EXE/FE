/** Authored interaction adapter for the existing world queue. Only the server acknowledges account evidence. */
import {livingTarget,performLivingAction} from './livingSpaces'
export const coreObservations:Record<string,{quest:'Q4'|'Q5';fact:string}>={
 A02_PREPARE:{quest:'Q4',fact:'KITCHEN_HEARTH_INSPECTED'},A02_SMOKE:{quest:'Q4',fact:'KITCHEN_SMOKE_INSPECTED'},
 A14_WATER:{quest:'Q5',fact:'WATER_STORAGE_INSPECTED'},A14_SHARE:{quest:'Q5',fact:'WATER_USES_CONNECTED'},
 A15_CLOTH:{quest:'Q5',fact:'MEDICAL_PREPARATION_INSPECTED'},A15_CARE:{quest:'Q5',fact:'MEDICAL_SUPPORT_CONNECTED'},
}
export const smokeOrder=['HEARTH','CHANNEL','DIFFUSION']
export const synthesisRelations=['ENTRANCE_STRUCTURE_ORGANIZES_SPACE','AIR_SUPPORTS_LIVING_CONDITIONS','KITCHEN_WATER_MEDICAL_SUPPORT_COMMUNITY']
export const foundationFacts=['ENTRANCE_CONFIRMED','AIR_MEANING_CONFIRMED','STRUCT_MEANING_CONFIRMED','KITCHEN_MEANING_CONFIRMED','CARE_MEANING_CONFIRMED']
export const canSynthesize=(facts:string[])=>foundationFacts.every(f=>facts.includes(f))
export const canConfirmCare=(facts:string[])=>['WATER_STORAGE_INSPECTED','WATER_USES_CONNECTED','MEDICAL_PREPARATION_INSPECTED','MEDICAL_SUPPORT_CONNECTED'].every(f=>facts.includes(f))

export function pendingCoreFacts(rows:Pick<import('./worldQueue').QueueRow,'intent'|'status'>[]):string[]{
 const result=new Set<string>()
 const actions:Record<string,string>={'Q4:SELECT_SMOKE_PATH':'KITCHEN_SMOKE_PATH_CORRECT','Q4:CONFIRM_KITCHEN_MEANING':'KITCHEN_MEANING_CONFIRMED','Q4:REFLECT_KITCHEN_CARE':'KITCHEN_CARE_REFLECTED','Q5:CONFIRM_CARE_MEANING':'CARE_MEANING_CONFIRMED','Q6:CONFIRM_SYNTHESIS':'MS_SYNTHESIS_COMPLETE'}
 for(const {intent,status} of rows){
  if(status==='REJECTED_REQUIRES_ACTION'||intent.actionType!=='STRUCTURED_INTERACTION')continue
  const {quest,action}=intent.payload,observation=coreObservations[intent.targetId]
  const fact=action==='INSPECT_TARGET'&&observation?.quest===quest?observation.fact:actions[`${quest}:${action}`]
  if(fact)result.add(fact)
 }
 return [...result]
}

export function reconcileRoomActivities(confirmed:string[],rows:Pick<import('./worldQueue').QueueRow,'intent'|'status'|'createdAt'>[]):string[]{
 let result=Array.isArray(confirmed)?Array.from(new Set(confirmed.filter(id=>!!livingTarget(id)))):[]
 for(const row of [...rows].sort((a,b)=>a.createdAt-b.createdAt))if(row.status!=='REJECTED_REQUIRES_ACTION'&&row.intent.actionType==='COMPLETE_ACTIVITY')result=performLivingAction(result,row.intent.targetId)
 return result
}
