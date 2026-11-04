import * as T from 'three'
import {Kit,mulberry32} from '../time-portal/tunnel3d/kit'
import {createWorldActor} from './worldActor'
import {mergeRigidChildren,mergeStaticDescendants} from './worldBatching'
import type {A04Phase} from './a04Experience'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import {skyDome,terrain,edge,noise2,tree,bamboo,banana,groundCover,hills,puffs,chickens} from './worldEnvKit'
import {isSafeWorldPoint} from './worldModel'

// Original authored review candidate. No downloaded meshes, textures, motions or likenesses.
type S2Actor={g:T.Object3D;left:T.Object3D;right:T.Object3D;legs:T.Object3D[];reach:(target:T.Vector3|null)=>void;contact:T.Object3D}
/** G3 immersive build: the R2 village supplies the ground and rigged people; A04 gameplay below is unchanged. */
export type S2R2={floor:T.Mesh;person:(color:string,scarf:boolean,role:'avatar'|'partner'|'helper'|'winnower',parent:T.Object3D)=>S2Actor}
export function createS2(scene:T.Scene,kit:Kit,r2?:S2R2){
 const random=mulberry32(196704),root=new T.Group();root.name='S2_REPRESENTATIVE_REVIEW_CANDIDATE';scene.add(root)
 const palette=new Map<string,T.MeshLambertMaterial|T.MeshStandardMaterial>();const material=(color:string)=>{let m=palette.get(color);if(!m){m=kit.track(r2?new T.MeshStandardMaterial({color,roughness:.82}):new T.MeshLambertMaterial({color}));palette.set(color,m)}return m}
 const mesh=(geo:T.BufferGeometry,color:string,at:[number,number,number],parent:T.Object3D=root)=>{const m=new T.Mesh(geo,material(color));m.position.set(...at);m.castShadow=true;m.receiveShadow=false;parent.add(m);return m}
 const sphere=kit.geo('s2-sphere',()=>new T.SphereGeometry(1,12,8)),cylinder=kit.geo('s2-cylinder',()=>new T.CylinderGeometry(1,1,1,8)),leafGeo=kit.geo('s2-leaf',()=>new T.SphereGeometry(1,8,5))
 const ellipsoid=(size:[number,number,number],color:string,at:[number,number,number],parent:T.Object3D=root)=>{const m=mesh(sphere,color,at,parent);m.scale.set(...size);return m}
 const pole=(a:T.Vector3,b:T.Vector3,r:number,color:string,parent:T.Object3D=root)=>{const m=mesh(cylinder,color,[0,0,0],parent);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,a.distanceTo(b),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());return m}
 const rod=(a:[number,number,number],b:[number,number,number],r:number,color:string,parent:T.Object3D=root)=>pole(new T.Vector3(...a),new T.Vector3(...b),r,color,parent)
 const relief=noise2(19670),pathAt=(x:number,z:number)=>Math.exp(-((x*.9)**2)/1.2)*T.MathUtils.smoothstep(z,-1,6)+Math.exp(-(((x-2.8)**2+(z-2.6)**2))/3)
 let floorLegacy:T.Mesh|undefined
 if(!r2){ const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#a88959';ctx.fillRect(0,0,256,256)
 for(let i=0;i<6000;i++){ctx.fillStyle=i%2?'#96764e':'#bba073';ctx.globalAlpha=.25;ctx.fillRect(random()*256,random()*256,random()*3+1,1)}
 const groundTex=kit.track(new T.CanvasTexture(canvas));groundTex.wrapS=groundTex.wrapT=T.RepeatWrapping;groundTex.repeat.set(16,16);groundTex.colorSpace=T.SRGBColorSpace
 // G3: sky dome + height-field ground. The walkable clearing stays flat; the land rises into wooded banks.
 skyDome(scene,kit,'#a9c6d6','#e4e2c6','#c7bb93');scene.fog=new T.Fog('#e4e2c6',17,58)

 floorLegacy=terrain(kit,{size:64,segments:72,map:groundTex,height:(x,z)=>{const e=edge(x,z,7.1,6.1,9);return e*(1.8+relief(x*.18,z*.18)*1.1)+relief(x*.9,z*.9)*.03*(1-e)},colour:(x,z,y,o)=>{const k=relief(x*1.3,z*1.3),worn=Math.min(1,pathAt(x,z));o.set(y>.35?'#7d8c55':'#a39a72').lerp(new T.Color('#b9a57a'),worn*.8);o.offsetHSL(0,0,k*.045)}})
 floorLegacy.position.y=-.035;root.add(floorLegacy)
 // Organic perimeter and layers of vegetation frame a walkable clearing; never a surveyed village plan.
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2,x=Math.cos(a)*(10+random()*3),z=Math.sin(a)*(9+random()*2);ellipsoid([2+random()*2,.4+random()*.5,2],'#74825a',[x,-.1,z])}}
 const floor=r2?r2.floor:floorLegacy!
 const matrix=new T.Matrix4(),q=new T.Quaternion()
 if(!r2){const leafMat=material('#537448'),leaves=new T.InstancedMesh(leafGeo,leafMat,160);leaves.castShadow=true;root.add(leaves)
 for(let i=0;i<32;i++){
  const x=(i-16)*.85,z=-6-random()*9,high=3+random()*3
  rod([x,0,z],[x+.25,high,z],.13,'#665039')
  for(let n=0;n<5;n++){q.setFromEuler(new T.Euler(random(),random()*6,random()));matrix.compose(new T.Vector3(x+(random()-.5)*2,high+(random()-.5)*1.4,z+(random()-.5)*2),q,new T.Vector3(1.4,1,1.3));leaves.setMatrixAt(i*5+n,matrix)}
 }
 // Bamboo thicket, segmented stems and long fronds.
 for(let i=0;i<18;i++){const x=4.5+random()*3,z=-5-random()*3,h=3.5+random()*2;rod([x,0,z],[x+.3,h,z],.055,'#728357');for(let j=1;j<5;j++)ellipsoid([.085,.035,.085],'#b5bd83',[x+j*.06,j*h/5,z]);const l=ellipsoid([.1,.035,1.25],'#708b53',[x,h-.3,z+.8]);l.rotation.z=.3}
 // Open timber work shelter: rounded posts, woven wall, layered thatch; front open for camera/readability.
 for(const x of [-5.5,-2.9])for(const z of [-4,-1.9])rod([x,0,z],[x,2.6,z],.085,'#73573a')
 for(const z of [-4,-1.9]){rod([-5.8,2.5,z],[-4.2,3.3,z],.07,'#6e5134');rod([-4.2,3.3,z],[-2.6,2.5,z],.07,'#6e5134')}
 for(let i=0;i<24;i++){const z=-4.3+i*.115;rod([-5.9,2.45,z],[-4.2,3.35,z],.11,i%2?'#b29a65':'#a68e5c');rod([-4.2,3.35,z],[-2.5,2.45,z],.11,i%2?'#b29a65':'#a68e5c')}
 for(let i=0;i<23;i++)rod([-5.5+i*.12,.2,-4],[-5.5+i*.12,1.95,-4],.038,i%2?'#a48b58':'#b79b65')
 for(let i=0;i<12;i++)rod([-5.5,.25+i*.14,-3.98],[-2.9,.25+i*.14,-3.98],.018,'#735e3d')}
 // Woven trays, grain sacks, storage jar and workbench support the story from husk to meal.
 const tray=(x:number,z:number,r=.6)=>{const g=new T.Group();g.position.set(x,.07,z);root.add(g);const rim=mesh(kit.geo('s2-tray-rim',()=>new T.TorusGeometry(r,.035,6,40)),'#a77f48',[0,.05,0],g);rim.rotation.x=Math.PI/2;const base=mesh(kit.geo('s2-tray-base',()=>new T.CylinderGeometry(r*.96,r*.94,.04,32)),'#c4a36b',[0,.02,0],g);for(let i=-4;i<=4;i++)rod([-r*.8,.05,i*r/6],[r*.8,.05,i*r/6],.008,'#9c7b4c',g);return base}
 const before=tray(2.8,2.5),after=tray(4,2.5);before.name='S2_HUSK_SAMPLE';after.name='S2_RICE_SAMPLE';after.material=material('#e5d4a3')
 for(const [base,color,long] of [[before,'#9b713e',.048],[after,'#eee1b8',.029]] as const){const bits=new T.InstancedMesh(kit.geo('s2-sample-grain',()=>new T.SphereGeometry(1,6,4)),material(color),90);base.parent!.add(bits);for(let i=0;i<90;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.48;matrix.compose(new T.Vector3(Math.cos(a)*r,.095,Math.sin(a)*r),new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),random()*6),new T.Vector3(long,.018,.018));bits.setMatrixAt(i,matrix)}}
 if(!r2){ for(let i=0;i<4;i++){ellipsoid([.38,.55,.32],'#b49d73',[-5+i*.55,.5,-2.7]);rod([-5+i*.55,.95,-2.7],[-5+i*.55,1.1,-2.7],.07,'#77603e')}
 const jarProfile=[[0,0],[.28,0],[.43,.25],[.4,.7],[.24,.85],[.23,.9]].map(([x,y])=>new T.Vector2(x,y));mesh(kit.geo('s2-jar',()=>new T.LatheGeometry(jarProfile,24)),'#79624d',[-2.8,0,-3.5])
 for(const x of [2.5,4.5])for(const z of [-3.8,-2.6])rod([x,0,z],[x,.7,z],.06,'#73573a')
 for(let i=0;i<12;i++)rod([2.3+i*.2,.72,-4],[2.3+i*.2,.72,-2.4],.06,'#a68d60')}
 tray(3.2,-3.2,.42)
 // The playable mortar is a hollow lathed wooden vessel, with grain instances and bound staves.
 const mortar=new T.Group();mortar.position.set(0,0,-.7);root.add(mortar)
 const profile=[[.2,0],[.4,.05],[.49,.25],[.51,.6],[.43,.65],[.36,.55],[.24,.3],[0,.28]].map(([x,y])=>new T.Vector2(x,y))
 mesh(kit.geo('s2-mortar',()=>new T.LatheGeometry(profile,32)),'#806043',[0,0,0],mortar)
 for(const y of [.15,.48]){const band=mesh(kit.geo('s2-band',()=>new T.TorusGeometry(.46,.018,6,32)),'#473e2f',[0,y,0],mortar);band.rotation.x=Math.PI/2}
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2;rod([Math.cos(a)*.43,.08,Math.sin(a)*.43],[Math.cos(a)*.49,.58,Math.sin(a)*.49],.006,'#a58756',mortar)}
 const grain=mesh(kit.geo('s2-grain',()=>new T.CylinderGeometry(.33,.27,.055,32)),'#b49859',[0,.4,0],mortar)
 const riceBits=new T.InstancedMesh(kit.geo('s2-rice-bit',()=>new T.SphereGeometry(1,6,4)),material('#d6bd80'),64);mortar.add(riceBits)
 for(let i=0;i<64;i++){const a=random()*Math.PI*2,r=Math.sqrt(random())*.31;matrix.compose(new T.Vector3(Math.cos(a)*r,.44,Math.sin(a)*r),new T.Quaternion(),new T.Vector3(.026,.012,.012));riceBits.setMatrixAt(i,matrix)}
 // ---- G3 environmental storytelling (static; merged below). Reconstruction-framed, not an artefact inventory. ----
 // Hearth: three stones, firewood and a clay pot — grain → water → cooking ("một bữa ăn bắt đầu ở đây").
 const hearth=new T.Group();hearth.position.set(5.55,0,-1.05);root.add(hearth)
 for(let i=0;i<3;i++){const a=i/3*6.28;ellipsoid([.17,.15,.17],'#6f675c',[Math.cos(a)*.26,.12,Math.sin(a)*.26],hearth)}
 for(let i=0;i<4;i++){const a=i/4*6.28+.4;rod([Math.cos(a)*.55,.03,Math.sin(a)*.55],[Math.cos(a)*.08,.1,Math.sin(a)*.08],.035,'#5b4128',hearth)}
 const potProfile=[[0,0],[.16,.02],[.27,.13],[.29,.25],[.2,.38],[.21,.42]].map(([x,y])=>new T.Vector2(x,y));mesh(kit.geo('s2-pot',()=>new T.LatheGeometry(potProfile,18)),'#5c4334',[0,.24,0],hearth)
 ellipsoid([.2,.035,.2],'#6b4f3c',[0,.67,0],hearth)
 for(let i=0;i<3;i++)rod([6.25,0,-2.05+i*.22],[6.25,.75+i*.05,-2.0+i*.22],.035,'#7c5f3d')
 // Water jars and a gourd ladle near the hearth; firewood stack on the edge of the clearing.
 for(const [x,z,s] of [[6.05,.7,1],[6.25,1.35,.8]] as const){const jar=mesh(kit.geo('s2-water-jar',()=>new T.LatheGeometry([[0,0],[.22,.02],[.33,.3],[.3,.55],[.17,.68],[.18,.74]].map(([a,b])=>new T.Vector2(a,b)),16)),'#6e5440',[x,0,z]);jar.scale.setScalar(s)}
 ellipsoid([.08,.06,.1],'#b79a5c',[5.8,.78,.85]);rod([5.8,.8,.95],[5.8,.82,1.25],.012,'#8a6b44')
 for(let row=0;row<4;row++)for(let i=0;i<5-row;i++)rod([-6.3,.1+row*.16,.1+i*.18+row*.09],[-5.4,.1+row*.16,.15+i*.18+row*.09],.07,i%2?'#6b4d31':'#7a5a3a')
 // Paddy drying on a woven mat in the sun (left foreground); grain texture via instancing below.
 const dryMat=mesh(kit.geo('s2-dry-mat',()=>new T.BoxGeometry(2.2,.02,1.5)),'#b39a63',[-4.4,.01,3.5]);dryMat.rotation.y=.15;dryMat.castShadow=false
 for(let i=-5;i<=5;i++)rod([-5.45,.025,3.5+i*.13],[-3.35,.025,3.5+i*.13+.3],.006,'#8f7646')
 if(!r2){ // Low split-bamboo fence and banana plants framing the foreground (depth layer, outside the walk area).
 for(let i=0;i<26;i++){const x=-6.4+i*.5;if(Math.abs(x)<1.4)continue;rod([x,0,6.35],[x,.75+((i*7)%3)*.06,6.35],.03,'#a49360')}
 rod([-6.4,.55,6.35],[-1.4,.55,6.35],.02,'#8f7d50');rod([1.4,.55,6.35],[6.4,.55,6.35],.02,'#8f7d50')
 for(const [x,z,k] of [[-7.4,5.4,1.1],[7.6,5.9,1],[-8.2,-1.5,1.2],[8.4,-3,1.15],[-7.8,1.8,.9]] as const)root.add(banana(kit,random,[x,0,z],k))}
 if(!r2){ // Nón lá hung on the shelter post; rice sacks already stand under the shelter.
 const hat=mesh(kit.geo('s2-non-la',()=>new T.ConeGeometry(.32,.16,18,1,true)),'#dccb93',[-2.78,1.6,-1.78]);hat.rotation.x=-1.2}
 if(!r2){ // Background depth: a second tree ring on the banks, bamboo groves and far hills.
 const bankHeight=(x:number,z:number)=>{const e=edge(x,z,7.1,6.1,9);return e*(1.8+relief(x*.18,z*.18)*1.1)-.035}
 for(let i=0;i<30;i++){const a=i/30*6.28+random()*.15,d=14+random()*9,x=Math.cos(a)*d,z=Math.sin(a)*d;if(z>8&&Math.abs(x)<9)continue;root.add(tree(kit,random,[x,bankHeight(x,z),z],.9+random()*.5,['#4f6b3f','#5f7c46','#566f3e']))}
 for(const [x,z] of [[-9.5,-6],[10,-5],[-11,3],[9.5,7.5]] as const)root.add(bamboo(kit,random,[x,bankHeight(x,z),z],6).group)
 scene.add(hills(kit,random,42,11,'#76896a'))
 scene.add(groundCover(kit,random,300,16,(x,z)=>(Math.abs(x)<6.7&&Math.abs(z)<5.9)||Math.hypot(x+4.4,z-3.5)<1.4,(x,z)=>bankHeight(x,z)))}
 // Batch original static scenery by material. Interactive and animated objects retain their identity.
 const staticScenery=(o:T.Mesh)=>{if(o instanceof T.InstancedMesh||([floor,grain,before,after] as T.Object3D[]).includes(o))return false;let at:T.Object3D|null=o;while(at){if(at===mortar)return false;at=at.parent}return true}
 mergeStaticDescendants(root,kit,staticScenery);mergeRigidChildren(mortar,kit,[grain])
 root.updateMatrixWorld(true)
 const batches=new Map<T.Material,T.Mesh[]>()
 root.traverse(o=>{if(!(o instanceof T.Mesh)||!staticScenery(o))return;if(Array.isArray(o.material)||(o.material as T.Material&{vertexColors?:boolean}).vertexColors)return;const list=batches.get(o.material)??[];list.push(o);batches.set(o.material,list)})
 for(const [material,list] of batches){if(list.length<2)continue;const copies=list.map(m=>m.geometry.clone().applyMatrix4(m.matrixWorld)),merged=mergeGeometries(copies);copies.forEach(g=>g.dispose());if(!merged)continue;const batch=new T.Mesh(kit.track(merged),material);batch.castShadow=true;batch.receiveShadow=false;root.add(batch);list.forEach(m=>m.removeFromParent())}
 const person=(color:string,scarf:boolean,role:'avatar'|'partner'|'helper'):S2Actor=>r2?r2.person(color,scarf,role,root):createWorldActor(root,kit,color,scarf)
 const avatar=person('#b4945c',false,'avatar'),npc=person('#596448',true,'partner'),helper=person('#81715a',true,'helper');npc.g.position.set(0,0,-1.5);helper.g.position.set(3.5,0,-2.5);helper.g.rotation.y=2.5
 const tool=(parent:T.Object3D)=>{const group=new T.Group();parent.add(group);rod([0,-.48,.12],[0,.6,.12],.045,'#c5a171',group);ellipsoid([.075,.13,.075],'#95764c',[0,-.5,.12],group);const grip=ellipsoid([.09,.12,.09],'#dbb67d',[0,.15,.12],group);group.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false});mergeRigidChildren(group,kit,[grip]);return{group,grip}}
 const playerTool=tool(root),npcTool=tool(root),helperTool=tool(root);helperTool.group.position.set(.65,1,-.7)
 // Small ambient birds, no quest/evidence and no pursuit of the player.
 const birds=r2?[]:[0,1,2].map(i=>{const g=new T.Group();root.add(g);ellipsoid([.17,.19,.24],i%2?'#8d6d45':'#c2ad83',[0,.22,0],g);ellipsoid([.09,.1,.1],'#c1aa7a',[0,.44,.12],g);const beak=mesh(kit.geo('s2-beak',()=>new T.ConeGeometry(.04,.1,5)),'#ae823a',[0,.43,.23],g);beak.rotation.x=Math.PI/2;for(const x of [-.05,.05])rod([x,0,0],[x,.13,0],.012,'#8b6e44',g);mergeRigidChildren(g,kit);return g})
 // ---- G3 ambient life and A04 feedback (dynamic; never merged, never quest objects, never progress) ----
 const live=new T.Group();live.name='S2_AMBIENT_LIFE';scene.add(live)
 const fire=new T.Mesh(kit.geo('s2-fire',()=>new T.ConeGeometry(.15,.38,7)),kit.track(new T.MeshBasicMaterial({color:'#ffb35a',transparent:true,opacity:.85,depthWrite:false})));fire.position.set(5.55,.2,-1.05);live.add(fire)
 const smoke=puffs(kit,20,'#dcd8cc',.3),dust=puffs(kit,30,'#dcc79d',.5),husks=puffs(kit,40,'#a27a45',.95),chaff=puffs(kit,24,'#e6d6a8',.6)
 for(const fx of [smoke,dust,husks,chaff])live.add(fx.mesh)
 const hens=chickens(kit,random,live,4,{x:[-5.5,5],z:[-.6,5.2]},(x,z)=>!isSafeWorldPoint([x,z],'S2')||Math.hypot(x,z+.7)<1.5||Math.hypot(x+3,z-4.6)<.9)
 // Seated winnower beside the drying mat: tosses the round tray so light chaff drifts off (A44 meaning, ambient).
 const winnower:S2Actor=r2?r2.person('#6a5a48',true,'winnower',live):createWorldActor(live,kit,'#6a5a48',true);winnower.g.position.set(-3,r2?.02:-.36,4.6);winnower.g.rotation.y=-2.45;winnower.legs.forEach(l=>l.rotation.x=-1.45);winnower.contact.position.set(-3,.005,4.6)
 const stool=new T.Mesh(kit.geo('s2-stool',()=>new T.CylinderGeometry(.2,.22,.2,8)),material('#6b4d31'));stool.position.set(-3,.1,4.68);live.add(stool)
 const niaTray=new T.Group();live.add(niaTray)
 const trayBase=new T.Mesh(kit.geo('s2-nia',()=>new T.CylinderGeometry(.38,.36,.025,24)),material('#c6a86c'));niaTray.add(trayBase)
 const trayRim=new T.Mesh(kit.geo('s2-nia-rim',()=>new T.TorusGeometry(.38,.02,5,28)),material('#9c7b4c'));trayRim.rotation.x=Math.PI/2;niaTray.add(trayRim)
 const trayGrain=new T.Mesh(kit.geo('s2-nia-grain',()=>new T.CircleGeometry(.3,18)),material('#eadbb0'));trayGrain.rotation.x=-Math.PI/2;trayGrain.position.y=.015;niaTray.add(trayGrain)
 const trayHome=new T.Vector3(-3.42,.62,4.15)
 // Butterflies drifting over the clearing.
 const butterflies=[0,1].map(i=>{const g=new T.Group();live.add(g);const wings=[-1,1].map(side=>{const w=new T.Mesh(kit.geo('s2-wing',()=>{const c=new T.CircleGeometry(.07,8);c.translate(.07,0,0);return c}),kit.track(new T.MeshBasicMaterial({color:i?'#f3d36b':'#f0efe6',side:T.DoubleSide})));w.scale.x=side;g.add(w);return w});return{g,wings}})
 // Turn cue on the ground around the mortar: amber = your stroke, soft green pulse = partner's stroke.
 const cueMat=kit.track(new T.MeshBasicMaterial({color:'#f2c46b',transparent:true,opacity:0,depthWrite:false})),cue=new T.Mesh(kit.geo('s2-cue',()=>new T.RingGeometry(.72,.8,40)),cueMat);cue.rotation.x=-Math.PI/2;cue.position.set(0,.03,-.7);live.add(cue)
 let previousTime=0,lastProcessed=-1,lastNpcY=0,npcFalling=false,smokeClock=0,chaffClock=0,npcPulse=0,impactAt=-1,seenProcessed=-1
 const update=(t:number,position:[number,number],heading:number,moving:boolean,phase:A04Phase,processed:number,working:boolean,reduced:boolean,onImpact=()=>{},onPartnerImpact=()=>{})=>{
  const dt=Math.min(.1,t-previousTime);previousTime=t
  avatar.g.position.set(position[0],0,position[1]);avatar.g.rotation.y=heading
  avatar.legs.forEach((l,i)=>l.rotation.x=moving&&!reduced?Math.sin(t*9+i*Math.PI)*.32:0)
  avatar.left.rotation.x=avatar.right.rotation.x=phase==='HELD'||phase==='RAISED'?-1.25:0
  npc.g.rotation.x=working?-.1:0;npc.left.rotation.x=-.8;npc.right.rotation.x=-.8
  const near=Math.hypot(...position)<.35,active=near&&(phase==='HELD'||phase==='RAISED'||working)
  if(seenProcessed<0)seenProcessed=processed
  if(processed>seenProcessed){impactAt=t+.16;seenProcessed=processed}
  playerTool.group.visible=near&&phase!=='IDLE';playerTool.group.position.x=.18;playerTool.group.position.z=-.6
  // The wooden end reaches the grain at y=.44. Both hands follow the same moving grip via arm IK.
  playerTool.group.position.y=impactAt>t?.92+(impactAt-t)/.16*.73:phase==='RAISED'?1.65:.92
  npcTool.group.position.set(-.18,processed>=6?.92:.92+(reduced?0:(1+Math.sin(t*3))*.365),-.78)
  const destination=new T.Vector3(near?3.5:.8,0,near?-2.5:0),walking=helper.g.position.distanceTo(destination)>.08
  helper.g.position.lerp(destination,Math.min(1,dt*1.4));helper.g.rotation.y=near?2.5:-2.3;helper.left.rotation.x=-.8+(reduced?0:Math.sin(t*1.3)*.1);helper.legs.forEach((l,i)=>l.rotation.x=walking&&!reduced?Math.sin(t*8+i*Math.PI)*.25:0)
  for(const actor of [avatar,npc,helper])actor.contact.position.set(actor.g.position.x,.005,actor.g.position.z)
  helperTool.group.visible=!near&&!processed;helperTool.group.position.y=1.05+(reduced?0:Math.sin(t*2+Math.PI)*.25)
  avatar.reach(active?new T.Vector3(.18,playerTool.group.position.y+.15,-.48):null)
  npc.reach(new T.Vector3(-.18,npcTool.group.position.y+.15,-.66));helper.reach(!near?new T.Vector3(.65,helperTool.group.position.y+.15,-.58):new T.Vector3(3.2,1,-3))
  grain.material=material(processed>=6?'#e7dab1':'#b49859');riceBits.material=material(processed>=6?'#eee2bf':'#d6bd80')
  grain.position.y=.4+processed*.008
  birds.forEach((bird,i)=>{bird.position.set(3.7+Math.sin(t*.25+i)*.8,0,3.9+Math.cos(t*.25+i)*.7);bird.rotation.y=-t*.25-i;bird.rotation.x=reduced?0:Math.sin(t*2+i)*.05})
  // A04 impact feedback: every accepted stroke (canonical count from the page) throws husk and dust from the mortar.
  const rim=new T.Vector3(0,.68,-.7)
  if(lastProcessed<0)lastProcessed=processed
  if(processed>lastProcessed&&t>=impactAt){onImpact();for(let i=0;i<(reduced?4:14);i++){const a=Math.random()*6.28,v=new T.Vector3(Math.cos(a)*(.4+Math.random()*.5),1+Math.random()*1.1,Math.sin(a)*(.4+Math.random()*.5));husks.spawn(rim,v,.022,.9,4.5)}for(let i=0;i<(reduced?2:6);i++)dust.spawn(rim,new T.Vector3((Math.random()-.5)*.5,.35+Math.random()*.2,(Math.random()-.5)*.5),.09,1.3);lastProcessed=processed}
  // Partner keeps a real rhythm before/after the encounter; each downstroke lands with a small puff.
  const npcY=npcTool.group.position.y;if(npcY<lastNpcY)npcFalling=true;else if(npcFalling&&processed<6){npcFalling=false;npcPulse=1;onPartnerImpact();if(!reduced)dust.spawn(new T.Vector3(-.15,.44,-.75),new T.Vector3(0,.25,0),.06,.9)}else npcFalling=false;lastNpcY=npcY
  npcPulse=Math.max(0,npcPulse-dt*2.5)
  const playerTurn=near&&(phase==='READY'||phase==='HELD'||phase==='RAISED')&&processed<6
  cueMat.color.set(playerTurn?'#f2c46b':'#9fd7a8');cueMat.opacity=playerTurn?.45+(reduced?0:Math.sin(t*4)*.15):npcPulse*.45
  // Hearth: flicker, smoke; once the batch is done the pot steams more — the meal continues off-screen.
  fire.scale.set(1,reduced?1:.85+Math.sin(t*13)*.12+Math.sin(t*7.3)*.08,1)
  smokeClock+=dt;const every=processed>=6?.22:.45;if(smokeClock>every){smokeClock=0;smoke.spawn(new T.Vector3(5.55+(Math.random()-.5)*.1,.75,-1.05),new T.Vector3(.08+Math.random()*.05,.35+Math.random()*.15,(Math.random()-.5)*.05),processed>=6?.16:.12,reduced?2:3.4)}
  // Winnower: rhythmic toss; chaff drifts downwind (ambient, does not change rice state).
  const toss=reduced?0:Math.max(0,Math.sin(t*3.2));niaTray.position.copy(trayHome).add(new T.Vector3(0,toss*.09,0));niaTray.rotation.set(reduced?0:Math.sin(t*3.2)*.18,0,reduced?0:Math.cos(t*1.6)*.08)
  winnower.reach(new T.Vector3(trayHome.x,trayHome.y+toss*.09+.05,trayHome.z+.1));winnower.g.rotation.x=reduced?0:Math.sin(t*3.2)*.04
  chaffClock+=dt;if(!reduced&&chaffClock>.5&&toss>.9){chaffClock=0;for(let i=0;i<3;i++)chaff.spawn(niaTray.position.clone().add(new T.Vector3(0,.05,0)),new T.Vector3(.35+Math.random()*.2,.25+Math.random()*.2,(Math.random()-.5)*.2),.025,1.6,.3)}
  hens.update(t,dt,avatar.g.position)
  butterflies.forEach((b,i)=>{b.g.position.set(-1+Math.sin(t*.35+i*2)*3,1.1+Math.sin(t*.9+i)*.35,2+Math.cos(t*.27+i)*2.2);b.g.rotation.y=t*.35+i;const f=reduced?.3:Math.sin(t*18+i)*.9;b.wings[0].rotation.y=f;b.wings[1].rotation.y=-f})
  for(const fx of [smoke,dust,husks,chaff])fx.update(dt)
 }
 return{floor,avatar,npc,mortar,grain,playerGrip:playerTool.grip,npcGrip:npcTool.grip,before,after,update}
}
