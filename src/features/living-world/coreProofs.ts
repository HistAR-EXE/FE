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
 let result=Array.isArray(confirmed)?Array.from(new Set(confirmed.filter(id=>!!livingTarget(id)||id==='A23_CAMPAIGN'))):[]
 for(const row of [...rows].sort((a,b)=>a.createdAt-b.createdAt))if(row.status!=='REJECTED_REQUIRES_ACTION'&&row.intent.actionType==='COMPLETE_ACTIVITY')result=row.intent.targetId==='A23_CAMPAIGN'?Array.from(new Set([...result,'A23_CAMPAIGN'])):performLivingAction(result,row.intent.targetId)
 return result
}

export const careTargetGuides:Record<string,{why:string;outcome:string}> = {
 A14_WATER:{
  why:'Chum dự trữ và gàu múc nước minh họa cách tích trữ nguồn nước quý cho nhiều nhu cầu sinh hoạt dưới lòng đất.',
  outcome:'Đã ghi nhận nguồn nước dự trữ. Bước tiếp theo trong phòng là chia nước cho hai nhu cầu: bếp và nơi chăm sóc.',
 },
 A14_SHARE:{
  why:'Một nguồn nước không tồn tại riêng lẻ mà phải chia sẻ cho cả việc nấu ăn ở bếp và việc chăm sóc người bị thương, đau ốm.',
  outcome:'Đã ghi nhận mối liên hệ giữa nguồn nước với bếp và nơi chăm sóc.',
 },
 A15_CLOTH:{
  why:'Chuẩn bị khăn sạch và nước tại bàn sơ cứu cho thấy việc chăm sóc con người bắt đầu từ những điều kiện vệ sinh và hậu cần thiết yếu.',
  outcome:'Đã ghi nhận khâu chuẩn bị vật dụng chăm sóc. Bước tiếp theo trong phòng là đưa khay tới hỗ trợ người chăm sóc bên giường.',
 },
 A15_CARE:{
  why:'Đưa khay vật dụng tới bên giường giúp thấy rõ sự chăm sóc dựa trên sự tương trợ giữa con người và nguồn nước, hậu cần phía sau.',
  outcome:'Đã ghi nhận sự hỗ trợ chăm sóc con người trong không gian ngầm.',
 },
}

export function describeCareProgress(confirmedFacts:readonly string[],pendingFacts:readonly string[]=[],target?:string){
 const available=Array.from(new Set([...confirmedFacts,...pendingFacts]))
 const has=(fact:string)=>available.includes(fact)
 const prerequisiteFact=target==='A14_SHARE'?'WATER_STORAGE_INSPECTED':target==='A15_CARE'?'MEDICAL_PREPARATION_INSPECTED':null
 const prerequisiteTarget=target==='A14_SHARE'?'A14_WATER':target==='A15_CARE'?'A15_CLOTH':null
 const prerequisiteMet=!prerequisiteFact||has(prerequisiteFact)
 const waterFacts=['WATER_STORAGE_INSPECTED','WATER_USES_CONNECTED'] as const
 const medicalFacts=['MEDICAL_PREPARATION_INSPECTED','MEDICAL_SUPPORT_CONNECTED'] as const
 const waterCount=waterFacts.filter(has).length
 const medicalCount=medicalFacts.filter(has).length
 const waterDone=waterCount===2
 const medicalDone=medicalCount===2
 const canConfirm=canConfirmCare(available)
 const careConfirmed=confirmedFacts.includes('CARE_MEANING_CONFIRMED')
 const carePending=!careConfirmed&&pendingFacts.includes('CARE_MEANING_CONFIRMED')
 const hasStructure=confirmedFacts.includes('STRUCT_MEANING_CONFIRMED')
 const hasKitchen=confirmedFacts.includes('KITCHEN_MEANING_CONFIRMED')
 const kitchenCallbackStatus:'LOCKED'|'AVAILABLE'|'VIEWED'=confirmedFacts.includes('KITCHEN_CARE_REFLECTED')
  ?'VIEWED'
  :(careConfirmed&&hasKitchen?'AVAILABLE':'LOCKED')
 const nextTarget=target==='A14_WATER'&&has('WATER_STORAGE_INSPECTED')&&!has('WATER_USES_CONNECTED')
  ?'A14_SHARE'
  :target==='A15_CLOTH'&&has('MEDICAL_PREPARATION_INSPECTED')&&!has('MEDICAL_SUPPORT_CONNECTED')
  ?'A15_CARE'
  :!prerequisiteMet
  ?prerequisiteTarget
  :null
 const nextZone:('L3-B'|'L3-C'|'L1-C'|'L3-D'|'L3-A'|null)=careConfirmed
  ?(canSynthesize([...confirmedFacts])?'L3-D':kitchenCallbackStatus==='AVAILABLE'||!hasKitchen?'L1-C':'L3-A')
  :(waterDone&&!medicalDone?'L3-B':medicalDone&&!waterDone?'L3-C':null)
 const guide=target?careTargetGuides[target]:undefined
 const turn2Summary=careConfirmed
  ?(hasStructure
   ?'Bước ngoặt nhận thức: Hệ thống công trình nhiều lớp không chỉ là kỹ thuật đào hầm, mà được tổ chức để duy trì nguồn nước, sự chăm sóc và sự sống gắn kết của con người.'
   :'Nước dự trữ và sự chăm sóc bổ sung cho nhau để giữ sự sống dưới lòng đất. Khi khám phá cấu trúc nhiều tầng, bạn sẽ thấy hệ thống công trình nâng đỡ đời sống ấy như thế nào.')
  :''
 return {
  prerequisiteFact,
  prerequisiteTarget,
  prerequisiteMet,
  waterCount,
  medicalCount,
  waterDone,
  medicalDone,
  canConfirm,
  careConfirmed,
  carePending,
  hasStructure,
  hasKitchen,
  kitchenCallbackStatus,
  nextTarget,
  nextZone,
  why:guide?.why??'',
  outcome:guide?.outcome??'',
  turn2Summary,
 }
}
