export type Point = [number, number]
import {routesFrom} from './worldContinuity'
import {tunnelLayouts,isTunnelZone,inLayout,isQuestTarget} from './tunnelLayouts'
import {livingSpaces,isLivingZone,livingWalkable,type LivingZone} from './livingSpaces'
import {kitchenNodes} from './spatialKitchen'
import {m2SurfaceTargets} from './m2WorldExpansion'
export type Zone = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'L1-A' | 'L1-B' | 'L1-D' | 'L2-A' | 'L3-A' | 'L2-D' | 'L3-D' | LivingZone
export type Mode = 'FREE' | 'STORY' | 'MEMORY'
export type Target = { id: string; label: string; at: Point; approach: Point; description: string }
export const factLabels:Record<string,string>={Q1_TRAIL_OBSERVED:'Lối mòn dừng đột ngột dưới lớp lá',Q1_LEAVES_OBSERVED:'Mảng lá được thay, khác màu xung quanh',Q1_HATCH_OBSERVED:'Một tấm nắp phủ đất và lá',ENTRANCE_CONFIRMED:'Nhận ra lối vào được ngụy trang',AIR_OPENING_INSPECTED:'Một lỗ mở nối với bên ngoài',AIR_PASSAGE_INSPECTED:'Đoạn dẫn nối các không gian',AIR_INTERIOR_INSPECTED:'Không gian cần điều kiện sử dụng',AIR_PATH_CORRECT:'Từ lỗ mở qua đoạn dẫn tới bên trong',AIR_MEANING_CONFIRMED:'Thông khí liên quan tới điều kiện sinh hoạt',STRUCT_LAYER_1:'Lớp trên trong hệ thống',STRUCT_LAYER_2:'Lớp giữa trong hệ thống',STRUCT_LAYER_3:'Lớp dưới trong hệ thống',STRUCT_LINK_12:'Điểm chuyển giữa lớp trên và lớp giữa',STRUCT_LINK_23:'Điểm chuyển giữa lớp giữa và lớp dưới',STRUCT_MEANING_CONFIRMED:'Các lớp kết nối thành một hệ thống có tổ chức'}
Object.assign(factLabels,{KITCHEN_HEARTH_INSPECTED:'Công việc quanh bữa ăn',KITCHEN_SMOKE_INSPECTED:'Mô hình dẫn khói',KITCHEN_SMOKE_PATH_CORRECT:'Đường khói qua rãnh và khoang phân tán',KITCHEN_MEANING_CONFIRMED:'Bếp gắn với bữa ăn cộng đồng',WATER_STORAGE_INSPECTED:'Vật dụng trữ nước',WATER_USES_CONNECTED:'Nước cho nhiều nhu cầu',MEDICAL_PREPARATION_INSPECTED:'Chuẩn bị cho việc chăm sóc',MEDICAL_SUPPORT_CONNECTED:'Sự hỗ trợ giữa con người',CARE_MEANING_CONFIRMED:'Nước và chăm sóc duy trì cộng đồng',KITCHEN_CARE_REFLECTED:'Nhìn lại bếp sau khi hiểu chăm sóc',MS_SYNTHESIS_COMPLETE:'Một cộng đồng hiện ra'})
const m2TargetsFor=(z:'S2'|'S3'|'S4'):Target[]=>Object.values(m2SurfaceTargets).filter(t=>t.zone===z).map(t=>({id:t.id,label:t.label,at:t.at,approach:t.approach,description:t.description}))
export const zones: Record<Zone, { title: string; targets: Target[] }> = {
 S5:{title:'Củ Chi hôm nay · ký ức và tri ân',targets:[
  {id:'MEMORIAL_READ',label:'Đọc lời tưởng niệm',at:[0,-3.35],approach:[0,-2.5],description:'Không gian diễn giải hiện đại dành cho ký ức và tri ân. Bạn có thể tham quan, dừng lại yên lặng hoặc trở về trạm bất cứ lúc nào. Bố cục đang chờ đối chiếu tư liệu Đền Bến Dược.'},
  {id:'MEMORIAL_FLOWERS',label:'Góc hoa tưởng niệm',at:[-1.5,-1.7],approach:[-1.5,-1],description:'Một khoảng dành cho sự tri ân tự nguyện. Hoạt động nghi lễ đang được hoàn thiện và chờ kiểm duyệt.'},
  {id:'MEMORIAL_INCENSE',label:'Lư hương',at:[0,-2],approach:[0,-1.5],description:'Nghi thức tưởng niệm tự nguyện trong bối cảnh hiện đại. Cử chỉ trong bản dựng đang chờ kiểm duyệt.'},
  {id:'MEMORIAL_QUIET',label:'Dừng lại yên lặng',at:[2,-.8],approach:[2,0],description:'Bạn có thể dành một khoảng yên lặng để nhớ về những con người vừa gặp trong hành trình, rồi tự chọn lúc tiếp tục.'},
 ]},
 S0: { title: 'Trạm thời gian', targets: [
  {id:'KHA',label:'Kha · người giữ trạm',at:[-2,-1],approach:[-2,0],description:'Kha là nhân vật giáo dục hư cấu. Chọn một cách khám phá rồi bước qua cổng; bạn có thể quay lại bất cứ lúc nào.'},
  {id:'MACHINE',label:'Cỗ máy thời gian',at:[0,-1],approach:[0,0],description:'Một chuyến đi vào bối cảnh tái dựng Củ Chi năm 1967. Đây không phải bản đồ khảo cổ hay tái hiện một trận đánh cụ thể.'}] },
 // G3 immersive: Prologue P5 destination (FINAL Baseline / PLAYER-EXPERIENCE-LOCK). VERTICAL SLICE for Q1 only — not S1 FULL.
 // Q1 observations are client-side (no server quest rules exist for Q1 yet); they never grant XP or verified facts.
 S1: {title:'Bìa rừng · dấu cửa giữa rừng',targets:[
  {id:'Q1_TRAIL',label:'Lối mòn bị xóa dấu',at:[-1.5,-1],approach:[-1.5,0],description:'Lối mòn dừng lại giữa chừng; lá được rải lại phía trên. Đây là dựng cảnh diễn giải, không phải dấu vết của một sự kiện cụ thể.'},
  {id:'Q1_LEAVES',label:'Lá ngụy trang khác màu',at:[1.5,-1.5],approach:[1.5,-.5],description:'Một mảng lá héo hơn xung quanh: lá được thay để che một vật bên dưới. Quan sát, không đào bới.'},
  {id:'Q1_HATCH',label:'Nắp hầm ẩn',at:[2.5,-2.5],approach:[2,-1.5],description:'Nắp gỗ mang một lớp đất và lá giống nền rừng. Kích thước, cấu tạo và vị trí là phục dựng (PENDING REVIEW); chui xuống là chuyển cảnh chủ đề tới L1-A, không chứng minh một đường nối khảo sát.'},
  // Dấu nhiễu: natural leaf drift / fallen branch. Teaches what is NOT a concealed opening; never quest progress.
  {id:'S1_DECOY_1',label:'Lá dồn dưới gốc rễ',at:[-2.8,-2.3],approach:[-2.5,-1.5],description:'Lá rụng tự nhiên dồn vào chân rễ: cùng màu, không có mép thẳng, đất bên dưới chặt. Không phải lớp ngụy trang.'},
  {id:'S1_DECOY_2',label:'Cành khô gãy đổ',at:[.5,-2.6],approach:[.5,-2],description:'Một cành khô gãy nằm trên lá. Đất bên dưới không bị xáo trộn. Dấu nhiễu, không phải lối vào.'},
  {id:'NPC_LIAISON',label:'Chiến sĩ giao liên',at:[-3.2,.8],approach:[-2,1],description:'Nhân vật giáo dục hư cấu mặc trang phục du kích, nón tai bèo và áo choàng vải dù ngụy trang tại chòi lá bìa rừng.'}]},
 S2: {title:'Góc lao động · một bữa ăn bắt đầu ở đây',targets:[
  {id:'A04',label:'Thử phối hợp giã gạo',at:[0,-0.7],approach:[0,0],description:'Một hạt gạo cần nhiều công sức trước khi thành bữa ăn. Quan sát nhịp của người cùng làm, rồi thử phối hợp hai bên. Dụng cụ và động tác trong bản thử là phục dựng.'},
  ...m2TargetsFor('S2'),
  {id:'NPC_CRAFTER',label:'Người tráng bánh',at:[-3,-0.5],approach:[-2.5,-0.5],description:'Nhân vật giáo dục hư cấu giữ lửa bếp tráng bánh tráng Củ Chi.'},
  {id:'NPC_COBBLER',label:'Người thợ dép',at:[3,-0.5],approach:[2.5,-0.5],description:'Nhân vật giáo dục hư cấu chế tác dép cao su tái chế.'},
 ]},
 S3: {title:'Đồng ruộng và khu lao động · nhịp sống đêm trăng',targets:[
  ...m2TargetsFor('S3'),
  {id:'NPC_WEAVER',label:'Người đan tre',at:[-2.5,-2.4],approach:[-2,-1.5],description:'Nhân vật giáo dục hư cấu đan nong, thúng tre dưới ánh trăng.'},
  {id:'NPC_EXCAVATOR',label:'Người đào đất',at:[2.5,-2.4],approach:[2,-1.5],description:'Nhân vật giáo dục hư cấu phụ trách tổ đào đất sét và chuyền thúng.'},
 ]},
 S4: {title:'Khu sinh hoạt cộng đồng và văn nghệ',targets:[
  ...m2TargetsFor('S4'),
  {id:'A23_CAMPAIGN',label:'Sa bàn bối cảnh Cedar Falls 01/1967',at:[0,-2.2],approach:[0,-1.5],description:'Sa bàn diễn giải bối cảnh tháng 01/1967 có dẫn nguồn [R01, R02, R03] và cầu nối thời gian A17.'},
  {id:'NPC_TROUPE',label:'Người đội văn nghệ',at:[-2.5,-2.5],approach:[-2,-1.5],description:'Nhân vật giáo dục hư cấu giữ nhịp đàn và lời ca tại sân sinh hoạt.'},
  {id:'NPC_YOUTH',label:'Thanh niên đăng ký tòng quân',at:[2.5,-1.45],approach:[2,-1],description:'Nhân vật giáo dục hư cấu chia sẻ tâm sự bên bàn đăng ký tòng quân trước giờ lên đường.'},
 ]},
 'L1-A':{title:'Lối vào và tuyến chuyển tiếp',targets:[]},
 'L1-B':{title:'Hơi thở của lòng đất',targets:[
  {id:'AIR_SURFACE_OPENING',label:'Dấu thông hơi trên mặt đất',at:[-2,-1],approach:[-2,0],description:'Một lỗ mở nối không gian ngầm với bên ngoài. Quan sát vị trí của nó trong sơ đồ; kích thước không phải số đo di tích.'},
  {id:'AIR_PASSAGE',label:'Đoạn nối trong lòng đất',at:[0,-1],approach:[0,0],description:'Hãy thử nối lỗ mở với đoạn dẫn rồi không gian bên trong. Mũi tên mô phỏng dùng để giải thích, không biểu diễn lưu lượng khí thực.'},
  {id:'AIR_INTERIOR',label:'Không gian bên trong',at:[2,-1],approach:[2,0],description:'Nếu chỉ nhìn đường hầm, ta dễ quên những điều kiện cần cho người ở bên trong. Không khí là một phần của câu chuyện sinh hoạt.'}]},
 'L1-D':{title:'Thành phố nhiều tầng · lớp trên',targets:[{id:'STRUCT_LAYER_1',label:'Quan sát lớp trên',at:[-1,-1],approach:[-1,0],description:'Lớp trên là một phần của hệ thống nhiều lớp. Sơ đồ này không gán một loại phòng cố định cho từng tầng.'},{id:'STRUCT_LINK_12',label:'Quan sát điểm chuyển 1–2',at:[2,-1],approach:[2,0],description:'Một điểm chuyển nối hai lớp. Hãy xem đầu còn lại ở lớp giữa; vị trí được diễn giải để dễ quan sát.'}]},
 'L2-A':{title:'Thành phố nhiều tầng · lớp giữa',targets:[{id:'STRUCT_LAYER_2',label:'Quan sát lớp giữa',at:[-1,-1],approach:[-1,0],description:'Đừng chỉ đếm tầng: hãy quan sát cách những khoảng không gian liên hệ với nhau.'},{id:'STRUCT_LINK_23',label:'Quan sát điểm chuyển 2–3',at:[2,-1],approach:[2,0],description:'Điểm chuyển này nối lớp giữa và lớp dưới trong mô hình diễn giải.'}]},
 'L3-A':{title:'Thành phố nhiều tầng · lớp dưới',targets:[{id:'STRUCT_LAYER_3',label:'Quan sát lớp dưới',at:[0,-1],approach:[0,0],description:'Khi nối các lớp, những đoạn rời rạc trở thành một hệ thống. Hãy quay về phần thông khí và thử nhìn nó trong toàn bộ cấu trúc.'}]},
 'L2-D':{title:'Trạm ký ức cấu trúc',targets:[{id:'MODEL_COMPARE',label:'Đối chiếu các lớp',at:[0,-.7],approach:[0,.5],description:'Mô hình phục dựng diễn giải, đối chiếu không gian với điều kiện sinh hoạt. Không phải sơ đồ khảo sát.'}]},
 'L3-D':{title:'Mạch Sống · một cộng đồng hiện ra',targets:['ENTRANCE','STRUCTURE','AIR','LIVING','SUPPORT','COMMUNITY'].map((n,i)=>({id:'SYN_'+n,label:['Lối vào','Tổ chức không gian','Thông khí','Điều kiện sinh hoạt','Bếp · nước · chăm sóc','Cộng đồng'][i],at:[(i%3-1)*.8,-.7-Math.floor(i/3)*.6] as Point,approach:[0,.5] as Point,description:'Mô hình tổng hợp diễn giải. Chọn hai điểm để nối quan hệ đã khám phá.'}))},
 'L1-C':{...livingSpaces['L1-C'],targets:[...livingSpaces['L1-C'].targets,{id:'NPC_COOK',label:'Người nấu bếp',at:[1.15,-1.85],approach:[.5,-1.5],description:'Nhân vật giáo dục hư cấu; bạn có thể hỏi về công việc quanh bếp.'}]},
 'L2-B':{...livingSpaces['L2-B'],targets:[...livingSpaces['L2-B'].targets,{id:'NPC_ORGANIZER',label:'Người ghi chép',at:[0,-1.85],approach:[0,-1],description:'Nhân vật giáo dục hư cấu phụ trách sổ phân công và lưu giữ thư gửi tương lai.'}]},
 'L2-C':{...livingSpaces['L2-C'],targets:[...livingSpaces['L2-C'].targets,{id:'NPC_MENDER',label:'Người giữ góc nghỉ',at:[0,-1.55],approach:[0,-1],description:'Nhân vật giáo dục hư cấu sắp xếp đồ dùng và giữ trật tự góc nghỉ tầng 2.'}]},
 'L3-B':{...livingSpaces['L3-B'],targets:[...livingSpaces['L3-B'].targets,{id:'NPC_CARER',label:'Chiến sĩ quân y',at:[1.85,-1.4],approach:[1,-.5],description:'Nhân vật giáo dục hư cấu phụ trách góc sơ cứu và chăm sóc sức khỏe tầng 3.'}]},
 'L3-C':{...livingSpaces['L3-C'],targets:[...livingSpaces['L3-C'].targets,{id:'NPC_WATER',label:'Người giữ nguồn nước',at:[-0.2,-1.55],approach:[0,-1],description:'Nhân vật giáo dục hư cấu trông coi chum nước dự trữ tầng 3.'}]},
}
for(const node of kitchenNodes)zones['L1-C'].targets.push({id:'Q4_'+node.id,label:node.label,at:[...node.at],approach:[0,-1.5],description:'Mô hình diễn giải nguyên lý trong cảnh bếp; không phải vị trí khảo sát.'})
// G3 WS6: L2-D interpretive niche inside the L2-A scene (THEMATIC · not a new zone id, never quest progress).
zones['L2-A'].targets.push({id:'L2D_NICHE',label:'Góc diễn giải L2-D',at:[0,0],approach:[0,0],description:'Một góc diễn giải (THEMATIC): mở mặt cắt X-ray để thấy lớp giữa nằm ở đâu giữa mặt đất và các lớp khác. Đây không phải một phòng có thật được khảo sát.'})
// Observation targets follow each layer's own layout (tunnelLayouts.ts).
for(const z of Object.keys(tunnelLayouts) as (keyof typeof tunnelLayouts)[])for(const t of zones[z].targets){const spot=tunnelLayouts[z].targets[t.id];if(spot){t.at=spot.at;t.approach=spot.approach}}
export const modeDestination = (mode: Mode) => mode === 'FREE' ? 'S2' : mode === 'STORY' ? 'L1-B' : 'SOURCES'
for(const zone of Object.keys(zones) as Zone[])for(const r of routesFrom(zone))if(r.target!=='MACHINE')zones[zone].targets.push({id:r.target,label:r.label,at:r.at,approach:r.approach,description:r.type+' · '+r.label})
export function nextStop(mode:Mode,zone:Zone,facts:string[]):Zone|'SOURCES'{
 const structure:Zone[]=['L1-D','L2-A','L3-A']
 const index=structure.indexOf(zone)
 if(index>=0){
  if(facts.includes('STRUCT_MEANING_CONFIRMED'))return 'L1-B'
  if(zones[zone].targets.some(t=>isQuestTarget(t.id)&&!facts.includes(t.id)))return zone
  return structure[Math.min(index+1,2)]
 }
 if(zone==='L1-B')return facts.includes('AIR_MEANING_CONFIRMED')&&!facts.includes('STRUCT_MEANING_CONFIRMED')?'L1-D':'L1-B'
 if(zone==='S2'||zone==='S3'||zone==='S4')return zone
 return modeDestination(mode)
}
const blocked = ([x,z]:Point, zone:Zone) => zone==='S2'
 ? Math.abs(x)>6.5||Math.abs(z)>5.5||(Math.abs(x)<.8&&z<-.2&&z>-2.3)||(x < -2.5 && z < -1.5)||(z < -4)
   // G3 props: hearth, water jars, firewood stack, seated winnower (keeps the walk grid honest).
   ||(x>4.8&&z>-2.3&&z<.1)||(x>5.6&&z>.3&&z<1.8)||(x< -5.2&&z>-.1&&z<1.3)||Math.hypot(x+3,z-4.5)<.7
 : zone==='S3'||zone==='S4' ? Math.abs(x)>4.5 || Math.abs(z)>3.5
 : zone==='S1' ? Math.abs(x)>4.5 || Math.abs(z)>3 || Math.hypot(x-2.5,z+2.5)<.6
 : zone==='S0' ? Math.abs(x)>3.5 || Math.abs(z)>2.5 || (Math.abs(x)<0.8 && z < -0.2 && z > -1.8)
 : zone==='S5' ? Math.abs(x)>3.5 || z>3 || z< -3 || (Math.abs(x+1.5)<.8&&Math.abs(z+1.7)<.5) || (Math.abs(x-2)<.9&&Math.abs(z+.8)<.45) || (Math.abs(x)<.35&&Math.abs(z+2)<.35)
   // G3 immersive: L1-B / L1-D / L2-A / L3-A are enterable tunnel sections; walking is limited to the carved
   // corridors of that layer's own layout (tunnelLayouts.ts, carved by r2/r2Tunnel.ts). The interpretive cutaway (X-ray) view uses the same points.
   : isLivingZone(zone)?!livingWalkable([x,z],zone):!(isTunnelZone(zone)&&inLayout(zone,x,z))
