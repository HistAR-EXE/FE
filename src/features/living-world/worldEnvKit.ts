import * as T from 'three'
import {Kit,mulberry32} from '../time-portal/tunnel3d/kit'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'

// Shared, original procedural building blocks for Living World environments (G3 / M1 representative).
// No downloaded meshes, textures, motions or likenesses. Everything is generated from seeded code so
// that scenes are reproducible and byte-cheap (WEQ08). Static pieces are expected to be merged by
// worldBatching after construction; animated pieces return an update(t,dt) function.

export type Rand=()=>number
export const rng=(seed:number)=>mulberry32(seed)
export const lambert=(kit:Kit,color:string,extra:Partial<T.MeshLambertMaterialParameters>={})=>kit.memo('lw-lambert:'+color+JSON.stringify(extra),()=>new T.MeshLambertMaterial({color,...extra}))

/** Smooth value noise in [-1,1]; deterministic per seed. */
export function noise2(seed:number){
 const r=rng(seed),table=new Float32Array(256*256);for(let i=0;i<table.length;i++)table[i]=r()*2-1
 const at=(x:number,z:number)=>table[((z&255)<<8)|(x&255)]
 const smooth=(t:number)=>t*t*(3-2*t)
 return (x:number,z:number)=>{const xi=Math.floor(x),zi=Math.floor(z),fx=smooth(x-xi),fz=smooth(z-zi);const a=at(xi,zi),b=at(xi+1,zi),c=at(xi,zi+1),d=at(xi+1,zi+1);return a+(b-a)*fx+(c-a)*fz+(a-b-c+d)*fx*fz}
}

/** Gradient sky dome; the horizon colour should match the scene fog. */
export function skyDome(scene:T.Scene,kit:Kit,top:string,horizon:string,bottom=horizon,radius=90){
 const material=kit.track(new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new T.Color(top)},horizon:{value:new T.Color(horizon)},bottom:{value:new T.Color(bottom)}},
  vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform vec3 top;uniform vec3 horizon;uniform vec3 bottom;varying vec3 vP;void main(){float h=vP.y;vec3 c=h>0.0?mix(horizon,top,pow(clamp(h,0.0,1.0),0.55)):mix(horizon,bottom,clamp(-h*3.0,0.0,1.0));gl_FragColor=vec4(c,1.0);}'}))
 const dome=new T.Mesh(kit.geo('lw-sky',()=>new T.SphereGeometry(radius,24,12)),material);dome.renderOrder=-1;dome.frustumCulled=false;scene.add(dome)
 scene.background=null;scene.fog=new T.Fog(horizon,18,60);return dome
}

export type TerrainOptions={size:number;segments:number;height:(x:number,z:number)=>number;colour:(x:number,z:number,y:number,out:T.Color)=>void;map?:T.Texture}
/** Height-field ground with per-vertex colour. Walkable areas should return height≈0. */
export function terrain(kit:Kit,o:TerrainOptions){
 const g=new T.PlaneGeometry(o.size,o.size,o.segments,o.segments);g.rotateX(-Math.PI/2)
 const p=g.attributes.position,colours=new Float32Array(p.count*3),c=new T.Color()
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=o.height(x,z);p.setY(i,y);o.colour(x,z,y,c);c.toArray(colours,i*3)}
 g.setAttribute('color',new T.BufferAttribute(colours,3));g.computeVertexNormals()
 const m=new T.Mesh(kit.track(g),kit.track(new T.MeshLambertMaterial({vertexColors:true,map:o.map??null})));m.receiveShadow=true;return m
}
/** 0 inside the walkable rectangle, rising smoothly to 1 at `margin` outside it. */
export const edge=(x:number,z:number,hx:number,hz:number,margin:number)=>{const dx=Math.max(0,Math.abs(x)-hx),dz=Math.max(0,Math.abs(z)-hz),d=Math.hypot(dx,dz)/margin;return Math.min(1,d*d*(3-2*Math.min(1,d)))}

