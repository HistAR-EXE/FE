import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import type {ZoneEnv} from '../zoneEnvironments'
import {passageFloor,insidePassage,passages} from '../undergroundContinuity'
import {livingSpaces,type LivingZone} from '../livingSpaces'
import {pbr,place,roomEnvironment,canvasTexture} from './r2Assets'
import {createRigActor,type RigActor} from './r2Actors'

// FINAL ¶420–436 / 494–510 / 550–584 · G3/G4 world recovery. RECONSTRUCTED + THEMATIC staging; no surveyed location,
// room-per-layer claim or verified dimensions. Props: Poly Haven CC0 runtime set + original educational geometry.
// People and gestures are FICTIONAL_EDUCATIONAL. PO concept images are a visual target only (not historical data).

type V2=[number,number]
type Step={d:number;to?:V2;face?:V2;idle?:string;crouch?:boolean;talk?:boolean;reach?:(k:number,t:number)=>T.Vector3|null;carry?:T.Object3D;enter?:()=>void;exit?:()=>void}
const V=(x:number,y:number,z:number)=>new T.Vector3(x,y,z)

/** Looping daily routine for a rigged NPC: walk between spots, kneel/crouch, reach, carry. Freezes while the player talks to it. */
function routine(actor:RigActor,steps:Step[],start=0){
 let i=0,begin=start,from=actor.g.position.clone(),entered=false,lastTime:number|null=null
 const hand=actor.g.getObjectByName('hand_r'),hv=new T.Vector3()
 let lastReach:T.Vector3|null=null
 return {
  get step(){return steps[i]},
  jump(index:number,t:number){steps[i]?.exit?.();i=index;begin=t;from=actor.g.position.clone();entered=false},
  tick(t:number,hold=false,face?:V2){
   actor.g.userData.afterPose=null
   const elapsed=lastTime===null?0:Math.max(0,t-lastTime);lastTime=t
   const s=steps[i];if(!entered){entered=true;s.enter?.();from=actor.g.position.clone()}
   if(hold){begin+=elapsed;if(face){const dx=face[0]-actor.g.position.x,dz=face[1]-actor.g.position.z;actor.g.rotation.y=Math.atan2(dx,dz)}actor.setTalking(true);actor.setCrouch(false);actor.setIdle('Idle_Loop');actor.reach(null);return}
   actor.setTalking(!!s.talk)
   const k=Math.min(1,(t-begin)/s.d)
   if(s.to){const p=from.clone().lerp(V(s.to[0],0,s.to[1]),k);actor.g.position.set(p.x,0,p.z);const dx=s.to[0]-from.x,dz=s.to[1]-from.z;if(Math.hypot(dx,dz)>.01)actor.g.rotation.y=Math.atan2(dx,dz)}
   else if(s.face){const dx=s.face[0]-actor.g.position.x,dz=s.face[1]-actor.g.position.z;actor.g.rotation.y=Math.atan2(dx,dz)}
   actor.setIdle(s.idle??'Idle_Loop');actor.setCrouch(!!s.crouch&&!s.to)
   lastReach=s.reach?.(k,t)??null;actor.reach(lastReach)
   if(s.carry){const carry=s.carry;actor.g.userData.afterPose=()=>{if(hand){hand.getWorldPosition(hv);carry.position.copy(hv).add(V(0,-.04,0))}else carry.position.copy(actor.g.position).add(V(0,.85,0))}}
   if(k>=1){s.exit?.();i=(i+1)%steps.length;begin=t;from=actor.g.position.clone();entered=false}
  }}
}

