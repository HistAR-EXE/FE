import * as T from 'three'
import type {Kit} from '../time-portal/tunnel3d/kit'
import {lambert,rng,noise2,skyDome,terrain,edge,soilTexture,tree,bamboo,banana,groundCover,hills,puffs,type Rand} from './worldEnvKit'
import {mergeStaticDescendants} from './worldBatching'
import type {Zone} from './worldModel'

// G3 representative upgrade for the non-S2 scenes of the World Continuity spine.
// S0 is a present-day *fictional* educational time station. L1-B / L1-D / L2-A / L3-A are a
// reconstruction-framed 1967 forest surface with an interpretive excavation cut ("lát cắt diễn giải"):
// the player walks on the surface and looks across a trench at an earth section in which the
// air path / layered tunnels are drawn. Dimensions, depths and layouts are NOT survey data.

export type ZoneCamera={position:[number,number,number];target:[number,number,number];min:number;max:number;polar:number}
export type ZoneEnv={heightAt:(x:number,z:number)=>number;floor:T.Mesh;targets:Record<string,T.Object3D>;endpoints:Map<string,T.Vector3>;pipes:T.Mesh[];links:T.Mesh[];camera:ZoneCamera;update:(t:number,dt:number,state:{reduced:boolean;working:boolean;active:string|null;hatch?:string;p2?:string;p2Era?:string|null;completed?:string[]})=>void}

const strata=['#8a6a45','#7a5a3a','#a07a4a','#6e4f33','#93704a']
function earthColour(y:number,n:number,out:T.Color){const band=Math.floor((-y+n*.25)*2.2);out.set(strata[((band%strata.length)+strata.length)%strata.length]);out.offsetHSL(0,0,n*.04)}