/** Fine soil/leaf-litter detail texture, generated on a canvas. */
export function soilTexture(kit:Kit,seed:number,base:string,specks:string[],repeat=10){
 return kit.memo('lw-soil:'+seed+base,()=>{const r=rng(seed),cv=document.createElement('canvas');cv.width=cv.height=256;const ctx=cv.getContext('2d')!;ctx.fillStyle=base;ctx.fillRect(0,0,256,256)
  for(let i=0;i<5200;i++){ctx.globalAlpha=.18+r()*.2;ctx.fillStyle=specks[i%specks.length];const s=r()*3+.6;ctx.fillRect(r()*256,r()*256,s,s*(r()<.3?2.5:1))}
  const t=new T.CanvasTexture(cv);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=T.SRGBColorSpace;return t})
}

/** Broadleaf tree: tapered trunk, a few branches and clustered low-poly crowns. */
export function tree(kit:Kit,r:Rand,at:[number,number,number],scale=1,leaf=['#4f6b3f','#5d7a45','#46613a']){
 const g=new T.Group();g.position.set(...at);g.scale.setScalar(scale);g.rotation.y=r()*6.28
 const trunkH=2.6+r()*1.6,trunk=new T.Mesh(kit.geo('lw-trunk',()=>new T.CylinderGeometry(.12,.22,1,7)),lambert(kit,'#5e4733'));trunk.scale.y=trunkH;trunk.position.y=trunkH/2;g.add(trunk)
 for(let b=0;b<2;b++){const br=new T.Mesh(kit.geo('lw-branch',()=>new T.CylinderGeometry(.05,.08,1,5)),lambert(kit,'#5e4733'));br.scale.y=1.2;br.position.set((b?.35:-.35),trunkH*.75,0);br.rotation.z=b?-.7:.7;g.add(br)}
 const crown=kit.geo('lw-crown',()=>new T.IcosahedronGeometry(1,0))
 for(let i=0;i<5;i++){const m=new T.Mesh(crown,lambert(kit,leaf[i%leaf.length],{flatShading:true}));const a=i/5*6.28;m.position.set(Math.cos(a)*(.5+r()*.5),trunkH+.3+r()*.9,Math.sin(a)*(.5+r()*.5));m.scale.set(.9+r()*.6,.7+r()*.4,.9+r()*.6);m.castShadow=true;g.add(m)}
 const top=new T.Mesh(crown,lambert(kit,leaf[1],{flatShading:true}));top.position.y=trunkH+1.2;top.scale.setScalar(1.1);top.castShadow=true;g.add(top)
 return g
}
/** Clump of segmented bamboo culms with drooping leaf sprays; returns sway-able tops. */
export function bamboo(kit:Kit,r:Rand,at:[number,number,number],count=7){
 const g=new T.Group();g.position.set(...at);const tops:T.Object3D[]=[]
 for(let i=0;i<count;i++){const h=3.4+r()*2.4,x=(r()-.5)*1.2,z=(r()-.5)*1.2,lean=(r()-.5)*.25
  const culm=new T.Group();culm.position.set(x,0,z);culm.rotation.z=lean;g.add(culm)
  const stem=new T.Mesh(kit.geo('lw-culm',()=>new T.CylinderGeometry(.045,.06,1,6)),lambert(kit,'#7f8b52'));stem.scale.y=h;stem.position.y=h/2;culm.add(stem)
  for(let n=1;n<5;n++){const node=new T.Mesh(kit.geo('lw-node',()=>new T.CylinderGeometry(.062,.062,.035,6,1,true)),lambert(kit,'#a5a76a'));node.position.y=n*h/6;culm.add(node)}
  const spray=new T.Group();spray.position.y=h;culm.add(spray);tops.push(spray)
  for(let l=0;l<6;l++){const leaf=new T.Mesh(kit.geo('lw-bamboo-leaf',()=>new T.SphereGeometry(1,6,3)),lambert(kit,l%2?'#6f8f4c':'#5f7f44'));leaf.scale.set(.06,.02,.42);leaf.position.set(Math.cos(l)*.25,-.1-l*.08,Math.sin(l)*.25);leaf.rotation.set(.6,l,0);spray.add(leaf)}
 }
 return {group:g,tops}
}
/** Banana plant: pseudo-stem and broad arched leaves (foreground framing, not a survey claim). */
export function banana(kit:Kit,r:Rand,at:[number,number,number],scale=1){
 const g=new T.Group();g.position.set(...at);g.scale.setScalar(scale);g.rotation.y=r()*6.28
 const stem=new T.Mesh(kit.geo('lw-banana-stem',()=>new T.CylinderGeometry(.12,.17,1.6,7)),lambert(kit,'#7d8a4e'));stem.position.y=.8;g.add(stem)
 for(let i=0;i<6;i++){const leaf=new T.Mesh(kit.geo('lw-banana-leaf',()=>{const s=new T.SphereGeometry(1,8,4);s.scale(.32,.03,1.1);s.translate(0,0,1.05);return s}),lambert(kit,i%2?'#5f8a43':'#6d9a4b'));leaf.position.y=1.55;leaf.rotation.set(-.55-r()*.4,i/6*6.28,0);g.add(leaf)}
 return g
}
/** Instanced ground cover (grass/fern tufts) avoiding a predicate region. */
export function groundCover(kit:Kit,r:Rand,count:number,radius:number,avoid:(x:number,z:number)=>boolean,height:(x:number,z:number)=>number,colours=['#6f8a4a','#82995a','#5d7a42']){
 const geo=kit.geo('lw-tuft',()=>{const blades=[0,1,2,3,4].map(i=>{const c=new T.ConeGeometry(.025,.32+(i%2)*.1,3,1,true);c.translate(0,.16,0);c.rotateZ((i-2)*.22);c.rotateY(i*1.3);c.translate(Math.cos(i*1.3)*.04,0,Math.sin(i*1.3)*.04);return c.toNonIndexed()});const m=mergeGeometries(blades)!;blades.forEach(b=>b.dispose());return m})
 const mesh=new T.InstancedMesh(geo,kit.memo('lw-tuft-mat',()=>new T.MeshLambertMaterial()),count),m=new T.Matrix4(),q=new T.Quaternion(),c=new T.Color();let n=0
 for(let i=0;i<count*4&&n<count;i++){const a=r()*6.28,d=Math.sqrt(r())*radius,x=Math.cos(a)*d,z=Math.sin(a)*d;if(avoid(x,z))continue
  q.setFromEuler(new T.Euler((r()-.5)*.4,r()*6.28,(r()-.5)*.4));const s=.6+r()*.9;m.compose(new T.Vector3(x,height(x,z)-.02,z),q,new T.Vector3(s,s*(0.8+r()*.8),s));mesh.setMatrixAt(n,m);mesh.setColorAt(n,c.set(colours[n%colours.length]));n++}
 mesh.count=n;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;return mesh
}
/** Distant low hills for background depth (fogged). */
export function hills(kit:Kit,r:Rand,radius:number,count:number,colour='#7b8f68'){
 const g=new T.Group()
 for(let i=0;i<count;i++){const a=i/count*6.28+r()*.3,m=new T.Mesh(kit.geo('lw-hill',()=>new T.SphereGeometry(1,10,6,0,6.283,0,1.57)),lambert(kit,colour,{flatShading:true}));m.position.set(Math.cos(a)*radius,-.5,Math.sin(a)*radius);m.scale.set(9+r()*8,2.5+r()*3.5,7+r()*5);g.add(m)}
 return g
}

