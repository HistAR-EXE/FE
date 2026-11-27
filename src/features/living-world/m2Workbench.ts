import * as T from 'three'
import type {Kit} from '../time-portal/tunnel3d/kit'

export type WorkKind='rice'|'sandal'|'weave'|'dig'|'rhythm'|'parcel'|'writing'
type WorkState={active?:string|null;completed?:readonly string[];reduced?:boolean;paused?:boolean;hidden?:boolean}
type WorkActor={g:T.Object3D;reach:(v:T.Vector3|null)=>void;grip?:(l:T.Vector3|null,r:T.Vector3|null)=>void;setIdle?:(clip:string)=>void;setCrouch?:(on:boolean)=>void;setTalking?:(on:boolean)=>void}
type WorkStation={id:string;object:T.Object3D;height?:number;offset?:[number,number,number];carry?:boolean}

/** Only visible, unpaused time advances the illustrative routine. Never writes gameplay state. */
export function createWorkClock(){
 let elapsed=0
 return {advance(dt:number,state:WorkState){if(!state.reduced&&!state.paused&&!state.hidden&&Number.isFinite(dt))elapsed+=T.MathUtils.clamp(dt,0,.1);return elapsed}}
}

/** Original tool geometry and local paths layered on the existing two-hand rig. */
export function createWorkbench({actor,kit,kind,stations}:{actor:WorkActor;kit:Kit;kind:WorkKind;stations:readonly WorkStation[]}){
 if(!stations.length)throw new Error('A workbench needs a station')
 const root=new T.Group();root.name='authored-work-'+kind
 const left=new T.Group(),right=new T.Group();left.name='left-grip';right.name='right-grip';root.add(left,right)
 const wood=kit.track(new T.MeshStandardMaterial({color:'#ad8d5f',roughness:.88})),dark=kit.track(new T.MeshStandardMaterial({color:'#48453b',roughness:.8})),paper=kit.track(new T.MeshStandardMaterial({color:'#d7c69e',roughness:.95}))
 const add=(geo:T.BufferGeometry,material:T.Material,parent:T.Object3D)=>{const m=new T.Mesh(kit.track(geo),material);m.castShadow=true;parent.add(m);return m}
 const rod=(parent:T.Object3D,length:number,r=.012)=>{const m=add(new T.CylinderGeometry(r,r,length,8),wood,parent);m.rotation.z=Math.PI/2;return m}
 // Each handle owns its prop; world-space IK goals are read from the same transforms.
 if(kind==='rice'){rod(right,.26);const scoop=add(new T.SphereGeometry(.055,12,8,0,Math.PI*2,0,Math.PI/2),paper,right);scoop.position.x=.14;scoop.rotation.z=Math.PI/2;rod(left,.12)}
 else if(kind==='sandal'){const strap=add(new T.TorusGeometry(.07,.012,6,14,Math.PI),dark,right);strap.rotation.x=Math.PI/2;rod(left,.13)}
 else if(kind==='weave'){rod(right,.31,.007);rod(left,.23,.007)}
 else if(kind==='dig'){const shaft=rod(right,.55,.018);shaft.rotation.z=.35;const blade=add(new T.BoxGeometry(.15,.035,.12),dark,right);blade.position.set(.09,-.26,0)}
 else if(kind==='rhythm'){rod(left,.23);rod(right,.23)}
 else if(kind==='parcel'){const parcel=add(new T.BoxGeometry(.22,.12,.17),paper,root);parcel.position.set(0,.8,-.12);const tie=add(new T.BoxGeometry(.025,.125,.175),wood,parcel);tie.position.y=0}
 else {const pencil=rod(right,.16,.006);pencil.rotation.z=.7;const sheet=add(new T.BoxGeometry(.27,.008,.18),paper,left);sheet.position.x=-.12}
 const carry=new T.Group();root.add(carry)
 if(kind==='dig'){
  const basket=add(new T.CylinderGeometry(.18,.13,.2,16,1,true),wood,carry);basket.position.y=.58
  const rim=add(new T.TorusGeometry(.18,.014,6,20),wood,carry);rim.rotation.x=Math.PI/2;rim.position.y=.68
  const soilMaterial=kit.track(new T.MeshStandardMaterial({color:'#795137',roughness:1}))
  const soil=add(new T.SphereGeometry(.165,12,6),soilMaterial,carry);soil.scale.y=.2;soil.position.y=.68
 }
 const clock=createWorkClock(),goal=new T.Vector3(),local=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3()
 let selected=stations[0],initialized=false
 const height=kind==='weave'?.48:kind==='rhythm'?1.06:kind==='parcel'?.8:kind==='writing'?.6:.5
 const idle=kind==='rhythm'||kind==='parcel'?'Idle_Loop':kind==='weave'?'Crouch_Idle_Loop':kind==='writing'?'Sitting_Idle_Loop':'Crouch_Idle_Loop'
 const update=(dt:number,state:WorkState)=>{
  const wanted=stations.find(s=>s.id===state.active)
  if(wanted)selected=wanted
  if(root.parent!==selected.object)selected.object.add(root)
  root.position.y=(selected.height??height)-height
  selected.object.updateWorldMatrix(true,false)
  local.fromArray(selected.offset??[0,0,kind==='parcel'?-.35:-.5]);selected.object.localToWorld(goal.copy(local))
  if(!initialized||state.reduced){actor.g.parent?.worldToLocal(goal);actor.g.position.copy(goal);initialized=true}
  else {
   actor.g.parent?.worldToLocal(goal)
   const distance=actor.g.position.distanceTo(goal)
   if(distance>.015&&!state.paused&&!state.hidden)actor.g.position.lerp(goal,Math.min(1,Math.max(0,dt)*.9/distance))
  }
  const traveling=actor.g.position.distanceTo(goal)>.02
  const worldCentre=selected.object.getWorldPosition(a),worldActor=actor.g.getWorldPosition(b)
  if(!state.paused)actor.g.rotation.y=Math.atan2(worldCentre.x-worldActor.x,worldCentre.z-worldActor.z)
  actor.setIdle?.(state.paused?(kind==='writing'?'Sitting_Idle_Loop':'Idle_Loop'):idle);actor.setCrouch?.(false)
  const elapsed=clock.advance(dt,{...state,paused:state.paused||traveling}),wave=state.reduced?0:Math.sin(elapsed*2.1),sway=state.reduced?0:Math.cos(elapsed*2.1)
  const y=height,z=kind==='writing'?-.3:kind==='rhythm'?-.15:-.12
  left.position.set(-.12,y,z);right.position.set(.12,y+.06,z)
  if(kind==='rice'){right.position.x+=wave*.075;right.position.z+=sway*.065}
  if(kind==='sandal'){right.position.y+=wave*.045;right.rotation.z=wave*.18}
  if(kind==='weave'){right.position.x+=wave*.08;right.position.z+=sway*.035;left.position.y+=wave*.015}
  if(kind==='dig'){left.position.set(.015,y+.1+wave*.035,z);right.position.set(.1,y+.32+wave*.035,z);right.rotation.z=wave*.16}
  if(kind==='rhythm'){left.position.y+=wave*.07;right.position.y-=wave*.07;left.rotation.z=wave*.3;right.rotation.z=-wave*.3}
  if(kind==='writing'){right.position.x+=wave*.035;right.position.z+=sway*.025;right.rotation.y=wave*.15}
  carry.visible=!!selected.carry
  for(const hand of [left,right])for(const prop of hand.children)prop.visible=!selected.carry
  if(selected.carry){left.position.set(-.18,.68,0);right.position.set(.18,.68,0);left.rotation.set(0,0,0);right.rotation.set(0,0,0)}
  // The humanoid faces +Z: its anatomical left is local +X.
  left.position.x*=-1;right.position.x*=-1
  root.visible=!traveling&&!state.paused&&!state.hidden
  root.updateWorldMatrix(true,true)
  left.getWorldPosition(a);right.getWorldPosition(b)
  actor.reach(null)
  if(root.visible){if(actor.grip)actor.grip(a,b);else actor.reach(a.clone().lerp(b,.5))}
  else actor.grip?.(null,null)
  actor.g.userData.workbench={kind,target:selected.id,phase:state.paused||state.hidden?'PAUSED':traveling?'TRAVEL':state.reduced?'STILL':'WORK',elapsed,handles:root.visible?[a.toArray(),b.toArray()]:[]}
 }
 return {root,handles:[left,right] as const,update}
}
