import {m2SurfaceTargets} from './m2WorldExpansion'
import {livingSpaces} from './livingSpaces'

export const m2ZoneGoals:Partial<Record<string,string>>={
 S2:'Theo hạt gạo qua cối giã, khuôn bánh và bàn tay xóm nghề',
 S3:'Đan thúng, chuyền đất và nối một câu hò dưới ánh trăng',
 S4:'Gặp những câu chuyện đời thường quanh sân sinh hoạt',
}
const reflections:Record<string,{body:string;nextZone:'S3'|'S4'|'L2-B';label:string}>={
 S2:{body:'Hạt gạo trở thành bánh tráng, vật liệu cũ trở thành đôi dép. Những đồ dùng nhỏ nối công sức của xóm nghề với bữa ăn và bước chân trong hầm.',nextZone:'S3',label:'Theo lối sang đồng ruộng'},
 S3:{body:'Chiếc thúng đan tay giúp chuyền đất; câu hò giúp giữ nhịp cùng làm. Hãy mang góc nhìn về sức lao động và tình người này tới sân sinh hoạt.',nextZone:'S4',label:'Theo lối tới sân sinh hoạt'},
 S4:{body:'Một lời ca, một lời dặn và gói nhu yếu phẩm cho thấy đời sống tinh thần đi cùng sự sẻ chia. Dưới lòng đất, sổ phân công và mảnh thư sẽ nối tiếp những câu chuyện này.',nextZone:'L2-B',label:'Theo hành trình tới khu hội họp'},
}
export type M2StationGuidance={phase:'PREPARE'|'TRY'|'NEXT'|'REFLECT';title:string;body:string;nextTarget?:string;nextZone?:'S3'|'S4'|'L2-B'|'L2-C';label?:string}
export function describeM2Station(id:string,completed:readonly string[]):M2StationGuidance|null{
 const meeting=livingSpaces['L2-B'].targets.find(t=>t.id===id)
 if(meeting){
  if(meeting.requires&&!completed.includes(meeting.requires))return{phase:'PREPARE',title:'Đọc nhịp công việc chung',body:'Đối chiếu sổ phân công trước khi mở lá thư.',nextTarget:meeting.requires,label:'Tới điểm chuẩn bị trước'}
  if(!completed.includes(id))return{phase:'TRY',title:'Quan sát rồi thử',body:meeting.description}
  if(id==='L2B_RECORDS'&&!completed.includes('L2B_LETTER'))return{phase:'NEXT',title:'Từ việc chung tới lời nhắn riêng',body:meeting.payoff,nextTarget:'L2B_LETTER',label:'Tiếp tục · Phong thư gửi tương lai'}
  return{phase:'REFLECT',title:'Giữ lại một điều có ý nghĩa',body:'Sổ công việc và lời nhắn cho thấy một cộng đồng cần cả sự phối hợp lẫn niềm hy vọng. Hãy nhìn lại góc nghỉ để nối việc chung với đời sống mỗi người.',nextZone:'L2-C',label:'Trở lại khu nghỉ và chăm đồ dùng'}
 }
 const target=m2SurfaceTargets[id];if(!target)return null
 if(target.requires&&!completed.includes(target.requires))return{phase:'PREPARE',title:'Trở lại bước chuẩn bị',body:`${target.why} Hãy hoàn tất việc chuẩn bị trước khi thực hiện bước này.`,nextTarget:target.requires,label:'Tới điểm chuẩn bị trước'}
 if(!completed.includes(id))return{phase:'TRY',title:'Quan sát rồi thử',body:target.why}
 const next=Object.values(m2SurfaceTargets).find(t=>t.requires===id&&!completed.includes(t.id))??Object.values(m2SurfaceTargets).find(t=>t.zone===target.zone&&!completed.includes(t.id))
 if(next)return{phase:'NEXT',title:'Kết quả vừa thay đổi',body:target.payoff,nextTarget:next.id,label:`Tiếp tục · ${next.label}`}
 const reflection=reflections[target.zone]
 return{phase:'REFLECT',title:'Mang theo một góc nhìn mới',body:reflection?.body??target.payoff,...(reflection?{nextZone:reflection.nextZone,label:reflection.label}:{})}
}
