import {livingTarget} from './livingSpaces'
import {tunnelLayouts} from './tunnelLayouts'
import type {Point,Zone,Shell} from './worldModel'
import type {WorldState} from './worldQueue'
import {passages,passageArrival} from './undergroundContinuity'
export type WorldRoute={id:string;from:Zone;to:Zone;target:string;label:string;type:'THEMATIC_SCENE'|'TEMPORAL_PORTAL'|'KNOWLEDGE_LINK'|'FAST_RETURN';at:Point;approach:Point;spawn:Point;heading:number;passage?:string}
const route=(id:string,from:Zone,to:Zone,label:string,type:WorldRoute['type'],side=1):WorldRoute=>({id,from,to,target:'ROUTE_'+id,label,type,at:[side*2.6,1],approach:[side*2,1.5],spawn:to==='S0'?[0,1.5]:[0,2],heading:Math.PI})
export const worldRoutes:WorldRoute[]=[
 {...route('EPILOGUE_RETURN','L3-D','S5','Khép hành trình · trở về hiện tại','TEMPORAL_PORTAL'),at:[1.6,.5],approach:[1,.5]},
 {...route('STATION_MEMORIAL','S0','S5','Thăm không gian tưởng niệm hiện đại','THEMATIC_SCENE'),at:[3,2],approach:[2.5,2]},
 route('MEMORIAL_STATION','S5','S0','Trở về trạm thời gian','FAST_RETURN'),
 // Prologue P5: the Story (and Memory) journey lands in S1 (Q1). S2 stays a valid Free Exploration shortcut.
 {...route('TIME_OUT','S0','S1','Củ Chi01/1967 · bìa rừng','TEMPORAL_PORTAL'),target:'MACHINE'},
 {...route('TIME_OUT_FREE','S0','S2','Củ Chi1967 · góc lao động (khám phá tự do)','TEMPORAL_PORTAL',-1),target:'MACHINE'},
 route('FOREST_LABOR','S1','S2','Theo lối mòn về xóm','THEMATIC_SCENE'),
 route('FOREST_ENTRANCE','S1','L1-A','Chui xuống · lối xuống phục dựng','THEMATIC_SCENE',-1),
 route('ENTRANCE_SURFACE','L1-A','S1','Leo lên bìa rừng','THEMATIC_SCENE',-1),
 route('ENTRANCE_AIR','L1-A','L1-B','Đi tới trạm thông hơi','THEMATIC_SCENE'),
 route('ENTRANCE_STRUCTURE','L1-A','L1-D','Đi tới trạm cấu trúc','THEMATIC_SCENE'),
 route('AIR_ENTRANCE','L1-B','L1-A','Quay lại lối vào','THEMATIC_SCENE'),
 route('STRUCTURE_ENTRANCE','L1-D','L1-A','Quay lại lối vào','THEMATIC_SCENE'),
 route('LABOR_FOREST','S2','S1','Về bìa rừng','THEMATIC_SCENE',-1),
 route('LABOR_AIR','S2','L1-B','Từ đời sống tới thông khí','THEMATIC_SCENE'),
 route('AIR_LABOR','L1-B','S2','Nhìn lại góc lao động','THEMATIC_SCENE',-1),
 route('AIR_STRUCTURE','L1-B','L1-D','Quan sát cấu trúc nhiều tầng','THEMATIC_SCENE'),
 route('LAYER_MIDDLE','L1-D','L2-A','Góc nhìn lớp giữa','KNOWLEDGE_LINK'),
 route('LAYER_DEEP','L2-A','L3-A','Góc nhìn lớp dưới','KNOWLEDGE_LINK'),
 route('LAYER_UP','L2-A','L1-D','Góc nhìn lớp trên','KNOWLEDGE_LINK',-1),
 route('LAYER_BACK','L3-A','L2-A','Góc nhìn lớp giữa','KNOWLEDGE_LINK',-1),
 ...(['L1-D','L2-A','L3-A'] as Zone[]).map(z=>route('CALLBACK_'+z,z,'L1-B','Nhìn lại hơi thở của lòng đất','THEMATIC_SCENE',z==='L1-D'?-1:1)),
 ...(['S1','S2','L1-A','L1-B','L1-D','L2-A','L3-A'] as Zone[]).map(z=>({...route('RETURN_'+z,z,'S0','Trở về hiện tại','FAST_RETURN',-1),at:[-2.8,2] as Point,approach:[-2,2] as Point})),
]
// Separate signposts within each existing scene; no physical tunnel is asserted.
for(const zone of ['S1','S2','L1-A','L1-B','L1-D','L2-A','L3-A'] as Zone[]){
 // G3: Q2/Q3 scenes end at the excavation bank (z>-1.6) and frame closer, so their markers sit inside the view.
 const positions:Point[]=zone==='S1'?[[3.6,1.5],[-3.6,-1.5],[-3.6,2]]:zone==='S2'?[[3.3,-2.2],[-3.3,-2.2],[3.3,2.4],[-3.3,2.4]]:[[3.1,-1.2],[-3.1,-1.2],[2.9,1.1],[-2.9,1.1],[0,1.7]]
 worldRoutes.filter(r=>r.from===zone).forEach((r,i)=>{r.at=positions[i];r.approach=zone==='S1'?[Math.sign(r.at[0])*3,r.at[1]]:zone==='S2'?[Math.sign(r.at[0])*3,r.at[1]<0?-1.5:2]:[Math.sign(r.at[0])*2.5,r.at[1]<0?-1:1.5]})
}
// G3 WS6: underground signposts sit where each layer's own layout puts them (tunnelLayouts.ts).
for(const r of worldRoutes)if(r.to in tunnelLayouts){const sp=tunnelLayouts[r.to as keyof typeof tunnelLayouts].spawn;r.spawn=[...sp.at];r.heading=sp.heading} // safe spawn per layer (QC-CAMERA)
for(const zone of Object.keys(tunnelLayouts) as (keyof typeof tunnelLayouts)[])worldRoutes.filter(r=>r.from===zone).forEach((r,i)=>{const spot=tunnelLayouts[zone].routes[i];if(spot){r.at=spot.at;r.approach=spot.approach}})
const entranceRoute=worldRoutes.find(r=>r.id==='FOREST_ENTRANCE')!;entranceRoute.at=[2.5,-2.5];entranceRoute.approach=[2,-1.5]
// Climbing back up arrives beside the hatch (which is then closed and re-covered), facing the clearing.
{const up=worldRoutes.find(r=>r.id==='ENTRANCE_SURFACE')!;up.spawn=[2,-1.5];up.heading=0}
// Representative branches are authored thematic transitions, never archaeological corridors.
// Added after the legacy anchor assignment so existing Q1/Q2/Q3 routes retain their positions/order.
for(const [from,to,id,label] of [
 ['S2','L1-C','LABOR_KITCHEN','Theo bữa cơm tới cảnh bếp'],['L1-C','S2','KITCHEN_LABOR','Về xóm lao động'],
 // L2-C / L3-B / L3-C are now reached through their own layer's passages (undergroundContinuity.ts); no cross-layer jumps.
] as [Zone,Zone,string,string][]){const r=route(id,from,to,label,'THEMATIC_SCENE');const n=worldRoutes.filter(r=>r.from===from).length;r.at=from==='S2'?[5,3]:[[-2.6,1],[2.6,1],[0,.9]][n%3] as Point;r.approach=from==='S2'?[4.5,3]:[[-2,1],[2,1],[0,.5]][n%3] as Point;r.spawn=to==='S2'?[4,3]:[0,2.5];worldRoutes.push(r)}
for(const z of ['L1-C','L2-C','L3-B','L3-C','L2-D','L3-D'] as Zone[]){const r=route('RETURN_'+z,z,'S0','Trở về hiện tại','FAST_RETURN');r.at=[0,3];r.approach=[0,2.5];worldRoutes.push(r)}
// PO representative continuity correction: these edges now have authored doors/ramps, not model-view links.
for(const p of Object.values(passages)){
 let r=worldRoutes.find(r=>r.id===p.id)
 const label=p.id==='FOREST_ENTRANCE'?'Chui xuống địa đạo':p.id==='ENTRANCE_SURFACE'?'Leo lên bìa rừng':p.motion==='down'?'Leo xuống '+p.to:p.motion==='up'?'Leo lên '+p.to:p.to==='L1-C'?'Rẽ vào bếp':p.to==='L2-C'?'Vào chỗ nghỉ':p.to==='L3-B'?'Vào nơi chăm sóc':p.to==='L3-C'?'Tới chỗ lấy nước':p.from==='L2-C'?'Ra nút giao tầng 2':p.from==='L3-B'&&p.to==='L3-A'?'Ra tuyến sâu':p.from==='L3-C'?'Trở lại nơi chăm sóc':p.to==='L1-B'?'Qua hành lang thông khí':'Đi qua cửa hầm'
 if(!r){r=route(p.id,p.from as Zone,p.to as Zone,label,'THEMATIC_SCENE');worldRoutes.push(r)}
 const arrival=passageArrival(p.id);r.passage=p.id;r.type=p.truth;r.label=label;r.approach=[...p.at];r.at=[p.at[0]+p.out[0]*.6,p.at[1]+p.out[1]*.6];r.spawn=arrival.position;r.heading=arrival.heading
}
// LOCK §5/§8: "Về hiện tại" is FAST_RETURN — always available, independent of Q6, never an Epilogue.
export const typeLabels={FAST_RETURN:'Về nhanh hiện tại · không phải Epilogue, không phụ thuộc Q6',THEMATIC_SCENE:'Chuyển cảnh chủ đề · không phải đường hầm khảo sát',TEMPORAL_PORTAL:'Cổng thời gian hư cấu · hiện tại ↔ khung1967',KNOWLEDGE_LINK:'Đổi góc nhìn mô hình diễn giải · không phải lối đi thật'}
export const routesFrom=(zone:Zone)=>worldRoutes.filter(r=>r.from===zone)
/** Time-machine departure: Story/Memory → S1 (P5); Free Exploration → S2 shortcut. */
export const timeRoute=(mode:string)=>worldRoutes.find(r=>r.id===(mode==='FREE'?'TIME_OUT_FREE':'TIME_OUT'))!
type Nav={version:1;zone:Zone;position:Point;heading:number;rice:number;last:'LEFT'|'RIGHT'|null;facts?:string[];callbackSeen?:boolean;mode?:string;q1?:string[];activities?:string[];synthesisDraft?:string[];modelCompared?:boolean;smokeDraft?:string[];memorial?:unknown;kitchenEcho?:unknown}
const storage=(owner:string)=>owner==='guest'?sessionStorage:localStorage
export function saveNavigation(owner:string,value:Nav){try{storage(owner).setItem('timelens-proof-nav:'+owner,JSON.stringify(value))}catch{/* Server checkpoint remains authoritative when storage is unavailable. */}}
export function readNavigation(owner:string):Nav|null{try{const n=JSON.parse(storage(owner).getItem('timelens-proof-nav:'+owner)??'null');return n?.version===1&&['S0','S1','S2','S5','L1-A','L1-B','L1-C','L1-D','L2-A','L2-C','L3-A','L3-B','L3-C','L2-D','L3-D'].includes(n.zone)&&Array.isArray(n.position)&&n.position.length===2&&n.position.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v))&&Number.isFinite(n.heading)&&Number.isInteger(n.rice)&&n.rice>=0&&n.rice<=6&&[null,'LEFT','RIGHT'].includes(n.last)&&(n.activities===undefined||Array.isArray(n.activities)&&n.activities.every((id:unknown)=>typeof id==='string'&&!!livingTarget(id)))&&(n.synthesisDraft===undefined||Array.isArray(n.synthesisDraft)&&n.synthesisDraft.every((x:unknown)=>typeof x==='string'))?n:null}catch{return null}}
export function saveVerifiedState(owner:string,state:WorldState){try{localStorage.setItem('timelens-proof-verified:'+owner,JSON.stringify(state))}catch{/* Do not turn cache failure into an acknowledgement. */}}
export function readVerifiedState(owner:string):WorldState|null{try{const s=JSON.parse(localStorage.getItem('timelens-proof-verified:'+owner)??'null');return s?.releaseVersion===1&&Number.isFinite(s.revision)&&Array.isArray(s.facts)?s:null}catch{return null}}
export function resumeShell(base:Shell,nav:Nav|null,zone:Zone,isSafe:(p:Point,z:Zone)=>boolean):Shell{return nav&&nav.zone===zone&&isSafe(nav.position,zone)?{...base,zone,position:nav.position,heading:nav.heading,path:[],intent:null}:{...base,zone,path:[],intent:null}}