/** 1967 forest surface + interpretive excavation trench (shared by Q2/Q3 scenes). */
function excavationGround(scene:T.Scene,kit:Kit,depth:number,seed:number){
 const n=noise2(seed)
 // Walk ledge z>-2.6 (flat), trench to -3.7, section face at -3.7; the cut closes before the patch sides.
 const cut=(x:number,z:number)=>{const side=1-T.MathUtils.smoothstep(Math.abs(x),4.6,5.6),front=T.MathUtils.smoothstep(-z,2.62,2.8),back=1-T.MathUtils.smoothstep(-z,5.66,5.78);return side*Math.min(front,back)}
 const side=(x:number)=>1-T.MathUtils.smoothstep(Math.abs(x),4.6,5.6),bank=(x:number,z:number)=>-.9*side(x)*T.MathUtils.smoothstep(-z,1.7,2.62)*(1-T.MathUtils.smoothstep(-z,5.66,5.78))
 const height=(x:number,z:number)=>Math.min(bank(x,z),-depth*cut(x,z))+(z<-5.78?n(x*.6,z*.6)*.05:0)
 const patch=new T.PlaneGeometry(12,13,72,118);patch.rotateX(-Math.PI/2);patch.translate(0,0,-2.5)
 const p=patch.attributes.position,cols=new Float32Array(p.count*3),c=new T.Color()
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=height(x,z);p.setY(i,y);const k=n(x*1.7,z*1.7);if(y<-.05)earthColour(y,k,c);else{c.set(k>.15?'#6f7a45':'#7b6a46');c.offsetHSL(0,0,k*.05)}c.toArray(cols,i*3)}
 patch.setAttribute('color',new T.BufferAttribute(cols,3));patch.computeVertexNormals()
 const floor=new T.Mesh(kit.track(patch),kit.track(new T.MeshLambertMaterial({vertexColors:true,map:soilTexture(kit,seed,'#8d7a58',['#5f4b33','#a48a5f','#6b7843'],14)})));floor.receiveShadow=true;scene.add(floor)
 // Exact vertical section face at z=-5.6, stratified; the terrain cliff sits just behind it.
 const faceGeo=new T.PlaneGeometry(10.4,depth+.02,52,Math.max(8,Math.round(depth*10)));faceGeo.translate(0,-depth/2,0)
 const fp=faceGeo.attributes.position,fc=new Float32Array(fp.count*3);for(let i=0;i<fp.count;i++){const x=fp.getX(i),y=fp.getY(i);fp.setZ(i,n(x*2.1,y*2.1)*.03);earthColour(y,n(x*1.4,y*3.1),c);c.toArray(fc,i*3)}
 faceGeo.setAttribute('color',new T.BufferAttribute(fc,3));faceGeo.computeVertexNormals()
 const sectionFace=new T.Mesh(kit.track(faceGeo),kit.track(new T.MeshLambertMaterial({vertexColors:true})));sectionFace.position.set(0,.005,-5.6);sectionFace.userData.floor=false;scene.add(sectionFace)
 // Outer coarse terrain sinks under the detailed patch so the trench is never covered.
 const outer=terrain(kit,{size:70,segments:40,height:(x,z)=>{const inside=Math.abs(x)<5.7&&z<3.8&&z>-8.8;return inside?-depth-1:edge(x,z+2.5,6,6.5,14)*2.2+n(x*.15,z*.15)*.6},colour:(x,z,y,o)=>{o.set(y>.8?'#62723f':'#6f7b45');o.offsetHSL(0,0,n(x*.3,z*.3)*.05)}})
 scene.add(outer)
 return {floor,height}
}
function forestFrame(scene:T.Scene,kit:Kit,r:Rand,height:(x:number,z:number)=>number){
 const root=new T.Group();scene.add(root)
 for(let i=0;i<34;i++){const a=r()*6.28,d=8+r()*12,x=Math.cos(a)*d,z=Math.sin(a)*d-2;if(z>-9.5&&Math.abs(x)<7&&z<6)continue;root.add(tree(kit,r,[x,height(x,z),z],.8+r()*.6))}
 for(let i=0;i<5;i++){const x=(r()-.5)*10,z=-7.3-r()*2;root.add(bamboo(kit,r,[x,0,z],5).group)}
 for(const [x,z] of [[-5.4,3.4],[5.2,3.6],[-5.8,-1],[5.9,.4]] as const)root.add(banana(kit,r,[x,0,z],.9+r()*.3))
 scene.add(hills(kit,r,40,10,'#6e8160'))
 scene.add(groundCover(kit,r,260,14,(x,z)=>(Math.abs(x)<3.9&&z>-2.7&&z<2.9)||(z<-2.55&&z>-5.75&&Math.abs(x)<5.6),height))
 mergeStaticDescendants(root,kit,()=>true)
 return root
}
/** Arched tunnel cross-section drawn on the section face (z = faceZ), running along x. */
function tunnel(kit:Kit,from:number,to:number,y:number,faceZ:number,colour='#2b2016',h=.55){
 const g=new T.Group(),len=Math.abs(to-from),mid=(from+to)/2
 const shape=new T.Shape();shape.moveTo(-len/2,-h/2);shape.lineTo(len/2,-h/2);shape.lineTo(len/2,h*.15);shape.quadraticCurveTo(len/2,h/2,len/2-.3,h/2);shape.lineTo(-len/2+.3,h/2);shape.quadraticCurveTo(-len/2,h/2,-len/2,h*.15);shape.closePath()
 const body=new T.Mesh(kit.track(new T.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false})),kit.track(new T.MeshLambertMaterial({color:colour})));body.position.set(mid,y,faceZ+.05);g.add(body)
 const frame=new T.Mesh(kit.track(new T.ExtrudeGeometry(shape,{depth:.04,bevelEnabled:true,bevelThickness:.02,bevelSize:.07,bevelSegments:1})),lambert(kit,'#b48d5c'));frame.position.set(mid,y,faceZ+.02);g.add(frame)
 const rim=new T.Mesh(kit.track(new T.EdgesGeometry(new T.ShapeGeometry(shape))),kit.track(new T.LineBasicMaterial({color:'#e7cf9c'})));rim.position.set(mid,y,faceZ+.115);g.add(rim)
 return {group:g,body}
}
function lamp(kit:Kit,parent:T.Object3D,at:[number,number,number]){const m=new T.Mesh(kit.geo('lw-oil-lamp',()=>new T.SphereGeometry(.06,8,6)),kit.memo('lw-lamp-glow',()=>new T.MeshBasicMaterial({color:'#ffc977'})));m.position.set(...at);parent.add(m);return m}

