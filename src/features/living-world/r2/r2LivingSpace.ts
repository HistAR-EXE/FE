import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import type {ZoneEnv} from '../zoneEnvironments'
import {passageFloor,insidePassage} from '../undergroundContinuity'
import {livingSpaces,type LivingZone} from '../livingSpaces'
import {pbr,place,roomEnvironment} from './r2Assets'
import {createRigActor} from './r2Actors'

// FINAL ¶420–436 / 494–510 / 550–584. RECONSTRUCTED + THEMATIC; no surveyed location or room-per-layer claim.
// Props: Poly Haven CC0 runtime set; original educational geometry. People/gestures are FICTIONAL_EDUCATIONAL.
export function buildLivingSpace(scene:T.Scene,kit:Kit,zone:LivingZone,renderer:T.WebGLRenderer):ZoneEnv&{inside:(x:number,y:number,z:number)=>boolean}{
 const kitchen=zone==='L1-C',rest=zone==='L2-C',care=zone==='L3-B',water=zone==='L3-C'
 const environment=roomEnvironment(renderer);kit.track(environment);scene.environment=environment.texture;scene.environmentIntensity=.18
 scene.background=new T.Color('#100d09');scene.fog=new T.Fog('#17120d',7,18)
 scene.add(new T.HemisphereLight('#c9b494','#35291f',.65))
 const root=new T.Group();root.name=zone+'-THEMATIC-RECONSTRUCTION';scene.add(root)
 const wood=pbr(kit,'rough_wood',{repeat:[1.5,1],color:'#9c7950',normalScale:.4}),earth=pbr(kit,'clay_plaster',{repeat:[3,1.5],color:kitchen?'#a88059':rest?'#9b8061':care?'#927b65':'#766957',normalScale:.25})
 earth.roughnessMap=null;earth.roughness=1
 const cloth=kit.track(new T.MeshStandardMaterial({color:care?'#d8ccb2':'#998b62',roughness:1})),dark=kit.track(new T.MeshStandardMaterial({color:'#493f31',roughness:1}))
 const box=(size:[number,number,number],at:[number,number,number],mat:T.Material=wood,parent:T.Object3D=root)=>{const m=new T.Mesh(kit.track(new T.BoxGeometry(...size)),mat);m.position.set(...at);m.castShadow=m.receiveShadow=true;parent.add(m);return m}
 const cylinder=(r:number,h:number,at:[number,number,number],mat:T.Material=wood)=>{const m=new T.Mesh(kit.track(new T.CylinderGeometry(r,r,h,20)),mat);m.position.set(...at);m.castShadow=m.receiveShadow=true;root.add(m);return m}
 const floor=new T.Mesh(kit.track((()=>{const g=new T.PlaneGeometry(8,8,80,80).rotateX(-Math.PI/2).translate(0,0,.5),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,passageFloor(zone,p.getX(i),p.getZ(i)));g.computeVertexNormals();return g})()),pbr(kit,'dirt_floor',{repeat:[3,3],color:'#968069',normalScale:.3}));floor.receiveShadow=true;root.add(floor)
 // A short low entrance opens into a functional chamber; no enlargement of the five existing tunnel zones.
 box([.2,2.35,4.8],[-3.1,1.17,-.8],earth);box([.2,2.35,4.8],[3.1,1.17,-.8],earth);box([6.4,2.35,.2],[0,1.17,-3.1],earth)
 for(const x of [-1.82,1.82])box([2.55,2.35,.2],[x,1.17,1.5],earth)
 box([6.4,.18,4.8],[0,2.35,-.8],earth)
 for(const x of [-.57,.57])box([.14,1.25,kitchen?1.1:2.05],[x,.62,kitchen?2.05:2.5],earth)
 box([1.28,.15,2.05],[0,1.32,2.5],earth)
 if(kitchen){box([2.5,.15,.95],[0,1.32,3],earth);box([2.5,1.25,.15],[0,.62,3.55],earth)}
 for(const z of [-2.7,-1.1,.6]){box([5.9,.12,.12],[0,2.13,z]);for(const x of [-2.85,2.85])box([.12,2.1,.12],[x,1.05,z])}
 const lamp=(x:number,z:number)=>{place(root,'vintage_oil_lamp',[x,.48,z],{scale:.8});const light=new T.PointLight('#ffd29b',kitchen?3:2.3,7,1.7);light.position.set(x,.75,z);root.add(light);return light}
 const light=lamp(-2.55,.7);lamp(2.55,-2.7)
 const targets:Record<string,T.Object3D>={}
 const makeTarget=(id:string,y:number)=>{const t=livingSpaces[zone].targets.find(t=>t.id===id)!,g=new T.Group();g.position.set(t.at[0],0,t.at[1]);root.add(g);g.userData.interactionAnchor=new T.Vector3(0,y,0);targets[id]=g;const proxy=new T.Mesh(kit.track(new T.BoxGeometry(.7,.65,.65)),kit.track(new T.MeshBasicMaterial({visible:false})));proxy.position.y=y;g.add(proxy);return g}
 const first=livingSpaces[zone].targets[0],second=livingSpaces[zone].targets[1],a=makeTarget(first.id,.65);makeTarget(second.id,.55)
 const person=createRigActor(root,kit,{body:kitchen?'female':'male',height:1.52,skin:'#bc926f',hair:kitchen?'Hair_Buns':'Hair_SimpleParted',hairColor:'#211c16',clothing:{top:kitchen?'#515a40':care?'#8e8b70':'#655d49',bottom:'#3e3c32',style:'baba'},idle:rest?'Sitting_Idle_Loop':'Idle_Loop'})
 person.g.position.set(kitchen?-2.4:2.3,0,kitchen?-1.8:-2.25);person.g.rotation.y=kitchen?.6:-1.4
 const bowl=place(a,'wooden_bowl_01',[0,.55,0],{scale:1.2})
 let movingProp:T.Object3D=bowl,fill:T.Mesh|null=null,bedCloth:T.Mesh|null=null
 const smoke:T.Mesh[]=[]
 if(kitchen){
  box([1.1,.08,.9],[-2,.48,0]);for(const x of [-2.4,-1.6])for(const z of [-.3,.3])box([.06,.45,.06],[x,.23,z])
  place(root,'wicker_basket_02',[-2.5,0,-.9]);place(root,'ceramic_pot',[-2.6,0,.7],{scale:.7})
  // Low hearth, covered smoke channels, three expansion chambers. Exposed only by deliberate inspection.
  box([1,.22,1.05],[1.7,.11,-1.5],earth);movingProp=place(root,'ceramic_pot',[1.7,.28,-1.5],{scale:.9})
  for(let i=0;i<3;i++){box([.65,.25,.55],[1.6-i*.9,.16,-2.6],earth);box([.35,.12,.16],[1.15-i*.9,.15,-2.6],dark)}
  for(let i=0;i<10;i++){const m=new T.Mesh(kit.track(new T.SphereGeometry(.08,8,5)),kit.track(new T.MeshBasicMaterial({color:'#b8b09a',transparent:true,opacity:.18,depthWrite:false})));root.add(m);smoke.push(m)}
  for(let i=0;i<6;i++){const log=box([.08,.08,.6],[2.6,.06+i*.07,-.6]);log.rotation.y=.3}
  const ember=cylinder(.18,.04,[1.7,.25,-1.5],kit.track(new T.MeshStandardMaterial({color:'#39251b',emissive:'#b85916',emissiveIntensity:1.2})));ember.name='hearth-educational'
 }else if(rest){
  for(const x of [-1.9,1.9]){box([1.2,.04,1.85],[x,.06,-1.35],pbr(kit,'bamboo_wall_02',{repeat:[1,2],color:'#b5a071'}));box([.85,.12,.3],[x,.15,-2.05],cloth)}
  bedCloth=box([1,.025,.7],[1.8,.1,-1.25],cloth);bedCloth.rotation.z=.12
  for(const x of [-2.7,-1.3])box([.05,.85,.05],[x,.42,-2.6]);box([1.6,.07,.5],[-2,.85,-2.6])
  movingProp=place(a,'wicker_basket_02',[0,.05,0],{scale:.7});place(root,'wooden_bowl_01',[-2.25,.9,-2.6]);place(root,'wooden_bucket_01',[2.6,0,.7],{scale:.7})
  for(const x of [-2.3,-2.05]){const sandal=box([.1,.03,.28],[x,.03,.6],dark);sandal.rotation.y=.4}
 }else if(care){
  box([1.15,.12,2.1],[1.8,.38,-1.55]);bedCloth=box([1.05,.035,1.9],[1.8,.47,-1.55],cloth)
  for(const x of [1.35,2.25])for(const z of [-2.4,-.7])box([.07,.37,.07],[x,.18,z])
  const patient=createRigActor(root,kit,{body:'female',height:1.5,skin:'#bb9277',hair:'Hair_Buns',hairColor:'#241d17',clothing:{top:'#7c7561',bottom:'#5c5849'}})
  patient.g.position.set(1.8,.55,-.85);patient.g.rotation.x=-Math.PI/2;patient.g.scale.setScalar(.85);patient.contact.visible=false
  box([1,.07,.85],[-2,.6,0]);box([.7,.04,.5],[-2,.66,0],dark);movingProp=box([.45,.06,.3],[-2,.71,0],cloth)
  place(root,'wooden_bowl_01',[-2.2,.7,.2]);place(root,'ceramic_pot',[-2.5,0,-.9],{scale:.65})
  // Folded curtains suggest privacy, leaving the central circulation clear.
  for(let i=0;i<6;i++)box([.07,1.2,.18],[.6,1.25,-2.7+i*.16],cloth)
 }else{
  // Separate evidence room: freestanding model on a pedestal, deliberately not an in-floor well.
  box([1.2,.5,1.2],[-2,.25,-1],earth);cylinder(.4,.12,[-2,.57,-1],wood)
  fill=cylinder(.32,.025,[-2,.64,-1],kit.track(new T.MeshStandardMaterial({color:'#536c68',roughness:.18,metalness:.1})))
  for(const x of [-2.5,-1.5])box([.07,1.5,.07],[x,1.25,-1]);box([1.2,.08,.08],[-2,1.98,-1]);box([.02,.8,.02],[-2,1.55,-1],dark)
  movingProp=place(root,'wooden_bucket_01',[-2,.7,-1],{scale:.65})
  box([1.1,.08,.8],[1.8,.6,-1]);for(const x of [1.55,2.05])place(root,'ceramic_pot',[x,.65,-1],{scale:.5})
  place(root,'wicker_basket_02',[2.5,0,.4],{scale:.8})
 }
 const home=movingProp.position.clone()
 return {floor,heightAt:()=>0,targets,endpoints:new Map(),pipes:[],links:[],camera:{position:[0,1,2.8],target:[0,.9,0],min:.7,max:2.2,polar:2.6},
  inside:(x,y,z)=>insidePassage(zone,x,y,z)||(kitchen&&Math.abs(x)<1.05&&z>2.6&&z<3.47&&y>.05&&y<1.17)||(y>.05&&((Math.abs(x)<2.98&&z>-2.98&&z<1.4&&y<2.15)||(Math.abs(x)<.48&&z>=1.4&&z<3.45&&y<1.17))),
  update:(t,dt,st)=>{
   const done=st.completed??[],prepared=done.includes(first.id),finished=done.includes(second.id),active=st.active===first.id||st.active===second.id
   light.intensity=(kitchen?3:2.3)*(st.reduced?1:1+Math.sin(t*7)*.025)
   person.setTalking(active);person.reach(active?new T.Vector3(kitchen?-1.8:1.5,1.05,kitchen?-.7:-1):null)
   if(kitchen){movingProp.position.set(prepared?1.7:-2,prepared?.28:.55,prepared?-1.5:0);bowl.visible=!prepared;smoke.forEach((m,i)=>{const k=(t*.22+i/smoke.length)%1;m.visible=prepared;m.position.set(finished?1.6-k*2.7:1.7,finished?.35+Math.sin(k*8)*.04:.65+k*.7,finished?-2.6:-1.5);m.scale.setScalar(.5+k);(m.material as T.MeshBasicMaterial).opacity=(1-k)*.2})}
   if(rest){movingProp.position.lerp(prepared?new T.Vector3(0,.9,-1.6):home,Math.min(1,dt*3));if(bedCloth)bedCloth.rotation.z=T.MathUtils.lerp(bedCloth.rotation.z,finished?0:.12,Math.min(1,dt*3))}
   if(care){movingProp.position.lerp(finished?new T.Vector3(1.2,.55,-.6):new T.Vector3(-2,prepared?.76:.71,0),Math.min(1,dt*3));if(bedCloth)bedCloth.scale.y=1+(st.reduced?0:Math.sin(t*1.4)*.025)}
   if(water){movingProp.position.y=T.MathUtils.lerp(movingProp.position.y,prepared?1.25:.7,Math.min(1,dt*2));if(fill)fill.scale.y=prepared?1.8:1}
  }}
}
