/** Presentation relation keys map to the existing, immutable Q6 wire contract. */
export function connectSynthesis(a:string,b:string):string|null{
 const pair=[a,b].sort().join(':')
 return ({'ENTRANCE:STRUCTURE':'ENTRANCE_STRUCTURE_ORGANIZES_SPACE','AIR:LIVING':'AIR_SUPPORTS_LIVING_CONDITIONS','COMMUNITY:SUPPORT':'KITCHEN_WATER_MEDICAL_SUPPORT_COMMUNITY'} as Record<string,string>)[pair]??null
}
export const synthesisNodes=[['ENTRANCE','Lối vào'],['STRUCTURE','Tổ chức không gian'],['AIR','Thông khí'],['LIVING','Điều kiện sinh hoạt'],['SUPPORT','Bếp · nước · chăm sóc'],['COMMUNITY','Cộng đồng']] as const

export const synthesisPayoffs:Record<string,string>={
 ENTRANCE_STRUCTURE_ORGANIZES_SPACE:'Lối vào và các tầng nối nhau thành một không gian có tổ chức.',
 AIR_SUPPORTS_LIVING_CONDITIONS:'Không khí giúp những không gian ấy có thể phục vụ đời sống.',
 KITCHEN_WATER_MEDICAL_SUPPORT_COMMUNITY:'Bữa ăn, nước và sự chăm sóc cùng duy trì cuộc sống của cộng đồng.',
}
