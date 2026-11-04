import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import {plantTrees,plantBushes} from './r2Flora'
import {pbr,ensureUv1,place,scatter,canvasTexture,leafCard,cardClump,preload,skyEnvironment} from './r2Assets'
import {createRigActor,R2_CHAR_FILES,type RigActor} from './r2Actors'
import type {S2R2} from '../s2Environment'
import type {ZoneEnv} from '../zoneEnvironments'

// S2 · Củ Chi 01/1967 surface — R2 village integrated around the unchanged A04 clearing (|x|<6.5, |z|<5.5, y=0).
// RECONSTRUCTED layout proposal (not a sourced site plan). Houses/sheds are code-built geometry with CC0 PBR
// textures; vegetation and props are Poly Haven CC0 models. LOOKDEV CANDIDATE — not final art.
const MATERIALS=['brown_mud_leaves_01','red_laterite_soil_stones','red_dirt_mud_01','thatch_roof_angled','bark_brown_01','rough_wood','bamboo_wall','bamboo_wall_02','clay_plaster','raw_plank_wall','palm_bark']
const MODELS=['tree_stump_01','wicker_basket_01','wicker_basket_02','wooden_bucket_01','wooden_stool_01','wooden_broom','ceramic_pot','pot_enamel_01','wooden_bowl_01']
const FOREST_MATERIALS=['brown_mud_leaves_01','red_laterite_soil_stones','red_dirt_mud_01','palm_bark','raw_plank_wall','bark_brown_01']
export const prepareForest=()=>preload({materials:FOREST_MATERIALS,models:['tree_stump_01'],chars:R2_CHAR_FILES})
export const prepareVillage=()=>preload({materials:MATERIALS,models:MODELS,chars:R2_CHAR_FILES})

let s=99;const R=()=>((s=(s*1664525+1013904223)>>>0)/4294967296)
const n2=(x:number,z:number)=>Math.sin(x*1.7+Math.sin(z*1.3))*Math.cos(z*1.1+Math.sin(x*.7))
const fbm=(x:number,z:number)=>n2(x,z)*.5+n2(x*2.03+5,z*2.03-3)*.25+n2(x*4.1-7,z*4.1+2)*.125
const clearing=(x:number,z:number)=>1-T.MathUtils.smoothstep(Math.max(Math.abs(x)/8,Math.abs(z)/7),.85,1.25)
export const villageHeight=(x:number,z:number)=>(1-clearing(x,z))*(fbm(x*.05,z*.05)*1.6+.5+Math.max(0,-z-12)*.06)+clearing(x,z)*0-.02
const pathX=(z:number)=>Math.sin(z*.09)*1.6

