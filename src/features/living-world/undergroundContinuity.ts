// Authored representative route only. PO concepts guide immersion, NOT archaeological topology/depth.
// FINAL L1-A connections / WC02,04,05,06 / WEQ06. Every passage is THEMATIC_SCENE.
export type Passage={id:string;reverse:string;from:string;to:string;at:[number,number];out:[number,number];rise:number;motion:'crawl'|'down'|'up';truth:'THEMATIC_SCENE'}
const p=(id:string,reverse:string,from:string,to:string,at:[number,number],out:[number,number],rise=0):Passage=>({id,reverse,from,to,at,out,rise,motion:rise>0?'up':rise<0?'down':'crawl',truth:'THEMATIC_SCENE'})
export const passages:Record<string,Passage>={
 FOREST_ENTRANCE:p('FOREST_ENTRANCE','ENTRANCE_SURFACE','S1','L1-A',[2,-1.5],[.45,-.9],-1.3),
 ENTRANCE_SURFACE:p('ENTRANCE_SURFACE','FOREST_ENTRANCE','L1-A','S1',[0,3],[0,1],1.3),
 ENTRANCE_AIR:p('ENTRANCE_AIR','AIR_ENTRANCE','L1-A','L1-B',[-2.5,-1],[0,-1]),
 AIR_ENTRANCE:p('AIR_ENTRANCE','ENTRANCE_AIR','L1-B','L1-A',[0,3],[0,1]),
 AIR_KITCHEN:p('AIR_KITCHEN','KITCHEN_AIR','L1-B','L1-C',[3,1.5],[0,1]),
 KITCHEN_AIR:p('KITCHEN_AIR','AIR_KITCHEN','L1-C','L1-B',[-1,3],[-1,0]),
 KITCHEN_MIDDLE:p('KITCHEN_MIDDLE','MIDDLE_KITCHEN','L1-C','L2-A',[1,3],[1,0],-1.3),
 MIDDLE_KITCHEN:p('MIDDLE_KITCHEN','KITCHEN_MIDDLE','L2-A','L1-C',[0,3],[0,1],1.3),
 LAYER_DEEP:p('LAYER_DEEP','LAYER_BACK','L2-A','L3-A',[3,-1],[1,0],-1.35),
 LAYER_BACK:p('LAYER_BACK','LAYER_DEEP','L3-A','L2-A',[0,3],[0,1],1.35),
 // G3/G4 world recovery: the living rooms hang off their own layer through low side passages (THEMATIC_SCENE),
 // replacing the cross-layer "continue" jumps (KITCHEN_REST/KITCHEN_CARE/WATER_KITCHEN…).
 MIDDLE_REST:p('MIDDLE_REST','REST_MIDDLE','L2-A','L2-C',[-2,1.5],[-1,0]),
 REST_MIDDLE:p('REST_MIDDLE','MIDDLE_REST','L2-C','L2-A',[-1,3],[-1,0]),
 DEEP_CARE:p('DEEP_CARE','CARE_DEEP','L3-A','L3-B',[-3,2],[-1,0]),
 CARE_DEEP:p('CARE_DEEP','DEEP_CARE','L3-B','L3-A',[-1,3],[-1,0]),
 CARE_WATER:p('CARE_WATER','WATER_CARE','L3-B','L3-C',[1,3],[1,0]),
 MIDDLE_MODEL:p('MIDDLE_MODEL','MODEL_MIDDLE','L2-A','L2-D',[-3,-.5],[-1,0]),
 MODEL_MIDDLE:p('MODEL_MIDDLE','MIDDLE_MODEL','L2-D','L2-A',[0,3],[0,1]),
 WATER_SYNTHESIS:p('WATER_SYNTHESIS','SYNTHESIS_WATER','L3-C','L3-D',[1,3],[1,0]),
 SYNTHESIS_WATER:p('SYNTHESIS_WATER','WATER_SYNTHESIS','L3-D','L3-C',[0,3],[0,1]),
 WATER_CARE:p('WATER_CARE','CARE_WATER','L3-C','L3-B',[-1,3],[-1,0]),
}
export type V3=[number,number,number]
/** Level threshold, a turn, then a low ramp/handhold section ending behind the bend. */
export function passagePoints(p:Passage):V3[]{
 const [x,z]=p.at,[dx,dz]=p.out,L=Math.hypot(dx,dz),u=dx/L,v=dz/L,side=['KITCHEN_AIR','REST_MIDDLE','CARE_DEEP','WATER_CARE'].includes(p.id)?-1:1
 return [[x,0,z],[x+u*.65,0,z+v*.65],[x+u*1.15-v*.45*side,p.rise*.35,z+v*1.15+u*.45*side],[x+u*1.65-v*.45*side,p.rise,z+v*1.65+u*.45*side]]
}
export function passageSample(points:V3[],progress:number):{point:V3;heading:number}{
 const q=Math.max(0,Math.min(.999999,progress))*(points.length-1),i=Math.floor(q),k=q-i,a=points[i],b=points[i+1]
 return {point:[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k],heading:Math.atan2(b[0]-a[0],b[2]-a[2])}
}
function near(zone:string,x:number,z:number){
 let closest:{distance:number;floor:number}|null=null
 for(const p of Object.values(passages).filter(p=>p.from===zone&&zone!=='S1')){const pts=passagePoints(p);for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dz=b[2]-a[2],k=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz))),distance=Math.hypot(x-a[0]-dx*k,z-a[2]-dz*k);if(!closest||distance<closest.distance)closest={distance,floor:a[1]+(b[1]-a[1])*k}}}
 return closest
}
export function passageFloor(zone:string,x:number,z:number){const n=near(zone,x,z);return n&&n.distance<.48?n.floor:0}
export function passageRoof(zone:string,x:number,z:number){const n=near(zone,x,z);return n&&n.distance<.48?n.floor+1.4*Math.sqrt(Math.max(0,1-(n.distance/.48)**6)):-Infinity}
export function insidePassage(zone:string,x:number,y:number,z:number){const n=near(zone,x,z);return !!n&&n.distance<.43&&y>n.floor+.04&&y<passageRoof(zone,x,z)-.05}
// Walk clear of the doorway on arrival; these points remain on the existing room/grid.
const arrivalClear:Record<string,[number,number][]>= {
 ENTRANCE_SURFACE:[[0,2]],AIR_ENTRANCE:[[0,2]],KITCHEN_AIR:[[0,3],[0,2],[0,1]],
 MIDDLE_KITCHEN:[[0,2]],LAYER_BACK:[[0,2]],ENTRANCE_AIR:[[-2.5,0]],
 AIR_KITCHEN:[[3,.5]],KITCHEN_MIDDLE:[[0,3],[0,2],[0,1]],LAYER_DEEP:[[3,-.5]],
 // living rooms: step through the low entry into the room so the whole function is in view on arrival (not a wall)
 REST_MIDDLE:[[0,3],[0,2],[0,1]],CARE_DEEP:[[0,3],[0,2],[0,1]],CARE_WATER:[[0,3],[0,2],[0,1]],WATER_CARE:[[0,3],[0,2],[0,1]],
 MIDDLE_REST:[[-1,1.5]],DEEP_CARE:[[-2,2]],
}
export function passageArrival(id:string){
 const reverse=passages[passages[id].reverse],points=passagePoints(reverse).reverse()
 for(const [x,z] of arrivalClear[reverse.id]??[])points.push([x,0,z])
 const end=points.at(-1)!,before=points.at(-2)!
 return {points,position:[end[0],end[2]] as [number,number],heading:Math.atan2(end[0]-before[0],end[2]-before[2])}
}