function buildAir(scene:T.Scene,kit:Kit):ZoneEnv{
 const r=rng(1967201);skyDome(scene,kit,'#9fc0c9','#dfe3c8','#b9b48e');scene.fog=new T.Fog('#dfe3c8',20,62)
 const {floor,height}=excavationGround(scene,kit,2.6,4711);forestFrame(scene,kit,r,height)
 const face=-5.6,targets:Record<string,T.Object3D>={},endpoints=new Map<string,T.Vector3>()
 // Surface opening: a small vent hole among roots at the top edge of the section (reconstruction).
 const opening=new T.Group();opening.position.set(-2,0,face-.35);scene.add(opening)
 const hole=new T.Mesh(kit.geo('lw-vent-hole',()=>new T.CircleGeometry(.16,14)),lambert(kit,'#1e1610'));hole.rotation.x=-Math.PI/2;hole.position.y=.06;opening.add(hole)
 for(let i=0;i<6;i++){const root=new T.Mesh(kit.geo('lw-root',()=>new T.CylinderGeometry(.025,.05,.7,5)),lambert(kit,'#5a4430'));const a=i/6*6.28;root.position.set(Math.cos(a)*.3,.08,Math.sin(a)*.3);root.rotation.set(Math.PI/2.3,0,a);opening.add(root)}
 const mound=new T.Mesh(kit.geo('lw-vent-mound',()=>new T.SphereGeometry(.42,10,5,0,6.28,0,1.2)),lambert(kit,'#7a6142',{flatShading:true}));mound.scale.y=.35;opening.add(mound)
 const shaft=tunnel(kit,-2.08,-1.92,-.55,face,'#2b2016',1.1);scene.add(shaft.group)
 const passage=tunnel(kit,-2,1.4,-1.15,face);scene.add(passage.group)
 const chamber=tunnel(kit,1.2,2.9,-1.05,face,'#33261a',1);scene.add(chamber.group)
 const glow=lamp(kit,scene,[2.55,-1.3,face+.16])
 // Daily-life cue inside the chamber: mat, bowl and lamp (fiction/reconstruction, not an artefact claim).
 const life=new T.Group();life.position.set(2,-1.48,face+.18);scene.add(life)
 const mat=new T.Mesh(kit.geo('lw-mat',()=>new T.BoxGeometry(.9,.03,.08)),lambert(kit,'#b49a63'));life.add(mat)
 const bowl=new T.Mesh(kit.geo('lw-bowl',()=>new T.SphereGeometry(.09,10,6,0,6.28,1.57,1.57)),lambert(kit,'#cbb995'));bowl.position.set(-.2,.1,0);life.add(bowl)
 const jar=new T.Mesh(kit.geo('lw-small-jar',()=>new T.CylinderGeometry(.06,.09,.2,8)),lambert(kit,'#7a5b40'));jar.position.set(.25,.12,0);life.add(jar)
 const lifeProxy=new T.Mesh(kit.geo('lw-life-proxy',()=>new T.BoxGeometry(1,.4,.2)),kit.memo('lw-proxy-mat',()=>new T.MeshBasicMaterial()));lifeProxy.position.y=.12;lifeProxy.visible=false;life.add(lifeProxy)
 targets.AIR_SURFACE_OPENING=opening;targets.AIR_PASSAGE=passage.body;targets.AIR_INTERIOR=chamber.body;targets.LINK_AIR_LIFE=life
 endpoints.set('OPENING',new T.Vector3(-2,.15,face-.3));endpoints.set('PASSAGE',new T.Vector3(-.3,-1.15,face+.25));endpoints.set('INTERIOR',new T.Vector3(2.05,-1.05,face+.25))
 const air=puffs(kit,14,'#e9efe8',.25)
 scene.add(air.mesh)
 let acc=0
 return {heightAt:height,floor,targets,endpoints,pipes:[passage.body],links:[],camera:{position:[2.6,4.8,5.6],target:[0,-.8,-3.6],min:4,max:13,polar:1.2},update:(t,dt,s)=>{
  glow.scale.setScalar(s.reduced?1:1+Math.sin(t*7)*.08)
  acc+=dt;if(!s.reduced&&acc>.7){acc=0;air.spawn(new T.Vector3(-2+(Math.random()-.5)*.1,.1,face-.35),new T.Vector3(0,.25,0),.05,2.4)}air.update(dt)
 }}
}
function buildStructure(scene:T.Scene,kit:Kit,zone:Zone):ZoneEnv{
 const r=rng(1967300),focus=zone==='L1-D'?0:zone==='L2-A'?1:2
 skyDome(scene,kit,'#9fc0c9','#dfe3c8','#b9b48e');scene.fog=new T.Fog('#dfe3c8',20,62)
 const {floor,height}=excavationGround(scene,kit,3.2,9931);forestFrame(scene,kit,r,height)
 const face=-5.6,levels=[-.7,-1.5,-2.3],targets:Record<string,T.Object3D>={},endpoints=new Map<string,T.Vector3>(),links:T.Mesh[]=[]
 const glows:T.Mesh[]=[]
 levels.forEach((y,i)=>{const t=tunnel(kit,-3.2+i*.4,3-i*.3,y,face,i===focus?'#3a2a1b':'#2a1f15',.62);scene.add(t.group);targets[`STRUCT_LAYER_${i+1}`]=t.body;endpoints.set(`STRUCT_LAYER_${i+1}`,new T.Vector3(0,y,face+.3))
  for(let k=0;k<3;k++)glows.push(lamp(kit,scene,[-2+k*1.8+i*.3,y-.12,face+.16]))})
 const shaft=(x:number,top:number,bottom:number,id:string)=>{const s=tunnel(kit,x-.12,x+.12,(top+bottom)/2,face,'#2a1f15',Math.abs(top-bottom)+.2);s.body.material=kit.track(new T.MeshLambertMaterial({color:'#e1c991'}));s.group.position.z+=.05;scene.add(s.group);targets[id]=s.body;links.push(s.body)}
 shaft(1.35,levels[0],levels[1],'STRUCT_LINK_12');shaft(-1.35,levels[1],levels[2],'STRUCT_LINK_23')
 // The focused layer is the "viewpoint" of this scene; camera centres on it (knowledge link, not a walkway).
 const camY=levels[focus]
 return {heightAt:height,floor,targets,endpoints,pipes:[],links,camera:{position:[2.6,4.6-camY*.5,5.6],target:[0,camY*.8,-3.8],min:4,max:13,polar:1.2},update:(t,_dt,s)=>{const k=s.reduced?1:1+Math.sin(t*6)*.07;for(const g of glows)g.scale.setScalar(k)}}
}
function buildStation(scene:T.Scene,kit:Kit):ZoneEnv{
 const r=rng(2026110);skyDome(scene,kit,'#e9b98a','#f4dcc0','#c9b394');scene.fog=new T.Fog('#f1d9bd',22,64)
 const n=noise2(77)
 const floor=terrain(kit,{size:60,segments:56,height:(x,z)=>edge(x,z,4.6,3.6,9)*1.6+n(x*.2,z*.2)*.4*edge(x,z,6,5,6),colour:(x,z,y,o)=>{o.set(Math.hypot(x,z+.4)<4.3?'#b9ab8f':y>.5?'#6e7f4a':'#86915a');o.offsetHSL(0,0,n(x,z)*.04)},map:soilTexture(kit,31,'#bcae92',['#a69878','#cfc2a6','#8f8468'],18)})
 scene.add(floor)
 const root=new T.Group();scene.add(root)
 // Inlaid compass/time rings on the platform (fictional station design).
 for(const [rad,col] of [[4.1,'#8b7a58'],[3.2,'#a08a5e'],[1.7,'#9b8a66']] as const){const ring=new T.Mesh(kit.geo('lw-inlay-'+rad,()=>new T.RingGeometry(rad-.06,rad,64)),lambert(kit,col));ring.rotation.x=-Math.PI/2;ring.position.set(0,.012,-.4);root.add(ring)}
 for(let i=0;i<12;i++){const a=i/12*6.28,tick=new T.Mesh(kit.geo('lw-tick',()=>new T.BoxGeometry(.06,.01,.35)),lambert(kit,'#7d6c4d'));tick.position.set(Math.cos(a)*3.65,.015,Math.sin(a)*3.65-.4);tick.rotation.y=-a;root.add(tick)}
 // Open pavilion: timber columns and a ring beam framing the sky, lanterns for evening light.
 for(let i=0;i<8;i++){const a=i/8*6.28+.2,x=Math.cos(a)*4.9,z=Math.sin(a)*4.3-.4;if(z>2.2)continue;const col=new T.Mesh(kit.geo('lw-column',()=>new T.CylinderGeometry(.14,.17,3.4,8)),lambert(kit,'#6d4e33'));col.position.set(x,1.7,z);col.castShadow=true;root.add(col);const cap=new T.Mesh(kit.geo('lw-capital',()=>new T.BoxGeometry(.42,.14,.42)),lambert(kit,'#5a3f2a'));cap.position.set(x,3.45,z);root.add(cap)}
 const beam=new T.Mesh(kit.geo('lw-beam-ring',()=>new T.TorusGeometry(4.6,.11,6,48,Math.PI*1.2)),lambert(kit,'#5a3f2a'));beam.rotation.x=Math.PI/2;beam.rotation.z=Math.PI*.9;beam.scale.set(1.06,.94,1);beam.position.set(0,3.55,-.4);root.add(beam)
 for(let i=0;i<14;i++){const x=(r()-.5)*24,z=-8-r()*10;root.add(tree(kit,r,[x,1.4,z],.9+r()*.6,['#5d7a45','#6b8a4f','#4f6b3f']))}
 for(const [x,z] of [[-6,1],[6.3,.5],[-5.4,-4.5],[5.6,-4.8]] as const)root.add(bamboo(kit,r,[x,.3,z],6).group)
 for(const [x,z] of [[-6.6,-2.2],[6.8,-2.6]] as const)root.add(banana(kit,r,[x,.3,z],1))
 const console1=new T.Mesh(kit.geo('lw-console',()=>new T.CylinderGeometry(.3,.38,.95,6)),lambert(kit,'#6d5a40',{flatShading:true}));console1.position.set(1.6,.47,-.6);root.add(console1)
 mergeStaticDescendants(root,kit,()=>true)
 scene.add(hills(kit,r,38,9,'#8a9372'))
 // The time machine: an upright ring gate with an animated veil (fictional device; Kha/Chrono are educational characters).
 const machine=new T.Group();machine.position.set(0,0,-1.05);scene.add(machine)
 const plinth=new T.Mesh(kit.geo('lw-plinth',()=>new T.CylinderGeometry(1.25,1.4,.3,10)),lambert(kit,'#7c6a4b',{flatShading:true}));plinth.position.y=.15;machine.add(plinth)
 const ring=new T.Mesh(kit.geo('lw-machine-ring',()=>new T.TorusGeometry(1.05,.12,10,48)),lambert(kit,'#a88d55'));ring.position.y=1.38;machine.add(ring)
 for(let i=0;i<8;i++){const a=i/8*6.28,stud=new T.Mesh(kit.geo('lw-stud',()=>new T.BoxGeometry(.12,.22,.18)),lambert(kit,'#6b5a3a'));stud.position.set(Math.cos(a)*1.05,1.38+Math.sin(a)*1.05,0);stud.rotation.z=a;machine.add(stud)}
 const veilMat=kit.track(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},power:{value:.35}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float time;uniform float power;varying vec2 vUv;void main(){vec2 p=vUv-.5;float r=length(p)*2.0;float a=atan(p.y,p.x);float s=.5+.5*sin(a*5.0+r*14.0-time*2.2);vec3 c=mix(vec3(.55,.85,.75),vec3(.98,.86,.55),s*r);float alpha=smoothstep(1.0,.75,r)*(.25+power*.6)*(.55+.45*s);gl_FragColor=vec4(c,alpha);}'}))
 const veil=new T.Mesh(kit.geo('lw-machine-veil',()=>new T.CircleGeometry(.95,48)),veilMat);veil.position.y=1.38;machine.add(veil)
  const lanterns:T.Mesh[]=[];for(const [x,z] of [[-3.2,-2.6],[3.2,-2.6],[-3.9,.9],[3.9,.9]] as const)lanterns.push(lamp(kit,scene,[x,2.6,z]))
 return {heightAt:()=>0,floor,targets:{MACHINE:machine},endpoints:new Map(),pipes:[],links:[],camera:{position:[5.4,4.6,8],target:[0,1,-.6],min:5,max:14,polar:1.25},update:(t,dt,s)=>{
  veilMat.uniforms.time.value=s.reduced?0:t;const p=s.active==='MACHINE'||s.working?1:.35;veilMat.uniforms.power.value+=(p-veilMat.uniforms.power.value)*Math.min(1,dt*3)
  if(!s.reduced)ring.rotation.z=t*.12
  for(const l of lanterns)l.scale.setScalar(s.reduced?1:1+Math.sin(t*3+l.position.x)*.06)
 }}
}
export function buildZone(zone:Exclude<Zone,'S2'>,scene:T.Scene,kit:Kit):ZoneEnv{
 return zone==='S0'?buildStation(scene,kit):zone==='L1-B'?buildAir(scene,kit):buildStructure(scene,kit,zone)
}