/** Pooled soft puffs (smoke/steam/dust). spawn() reuses the oldest puff. */
export function puffs(kit:Kit,count:number,colour:string,opacity:number){
 const mat=kit.track(new T.MeshLambertMaterial({color:colour,transparent:true,opacity,depthWrite:false})),geo=kit.geo('lw-puff',()=>new T.IcosahedronGeometry(1,0))
 const mesh=new T.InstancedMesh(geo,mat,count);mesh.frustumCulled=false
 const state=Array.from({length:count},()=>({age:9,life:1,p:new T.Vector3(),v:new T.Vector3(),s:.1,g:0}));let next=0;const m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3()
 const spawn=(at:T.Vector3,velocity:T.Vector3,size:number,life:number,gravity=0)=>{const p=state[next];next=(next+1)%count;p.age=0;p.life=life;p.p.copy(at);p.v.copy(velocity);p.s=size;p.g=gravity}
 const update=(dt:number)=>{state.forEach((p,i)=>{p.age+=dt;const alive=p.age<p.life;if(alive){p.v.y-=p.g*dt;p.p.addScaledVector(p.v,dt)}const k=alive?p.s*(0.6+p.age/p.life):0;m.compose(p.p,q,s.set(k,k,k));mesh.setMatrixAt(i,m)});mesh.instanceMatrix.needsUpdate=true}
 update(0);return {mesh,spawn,update}
}