export function buildLivingSpace(scene:T.Scene,kit:Kit,zone:LivingZone,renderer:T.WebGLRenderer):ZoneEnv&{inside:(x:number,y:number,z:number)=>boolean;hands:()=>T.Vector3|null}{
 const kitchen=zone==='L1-C',rest=zone==='L2-C',care=zone==='L3-B'
 const environment=roomEnvironment(renderer);kit.track(environment);scene.environment=environment.texture;scene.environmentIntensity=.14
 scene.background=new T.Color('#0d0a07');scene.fog=new T.Fog('#140f0b',6,16)
 scene.add(new T.HemisphereLight('#c9b090','#2c2018',kitchen?.42:.5))
 const root=new T.Group();root.name=zone+'-THEMATIC-RECONSTRUCTION';scene.add(root)
 let seed=({'L1-C':11,'L2-C':23,'L3-B':37,'L3-C':41} as Record<LivingZone,number>)[zone]
 const R=()=>(seed=(seed*16807)%2147483647)/2147483647
 const tone=kitchen?'#9c7452':rest?'#94785a':care?'#8a7360':'#76685a'
 const wood=pbr(kit,'rough_wood',{repeat:[1.5,1],color:'#8f6e49',normalScale:.4}),plank=pbr(kit,'rough_wood',{repeat:[2,.5],color:'#7d5f40',normalScale:.3})
 const earth=pbr(kit,'clay_plaster',{repeat:[3,1.5],color:tone,normalScale:.25});earth.roughnessMap=null;earth.roughness=1
 const soil=pbr(kit,'excavated_soil_wall',{repeat:[2.4,1.2],color:tone,normalScale:.55});soil.roughnessMap=null;soil.roughness=1
 const bamboo=pbr(kit,'bamboo_wall_02',{repeat:[1,2],color:'#b39a68'})
 const mat=(color:string,o:Partial<T.MeshStandardMaterialParameters>={})=>kit.track(new T.MeshStandardMaterial({color,roughness:1,...o}))
 const cloth=mat(care?'#d6cbb3':'#9a8b66'),dark=mat('#3f362b'),rice=mat('#e9e1cc'),greens=mat('#5f7a3a'),waterMat=mat('#3d4f4c',{roughness:.15,metalness:.05})
 const box=(size:[number,number,number],at:[number,number,number],m:T.Material=wood,parent:T.Object3D=root)=>{const o=new T.Mesh(kit.track(new T.BoxGeometry(...size)),m);o.position.set(...at);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
 const cyl=(r:number,h:number,at:[number,number,number],m:T.Material=wood,r2=r,parent:T.Object3D=root)=>{const o=new T.Mesh(kit.track(new T.CylinderGeometry(r,r2,h,18)),m);o.position.set(...at);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
 const lump=(r:number,at:[number,number,number],m:T.Material,sy=.6)=>{const g=kit.track(new T.IcosahedronGeometry(r,2)),p=g.attributes.position;for(let i=0;i<p.count;i++){const k=1+(Math.sin(p.getX(i)*13+seed)+Math.cos(p.getZ(i)*11))*.05;p.setXYZ(i,p.getX(i)*k,Math.max(-r*.15,p.getY(i))*sy*k,p.getZ(i)*k)}g.computeVertexNormals();const o=new T.Mesh(g,m);o.position.set(...at);o.castShadow=o.receiveShadow=true;root.add(o);return o}

 // ---- carved chamber: hand-dug earth skin over the collision box (no flat box walls in view) ----
 const vaultY=(x:number)=>1.8+.45*Math.cos(Math.min(1,Math.abs(x)/3.1)*Math.PI/2)
 const carved=(w:number,h:number,amp:number,s0:number)=>{const g=new T.PlaneGeometry(w,h,Math.ceil(w*9),Math.ceil(h*9)),p=g.attributes.position
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),edge=Math.min(1,(w/2-Math.abs(x))*3,(h/2-Math.abs(y))*3);p.setZ(i,(Math.sin(x*2.1+s0)*Math.cos(y*1.7+s0*1.3)*.55+Math.sin(x*5.3+y*4.1+s0)*.3+Math.sin(x*13+y*11)*.1)*amp*Math.max(.25,edge))}
  g.computeVertexNormals();return kit.track(g)}
 const panel=(w:number,h:number,at:[number,number,number],ry:number,s0:number)=>{const m=new T.Mesh(carved(w,h,.07,s0),soil);m.position.set(...at);m.rotation.y=ry;m.receiveShadow=true;root.add(m);return m}
 panel(6.25,2.45,[0,1.2,-3.0],0,1);panel(4.7,2.2,[-3.0,1.1,-.78],Math.PI/2,2);panel(4.7,2.2,[3.0,1.1,-.78],-Math.PI/2,3)
 panel(2.5,2.45,[-1.85,1.2,1.42],Math.PI,4);panel(2.5,2.45,[1.85,1.2,1.42],Math.PI,5);panel(1.3,1.15,[0,1.85,1.42],Math.PI,6)
 {const g=new T.PlaneGeometry(6.25,4.75,50,38).rotateX(Math.PI/2).translate(0,0,-.78),p=g.attributes.position
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,vaultY(x)+(Math.sin(x*2.7+z*1.9)*.5+Math.sin(x*7+z*5.5)*.3)*.06)}
  g.computeVertexNormals();const v=new T.Mesh(kit.track(g),soil);v.receiveShadow=true;root.add(v)}
 // collision/occlusion shell (hidden behind the skin) + low entry passage and T-shaped vestibule shared by all rooms
 box([.2,2.4,4.9],[-3.15,1.2,-.8],earth);box([.2,2.4,4.9],[3.15,1.2,-.8],earth);box([6.5,2.4,.2],[0,1.2,-3.15],earth);box([6.5,.2,4.9],[0,2.55,-.8],earth)
 for(const x of [-1.85,1.85])box([2.55,2.4,.2],[x,1.2,1.56],earth)
 for(const x of [-.57,.57])box([.14,1.25,1.1],[x,.62,2.05],earth)
 box([1.28,.15,1.2],[0,1.32,2.05],earth);box([2.5,.15,.95],[0,1.32,3]);box([2.5,1.25,.15],[0,.62,3.55],earth)
 const doors=Object.values(passages).filter(p=>p.from===zone)
 for(const side of [-1,1])if(!doors.some(p=>Math.sign(p.at[0])===side))box([.15,1.25,.95],[side*1.3,.62,3],earth)
 const floor=new T.Mesh(kit.track((()=>{const g=new T.PlaneGeometry(8,8,80,80).rotateX(-Math.PI/2).translate(0,0,.5),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,passageFloor(zone,p.getX(i),p.getZ(i))+(Math.abs(p.getX(i))<2.9&&p.getZ(i)<1.3?Math.sin(p.getX(i)*3.1)*Math.cos(p.getZ(i)*2.7)*.012:0));g.computeVertexNormals();return g})()),pbr(kit,'dirt_floor',{repeat:[3,3],color:'#8d765f',normalScale:.35}));floor.receiveShadow=true;root.add(floor)
 // a few roots and fallen soil crumbs at the wall foot give scale and use
 for(let i=0;i<14;i++){const a=R()*Math.PI*2,x=Math.cos(a)*2.85,z=-.8+Math.sin(a)*2.2;if(z>1.2)continue;lump(.05+R()*.07,[T.MathUtils.clamp(x,-2.9,2.9),.01,T.MathUtils.clamp(z,-2.9,1.2)],earth,.5)}
 // oil lamps sit in small wall niches: lighting only, never interaction or transfer targets
 const lamps:T.PointLight[]=[]
 const lamp=(x:number,y:number,z:number,i:number)=>{box([.34,.3,.22],[x,y+.12,z+(z< -2.5?-.1:0)],dark);place(root,'vintage_oil_lamp',[x,y,z],{scale:.75});const l=new T.PointLight('#ffcf94',i,6.5,1.8);l.position.set(x,y+.35,z+.25);root.add(l);lamps.push(l);return l}

 const targets:Record<string,T.Object3D>={}
 const [first,second]=livingSpaces[zone].targets
 const makeTarget=(id:string,y:number,size:[number,number,number]=[.7,.65,.65])=>{const t=livingSpaces[zone].targets.find(t=>t.id===id)!,g=new T.Group();g.position.set(t.at[0],0,t.at[1]);root.add(g);g.userData.interactionAnchor=new T.Vector3(0,y,0);targets[id]=g;const proxy=new T.Mesh(kit.track(new T.BoxGeometry(...size)),kit.track(new T.MeshBasicMaterial({visible:false})));proxy.position.y=y;g.add(proxy);return g}
 makeTarget(first.id,.6);makeTarget(second.id,.45)
 const person=(o:{body:'male'|'female';top:string;bottom?:string;hair?:'Hair_Buns'|'Hair_SimpleParted';skin?:string;height?:number;idle?:string;scarf?:boolean})=>createRigActor(root,kit,{body:o.body,height:o.height??(o.body==='female'?1.52:1.6),skin:o.skin??'#bc926f',hair:o.hair??(o.body==='female'?'Hair_Buns':'Hair_SimpleParted'),hairColor:'#1f1a15',clothing:{top:o.top,bottom:o.bottom??'#2f2c27',style:'baba',scarf:o.scarf},idle:o.idle,sample:kitchen})
 const lying=(a:RigActor,x:number,y:number,z:number,headDir:number)=>{a.g.rotation.order='YXZ';a.g.rotation.set(-Math.PI/2,headDir,0);a.g.position.set(x,y,z);a.contact.visible=false}
 // player choreography bookkeeping: a completion seen live is animated; one restored from a save is shown settled
 const begun:Record<string,number>={};let firstUpdate=true,handsTarget:T.Vector3|null=null
 const since=(id:string,t:number,done:string[])=>{if(!done.includes(id))return null;if(!(id in begun))begun[id]=firstUpdate?-1e9:t;return t-begun[id]}
 const ease=(k:number)=>k<=0?0:k>=1?1:k*k*(3-2*k),seg=(a:number,s:number,e:number)=>ease((a-s)/(e-s))
 // soft billboards (no hard-edged spheres) for steam and the interpretive smoke model
 const softTex=kit.track(canvasTexture(64,64,(x,w,h)=>{const g=x.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(235,230,220,.9)');g.addColorStop(.5,'rgba(220,214,204,.35)');g.addColorStop(1,'rgba(210,205,195,0)');x.fillStyle=g;x.fillRect(0,0,w,h)}))
 // Fabric folds use the existing cloth material; small drapes distinguish used surfaces from rigid boxes.
 const drape=(w:number,d:number,at:[number,number,number],m:T.Material=cloth)=>{const g=new T.PlaneGeometry(w,d,20,14).rotateX(-Math.PI/2),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,.012+Math.sin(x*34+z*9)*.009+Math.cos(z*21)*.006)}g.computeVertexNormals();const o=new T.Mesh(kit.track(g),m);o.position.set(...at);o.receiveShadow=true;root.add(o);return o}
 const steam:T.Sprite[]=[]
 const puff=(n:number)=>{for(let i=0;i<n;i++){const m=new T.Sprite(kit.track(new T.SpriteMaterial({map:softTex,transparent:true,opacity:.16,depthWrite:false})));m.visible=false;root.add(m);steam.push(m)}return steam.slice(-n)}
 const rise=(ps:T.Sprite[],src:T.Vector3,t:number,on:boolean,h=.8,spread=.12)=>ps.forEach((m,i)=>{const k=(t*.35+i/ps.length)%1;m.visible=on;m.position.set(src.x+Math.sin(i*2.3+t)*spread*k,src.y+k*h,src.z+Math.cos(i*1.7+t)*spread*k);m.scale.setScalar(.12+k*.35);m.material.opacity=(1-k)*.35})
 let update:(t:number,dt:number,done:string[],active:string|null,player:V2|null,reduced:boolean)=>void=()=>{}

 if(kitchen){
  // Low clay stove dug against the back wall (Hoàng Cầm principle: smoke is led away low and diffused). Interpretive.
  lamp(-2.75,.85,.3,1.6);lamp(2.75,.85,.5,1.2)
  const stove=box([1.4,.38,.8],[1.5,.19,-2.3],earth);stove.name='hearth-educational'
  for(const x of [1.15,1.85]){cyl(.17,.03,[x,.385,-2.3],dark);box([.26,.16,.04],[x,.12,-1.89],dark)}
  const ember=new T.Mesh(kit.track(new T.BoxGeometry(.22,.1,.05)),mat('#2f1d14',{emissive:'#d0661c',emissiveIntensity:1.6}));ember.position.set(1.15,.1,-1.9);root.add(ember)
  const ember2=ember.clone();ember2.position.x=1.85;root.add(ember2)
  const fire=new T.PointLight('#ff9a4a',3.4,5.5,1.6);fire.position.set(1.5,.35,-1.7);root.add(fire)
  place(root,'pot_enamel_01',[1.15,.39,-2.3],{scale:.9})
  // covered smoke trench along the back wall with three expansion mounds; the inspection lid opens on request only
  box([3,.1,.34],[-.7,.05,-2.8],earth);for(const x of [-.3,-1.1,-1.9]){const chamber=lump(.28,[x,0,-2.75],earth,.55);if(x===-1.9)targets.Q4_DIFFUSION=chamber}
  const lid=new T.Group();lid.position.set(.45,.11,-2.62);root.add(lid);box([.34,.035,.3],[0,0,-.15],plank,lid);for(const x of [-.085,.085])box([.025,.23,.025],[x,.115,-.15],plank,lid);box([.2,.025,.025],[0,.24,-.15],plank,lid)
  const trenchGlow=box([.28,.02,.26],[.45,.07,-2.78],mat('#1a120c'))
  targets.Q4_HEARTH=stove;stove.userData.interactionAnchor=V(.45,.1,-.1);targets.Q4_CHANNEL=lid
  const smoke=puff(10),potSteam=puff(6),pot2Steam=puff(6)
  // prep table, rice bowl, the small cooking pot that will travel to the stove
  box([1,.05,.8],[-1.45,.45,-1],plank);for(const x of [-1.88,-1.02])for(const z of [-1.33,-.67])box([.05,.43,.05],[x,.21,z])
  drape(.48,.5,[-1.45,.48,-1.04],mat('#7d765d',{side:T.DoubleSide}))
  const bowl=place(root,'wooden_bowl_01',[-1.12,.48,-.86],{scale:1.15});const bowlRice=cyl(.085,.02,[0,.05,0],rice,.07,bowl as unknown as T.Object3D)
  targets.Q4_COMMUNITY=bowl
  const potSmall=place(root,'ceramic_pot',[-1.62,.48,-1.12],{scale:.55});const potRice=cyl(.07,.015,[0,.16,0],rice,.07,potSmall as unknown as T.Object3D);potRice.visible=false
  box([.32,.03,.22],[-1.6,.485,-.8],plank);for(let i=0;i<5;i++)cyl(.025,.12,[-1.7+i*.05,.51,-.8],greens).rotation.z=Math.PI/2
  // rice basket, water bucket, shelf of bowls and jars, firewood, sacks, broom — traces of use
  const basket=place(root,'wicker_basket_02',[-2.05,0,-1.75],{scale:.85});lump(.14,[-2.05,.2,-1.75],rice,.3);void basket
  place(root,'wooden_bucket_01',[-.55,0,-1.55],{scale:.7});cyl(.13,.01,[-.55,.25,-1.55],waterMat)
  for(const y of [.82,1.32]){box([.34,.04,2.1],[-2.78,y,-1.4],plank);for(const z of [-2.35,-.45])box([.05,y,.05],[-2.66,y/2,z])}
  for(let i=0;i<4;i++)place(root,'wooden_bowl_01',[-2.78,.85,-2.2+i*.22],{scale:.85});for(let i=0;i<3;i++)place(root,'ceramic_pot',[-2.78,1.34,-2.15+i*.5],{scale:.42+i*.05})
  place(root,'wicker_basket_01',[-2.78,1.34,-.65],{scale:.55})
  const logs:T.Mesh[]=[];for(let i=0;i<9;i++){const l=cyl(.045,.62,[2.62+((i%3)-1)*.1,.05+Math.floor(i/3)*.085,-.85],pbr(kit,'rough_wood',{repeat:[.3,1],color:'#5d4430'}));l.rotation.x=Math.PI/2;logs.push(l)}
  for(const [x,z] of [[-2.6,.55],[-2.4,.95]] as V2[])lump(.2,[x,.17,z],mat('#7f6e52'),.9)
  const broom=place(root,'wooden_broom',[-2.85,0,1.05],{scale:.9});broom.rotation.z=.25
  // a cloth and herbs drying on a cord under the vault
  for(let i=0;i<4;i++){const c=box([.22,.26,.01],[-.9+i*.55,2.0,.2],i%2?cloth:greens);c.rotation.y=.1}
  box([3,.012,.012],[0,2.14,.2],dark)
  // cook (crouched stirring at the stove) and helper (sorting greens, fetching firewood)
  const cook=person({body:'female',top:'#4e5639',idle:'Crouch_Idle_Loop'});cook.g.position.set(1.15,0,-1.85)
  targets.NPC_COOK=cook.g; cook.g.userData.interactionBone=cook.g.getObjectByName('spine_03')
  const helper=person({body:'male',top:'#5b5444',bottom:'#3a352d',idle:'Fixing_Kneeling'});helper.g.position.set(-1,0,-2.0)
  box([.5,.03,.32],[-1,.32,-2.45],bamboo);for(const x of [-1.2,-.8])box([.04,.3,.28],[x,.15,-2.45],bamboo);for(let i=0;i<6;i++)cyl(.03,.14,[-1.15+i*.06,.35,-2.45],greens).rotation.z=Math.PI/2
  const log=cyl(.045,.55,[2.62,.3,-.85],pbr(kit,'rough_wood',{repeat:[.3,1],color:'#5d4430'}));log.rotation.x=Math.PI/2;log.visible=false
  let flare=0
  const stir=(t:number)=>V(1.15+Math.cos(t*2.4)*.07,.62,-2.3+Math.sin(t*2.4)*.07)
  const cookBase:Step[]=[{d:7,face:[1.15,-2.3],idle:'Crouch_Idle_Loop',crouch:true,reach:(_k,t)=>stir(t)},{d:2.2,face:[-1,-2],talk:true,idle:'Idle_Loop'}]
  const cookR=routine(cook,cookBase)
  const helperR=routine(helper,[
   {d:9,face:[-1,-2.45],idle:'Fixing_Kneeling',reach:(_k,t)=>V(-1.05+Math.sin(t*1.7)*.08,.36,-2.42)},
   {d:1.6,to:[.4,-1.2]},{d:1.7,to:[2.05,-.85]},
   {d:1,face:[2.62,-.85],idle:'PickUp_Table',reach:()=>V(2.55,.25,-.85),exit:()=>{log.visible=true}},
   {d:1.6,to:[.85,-1.65],carry:log},
   {d:1.1,face:[1.15,-1.9],idle:'Fixing_Kneeling',reach:()=>V(1.15,.14,-1.86),carry:log,exit:()=>{log.visible=false;flare=1}},
   {d:1.5,to:[.4,-1.25]},{d:1.4,to:[-1,-2.0]}],3)
  // cook fetches the player's pot after the rice is washed and puts it on the free hole
  let fetching=false,potOnStove=false
  const fetchSteps:Step[]=[{d:2.4,to:[-.72,-1.6]},{d:.9,face:[-1.62,-1.12],idle:'PickUp_Table',reach:()=>potSmall.position.clone().add(V(0,.12,0))},{d:2.4,to:[1.82,-1.62],carry:potSmall},{d:1.1,face:[1.85,-2.3],idle:'Crouch_Idle_Loop',crouch:true,reach:()=>V(1.85,.5,-2.3),carry:potSmall,exit:()=>{potOnStove=true;flare=1}}]
  const fetchR=routine(cook,fetchSteps)
  update=(t,dt,done,active,player,reduced)=>{
   const a=since(first.id,t,done),b=since(second.id,t,done),near=player&&Math.hypot(player[0]-1.4,player[1]+1.62)<1.1
   flare=Math.max(0,flare-dt*.8);fire.intensity=(3.4+flare*3)*(reduced?1:1+Math.sin(t*9)*.06+Math.sin(t*23)*.04);(ember.material as T.MeshStandardMaterial).emissiveIntensity=1.6+flare*2
   // player: wash the rice in the bowl, tip it into the small pot
   handsTarget=null
   if(active===first.id&&a===null)handsTarget=bowl.position.clone().add(V(0,.08,0))
   if(a!==null){
    const w=seg(a,0,.4)*(1-seg(a,2.3,2.6)),pour=seg(a,2.4,3.2)*(1-seg(a,3.5,4))
    bowl.position.set(-1.12+(-1.55+1.12)*pour,.48+w*.06+pour*.18+(reduced?0:Math.sin(a*9)*.012*w),-.86+(-1.05+.86)*pour)
    bowl.rotation.y=reduced?0:a*1.4*w;bowl.rotation.z=pour*1.1;bowlRice.visible=a<3.1;potRice.visible=a>=3
    if(a<3.7)handsTarget=bowl.position.clone().add(V(0,.07,0))
    if(a>=3.9&&!fetching&&!potOnStove&&a<1e8){fetching=true;fetchR.jump(0,t)}
    if(a>1e8&&!potOnStove){potOnStove=true;potSmall.position.set(1.85,.39,-2.3);potRice.visible=true;bowlRice.visible=false}
   }
   if(fetching&&!potOnStove)fetchR.tick(t);else{if(fetching&&potOnStove){fetching=false;potSmall.position.set(1.85,.39,-2.3)}cookR.tick(t,active==='NPC_COOK'||!!near&&active===first.id,player??undefined)}
   helperR.tick(t)
   rise(potSteam,V(1.15,.62,-2.3),t,!reduced,.7);rise(pot2Steam,V(1.85,.6,-2.3),t,potOnStove&&!reduced,.75)
   // inspection: open the lid; smoke runs low along the trench into the mounds, thinning out (interpretive model)

   const open=b===null?0:seg(b,0,.8);lid.rotation.x=open*1.2;(trenchGlow.material as T.MeshStandardMaterial).color.set(open?'#3a2a20':'#1a120c')
   if(active===second.id&&b===null&&a!==null||b!==null&&b<1.2)handsTarget=lid.localToWorld(V(0,.25,-.15))
   smoke.forEach((m,i)=>{const k=(t*.18+i/smoke.length)%1;m.visible=open>.5&&!reduced;m.position.set(.45-k*2.6,.16+Math.sin(k*9+i)*.03+k*.12,-2.78);m.scale.setScalar(.14+k*.3);m.material.opacity=(1-k)*.4})
  }
 }else if(rest){
  lamp(-2.75,.75,-.2,1.5);lamp(2.75,.85,-2.4,1.1)
  // hammock between two posts, a sleeping mat with folded blanket, a seated woman mending, a low shelf of belongings
  for(const x of [-.55,2.15]){cyl(.06,1.9,[x,.95,-2.5]);box([.2,.08,.2],[x,1.88,-2.5],wood)}
  {const g=new T.PlaneGeometry(2.5,.7,30,6),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setXYZ(i,x,1.25-.62*(1-(x/1.25)**2)-(y*y)*.4,y)}g.rotateX(0);g.computeVertexNormals()
   const h=new T.Mesh(kit.track(g),mat('#7e7b5a',{side:T.DoubleSide}));h.position.set(.8,0,-2.5);root.add(h)
   for(const s of [-1,1])box([.012,.012,.6],[.8+s*1.32,1.22,-2.5],dark).rotation.y=Math.PI/2}
  const sleeper=person({body:'male',top:'#5f594a',bottom:'#3b382f'});lying(sleeper,.05,.66,-2.5,-Math.PI/2);sleeper.g.scale.setScalar(.92)
  const matL=box([1.4,.02,1.6],[-2.1,.015,-1.7],bamboo);matL.receiveShadow=true
  const matR=new T.Group();matR.position.set(1.65,0,-1.5);root.add(matR);const matRm=box([1.2,.02,.8],[0,.015,0],bamboo,matR);const corner=box([.5,.02,.4],[-.35,.04,.22],bamboo,matR);corner.rotation.z=.5
  const blanket=box([.5,.07,.35],[.3,.06,-.1],cloth,matR);void matRm
  place(root,'wooden_stool_01',[-2.2,0,-1.55],{scale:.75}) // low stool: the seated clip is a chair pose, never a sit on air
  const mender=person({body:'female',top:'#4a4436',idle:'Sitting_Idle_Loop'});mender.g.position.set(-2.15,-.08,-1.55);mender.g.rotation.y=Math.PI/2
  const sewing=box([.3,.03,.22],[-1.75,.03,-1.5],cloth)
  drape(.42,.35,[-1.9,.04,-1.7],mat('#7d755c',{side:T.DoubleSide}))
  place(root,'wicker_basket_01',[-1.7,0,-2.05],{scale:.5})
  box([1,.04,.5],[-2.1,.42,-.05],plank);for(const x of [-2.55,-1.65])box([.05,.42,.05],[x,.21,-.05])
  place(root,'wooden_bowl_01',[-2.4,.45,-.05],{scale:.8});place(root,'ceramic_pot',[-1.85,.45,-.05],{scale:.38})
  const bag=place(root,'wicker_basket_02',[-1.22,0,-.5],{scale:.55})
  for(const x of [-1.4,-1.2]){const s=box([.1,.03,.26],[x,.015,.35],dark);s.rotation.y=.4}
  for(let i=0;i<3;i++)box([.3,.45,.01],[2.85,1.35,-.2+i*.4],i===1?cloth:mat('#6f6a55')).rotation.y=Math.PI/2
  box([.012,.012,1.4],[2.88,1.6,.2],dark)
  place(root,'wooden_bucket_01',[2.55,0,.9],{scale:.6})
  const bagHome=bag.position.clone(),bagShelf=V(-1.75,.45,-.05)
  update=(t,_dt,done,active,player,reduced)=>{
   const a=since(first.id,t,done),b=since(second.id,t,done)
   sleeper.g.rotation.z=reduced?0:Math.sin(t*.9)*.03
   handsTarget=null
   if(active===first.id&&a===null)handsTarget=bag.position.clone().add(V(0,.25,0))
   if(a!==null){const k=seg(a,.2,2.2);bag.position.copy(bagHome).lerp(bagShelf,k);bag.position.y+=Math.sin(k*Math.PI)*.25;if(a<2.4)handsTarget=bag.position.clone().add(V(0,.22,0))}
   if(active===second.id&&b===null&&a!==null)handsTarget=corner.getWorldPosition(new T.Vector3()).add(V(0,.05,0))
   const flat=b===null?0:seg(b,.2,1.6);corner.rotation.z=.5*(1-flat);corner.position.y=.04-flat*.02;blanket.position.x=.3-flat*.05;blanket.scale.y=1+flat*.3
   if(b!==null&&b<1.8)handsTarget=corner.getWorldPosition(new T.Vector3()).add(V(0,.06,0))
   const near=player&&Math.hypot(player[0]+2.15,player[1]+1.55)<1.6
   mender.setIdle(near||(a!==null&&a<6)||(b!==null&&b<6)?'Sitting_Talking_Loop':'Sitting_Idle_Loop')
   mender.reach(near?null:V(-1.78+Math.sin(t*1.3)*.05,.22,-1.5));sewing.rotation.y=reduced?0:Math.sin(t*1.3)*.08
  }
 }else if(care){
  lamp(-2.75,.85,-.3,1.4);lamp(2.75,.9,-.6,1.2)
  // bamboo cot with a resting person, a carer kneeling at the head with a damp cloth, a prep table with basin and cloths
  box([1.9,.06,.8],[1.6,.42,-2.1],bamboo);for(const x of [.75,2.45])for(const z of [-2.45,-1.75])box([.06,.42,.06],[x,.21,z])
  box([.45,.08,.5],[2.3,.5,-2.1],cloth)
  const patient=person({body:'male',top:'#7a745f',bottom:'#5a5648'});lying(patient,.95,.56,-2.1,-Math.PI/2);patient.g.scale.setScalar(.9)
  const sheet=box([1.05,.03,.72],[1.35,.62,-2.1],cloth)
  drape(.9,.68,[1.35,.645,-2.1],mat('#b4aa90',{side:T.DoubleSide}))
  const carer=person({body:'female',top:'#57503f',idle:'Fixing_Kneeling'});carer.g.position.set(1.85,0,-1.4);carer.g.rotation.y=Math.PI
  const wet=box([.14,.02,.1],[2.05,.66,-2.1],mat('#e2dccb'))
  box([1,.05,.8],[-1.45,.45,-1],plank);for(const x of [-1.88,-1.02])for(const z of [-1.33,-.67])box([.05,.43,.05],[x,.21,z])
  const basin=place(root,'wooden_bowl_01',[-1.62,.48,-1.12],{scale:1.5});cyl(.12,.01,[-1.62,.53,-1.12],waterMat)
  for(let i=0;i<3;i++)box([.26,.03,.18],[-1.2,.49+i*.03,-.8],cloth)
  const tray=box([.42,.03,.3],[-1.15,.485,-1.15],plank),trayCloth=box([.2,.025,.14],[-1.2,.5,-.8],cloth)
  const stool=place(root,'wooden_stool_01',[.95,0,-1.95],{scale:.8});void stool
  for(const y of [.82,1.32]){box([.34,.04,2.1],[-2.78,y,-1.4],plank);for(const z of [-2.35,-.45])box([.05,y,.05],[-2.66,y/2,z])}
  for(let i=0;i<4;i++)place(root,'ceramic_pot',[-2.78,.85,-2.2+i*.5],{scale:.36});for(let i=0;i<5;i++){const h=box([.06,.2,.06],[-2.78,1.45,-2.25+i*.2],greens);h.rotation.z=.2}
  // a low cloth screen at the foot of the cot (privacy), hung from a cord — muted, so it never fills the frame
  const screenCloth=mat('#857a62');box([.012,.012,.8],[.5,1.25,-2.55],dark);for(let i=0;i<4;i++)box([.05,.75,.17],[.5,.86,-2.86+i*.17],screenCloth)
  place(root,'wooden_bucket_01',[2.6,0,.2],{scale:.65});place(root,'ceramic_pot',[2.65,0,-.5],{scale:.6})
  basin.name='basin'
  const trayHome=tray.position.clone(),trayBed=V(.95,.42,-1.95),clothHome=trayCloth.position.clone()
  update=(t,_dt,done,active,player,reduced)=>{
   const a=since(first.id,t,done),b=since(second.id,t,done)
   sheet.scale.y=1+(reduced?0:Math.sin(t*1.4)*.25)
   handsTarget=null
   if(active===first.id&&a===null)handsTarget=trayCloth.position.clone().add(V(0,.06,0))
   const c=a===null?0:seg(a,.2,1.5);trayCloth.position.copy(clothHome).lerp(tray.position.clone().add(V(0,.03,0)),c);trayCloth.position.y+=Math.sin(c*Math.PI)*.12
   if(a!==null&&a<1.7)handsTarget=trayCloth.position.clone().add(V(0,.05,0))
   if(active===second.id&&b===null&&a!==null)handsTarget=tray.position.clone().add(V(0,.06,0))
   const m=b===null?0:seg(b,.2,2.4);tray.position.copy(trayHome).lerp(trayBed,m);tray.position.y+=Math.sin(m*Math.PI)*.25
   if(a!==null&&c>=1)trayCloth.position.copy(tray.position).add(V(-.03,.03,0))
   if(b!==null&&b<2.6)handsTarget=tray.position.clone().add(V(0,.08,0))
   // the carer wipes the forehead; after the tray arrives she rinses the cloth on it, then returns to the patient
   const rinse=b!==null&&b>2.6&&b<6
   const near=player&&Math.hypot(player[0]-1.85,player[1]+1.4)<1
   carer.setIdle(near?'Idle_Loop':'Fixing_Kneeling');carer.setTalking(!!near)
   const wipe=rinse?trayBed.clone().add(V(.05,.08,0)):V(2.05+(reduced?0:Math.sin(t*1.1)*.06),.68,-2.1)
   carer.reach(near?null:wipe);wet.position.copy(wipe).add(V(0,-.02,0))
  }
 }else{
  lamp(-2.75,.85,.2,1.4);lamp(2.75,.9,.4,1.1)
  // Illustrative stored-water station, not an in-floor well or geological source on this layer.
  const jar=place(root,'ceramic_pot',[-1.3,0,-1.25],{scale:1.5});void jar
  cyl(.27,.01,[-1.3,.62,-1.25],waterMat)
  // A short hand-held dipper replaces the well-like overhead gantry.
  const rope=cyl(.016,.45,[-1.3,1.0,-1.25],plank)
  const bucket=place(root,'wooden_bucket_01',[-1.3,.85,-1.25],{scale:.45});const bucketWater=cyl(.07,.01,[0,.3,0],waterMat,.07,bucket as unknown as T.Object3D);bucketWater.visible=false
  // two marked uses: a jar beside a small cooking pot (kitchen) and a jar beside folded cloth (care) — no numbers claimed
  const jars:{level:T.Mesh;x:number}[]=[]
  for(const [x,mark] of [[1,'kitchen'],[1.6,'care']] as [number,string][]){place(root,'ceramic_pot',[x,0,-2.05],{scale:1.05});const lv=cyl(.18,.01,[x,.22,-2.05],waterMat);jars.push({level:lv,x});if(mark==='kitchen')place(root,'pot_enamel_01',[x-.05,0,-1.6],{scale:.55});else box([.24,.08,.18],[x,.04,-1.6],cloth)}
  for(let i=0;i<5;i++)place(root,'ceramic_pot',[-2.4+i*.6,0,-2.6],{scale:.85+((i*37)%5)*.06})
  for(let i=0;i<3;i++)place(root,'wooden_bowl_01',[2.7,.0,-1.2+i*.3],{scale:.7})
  place(root,'wicker_basket_02',[2.6,0,.5],{scale:.75})
  const carrier=person({body:'female',top:'#4f4a3c',scarf:true});carrier.g.position.set(-.6,0,-2.05)
  const pail=place(root,'wooden_bucket_01',[-.6,.4,-2.05],{scale:.4})
  let pailFull=false
  // she ladles from a back storage jar into her pail and tops up another — away from the player's station
  carrier.g.position.set(-2.3,0,-2.05)
  const carrierR=routine(carrier,[
   {d:2.2,face:[-2.4,-2.6],idle:'PickUp_Table',reach:()=>V(-2.38,.55,-2.45),enter:()=>{pail.position.set(-2.1,.4,-2.25)},exit:()=>{pailFull=true}},
   {d:2.2,to:[-.15,-2.05],carry:pail},
   {d:1.8,face:[0,-2.6],idle:'PickUp_Table',reach:()=>V(0,.55,-2.45),carry:pail,exit:()=>{pailFull=false}},
   {d:2.2,to:[-2.3,-2.05],carry:pail},{d:2.4,face:[-.5,-1],talk:true}],1)
  const bucketHome=bucket.position.clone()
  update=(t,_dt,done,active,player)=>{
   const a=since(first.id,t,done),b=since(second.id,t,done)
   handsTarget=null
   // lower the bucket into the jar on the rope, raise it full
   const down=a===null?0:seg(a,.2,1.2)*(1-seg(a,1.6,2.6))
   bucket.position.copy(bucketHome).add(V(0,-down*.45,0));rope.scale.y=1+down*.75;rope.position.y=1.2-down*.22;bucketWater.visible=a!==null&&a>1.3
   if(active===first.id&&a===null)handsTarget=V(-1.3,1.25,-1.15)
   if(a!==null&&a<2.8)handsTarget=V(-1.3,1.2-down*.25,-1.15)
   // carry it to the two jars and pour into each; levels rise
   if(active===second.id&&b===null&&a!==null)handsTarget=bucket.position.clone().add(V(0,.2,0))
   if(b!==null){const toK=seg(b,0,1.4),p1=seg(b,1.4,2.2),toC=seg(b,2.4,3.2),p2=seg(b,3.2,4)
    const at=V(-1.3,.85,-1.25).lerp(V(1,.75,-1.85),toK).lerp(V(1.6,.75,-1.85),toC);bucket.position.copy(at);bucket.rotation.x=-(p1*(1-toC)+p2)*.9
    bucketWater.visible=p2<1;jars[0].level.position.y=.22+p1*.18;jars[1].level.position.y=.22+p2*.18
    if(b<4.4)handsTarget=bucket.position.clone().add(V(0,.18,0));rope.visible=false}
   else{jars[0].level.position.y=.22;jars[1].level.position.y=.22}
   const near=player&&Math.hypot(player[0]-carrier.g.position.x,player[1]-carrier.g.position.z)<1.2
   carrierR.tick(t);carrier.setTalking(!!near||carrierR.step.talk===true);void pailFull
  }
 }
 const inside=(x:number,y:number,z:number)=>insidePassage(zone,x,y,z)||(Math.abs(x)<1.18&&z>2.6&&z<3.47&&y>.05&&y<1.17)||(y>.05&&((Math.abs(x)<2.9&&z>-2.9&&z<1.35&&y<vaultY(x)-.12)||(Math.abs(x)<.48&&z>=1.35&&z<3.45&&y<1.17)))
 return {floor,heightAt:()=>0,targets,endpoints:new Map(),pipes:[],links:[],camera:{position:[0,1,2.8],target:[0,.9,0],min:.7,max:2.2,polar:2.6},inside,
  hands:()=>handsTarget,
  update:(t,dt,st)=>{update(t,dt,st.completed??[],st.active,st.player??null,st.reduced);for(const l of lamps){const base=(l.userData.base??=l.intensity) as number;l.intensity=base*(st.reduced?1:1+Math.sin(t*7+l.position.x*3)*.03)}firstUpdate=false}}
}