export function buildVillage(scene:T.Scene,kit:Kit,renderer:T.WebGLRenderer,variant:'S1'|'S2'='S2'){
 const village=variant==='S2'
 // Six triangles per vegetation clump instead of 9,890 per grass instance / 6,232 per fern.
 const cover=(parent:T.Object3D,items:{p:[number,number,number];r?:number;s?:number}[],size:number,color:string)=>{
  const g=kit.track(cardClump(size));g.translate(0,size/2,0)
  const m=kit.track(new T.MeshStandardMaterial({map:leafCard('bamboo',.22,91),color,alphaTest:.45,side:T.DoubleSide,roughness:.9}))
  const im=new T.InstancedMesh(g,m,items.length),matrix=new T.Matrix4()
  items.forEach((v,i)=>{matrix.compose(new T.Vector3(...v.p),new T.Quaternion().setFromEuler(new T.Euler(0,v.r??0,0)),new T.Vector3().setScalar(v.s??1));im.setMatrixAt(i,matrix)})
  im.receiveShadow=true;im.computeBoundingSphere();parent.add(im)
 }
 s=99;const H=villageHeight,root=new T.Group();root.name='S2_R2_VILLAGE_LOOKDEV_CANDIDATE';scene.add(root)
 const sunDir=new T.Vector3(30,26,18).normalize(),{rt,sky}=skyEnvironment(renderer,scene,sunDir);kit.track(rt);kit.track(sky.material);kit.track(sky.geometry)
 scene.environment=rt.texture;scene.environmentIntensity=.6;scene.fog=new T.FogExp2('#c4cdc8',.012)
 const sun=new T.DirectionalLight('#ffe2bd',3);sun.position.copy(sunDir).multiplyScalar(40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:110});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04
 scene.add(sun,new T.HemisphereLight('#cfe0ff','#5a3f2a',.45))

 // ---- terrain: three CC0 layers blended per vertex (forest floor / laterite yard / red-earth path) ----
 const geo=new T.PlaneGeometry(150,150,80,80);geo.rotateX(-Math.PI/2)
 const pos=geo.attributes.position,splat=new Float32Array(pos.count*3)
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setY(i,H(x,z));const y=clearing(x,z),p=z>-30&&z<40?Math.max(0,1-Math.abs(x-pathX(z))/1.2)*(z>4?1:0):0,n=fbm(x*.15,z*.15)*.6,soil=Math.min(1,y*.95+p*.8+Math.max(0,n)*.3);const w=[Math.max(0,1-soil)+.02,soil*(.65+n*.3),soil*(.35-n*.3)+p*.4],sum=w[0]+w[1]+w[2]||1;splat.set([w[0]/sum,w[1]/sum,w[2]/sum],i*3)}
 geo.setAttribute('splat',new T.BufferAttribute(splat,3));geo.computeVertexNormals();ensureUv1(geo)
 const L=['brown_mud_leaves_01','red_laterite_soil_stones','red_dirt_mud_01'].map(id=>pbr(kit,id,{repeat:[45,45]}))
 const mat=L[0];mat.metalnessMap=null
 // Q1: the terrain can open a real hole over the hatch shaft (x, z, half-width, half-depth); z/w = 0 keeps it closed.
 const hole={value:new T.Vector4(0,0,0,0)}
 mat.customProgramCacheKey=()=>'r2-terrain-hole'
 mat.onBeforeCompile=sh=>{
  sh.uniforms.uHole=hole
  sh.uniforms.d1={value:L[1].map};sh.uniforms.d2={value:L[2].map};sh.uniforms.n1={value:L[1].normalMap};sh.uniforms.n2={value:L[2].normalMap};sh.uniforms.a1={value:L[1].roughnessMap};sh.uniforms.a2={value:L[2].roughnessMap}
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 splat; varying vec3 vSplat; varying vec2 vUvS; varying vec2 vWXZ;').replace('#include <uv_vertex>','#include <uv_vertex>\nvSplat = splat; vUvS = uv * 45.0; vWXZ = (modelMatrix * vec4(position,1.0)).xz;')
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D d1, d2, n1, n2, a1, a2; uniform vec4 uHole; varying vec3 vSplat; varying vec2 vUvS; varying vec2 vWXZ;').replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (uHole.z > 0.0 && abs(vWXZ.x - uHole.x) < uHole.z && abs(vWXZ.y - uHole.y) < uHole.w) discard;')
   .replace('#include <map_fragment>','vec3 w = vSplat; vec4 c0 = texture2D(map, vUvS), c1 = texture2D(d1, vUvS * 1.37), c2 = texture2D(d2, vUvS * 0.83); diffuseColor *= c0 * w.x + c1 * w.y + c2 * w.z;')
   .replace('#include <roughnessmap_fragment>','float roughnessFactor = roughness * (texture2D(roughnessMap, vUvS).g * w.x + texture2D(a1, vUvS * 1.37).g * w.y + texture2D(a2, vUvS * 0.83).g * w.z);')
   .replace('#include <normal_fragment_maps>','vec3 mapN = (texture2D(normalMap, vUvS).xyz * w.x + texture2D(n1, vUvS * 1.37).xyz * w.y + texture2D(n2, vUvS * 0.83).xyz * w.z) * 2.0 - 1.0; mapN.xy *= normalScale; normal = normalize( tbn * mapN );')
 }
 const floor=new T.Mesh(kit.track(geo),mat);floor.receiveShadow=true;scene.add(floor);floor.userData.hole=hole

 if(village){ // ---- paddy field to the east (S3 adjacency, outside the play space) ----
 const water=new T.Mesh(kit.track(new T.PlaneGeometry(40,60)),kit.track(new T.MeshStandardMaterial({color:'#4a4636',roughness:.08})));water.rotation.x=-Math.PI/2;water.position.set(36,.15,-4);root.add(water)
 const dike=pbr(kit,'red_dirt_mud_01',{repeat:[12,1]});for(const z of [-26,-12,2,16]){const d=new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(40,.35,.9))),dike);d.position.set(36,.2,z);d.receiveShadow=true;root.add(d)}
 const rice:{p:[number,number,number];r:number;s:number}[]=[];for(let x=17.5;x<55;x+=.75)for(let z=-33;z<25;z+=.75){if(((z+26)%14+14)%14<.9)continue;rice.push({p:[x+(R()-.5)*.15,.12,z+(R()-.5)*.15],r:R()*6.3,s:.45+R()*.12})}
 cover(root,rice.slice(0,2600),1.1,'#86934b')
}
 // ---- vegetation ----
 const free=(x:number,z:number,r=2)=>clearing(x,z)<.05&&Math.abs(x-pathX(z))>1.6+r*.3&&x<16&&Math.hypot(x+3.5,z+9)>r+3
 const trees:{p:[number,number,number];r:number;s:number}[]=[];for(let i=0;i<60&&trees.length<22;i++){const a=R()*6.28,d=13+R()*26,x=Math.cos(a)*d,z=Math.sin(a)*d-3;if(!free(x,z,3))continue;trees.push({p:[x,H(x,z)-.2,z],r:R()*6.3,s:.8+R()*.4})}
 plantTrees(root,kit,trees)
 const sc=(n:number,rMin:number,rMax:number,fn:(x:number,z:number)=>boolean,k=1)=>{const out:{p:[number,number,number];r:number;s:number}[]=[];for(let i=0;i<n*4&&out.length<n;i++){const a=R()*6.28,d=rMin+Math.sqrt(R())*(rMax-rMin),x=Math.cos(a)*d,z=Math.sin(a)*d-2;if(!fn(x,z))continue;out.push({p:[x,H(x,z),z],r:R()*6.3,s:(.7+R()*.6)*k})}return out}
 plantBushes(root,kit,sc(36,9,34,(x,z)=>free(x,z,1.5)))
 cover(root,sc(90,8,30,(x,z)=>free(x,z,.8)),.8,'#6b8349')
 cover(root,sc(900,7.5,30,(x,z)=>clearing(x,z)<.4&&Math.abs(x-pathX(z))>1&&x<16,1.4),.65,'#8c9c61')
 scatter(root,'tree_stump_01',[{p:[-6.4,H(-6.4,-5.4),-5.4],r:.4,s:1.1},{p:[9,H(9,-12),-12],r:2,s:.9}])
 // bamboo clumps + banana plants (original procedural stems/leaf cards)
 const bambooTex=canvasTexture(64,512,(x,w,h)=>{const g=x.createLinearGradient(0,0,w,0);g.addColorStop(0,'#46542a');g.addColorStop(.5,'#6f7d3c');g.addColorStop(1,'#3d4a24');x.fillStyle=g;x.fillRect(0,0,w,h);for(let y=0;y<h;y+=128){x.fillStyle='rgba(60,55,25,0.85)';x.fillRect(0,y,w,6)}});kit.track(bambooTex);bambooTex.wrapS=bambooTex.wrapT=T.RepeatWrapping;bambooTex.repeat.set(1,5)
 const stemM=kit.track(new T.MeshStandardMaterial({map:bambooTex,roughness:.55})),bLeaf=kit.track(new T.MeshStandardMaterial({map:leafCard('bamboo',.22,21),color:'#f0f6dc',alphaTest:.45,side:T.DoubleSide,roughness:.75})),stemGeo=kit.track(new T.CylinderGeometry(.04,.065,1,8)),clumpGeo=kit.track(cardClump(2.3))
 const m4=new T.Matrix4(),stems:T.Matrix4[]=[],cards:T.Matrix4[]=[]
 for(const [cx,cz] of [[-12,-4],[-11,7],[11,-9],[13,6],[-5,-14],[5,-15],[-16,-12]] as const)for(let i=0;i<14;i++){const a=R()*6.28,r=R()*1.3,h=7+R()*5,lean=.08+r*.12,bx=cx+Math.cos(a)*r,bz=cz+Math.sin(a)*r,q=new T.Quaternion().setFromEuler(new T.Euler(Math.sin(a)*lean,0,Math.cos(a)*lean)),base=new T.Vector3(bx,H(bx,bz),bz)
  stems.push(new T.Matrix4().compose(base.clone().add(new T.Vector3(0,h/2,0).applyQuaternion(q)),q,new T.Vector3(1,h,1)))
  for(let k=0;k<8;k++)cards.push(new T.Matrix4().compose(base.clone().add(new T.Vector3((R()-.5)*1.1,h*(.4+k/8*.6),(R()-.5)*.8).applyQuaternion(q)),new T.Quaternion().setFromEuler(new T.Euler(R()*.6,R()*6.3,R()*.6)),new T.Vector3().setScalar(.8+R()*.7)))}
 const stemIM=new T.InstancedMesh(stemGeo,stemM,stems.length);stems.forEach((m,i)=>stemIM.setMatrixAt(i,m));const cardIM=new T.InstancedMesh(clumpGeo,bLeaf,cards.length);cards.forEach((m,i)=>cardIM.setMatrixAt(i,m));stemIM.castShadow=cardIM.castShadow=true;root.add(stemIM,cardIM)
 const banTex=canvasTexture(128,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.fillStyle='#4f7a2c';x.beginPath();x.moveTo(w/2,0);x.bezierCurveTo(w*1.05,h*.25,w*.98,h*.75,w/2,h);x.bezierCurveTo(w*.02,h*.75,-w*.05,h*.25,w/2,0);x.fill();x.strokeStyle='#b9c27a';x.lineWidth=3;x.beginPath();x.moveTo(w/2,0);x.lineTo(w/2,h);x.stroke();x.globalCompositeOperation='destination-out';for(let i=0;i<14;i++){const y=R()*h,side=R()>.5?1:-1;x.fillRect(side>0?w/2+8:0,y,w/2-8,1.5)}});kit.track(banTex)
 const banM=kit.track(new T.MeshStandardMaterial({map:banTex,alphaTest:.5,side:T.DoubleSide,roughness:.6})),palm=pbr(kit,'palm_bark',{repeat:[1,2],color:'#9aa070'})
 const leafGeo=(()=>{const lg=new T.PlaneGeometry(.6,2.2,2,10),lp=lg.attributes.position;for(let k=0;k<lp.count;k++){const y=lp.getY(k)+1.1;lp.setZ(k,-y*y*.16+Math.abs(lp.getX(k))*.15)}lg.translate(0,1.1,0);lg.computeVertexNormals();return kit.track(lg)})(),trunkGeo=kit.track(new T.CylinderGeometry(.11,.16,2.4,12))
 for(const [x,z] of [[-9.5,-1],[-8.6,1.6],[8.6,4.5],[9.6,6],[-7,8.5],[7.2,-6.5]] as const){const g=new T.Group();g.position.set(x,H(x,z),z);root.add(g);const tr=new T.Mesh(trunkGeo,palm);tr.position.y=1.2;tr.castShadow=true;g.add(tr);for(let i=0;i<9;i++){const l=new T.Mesh(leafGeo,banM);l.position.y=2.2;l.rotation.set(-.6-R()*.5,i/9*6.28+R()*.3,0);l.castShadow=true;g.add(l)}}

 if(village){ // ---- structures (house · open kitchen shed · storage shed) ----
 const thatch=pbr(kit,'thatch_roof_angled',{repeat:[3,2],side:T.DoubleSide,normalScale:1.5}),post=pbr(kit,'bark_brown_01',{repeat:[1,2]}),wood=pbr(kit,'rough_wood'),bamboo=pbr(kit,'bamboo_wall',{repeat:[2,1]}),bamboo2=pbr(kit,'bamboo_wall_02',{repeat:[3,1]}),plaster=pbr(kit,'clay_plaster',{repeat:[2,.5],color:'#c9a882'})
 const add=(m:T.Mesh,parent:T.Object3D)=>{m.castShadow=m.receiveShadow=true;parent.add(m);return m}
 const house=(x:number,z:number,rot:number,W:number,D:number,Hh:number,rise:number,open=false)=>{
  const g=new T.Group();g.position.set(x,H(x,z),z);g.rotation.y=rot;root.add(g)
  const cols=open?[[-W/2,-D/2],[W/2,-D/2],[-W/2,D/2],[W/2,D/2]]:[[-W/2,-D/2],[0,-D/2],[W/2,-D/2],[-W/2,D/2],[0,D/2],[W/2,D/2]]
  const postGeo=kit.track(ensureUv1(new T.CylinderGeometry(.08,.1,Hh+rise*.15,10)))
  for(const [px,pz] of cols){const p=add(new T.Mesh(postGeo,post),g);p.position.set(px,(Hh+rise*.15)/2,pz);p.rotation.z=(R()-.5)*.03}
  const over=.9,half=D/2+over,slope=Math.hypot(half,rise)
  for(const sg of [-1,1]){const rg=ensureUv1(new T.BoxGeometry(W+2*over,.28,slope,24,1,12)),pp=rg.attributes.position;for(let i=0;i<pp.count;i++){const zz=pp.getZ(i),xx=pp.getX(i);pp.setY(i,pp.getY(i)+n2(xx*1.3,zz*1.3)*.05+(zz>slope/2-.2?-.06:0))}rg.computeVertexNormals();const r=add(new T.Mesh(kit.track(rg),thatch),g);r.position.set(0,Hh+rise/2,sg*half/2);r.rotation.x=sg*Math.atan2(rise,half)}
  const ridge=add(new T.Mesh(kit.track(ensureUv1(new T.CylinderGeometry(.16,.16,W+2*over,10))),thatch),g);ridge.rotation.z=Math.PI/2;ridge.position.y=Hh+rise
  const tri=new T.Shape([new T.Vector2(-D/2,0),new T.Vector2(D/2,0),new T.Vector2(0,rise)])
  for(const sx of [-1,1]){const gg=add(new T.Mesh(kit.track(ensureUv1(new T.ShapeGeometry(tri))),bamboo2),g);gg.rotation.y=Math.PI/2;gg.position.set(sx*W/2,Hh,0);(gg.material as T.Material).side=T.DoubleSide}
  if(!open){const wall=(w:number,px:number,pz:number,ry:number,door=false)=>{for(const [a,b] of door?[[-w/2,-.6],[.6,w/2]]:[[-w/2,w/2]]){const ww=b-a,cx=(a+b)/2,gw=new T.Group();add(new T.Mesh(kit.track(ensureUv1(new T.PlaneGeometry(ww,Hh-.55))),bamboo),gw).position.set(0,.55+(Hh-.55)/2,0);add(new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(ww,.55,.12))),plaster),gw).position.y=.275;gw.position.set(px+Math.cos(ry)*cx,0,pz-Math.sin(ry)*cx);gw.rotation.y=ry;g.add(gw)}
    if(door){const lint=add(new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(1.3,.12,.12))),wood),g);lint.position.set(px,Hh-.25,pz);lint.rotation.y=ry}}
   wall(W,0,D/2,0,true);wall(W,0,-D/2,0);wall(D,-W/2,0,Math.PI/2);wall(D,W/2,0,Math.PI/2)}
  return g}
 house(-3.4,-10.5,.12,7.5,5,2.25,2)          // family house north of the clearing
 house(-13.5,3.5,1.4,6.5,4.5,2.2,1.9)        // neighbour west
 house(5.8,-1.05,0,2.6,3.3,1.95,1.2,true)    // open kitchen shed over the hearth (gameplay hearth stays)
 house(-4.4,-3.1,0,2.6,2.3,1.85,1,true)      // storage shed (blocked corner of the walk grid)
 // props (CC0 models) around the work clearing
 place(root,'wicker_basket_01',[-4.9,0,-3.4],{rotY:.4});place(root,'wicker_basket_02',[-3.8,0,-2.6],{rotY:1.2});place(root,'ceramic_pot',[-5.2,0,-2.4],{scale:1.5})
 place(root,'wooden_bucket_01',[1.4,0,-1.9],{rotY:2});place(root,'wooden_stool_01',[-1.7,0,-2.2],{rotY:.8});place(root,'wooden_broom',[2.4,0,-3.6],{rotY:.3})
 place(root,'pot_enamel_01',[6.6,0,-2.3],{scale:1.2});place(root,'wooden_bowl_01',[-1.2,.02,1.6]);place(root,'ceramic_pot',[-3.4,H(-3.4,-7.6),-7.6],{scale:1.6})
 // bamboo fence along the south path + camouflaged hatch by the stump (L1 link is THEMATIC, not a surveyed entrance)
 // R2 QC-FENCE (V10): a dense row of green pickets read as a wall. Now: dry bamboo posts every ~1.5 m, sparse leaning
 // pickets with gaps, and two lashed horizontal rails — reads as a light fence you can see through (RECONSTRUCTED).
 const fenceM=kit.track(new T.MeshStandardMaterial({map:bambooTex,roughness:.7,color:'#c4b488'})),picket=kit.track(new T.CylinderGeometry(.018,.024,1,7)),fencePost=kit.track(new T.CylinderGeometry(.035,.04,1,8)),fence:T.Matrix4[]=[],posts:T.Matrix4[]=[]
 for(let z=34;z>7;z-=.42+R()*.25){if(R()<.18)continue;const x=pathX(z)+2+(R()-.5)*.05,h=.85+R()*.35;fence.push(new T.Matrix4().compose(new T.Vector3(x,H(x,z)+h/2-.05,z),new T.Quaternion().setFromEuler(new T.Euler((R()-.5)*.12,0,(R()-.5)*.16)),new T.Vector3(1,h,1)))}
 for(let z=34;z>7;z-=1.5){const x=pathX(z)+2;posts.push(new T.Matrix4().compose(new T.Vector3(x,H(x,z)+.6,z),new T.Quaternion(),new T.Vector3(1,1.3,1)))}
 const fenceIM=new T.InstancedMesh(picket,fenceM,fence.length);fence.forEach((m,i)=>fenceIM.setMatrixAt(i,m));fenceIM.castShadow=true;root.add(fenceIM)
 const postIM=new T.InstancedMesh(fencePost,fenceM,posts.length);posts.forEach((m,i)=>postIM.setMatrixAt(i,m));postIM.castShadow=true;root.add(postIM)
 // rails: short segments between consecutive posts at two heights (follow the path curve)
 const rail=kit.track(new T.CylinderGeometry(.014,.014,1,6)),rails:T.Matrix4[]=[]
 for(let z=34;z>8.5;z-=1.5){const a=new T.Vector3(pathX(z)+2,0,z),b=new T.Vector3(pathX(z-1.5)+2,0,z-1.5);for(const y of [.35,.8]){const pa=a.clone().setY(H(a.x,a.z)+y),pb=b.clone().setY(H(b.x,b.z)+y),mid=pa.clone().add(pb).multiplyScalar(.5),len=pa.distanceTo(pb);rails.push(new T.Matrix4().compose(mid,new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),pb.clone().sub(pa).normalize()),new T.Vector3(1,len,1)))}}
 const railIM=new T.InstancedMesh(rail,fenceM,rails.length);rails.forEach((m,i)=>railIM.setMatrixAt(i,m));root.add(railIM)
 const lid=add(new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(.62,.06,.52))),pbr(kit,'raw_plank_wall',{repeat:[.6,.5],color:'#8f7660'})),root);lid.position.set(-5.6,H(-5.6,-6.2)+.03,-6.2);lid.rotation.set(.04,.3,.02)}
 // distant forest belt (beyond the play space)
 const far=kit.track(new T.MeshStandardMaterial({map:leafCard('broad',.24,5),color:'#e6eedc',alphaTest:.45,side:T.DoubleSide,roughness:.75})),N=320,can=new T.InstancedMesh(kit.track(cardClump(3.4)),far,N*3);let c=0
 for(let i=0;i<N;i++){const a=R()*6.28,d=42+R()*30,x=Math.cos(a)*d,z=Math.sin(a)*d-6;if(x>16&&Math.abs(z)<32)continue;const h=7+R()*9,y0=H(x,z);for(let k=0;k<3;k++){m4.compose(new T.Vector3(x+(R()-.5)*4,y0+h+(R()-.3)*3,z+(R()-.5)*4),new T.Quaternion().setFromEuler(new T.Euler(R()*.4,R()*6,R()*.4)),new T.Vector3().setScalar(1+R()));can.setMatrixAt(c++,m4)}}
 can.count=c;root.add(can)

 if(village){const haze=new T.Mesh(kit.track(new T.CylinderGeometry(76,76,22,48,1,true)),kit.track(new T.MeshBasicMaterial({color:'#819079',side:T.BackSide,fog:true})));haze.position.set(0,7,-6);root.add(haze)}
 // ---- rigged people (CC0 bodies, placeholder clothing) ----
 const extras:RigActor[]=[]
 if(village){const cook=createRigActor(root,kit,{body:'female',height:1.52,skin:'#be8c69',hair:'Hair_Buns',hairColor:'#120e0b',clothing:{top:'#2a2a2e',bottom:'#1d1c1e'},idle:'Fixing_Kneeling'});cook.g.position.set(6.6,0,-.3);cook.g.rotation.y=-2.2;extras.push(cook)}
 const r2:S2R2={floor,person:(_color,scarf,role,parent)=>{
  const o=role==='avatar'?{body:'male' as const,height:1.68,skin:'#d0a283',hair:'Hair_SimpleParted' as const,brows:true,hairColor:'#1a1410',clothing:{top:'#5d6650',bottom:'#8a7d63',style:'modern' as const}}
   :role==='partner'?{body:'male' as const,height:1.63,skin:'#b88a68',hair:'Hair_SimpleParted' as const,hairColor:'#15110e',clothing:{top:'#1f1e21',bottom:'#1c1b1d',scarf}}
   :role==='helper'?{body:'female' as const,height:1.55,skin:'#c3936f',hair:'Hair_Buns' as const,brows:true,hairColor:'#120e0b',clothing:{top:'#3b2e25',bottom:'#1b1a1d',hat:'non' as const}}
   :{body:'female' as const,height:1.52,skin:'#be8c69',hair:'Hair_Buns' as const,hairColor:'#120e0b',clothing:{top:'#2a2a2e',bottom:'#1d1c1e'},idle:'Sitting_Idle_Loop'}
  return createRigActor(parent,kit,o)}}
 return {r2,extras}
}