/** Small free-ranging chickens that peck and wander inside an area; never interactable quest objects. */
export function chickens(kit:Kit,r:Rand,parent:T.Object3D,count:number,area:{x:[number,number];z:[number,number]},blocked:(x:number,z:number)=>boolean){
 const birds=Array.from({length:count},(_,i)=>{const g=new T.Group();parent.add(g)
  const body=new T.Mesh(kit.geo('lw-hen-body',()=>new T.SphereGeometry(1,8,6)),lambert(kit,i%2?'#a8794a':'#e8dcc2'));body.scale.set(.16,.14,.22);body.position.y=.2;g.add(body)
  const head=new T.Group();head.position.set(0,.33,.17);g.add(head)
  const skull=new T.Mesh(kit.geo('lw-hen-head',()=>new T.SphereGeometry(1,6,5)),lambert(kit,i%2?'#a8794a':'#e8dcc2'));skull.scale.setScalar(.075);head.add(skull)
  const comb=new T.Mesh(kit.geo('lw-hen-comb',()=>new T.BoxGeometry(.02,.05,.07)),lambert(kit,'#b8402c'));comb.position.y=.07;head.add(comb)
  const beak=new T.Mesh(kit.geo('lw-hen-beak',()=>new T.ConeGeometry(.02,.06,4)),lambert(kit,'#d39a3a'));beak.rotation.x=Math.PI/2;beak.position.z=.08;head.add(beak)
  const tail=new T.Mesh(kit.geo('lw-hen-tail',()=>new T.ConeGeometry(.08,.2,4)),lambert(kit,i%2?'#6a4a2c':'#cfc2a6'));tail.position.set(0,.3,-.2);tail.rotation.x=-.9;g.add(tail)
  const pick=()=>{for(let k=0;k<20;k++){const x=area.x[0]+r()*(area.x[1]-area.x[0]),z=area.z[0]+r()*(area.z[1]-area.z[0]);if(!blocked(x,z))return new T.Vector3(x,0,z)}return g.position.clone()}
  g.position.copy(pick());return {g,head,goal:pick(),wait:r()*3,peck:0,pick}
 })
 const update=(t:number,dt:number,avoid:T.Vector3)=>{for(const b of birds){
  const away=b.g.position.distanceTo(avoid)<1.1
  if(away){b.goal=b.g.position.clone().add(b.g.position.clone().sub(avoid).setY(0).normalize().multiplyScalar(1.6));if(blocked(b.goal.x,b.goal.z))b.goal=b.pick();b.wait=0}
  if(b.wait>0){b.wait-=dt;b.head.rotation.x=Math.max(0,Math.sin(t*9+b.peck))*.9;continue}
  const d=b.goal.clone().sub(b.g.position).setY(0),len=d.length()
  if(len<.08){b.wait=1+Math.random()*3;b.peck=Math.random()*6;b.goal=b.pick();continue}
  const step=Math.min(len,dt*(away?1.6:.55));b.g.position.addScaledVector(d.normalize(),step);b.g.rotation.y=Math.atan2(d.x,d.z);b.g.position.y=Math.abs(Math.sin(t*14))*.03;b.head.rotation.x=0
 }}
 return {update}
}