// Small regular walk grid, shared by pointer, keyboard and accessible approach actions.
export const isSafeWorldPoint=(p:Point,zone:Zone)=>!blocked(p,zone)
/** Safe spawn view: keep the heading when the passage continues ≥1 m ahead AND there is ≥1 m behind for the follow
 *  camera; otherwise face the direction with the most room (ahead + behind). Axis directions on the 0.5 m walk grid. */
export function openHeading(zone:Zone,[x,z]:Point,heading:number):number{
 const run=(h:number,max:number)=>{let d=0;for(let k=.5;k<=max;k+=.5){if(!isSafeWorldPoint([Math.round((x+Math.sin(h)*k)*2)/2,Math.round((z+Math.cos(h)*k)*2)/2],zone))break;d=k}return d}
 const score=(h:number)=>run(h,3)+run(h+Math.PI,1.5)
 if(run(heading,3)>=1&&run(heading+Math.PI,1.5)>=1)return heading
 let best=heading,bestScore=score(heading)
 for(const h of [heading+Math.PI/2,heading-Math.PI/2,heading+Math.PI]){const v=score(h);if(v>bestScore+1e-6&&run(h,3)>=1){best=h;bestScore=v}}
 return Math.atan2(Math.sin(best),Math.cos(best))
}
export function planPath(from:Point,to:Point,zone:Zone):Point[] {
 if(blocked(to,zone))return []
 const snap=([x,z]:Point):Point=>[Math.round(x*2)/2,Math.round(z*2)/2]
 const start=snap(from), goal=snap(to), key=(p:Point)=>p.join(',')
 const queue:Point[]=[start], parents=new Map<string,Point|null>([[key(start),null]])
 for(let i=0;i<queue.length;i++){
  const at=queue[i]
  if(key(at)===key(goal)){
   const path:Point[]=[];let cur:Point|null=at
   while(cur){path.unshift(cur);cur=parents.get(key(cur))??null}
   return path.slice(1)
  }
  for(const [dx,dz] of [[0.5,0],[-0.5,0],[0,0.5],[0,-0.5]]){
   const next:Point=[at[0]+dx,at[1]+dz]
   if(!blocked(next,zone)&&!parents.has(key(next))){parents.set(key(next),at);queue.push(next)}
  }
 }
 return []
}
export type Shell = {zone:Zone; position:Point; path:Point[]; intent:string|null; heading:number}
export const initialShell = ():Shell=>({zone:'S0',position:[0,2],path:[],intent:null,heading:Math.PI})
export const enterZone = (s:Shell,zone:Zone):Shell=>isTunnelZone(zone)?{...s,zone,position:[...tunnelLayouts[zone].spawn.at],heading:tunnelLayouts[zone].spawn.heading,path:[],intent:null}:({...s,zone,position:[0,2],path:[],intent:null})
export const moveTo = (s:Shell,to:Point):Shell=>({...s,path:planPath(s.position,to,s.zone),intent:null})
export function startApproach(s:Shell,id:string):Shell {
 const target=zones[s.zone].targets.find(t=>t.id===id)
 return target?{...s,path:planPath(s.position,target.approach,s.zone),intent:id}:s
}
export function advanceShell(s:Shell,delta:number):Shell {
 const next=s.path[0];if(!next)return s
 const dx=next[0]-s.position[0],dz=next[1]-s.position[1],distance=Math.hypot(dx,dz),step=Math.min(0.1,Math.max(0,delta))*2.8
 const target=s.path.length===1?zones[s.zone].targets.find(t=>t.id===s.intent):undefined
 return distance<=step?{...s,position:next,path:s.path.slice(1),heading:target?Math.atan2(target.at[0]-next[0],target.at[1]-next[1]):Math.atan2(dx,dz)}:{...s,position:[s.position[0]+dx/distance*step,s.position[1]+dz/distance*step],heading:Math.atan2(dx,dz)}
}
export function arrivedInteraction(s:Shell):string|null {
 const target=zones[s.zone].targets.find(t=>t.id===s.intent)
 return target&&!s.path.length&&Math.hypot(s.position[0]-target.approach[0],s.position[1]-target.approach[1])<0.2?target.id:null
}
export type Rice = {processed:number; last:'LEFT'|'RIGHT'|null; finished:boolean}
export const initialRice=():Rice=>({processed:0,last:null,finished:false})
export function strokeRice(s:Rice,side:'LEFT'|'RIGHT'):Rice {
 if(s.finished||s.last===side)return s
 const processed=s.processed+1;return {processed,last:side,finished:processed>=6}
}