/** S1 · bìa rừng — VERTICAL SLICE for Prologue P5 / Q1 "Dấu cửa giữa rừng" (not S1 FULL). Same terrain/vegetation kit
 *  as S2 without the hamlet; Q1 clues are RECONSTRUCTED staging, the hatch leads on via a THEMATIC scene change. */
export function buildForest(scene:T.Scene,kit:Kit,renderer:T.WebGLRenderer):ZoneEnv{
 const {r2}=buildVillage(scene,kit,renderer,'S1'),root=new T.Group();scene.add(root);s=4242
 // denser forest edge close around the small clearing
 const near:{p:[number,number,number];r:number;s:number}[]=[];for(let i=0;i<80&&near.length<16;i++){const a=R()*6.28,d=7+R()*9,x=Math.cos(a)*d,z=Math.sin(a)*d-1;if(Math.abs(x)<5.5&&z>-4&&z<4)continue;near.push({p:[x,villageHeight(x,z)-.2,z],r:R()*6.3,s:.75+R()*.35})}
 plantTrees(root,kit,near,{s:29,light:.45})
 // R2 QC-GROUND: a continuous far tree line (no white horizon gap) and a greener, denser fog band at the forest edge
 const far:{p:[number,number,number];r:number;s:number}[]=[];for(let i=0;i<46;i++){const a=i/46*6.283+R()*.1,d=17+R()*14,x=Math.cos(a)*d,z=Math.sin(a)*d-1;far.push({p:[x,villageHeight(x,z)-.3,z],r:R()*6.3,s:.9+R()*.5})}
 plantTrees(root,kit,far,{s:61,light:.38,hue:.26})
 scene.fog=new T.FogExp2('#7f8f72',.026)
 // R2 retest: the sky shader ignores fog, so gaps between far trunks still read as a white horizon. A fogged canopy-haze ring sits behind the far tree line.
 {const haze=new T.Mesh(kit.track(new T.CylinderGeometry(36,36,16,40,1,true)),kit.track(new T.MeshBasicMaterial({color:'#5f7356',side:T.BackSide,fog:true})));haze.position.set(0,6,-1);root.add(haze)}
 const ferns:{p:[number,number,number];r:number;s:number}[]=[];for(let i=0;i<70;i++){const x=(R()-.5)*14,z=(R()-.5)*11;if(Math.abs(x)<4.6&&Math.abs(z)<3.2&&Math.hypot(x-1.5,z+1.5)>.7)continue;ferns.push({p:[x,villageHeight(x,z),z],r:R()*6.3,s:.6+R()*.6})}
 const fernGeo=kit.track(cardClump(.7)),fernMat=kit.track(new T.MeshStandardMaterial({map:leafCard('bamboo',.22,91),alphaTest:.45,side:T.DoubleSide,roughness:.9})),fernIM=new T.InstancedMesh(fernGeo,fernMat,ferns.length),fernMatrix=new T.Matrix4();ferns.forEach((v,i)=>{fernMatrix.compose(new T.Vector3(...v.p).add(new T.Vector3(0,.35,0)),new T.Quaternion().setFromEuler(new T.Euler(0,v.r,0)),new T.Vector3().setScalar(v.s));fernIM.setMatrixAt(i,fernMatrix)});fernIM.computeBoundingSphere();root.add(fernIM);plantBushes(root,kit,[{p:[-4.8,0,-3.4],s:1.3},{p:[4.9,0,2.9],s:1.2},{p:[3.4,0,-3.5],s:1.1}],{s:53})
 const under:{p:[number,number,number];s:number}[]=[];for(let i=0;i<160&&under.length<46;i++){const x=(R()-.5)*12,z=(R()-.5)*9;if(Math.abs(x)<3.4&&Math.abs(z)<2.4)continue;if(z>1.2&&Math.abs(x)<4.2)continue; // keep the camera lane behind the spawn clear
if(Math.hypot(x-2.5,z+2.5)<1.2||Math.hypot(x+1.5,z-1)<1)continue;under.push({p:[x,villageHeight(x,z),z],s:.6+R()*.7})}
 plantBushes(root,kit,under,{hue:.24,light:.36,s:77})
 const targets:Record<string,T.Object3D>={}
 // Q1_TRAIL: a path that stops under freshly strewn leaves
 const trail=new T.Group();trail.position.set(-1.5,0,-1);root.add(trail)
 // worn path = overlapping irregular soil patches that thin out and stop (no rectangular decal)
 const dirt=pbr(kit,'red_dirt_mud_01',{repeat:[.8,.8]});for(let i=0;i<7;i++){const d=new T.Mesh(kit.geo('r2-trail-'+i,()=>{const c=new T.CircleGeometry(.42-i*.03,18);const p=c.attributes.position;for(let k=1;k<p.count;k++){p.setX(k,p.getX(k)*(1+(Math.sin(k*2.3+i)*.18)));p.setY(k,p.getY(k)*(1.6+Math.cos(k*1.7)*.2))}c.rotateX(-Math.PI/2);return ensureUv1(c)}),dirt);d.position.set(Math.sin(i*.5)*.15,.011+i*.0005,2.6-i*.42);d.rotation.y=.25;d.receiveShadow=true;trail.add(d)}
 const leafM=kit.track(new T.MeshStandardMaterial({map:leafCard('broad',.13,7),color:'#c9a777',alphaTest:.45,side:T.DoubleSide,roughness:.9}))
 const litter=(parent:T.Object3D,n:number,spread:number,tint:string)=>{const m=leafM.clone();kit.track(m);m.color.set(tint);const im=new T.InstancedMesh(kit.geo('r2-litter',()=>new T.PlaneGeometry(.35,.35)),m,n),m4=new T.Matrix4();for(let i=0;i<n;i++){m4.compose(new T.Vector3((R()-.5)*spread,.02+R()*.02,(R()-.5)*spread),new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2+(R()-.5)*.3,0,R()*6.3)),new T.Vector3().setScalar(.7+R()*.6));im.setMatrixAt(i,m4)}parent.add(im);return im}
 {const g=new T.Group();root.add(g);s=9191;for(let k=0;k<14;k++){const x=(R()-.5)*8.4,z=(R()-.5)*5.6;if(Math.hypot(x-2.5,z+2.5)<1.3||Math.hypot(x+1.5,z+1)<1||Math.abs(x)<.6&&z>0)continue;const p=new T.Group();p.position.set(x,villageHeight(x,z),z);g.add(p);litter(p,26,1.3,k%2?'#8f7a52':'#9a8458')}} // R2 QC-GROUND: forest-floor litter, not bare red earth
 litter(trail,40,.9,'#c9a777');trail.add(new T.Mesh(kit.geo('r2-q1-proxy',()=>new T.BoxGeometry(.9,.3,.9)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false}))));targets.Q1_TRAIL=trail
 // Q1_LEAVES: a patch of wilted, replaced leaves (different colour than the surroundings)
 const leaves=new T.Group();leaves.position.set(1.5,0,-1.5);root.add(leaves);litter(leaves,60,1.1,'#9a7a4c');leaves.add(new T.Mesh(kit.geo('r2-q1-proxy',()=>new T.BoxGeometry(.9,.3,.9)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false}))));targets.Q1_LEAVES=leaves
 // Q1_HATCH — concealed entrance (G3 QA P0 Q1-STATE / QC-HATCH). RECONSTRUCTED · GAMEPLAY_ADAPTED, PENDING REVIEW:
 // principle (a lid carrying the same earth and leaf litter as the forest floor) follows the cited sources; exact
 // construction, size and placement for 01/1967 are not verified. Closed, there is NO visible lid, edge, glow or marker:
 // the lid sits flush under the terrain and only the litter shows. States (driven by the page, see hatchStages):
 // HIDDEN → SWEEPING → REVEALED (seam visible) → OPENING → OPEN (real hole, shaft) → DESCENDING; CLOSING → COVERED.
 const HX=2.5,HZ=-2.5,HW=.24,HD=.27,hy=villageHeight(HX,HZ)
 const hatch=new T.Group();hatch.position.set(HX,hy,HZ);root.add(hatch)
 place(hatch,'tree_stump_01',[-.6,0,-.4],{rotY:1.1,scale:.8})
 // shaft below the hole (seen only when the terrain opens): earthen walls, two cut foot-holds
 const earthIn=pbr(kit,'red_dirt_mud_01',{repeat:[.6,1.2],color:'#6e4a33',side:T.BackSide})
 const shaft=new T.Mesh(kit.geo('r2-q1-shaft',()=>ensureUv1(new T.BoxGeometry(HW*2,1.5,HD*2))),earthIn);shaft.position.y=-.75;shaft.visible=false;hatch.add(shaft)
 const shaftDark=new T.Mesh(kit.geo('r2-q1-shaft-floor',()=>new T.PlaneGeometry(HW*2,HD*2)),kit.memo('r2-q1-dark',()=>new T.MeshBasicMaterial({color:'#070504'})));shaftDark.rotation.x=-Math.PI/2;shaftDark.position.y=-1.45;shaftDark.visible=false;hatch.add(shaftDark)
 for(const [y,z] of [[-.45,-HD+.05],[-.9,HD-.05]] as const){const step=new T.Mesh(kit.geo('r2-q1-hold',()=>new T.BoxGeometry(.22,.05,.1)),earthIn.clone());(step.material as T.MeshStandardMaterial).side=T.FrontSide;kit.track(step.material as T.Material);step.position.set(0,y,z);step.visible=false;shaft.parent!.add(step);(shaft.userData.holds??=[]).push(step)}
 // the lid: a plank board carrying a layer of the same soil, flush with the ground while closed
 const lid=new T.Group();lid.position.y=-.06;hatch.add(lid)
 const board=new T.Mesh(kit.geo('r2-q1-lid',()=>ensureUv1(new T.BoxGeometry(HW*2+.04,.05,HD*2+.04))),pbr(kit,'raw_plank_wall',{repeat:[.5,.5],color:'#5f4c3b'}));lid.add(board)
 const soil=new T.Mesh(kit.geo('r2-q1-soil',()=>{const g=new T.CylinderGeometry(.36,.4,.03,14,1);g.scale(1,1,1.1);return ensureUv1(g)}),pbr(kit,'red_dirt_mud_01',{repeat:[.4,.4],color:'#8a6448'}));soil.position.y=.035;lid.add(soil)
 const lidLitter=litter(lid,16,.5,'#9b8058');lidLitter.position.y=.04
 // loose cover litter over and around the lid: same tints as the forest floor; swept aside by the Avatar's hands
 const cover=litter(hatch,44,1.05,'#957a54'),coverBase:T.Matrix4[]=[],coverSwept:T.Matrix4[]=[]
 {const m4=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3();for(let i=0;i<44;i++){cover.getMatrixAt(i,m4);coverBase.push(m4.clone());m4.decompose(p,q,sc);const a=Math.atan2(p.z,p.x)+(R()-.5)*.6,r=.62+R()*.35;p.set(Math.cos(a)*r,.015+R()*.02,Math.sin(a)*r);coverSwept.push(new T.Matrix4().compose(p,q,sc))}}
 litter(hatch,26,1.9,'#8f7a52')
 // seam: shows only once the cover is swept (a thin line of darker soil around the board — never a glow)
 const seamMat=kit.memo('r2-q1-seam',()=>new T.MeshBasicMaterial({color:'#2a1c12',transparent:true,opacity:0,depthWrite:false}))
 for(const [w,d,x,z] of [[HW*2+.06,.018,0,-HD-.02],[HW*2+.06,.018,0,HD+.02],[.018,HD*2+.06,-HW-.02,0],[.018,HD*2+.06,HW+.02,0]] as const){const l=new T.Mesh(kit.geo(`r2-q1-seam-${w}-${d}`,()=>new T.PlaneGeometry(w,d).rotateX(-Math.PI/2)),seamMat);l.position.set(x,.012,z);hatch.add(l)}
 hatch.add(new T.Mesh(kit.geo('r2-q1-proxy',()=>new T.BoxGeometry(.9,.3,.9)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false}))));targets.Q1_HATCH=hatch
 // Hidden shaft geometry extends below ground; captions/pointer diagnostics must anchor on the actual ground proxy.
 hatch.userData.interactionAnchor=new T.Vector3(0,.1,0)
 // decoys (dấu nhiễu): natural leaf drifts / a fallen branch — inspecting them teaches what is NOT a concealed opening
 const decoy=(id:string,x:number,z:number,branch:boolean)=>{const d=new T.Group();d.position.set(x,villageHeight(x,z),z);root.add(d);litter(d,34,.9,'#8f7a52');litter(d,14,.5,'#a08458')
  if(branch){const b=new T.Mesh(kit.geo('r2-decoy-branch',()=>ensureUv1(new T.CylinderGeometry(.025,.04,1.3,6))),pbr(kit,'bark_brown_01',{repeat:[.3,1],color:'#6a5644'}));b.rotation.set(Math.PI/2,0,.7);b.position.y=.04;b.castShadow=true;d.add(b)}
  d.add(new T.Mesh(kit.geo('r2-q1-proxy',()=>new T.BoxGeometry(.9,.3,.9)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false}))));targets[id]=d}
 decoy('S1_DECOY_1',-2.8,-2.3,false);decoy('S1_DECOY_2',.5,-2.6,true)
 const holeU=r2.floor.userData.hole as {value:T.Vector4},m4=new T.Matrix4(),pa=new T.Vector3(),pb=new T.Vector3(),qa=new T.Quaternion(),qb=new T.Quaternion(),sa=new T.Vector3(),sb=new T.Vector3()
 let sweep=0,open=0
 const setCover=(k:number)=>{for(let i=0;i<coverBase.length;i++){coverBase[i].decompose(pa,qa,sa);coverSwept[i].decompose(pb,qb,sb);pa.lerp(pb,k);m4.compose(pa,qa,sa);cover.setMatrixAt(i,m4)}cover.instanceMatrix.needsUpdate=true}
 return {heightAt:villageHeight,floor:r2.floor,targets,endpoints:new Map(),pipes:[],links:[],camera:{position:[0,2.2,6],target:[0,1.1,0],min:2.2,max:7,polar:1.42},update:(_t,dt,st)=>{
  const stage=st.hatch??'HIDDEN',wantSweep=['SWEEPING','REVEALED','OPENING','OPEN','DESCENDING'].includes(stage)?1:stage==='COVERED'?.12:0,wantOpen=['OPENING','OPEN','DESCENDING'].includes(stage)?1:0
  const k=st.reduced?1:Math.min(1,dt*1.6);const ps=sweep,po=open;sweep+=(wantSweep-sweep)*k;open+=(wantOpen-open)*(st.reduced?1:Math.min(1,dt*1.3))
  if(Math.abs(sweep-ps)>1e-4)setCover(sweep)
  seamMat.opacity=Math.max(0,Math.min(.75,(sweep-.6)*2))*(1-open)
  if(Math.abs(open-po)>1e-4||open>0){
   // lift straight up, then set aside against the stump, tilted (no hinge is assumed)
   const up=Math.min(1,open*2),side=Math.max(0,open*2-1)
   lid.position.set(-.55*side,-.06+.36*up-.27*side,.35*side);lid.rotation.set(.22*side,0,-.35*side)
  }
  const isOpen=open>.08;holeU.value.set(HX,HZ,isOpen?HW:0,isOpen?HD:0);shaft.visible=shaftDark.visible=isOpen;for(const h of shaft.userData.holds as T.Mesh[])h.visible=isOpen
 }}
}