/** In-world wayfinding markers for route types (THEMATIC / TEMPORAL / KNOWLEDGE); not physical tunnels. */
export function routeMarker(kit:Kit,rawType:'THEMATIC_SCENE'|'TEMPORAL_PORTAL'|'KNOWLEDGE_LINK'|'FAST_RETURN'){
 const type=rawType==='FAST_RETURN'?'TEMPORAL_PORTAL':rawType // debug marker shape only
 const g=new T.Group(),glow:T.Mesh[]=[]
 if(type==='TEMPORAL_PORTAL'){
  const ring=new T.Mesh(kit.geo('lw-gate-ring',()=>new T.TorusGeometry(.75,.07,8,32)),lambert(kit,'#9a8a62'));ring.position.y=.95;g.add(ring)
  const veil=new T.Mesh(kit.geo('lw-gate-veil',()=>new T.CircleGeometry(.7,32)),kit.track(new T.MeshBasicMaterial({color:'#bfe9d6',transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false})));veil.position.y=.95;g.add(veil);glow.push(veil)
  for(const x of [-.75,.75]){const foot=new T.Mesh(kit.geo('lw-gate-foot',()=>new T.CylinderGeometry(.09,.13,.3,6)),lambert(kit,'#6b5a3f'));foot.position.set(x,.15,0);g.add(foot)}
 }else if(type==='KNOWLEDGE_LINK'){
  const stone=new T.Mesh(kit.geo('lw-stele',()=>new T.CylinderGeometry(.22,.3,1.1,6)),lambert(kit,'#8c8371',{flatShading:true}));stone.position.y=.55;g.add(stone)
  const glyph=new T.Mesh(kit.geo('lw-glyph',()=>new T.TorusGeometry(.12,.025,6,16)),kit.track(new T.MeshBasicMaterial({color:'#e9d48f'})));glyph.position.set(0,.8,.2);g.add(glyph);glow.push(glyph)
 }else{
  const post=new T.Mesh(kit.geo('lw-post',()=>new T.CylinderGeometry(.06,.08,1.5,6)),lambert(kit,'#6e5539'));post.position.y=.75;g.add(post)
  const arrow=new T.Mesh(kit.geo('lw-arrow',()=>{const s=new T.Shape();s.moveTo(-.4,-.1);s.lineTo(.25,-.1);s.lineTo(.25,-.18);s.lineTo(.45,0);s.lineTo(.25,.18);s.lineTo(.25,.1);s.lineTo(-.4,.1);return new T.ExtrudeGeometry(s,{depth:.05,bevelEnabled:false})}),lambert(kit,'#a5875a'));arrow.position.set(0,1.25,.04);g.add(arrow)
  const lamp=new T.Mesh(kit.geo('lw-lamp',()=>new T.SphereGeometry(.07,8,6)),kit.track(new T.MeshBasicMaterial({color:'#ffd58a'})));lamp.position.set(-.1,1.05,.1);g.add(lamp);glow.push(lamp)
 }
 // Invisible pick proxy: thin posts/rings stay easy to tap (raycasts ignore visibility, rendering does not).
 const proxy=new T.Mesh(kit.geo('lw-marker-proxy',()=>new T.BoxGeometry(1,1.7,.6)),kit.memo('lw-proxy-mat',()=>new T.MeshBasicMaterial()));proxy.position.y=.85;proxy.visible=false;g.add(proxy)
 const update=(t:number,reduced:boolean)=>{for(const m of glow){const k=reduced?.8:.65+Math.sin(t*2.4)*.25;if(m.material instanceof T.MeshBasicMaterial&&m.material.transparent)m.material.opacity=.22+k*.2;m.scale.setScalar(type==='TEMPORAL_PORTAL'?1:0.9+k*.15)}}
 return {group:g,update}
}
