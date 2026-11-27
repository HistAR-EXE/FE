import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import {plantTrees,plantBushes} from './r2Flora'
import {pbr,ensureUv1,place,scatter,canvasTexture,leafCard,cardClump,preload,skyEnvironment} from './r2Assets'
import {createRigActor,R2_CHAR_FILES,type RigActor} from './r2Actors'
import {createVietnameseOilLamp,type VietnameseOilLamp} from './vietnameseOilLamp'
import type {S2R2} from '../s2Environment'
import type {ZoneEnv} from '../zoneEnvironments'
import {configureMoonlitField,completionReveal} from '../m2ScenePresentation'
import {createWorkbench} from '../m2Workbench'

// S2 · Củ Chi 01/1967 surface — R2 village integrated around the unchanged A04 clearing (|x|<6.5, |z|<5.5, y=0).
// RECONSTRUCTED layout proposal (not a sourced site plan). Houses/sheds are code-built geometry with CC0 PBR
// textures; vegetation and props are Poly Haven CC0 models. LOOKDEV CANDIDATE — not final art.
const MATERIALS=['brown_mud_leaves_01','red_laterite_soil_stones','red_dirt_mud_01','thatch_roof_angled','bark_brown_01','rough_wood','bamboo_wall','bamboo_wall_02','clay_plaster','raw_plank_wall','palm_bark']
const MODELS=['tree_stump_01','wicker_basket_01','wicker_basket_02','wooden_bucket_01','wooden_stool_01','wooden_broom','ceramic_pot','pot_enamel_01','wooden_bowl_01','vintage_oil_lamp']
const FOREST_MATERIALS=['brown_mud_leaves_01','red_laterite_soil_stones','red_dirt_mud_01','palm_bark','raw_plank_wall','bark_brown_01']
export const prepareForest=()=>preload({materials:FOREST_MATERIALS,models:['tree_stump_01'],chars:R2_CHAR_FILES})
export const prepareVillage=()=>preload({materials:MATERIALS,models:MODELS,chars:R2_CHAR_FILES})

let s=99;const R=()=>((s=(s*1664525+1013904223)>>>0)/4294967296)
const n2=(x:number,z:number)=>Math.sin(x*1.7+Math.sin(z*1.3))*Math.cos(z*1.1+Math.sin(x*.7))
const fbm=(x:number,z:number)=>n2(x,z)*.5+n2(x*2.03+5,z*2.03-3)*.25+n2(x*4.1-7,z*4.1+2)*.125
const clearing=(x:number,z:number)=>1-T.MathUtils.smoothstep(Math.max(Math.abs(x)/8,Math.abs(z)/7),.85,1.25)
export const villageHeight=(x:number,z:number)=>(1-clearing(x,z))*(fbm(x*.05,z*.05)*1.6+.5+Math.max(0,-z-12)*.06)+clearing(x,z)*0-.02
const pathX=(z:number)=>Math.sin(z*.09)*1.6

export function buildVillage(scene:T.Scene,kit:Kit,renderer:T.WebGLRenderer,variant:'S1'|'S2'|'S4'='S2'){
 const village=variant==='S2'||variant==='S4',s2Only=variant==='S2'
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
 if(s2Only)house(5.8,-1.05,0,2.6,3.3,1.95,1.2,true) // open kitchen shed over the hearth (S2 only; S4 uses its own bamboo hall)
 house(-4.4,-3.1,0,2.6,2.3,1.85,1,true)      // storage shed (blocked corner of the walk grid)
 // props (CC0 models) around the work clearing
 place(root,'wicker_basket_01',[-4.9,0,-3.4],{rotY:.4});place(root,'wicker_basket_02',[-3.8,0,-2.6],{rotY:1.2});place(root,'ceramic_pot',[-5.2,0,-2.4],{scale:1.5})
 place(root,'wooden_bucket_01',[1.4,0,-1.9],{rotY:2});place(root,'wooden_stool_01',[-1.7,0,-2.2],{rotY:.8});place(root,'wooden_broom',[2.4,0,-3.6],{rotY:.3})
 if(s2Only)place(root,'pot_enamel_01',[6.6,0,-2.3],{scale:1.2});place(root,'wooden_bowl_01',[-1.2,.02,1.6]);place(root,'ceramic_pot',[-3.4,H(-3.4,-7.6),-7.6],{scale:1.6})
 // bamboo fence along the south path + camouflaged hatch by the stump (L1 link is THEMATIC, not a surveyed entrance)
 const fenceM=kit.track(new T.MeshStandardMaterial({map:bambooTex,roughness:.7,color:'#c4b488'})),picket=kit.track(new T.CylinderGeometry(.018,.024,1,7)),fencePost=kit.track(new T.CylinderGeometry(.035,.04,1,8)),fence:T.Matrix4[]=[],posts:T.Matrix4[]=[]
 for(let z=34;z>7;z-=.42+R()*.25){if(R()<.18)continue;const x=pathX(z)+2+(R()-.5)*.05,h=.85+R()*.35;fence.push(new T.Matrix4().compose(new T.Vector3(x,H(x,z)+h/2-.05,z),new T.Quaternion().setFromEuler(new T.Euler((R()-.5)*.12,0,(R()-.5)*.16)),new T.Vector3(1,h,1)))}
 for(let z=34;z>7;z-=1.5){const x=pathX(z)+2;posts.push(new T.Matrix4().compose(new T.Vector3(x,H(x,z)+.6,z),new T.Quaternion(),new T.Vector3(1,1.3,1)))}
 const fenceIM=new T.InstancedMesh(picket,fenceM,fence.length);fence.forEach((m,i)=>fenceIM.setMatrixAt(i,m));fenceIM.castShadow=true;root.add(fenceIM)
 const postIM=new T.InstancedMesh(fencePost,fenceM,posts.length);posts.forEach((m,i)=>postIM.setMatrixAt(i,m));postIM.castShadow=true;root.add(postIM)
 const rail=kit.track(new T.CylinderGeometry(.014,.014,1,6)),rails:T.Matrix4[]=[]
 for(let z=34;z>8.5;z-=1.5){const a=new T.Vector3(pathX(z)+2,0,z),b=new T.Vector3(pathX(z-1.5)+2,0,z-1.5);for(const y of [.35,.8]){const pa=a.clone().setY(H(a.x,a.z)+y),pb=b.clone().setY(H(b.x,b.z)+y),mid=pa.clone().add(pb).multiplyScalar(.5),len=pa.distanceTo(pb);rails.push(new T.Matrix4().compose(mid,new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),pb.clone().sub(pa).normalize()),new T.Vector3(1,len,1)))}}
 const railIM=new T.InstancedMesh(rail,fenceM,rails.length);rails.forEach((m,i)=>railIM.setMatrixAt(i,m));root.add(railIM)
 const lid=add(new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(.62,.06,.52))),pbr(kit,'raw_plank_wall',{repeat:[.6,.5],color:'#8f7660'})),root);lid.position.set(-5.6,H(-5.6,-6.2)+.03,-6.2);lid.rotation.set(.04,.3,.02)}
 // distant forest belt (beyond the play space)
 const far=kit.track(new T.MeshStandardMaterial({map:leafCard('broad',.24,5),color:'#e6eedc',alphaTest:.45,side:T.DoubleSide,roughness:.75})),N=320,can=new T.InstancedMesh(kit.track(cardClump(3.4)),far,N*3);let c=0
 for(let i=0;i<N;i++){const a=R()*6.28,d=42+R()*30,x=Math.cos(a)*d,z=Math.sin(a)*d-6;if(x>16&&Math.abs(z)<32)continue;const h=7+R()*9,y0=H(x,z);for(let k=0;k<3;k++){m4.compose(new T.Vector3(x+(R()-.5)*4,y0+h+(R()-.3)*3,z+(R()-.5)*4),new T.Quaternion().setFromEuler(new T.Euler(R()*.4,R()*6,R()*.4)),new T.Vector3().setScalar(1+R()));can.setMatrixAt(c++,m4)}}
 can.count=c;root.add(can)

 if(village){const haze=new T.Mesh(kit.track(new T.CylinderGeometry(76,76,22,48,1,true)),kit.track(new T.MeshBasicMaterial({color:'#819079',side:T.BackSide,fog:true})));haze.position.set(0,7,-6);root.add(haze)}
 // ---- rigged people: người dân mặc áo bà ba khăn rằn giản dị; chiến sĩ mặc quân phục xanh lá, nón tai bèo, áo choàng vải dù ----
 const extras:RigActor[]=[]
 if(s2Only){
  const cook=createRigActor(root,kit,{body:'female',height:1.52,skin:'#be8c69',hair:'Hair_Buns',hairColor:'#120e0b',clothing:{top:'#1f1e1c',bottom:'#191817',scarf:true},idle:'Fixing_Kneeling'})
  cook.g.position.set(6.6,0,-.3);cook.g.rotation.y=-2.2;extras.push(cook)
  // Chiến sĩ cách mạng ghé thăm hiên nhà kho / xóm nghề (quân phục xanh lá + nón tai bèo + khăn rằn + áo choàng vải dù + bi-đông)
  const sentry=createRigActor(root,kit,{body:'male',height:1.65,skin:'#bc8e6b',hair:'Hair_SimpleParted',hairColor:'#16120e',clothing:{top:'#485b32',bottom:'#3b4a29',style:'soldier',hat:'taibeo',scarf:true,camoCape:true,belt:true,canteen:true},idle:'Idle_Loop',sample:true})
  sentry.g.position.set(-4.0,0,-2.35);sentry.g.rotation.y=.55;extras.push(sentry)
 }
 const r2:S2R2={floor,person:(_color,scarf,role,parent)=>{
  const o=role==='avatar'?{body:'male' as const,height:1.68,skin:'#d0a283',hair:'Hair_SimpleParted' as const,brows:true,hairColor:'#1a1410',clothing:{top:'#5d6650',bottom:'#8a7d63',style:'modern' as const}}
   :role==='partner'?{body:'male' as const,height:1.63,skin:'#b88a68',hair:'Hair_SimpleParted' as const,hairColor:'#15110e',clothing:{top:'#1e1d1b',bottom:'#181716',scarf:true}}
   :role==='cobbler'?{body:'male' as const,height:1.63,skin:'#b88a68',hair:'Hair_SimpleParted' as const,hairColor:'#15110e',clothing:{top:'#475931',bottom:'#3a4828',style:'soldier' as const,hat:'taibeo' as const,scarf:true,camoCape:true,belt:true,canteen:true}}
   :role==='helper'||role==='crafter'?{body:'female' as const,height:1.55,skin:'#c3936f',hair:'Hair_Buns' as const,brows:true,hairColor:'#120e0b',clothing:{top:'#36281f',bottom:'#1b1a18',hat:'non' as const,scarf:true}}
   :{body:'female' as const,height:1.52,skin:'#be8c69',hair:'Hair_Buns' as const,hairColor:'#120e0b',clothing:{top:'#1f1e1c',bottom:'#191817',scarf:scarf||true},idle:'Sitting_Idle_Loop'}
  return createRigActor(parent,kit,{...o,sample:role==='crafter'||role==='cobbler'})}}
 return {r2,extras}
}

/** S1 · bìa rừng — VERTICAL SLICE for Prologue P5 / Q1 "Dấu cửa giữa rừng" + chiến sĩ giao liên dẫn chuyện (A22). */
export function buildForest(scene:T.Scene,kit:Kit,renderer:T.WebGLRenderer):ZoneEnv{
 const {r2}=buildVillage(scene,kit,renderer,'S1'),root=new T.Group();scene.add(root);s=4242
 const near:{p:[number,number,number];r:number;s:number}[]=[];for(let i=0;i<80&&near.length<16;i++){const a=R()*6.28,d=7+R()*9,x=Math.cos(a)*d,z=Math.sin(a)*d-1;if(Math.abs(x)<5.5&&z>-4&&z<4)continue;near.push({p:[x,villageHeight(x,z)-.2,z],r:R()*6.3,s:.75+R()*.35})}
 plantTrees(root,kit,near,{s:29,light:.45})
 const far:{p:[number,number,number];r:number;s:number}[]=[];for(let i=0;i<46;i++){const a=i/46*6.283+R()*.1,d=17+R()*14,x=Math.cos(a)*d,z=Math.sin(a)*d-1;far.push({p:[x,villageHeight(x,z)-.3,z],r:R()*6.3,s:.9+R()*.5})}
 plantTrees(root,kit,far,{s:61,light:.38,hue:.26})
 scene.fog=new T.FogExp2('#7f8f72',.026)
 {const haze=new T.Mesh(kit.track(new T.CylinderGeometry(36,36,16,40,1,true)),kit.track(new T.MeshBasicMaterial({color:'#5f7356',side:T.BackSide,fog:true})));haze.position.set(0,6,-1);root.add(haze)}
 const ferns:{p:[number,number,number];r:number;s:number}[]=[];for(let i=0;i<70;i++){const x=(R()-.5)*14,z=(R()-.5)*11;if(Math.abs(x)<4.6&&Math.abs(z)<3.2&&Math.hypot(x-1.5,z+1.5)>.7)continue;ferns.push({p:[x,villageHeight(x,z),z],r:R()*6.3,s:.6+R()*.6})}
 const fernGeo=kit.track(cardClump(.7)),fernMat=kit.track(new T.MeshStandardMaterial({map:leafCard('bamboo',.22,91),alphaTest:.45,side:T.DoubleSide,roughness:.9})),fernIM=new T.InstancedMesh(fernGeo,fernMat,ferns.length),fernMatrix=new T.Matrix4();ferns.forEach((v,i)=>{fernMatrix.compose(new T.Vector3(...v.p).add(new T.Vector3(0,.35,0)),new T.Quaternion().setFromEuler(new T.Euler(0,v.r,0)),new T.Vector3().setScalar(v.s));fernIM.setMatrixAt(i,fernMatrix)});fernIM.computeBoundingSphere();root.add(fernIM);plantBushes(root,kit,[{p:[-4.8,0,-3.4],s:1.3},{p:[4.9,0,2.9],s:1.2},{p:[3.4,0,-3.5],s:1.1}],{s:53})
 {const seedBefore=s;s=7331;const pockets:[number,number][]=[[-5.2,-1],[-4.4,2.6],[5.3,.6],[4.6,-2.9],[-2.8,-4.2],[2.2,-4.4],[-6.1,-3.6],[6.2,2.8]]
  const extra:{p:[number,number,number];r:number;s:number}[]=[]
  for(const [cx,cz] of pockets)for(let i=0;i<9;i++){const a=R()*6.283,r=Math.sqrt(R())*1.4,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(Math.abs(x)<3.3&&Math.abs(z)<2.5)continue;extra.push({p:[x,villageHeight(x,z)+.3,z],r:R()*6.3,s:.55+R()*.7})}
  const im=new T.InstancedMesh(fernGeo,fernMat,extra.length),m4=new T.Matrix4();extra.forEach((v,i)=>{m4.compose(new T.Vector3(...v.p),new T.Quaternion().setFromEuler(new T.Euler(0,v.r,0)),new T.Vector3().setScalar(v.s));im.setMatrixAt(i,m4)});im.computeBoundingSphere();im.receiveShadow=true;root.add(im)
  const bark=pbr(kit,'bark_brown_01',{repeat:[1,2],color:'#6b5a46'})
  for(const [x,z,len,ry,rad] of [[-4.9,-.2,2.6,.4,.16],[4.8,-1.6,2.2,-.7,.13],[-3.6,-3.6,1.8,1.2,.11],[3.9,2.4,2.4,.2,.14],[-5.6,2.1,1.6,-1,.1]] as [number,number,number,number,number][]){
   const log=new T.Mesh(kit.track(new T.CylinderGeometry(rad,rad*1.15,len,10)),bark);log.rotation.set(0,ry,Math.PI/2-.04);log.position.set(x,villageHeight(x,z)+rad*.8,z);log.castShadow=log.receiveShadow=true;root.add(log)
   for(let k=0;k<3;k++){const root_=new T.Mesh(kit.track(new T.TorusGeometry(.18+k*.05,.022,6,10,Math.PI)),bark);root_.position.set(x+Math.cos(ry)*len*.48,villageHeight(x,z)+.02,z-Math.sin(ry)*len*.48);root_.rotation.set(Math.PI/2*.9,ry+k*.9,0);root.add(root_)}}
  s=seedBefore}
 const under:{p:[number,number,number];s:number}[]=[];for(let i=0;i<160&&under.length<46;i++){const x=(R()-.5)*12,z=(R()-.5)*9;if(Math.abs(x)<3.8&&Math.abs(z)<2.4)continue;if(z>1.2&&Math.abs(x)<4.2)continue;
if(Math.hypot(x-2.5,z+2.5)<1.2||Math.hypot(x+1.5,z-1)<1)continue;under.push({p:[x,villageHeight(x,z),z],s:.6+R()*.7})}
 plantBushes(root,kit,under,{hue:.24,light:.36,s:77})
 const targets:Record<string,T.Object3D>={}
 // Mái chòi lá nhỏ rìa rừng phía tây & Nữ chiến sĩ giao liên (bà ba đen + nón tai bèo + khăn rằn + áo choàng vải dù + bi-đông, tách biệt hoàn toàn với dấu Q1)
 {
  const shelter=new T.Group();shelter.position.set(-3.55,villageHeight(-3.55,.55),.55);shelter.rotation.y=.48;root.add(shelter)
  const postMat=pbr(kit,'bark_brown_01',{repeat:[1,2],color:'#5e4b38'})
  const palmRoofTex=kit.track(canvasTexture(256,256,(c,w,h)=>{
   c.fillStyle='#5c4b32';c.fillRect(0,0,w,h)
   for(let y=0;y<h;y+=16){
    c.fillStyle=y%32===0?'#6b5839':'#4d3e28';c.fillRect(0,y,w,14)
    for(let x=0;x<w;x+=5){c.fillStyle=(x+y)%10===0?'#7e6a46':'#3e311f';c.fillRect(x,y+2,2,12)}
   }
  }))
  palmRoofTex.wrapS=palmRoofTex.wrapT=T.RepeatWrapping;palmRoofTex.repeat.set(2,2)
  const roofMat=kit.track(new T.MeshStandardMaterial({map:palmRoofTex,roughness:.95,side:T.DoubleSide}))
  for(const [px,pz,ph] of [[-.82,-.58,2.04],[.82,-.58,2.04],[-.82,.58,1.76],[.82,.58,1.76]] as const){
   const p=new T.Mesh(kit.track(new T.CylinderGeometry(.045,.055,ph,8)),postMat);p.position.set(px,ph/2,pz);p.castShadow=true;shelter.add(p)
  }
  for(const rz of [-.52,0,.52]){const beam=new T.Mesh(kit.track(new T.CylinderGeometry(.028,.03,1.88,8)),postMat);beam.rotation.z=Math.PI/2;beam.position.set(0,1.9-rz*.22,rz);shelter.add(beam)}
  const thatchRoof=new T.Mesh(kit.track(new T.BoxGeometry(2.05,.09,1.65)),roofMat);thatchRoof.position.set(0,1.95,0);thatchRoof.rotation.x=.22;thatchRoof.castShadow=true;shelter.add(thatchRoof)
 }
 const liaison=createRigActor(root,kit,{body:'female',height:1.57,skin:'#c2926e',hair:'Hair_Buns',brows:true,hairColor:'#15110d',clothing:{top:'#1d1c1a',bottom:'#181716',hat:'taibeo',scarf:true,camoCape:true,belt:true,canteen:true},idle:'Idle_Loop',sample:true})
 liaison.g.position.set(-3.2,villageHeight(-3.2,.8),.8);liaison.g.rotation.y=1.15
 targets.NPC_LIAISON=liaison.g;liaison.g.userData.interactionBone=liaison.g.getObjectByName('spine_03')

 // Q1_TRAIL: a path that stops under freshly strewn leaves
 const trail=new T.Group();trail.position.set(-1.5,0,-1);root.add(trail)
 const dirt=pbr(kit,'red_dirt_mud_01',{repeat:[.8,.8]});for(let i=0;i<7;i++){const d=new T.Mesh(kit.geo('r2-trail-'+i,()=>{const c=new T.CircleGeometry(.42-i*.03,18);const p=c.attributes.position;for(let k=1;k<p.count;k++){p.setX(k,p.getX(k)*(1+(Math.sin(k*2.3+i)*.18)));p.setY(k,p.getY(k)*(1.6+Math.cos(k*1.7)*.2))}c.rotateX(-Math.PI/2);return ensureUv1(c)}),dirt);d.position.set(Math.sin(i*.5)*.15,.011+i*.0005,2.6-i*.42);d.rotation.y=.25;d.receiveShadow=true;trail.add(d)}
 const leafM=kit.track(new T.MeshStandardMaterial({map:leafCard('broad',.13,7),color:'#c9a777',alphaTest:.45,side:T.DoubleSide,roughness:.9}))
 const litter=(parent:T.Object3D,n:number,spread:number,tint:string)=>{const m=leafM.clone();kit.track(m);m.color.set(tint);const im=new T.InstancedMesh(kit.geo('r2-litter',()=>new T.PlaneGeometry(.35,.35)),m,n),m4=new T.Matrix4();for(let i=0;i<n;i++){m4.compose(new T.Vector3((R()-.5)*spread,.02+R()*.02,(R()-.5)*spread),new T.Quaternion().setFromEuler(new T.Euler(-Math.PI/2+(R()-.5)*.3,0,R()*6.3)),new T.Vector3().setScalar(.7+R()*.6));im.setMatrixAt(i,m4)}parent.add(im);return im}
 {const g=new T.Group();root.add(g);s=9191;for(let k=0;k<14;k++){const x=(R()-.5)*8.4,z=(R()-.5)*5.6;if(Math.hypot(x-2.5,z+2.5)<1.3||Math.hypot(x+1.5,z+1)<1||Math.abs(x)<.6&&z>0)continue;const p=new T.Group();p.position.set(x,villageHeight(x,z),z);g.add(p);litter(p,26,1.3,k%2?'#8f7a52':'#9a8458')}}
 litter(trail,40,.9,'#c9a777');trail.add(new T.Mesh(kit.geo('r2-q1-proxy',()=>new T.BoxGeometry(.9,.3,.9)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false}))));targets.Q1_TRAIL=trail
 // Q1_LEAVES: a patch of wilted, replaced leaves (different colour than the surroundings)
 const leaves=new T.Group();leaves.position.set(1.5,0,-1.5);root.add(leaves);litter(leaves,60,1.1,'#9a7a4c');leaves.add(new T.Mesh(kit.geo('r2-q1-proxy',()=>new T.BoxGeometry(.9,.3,.9)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false}))));targets.Q1_LEAVES=leaves
 // Q1_HATCH — concealed entrance
 const HX=2.5,HZ=-2.5,HW=.24,HD=.27,hy=villageHeight(HX,HZ)
 const hatch=new T.Group();hatch.position.set(HX,hy,HZ);root.add(hatch)
 place(hatch,'tree_stump_01',[-.6,0,-.4],{rotY:1.1,scale:.8})
 const earthIn=pbr(kit,'red_dirt_mud_01',{repeat:[.6,1.2],color:'#6e4a33',side:T.BackSide})
 const shaft=new T.Mesh(kit.geo('r2-q1-shaft',()=>ensureUv1(new T.BoxGeometry(HW*2,1.5,HD*2))),earthIn);shaft.position.y=-.75;shaft.visible=false;hatch.add(shaft)
 const shaftDark=new T.Mesh(kit.geo('r2-q1-shaft-floor',()=>new T.PlaneGeometry(HW*2,HD*2)),kit.memo('r2-q1-dark',()=>new T.MeshBasicMaterial({color:'#070504'})));shaftDark.rotation.x=-Math.PI/2;shaftDark.position.y=-1.45;shaftDark.visible=false;hatch.add(shaftDark)
 for(const [y,z] of [[-.45,-HD+.05],[-.9,HD-.05]] as const){const step=new T.Mesh(kit.geo('r2-q1-hold',()=>new T.BoxGeometry(.22,.05,.1)),earthIn.clone());(step.material as T.MeshStandardMaterial).side=T.FrontSide;kit.track(step.material as T.Material);step.position.set(0,y,z);step.visible=false;shaft.parent!.add(step);(shaft.userData.holds??=[]).push(step)}
 const lid=new T.Group();lid.position.y=-.06;hatch.add(lid)
 const board=new T.Mesh(kit.geo('r2-q1-lid',()=>ensureUv1(new T.BoxGeometry(HW*2+.04,.05,HD*2+.04))),pbr(kit,'raw_plank_wall',{repeat:[.5,.5],color:'#5f4c3b'}));lid.add(board)
 const soil=new T.Mesh(kit.geo('r2-q1-soil',()=>{const g=new T.CylinderGeometry(.36,.4,.03,14,1);g.scale(1,1,1.1);return ensureUv1(g)}),pbr(kit,'red_dirt_mud_01',{repeat:[.4,.4],color:'#8a6448'}));soil.position.y=.035;lid.add(soil)
 const lidLitter=litter(lid,16,.5,'#9b8058');lidLitter.position.y=.04
 const cover=litter(hatch,44,1.05,'#957a54'),coverBase:T.Matrix4[]=[],coverSwept:T.Matrix4[]=[]
 {const m4=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),sc=new T.Vector3();for(let i=0;i<44;i++){cover.getMatrixAt(i,m4);coverBase.push(m4.clone());m4.decompose(p,q,sc);const a=Math.atan2(p.z,p.x)+(R()-.5)*.6,r=.62+R()*.35;p.set(Math.cos(a)*r,.015+R()*.02,Math.sin(a)*r);coverSwept.push(new T.Matrix4().compose(p,q,sc))}}
 litter(hatch,26,1.9,'#8f7a52')
 const seamMat=kit.memo('r2-q1-seam',()=>new T.MeshBasicMaterial({color:'#2a1c12',transparent:true,opacity:0,depthWrite:false}))
 for(const [w,d,x,z] of [[HW*2+.06,.018,0,-HD-.02],[HW*2+.06,.018,0,HD+.02],[.018,HD*2+.06,-HW-.02,0],[.018,HD*2+.06,HW+.02,0]] as const){const l=new T.Mesh(kit.geo(`r2-q1-seam-${w}-${d}`,()=>new T.PlaneGeometry(w,d).rotateX(-Math.PI/2)),seamMat);l.position.set(x,.012,z);hatch.add(l)}
 hatch.add(new T.Mesh(kit.geo('r2-q1-proxy',()=>new T.BoxGeometry(.9,.3,.9)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false}))));targets.Q1_HATCH=hatch
 hatch.userData.interactionAnchor=new T.Vector3(0,.1,0)
 const decoy=(id:string,x:number,z:number,branch:boolean)=>{const d=new T.Group();d.position.set(x,villageHeight(x,z),z);root.add(d);litter(d,34,.9,'#8f7a52');litter(d,14,.5,'#a08458')
  if(branch){const b=new T.Mesh(kit.geo('r2-decoy-branch',()=>ensureUv1(new T.CylinderGeometry(.025,.04,1.3,6))),pbr(kit,'bark_brown_01',{repeat:[.3,1],color:'#6a5644'}));b.rotation.set(Math.PI/2,0,.7);b.position.y=.04;b.castShadow=true;d.add(b)}
  d.add(new T.Mesh(kit.geo('r2-q1-proxy',()=>new T.BoxGeometry(.9,.3,.9)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false}))));targets[id]=d}
 decoy('S1_DECOY_1',-2.8,-2.3,false);decoy('S1_DECOY_2',.5,-2.6,true)
 const holeU=r2.floor.userData.hole as {value:T.Vector4},m4=new T.Matrix4(),pa=new T.Vector3(),pb=new T.Vector3(),qa=new T.Quaternion(),qb=new T.Quaternion(),sa=new T.Vector3(),sb=new T.Vector3()
 let sweep=0,open=0
 const setCover=(k:number)=>{for(let i=0;i<coverBase.length;i++){coverBase[i].decompose(pa,qa,sa);coverSwept[i].decompose(pb,qb,sb);pa.lerp(pb,k);m4.compose(pa,qa,sa);cover.setMatrixAt(i,m4)}cover.instanceMatrix.needsUpdate=true}
 return {heightAt:villageHeight,floor:r2.floor,targets,endpoints:new Map(),pipes:[],links:[],camera:{position:[0,2.2,6],target:[0,1.1,0],min:2.2,max:7,polar:1.42},update:(_t,dt,st)=>{
  const alert=st.atmosphere==='ALERT'
  liaison.g.userData.ambientReaction=alert?'LISTENING':'ROUTINE'
  const talkingLiaison=!alert&&st.active==='NPC_LIAISON'
  liaison.setTalking(talkingLiaison)
  if(st.player&&talkingLiaison){liaison.g.rotation.y=Math.atan2(st.player[0]-liaison.g.position.x,st.player[1]-liaison.g.position.z)}
  const stage=st.hatch??'HIDDEN',wantSweep=['SWEEPING','REVEALED','OPENING','OPEN','DESCENDING'].includes(stage)?1:stage==='COVERED'?.12:0,wantOpen=['OPENING','OPEN','DESCENDING'].includes(stage)?1:0
  const k=st.reduced?1:Math.min(1,dt*1.6);const ps=sweep,po=open;sweep+=(wantSweep-sweep)*k;open+=(wantOpen-open)*(st.reduced?1:Math.min(1,dt*1.3))
  if(Math.abs(sweep-ps)>1e-4)setCover(sweep)
  seamMat.opacity=Math.max(0,Math.min(.75,(sweep-.6)*2))*(1-open)
  if(Math.abs(open-po)>1e-4||open>0){
   const up=Math.min(1,open*2),side=Math.max(0,open*2-1)
   lid.position.set(-.55*side,-.06+.36*up-.27*side,.35*side);lid.rotation.set(.22*side,0,-.35*side)
  }
  const isOpen=open>.08;holeU.value.set(HX,HZ,isOpen?HW:0,isOpen?HD:0);shaft.visible=shaftDark.visible=isOpen;for(const h of shaft.userData.holds as T.Mesh[])h.visible=isOpen
 }}
}

/** S3 · Đồng ruộng và khu lao động — Moonlit paddy field, bamboo weaving (A05), tunnel excavation (A06), and work chant (A10). */
export function buildField(scene:T.Scene,kit:Kit,renderer:T.WebGLRenderer):ZoneEnv{
 const {r2}=buildVillage(scene,kit,renderer,'S1'),root=new T.Group();root.name='S3_R2_MOONLIT_FIELD';scene.add(root)
 configureMoonlitField(scene)
 const moon=new T.DirectionalLight('#c4dcff',1.85);moon.position.set(-14,22,-10);scene.add(moon)
 const ambient=new T.HemisphereLight('#8eb2d9','#2d251b',.75);scene.add(ambient)
 const moonDisc=new T.Mesh(kit.track(new T.SphereGeometry(1.1,20,12)),kit.track(new T.MeshBasicMaterial({color:'#d9e7ed',fog:false,toneMapped:false})));moonDisc.position.set(-18,12,-88);root.add(moonDisc)
 const starPositions:number[]=[]
 for(let i=0;i<100;i++){const a=i*2.3999632,y=.06+(i%17)/20,r=Math.sqrt(1-y*y);starPositions.push(Math.cos(a)*r*85,y*85,Math.sin(a)*r*85)}
 const starGeo=kit.track(new T.BufferGeometry());starGeo.setAttribute('position',new T.Float32BufferAttribute(starPositions,3))
 const stars=new T.Points(starGeo,kit.track(new T.PointsMaterial({color:'#b4c8d8',size:.12,sizeAttenuation:true,fog:false,transparent:true,opacity:.65,depthWrite:false})));root.add(stars)
 const wood=pbr(kit,'rough_wood',{repeat:[1.5,1],color:'#876745'}),bamboo=pbr(kit,'bamboo_wall_02',{repeat:[2,2],color:'#b9a06c'}),earth=pbr(kit,'red_dirt_mud_01',{repeat:[2,2],color:'#7e5539'})
 const mat=(color:string,o:Partial<T.MeshStandardMaterialParameters>={})=>kit.track(new T.MeshStandardMaterial({color,roughness:.85,...o}))
 const targets:Record<string,T.Object3D>={},oilLamps:VietnameseOilLamp[]=[]
 const station=(id:string,x:number,z:number)=>{const g=new T.Group();g.position.set(x,villageHeight(x,z),z);root.add(g);const proxy=new T.Mesh(kit.track(new T.BoxGeometry(.95,.9,.95)),kit.track(new T.MeshBasicMaterial({visible:false})));proxy.position.y=.45;g.add(proxy);g.userData.interactionAnchor=new T.Vector3(0,.6,0);targets[id]=g;return g}
 const water=new T.Mesh(kit.track(new T.PlaneGeometry(26,8)),mat('#2a3f4d',{roughness:.14,metalness:.18}));water.rotation.x=-Math.PI/2;water.position.set(0,.02,-8.2);root.add(water)
 const northDike=new T.Mesh(kit.track(new T.BoxGeometry(26,.22,.75)),earth);northDike.position.set(0,.1,-4.1);northDike.receiveShadow=true;root.add(northDike)
 // A05_STRIPS & A05_WEAVE (west side: bamboo weaving mat & traditional Vietnamese oil lamp)
 const a05Strips=station('A05_STRIPS',-2.5,-1.5)
 const weaveMat=new T.Mesh(kit.track(new T.BoxGeometry(1.6,.025,1.3)),bamboo);weaveMat.position.y=.02;a05Strips.add(weaveMat)
 for(let i=0;i<7;i++){const strip=new T.Mesh(kit.track(new T.BoxGeometry(.75,.015,.04)),bamboo);strip.position.set(-.15,.04,-.25+i*.08);strip.rotation.y=(i%2)*.35;a05Strips.add(strip)}
 const crossStrips:T.Object3D[]=[]
 for(let i=0;i<7;i++){const strip=new T.Mesh(kit.track(new T.BoxGeometry(.04,.015,.75)),bamboo);strip.position.set(-.42+i*.09,.058,.01);a05Strips.add(strip);crossStrips.push(strip)}
 const showCrossWeave=completionReveal('A05_STRIPS',crossStrips)
 oilLamps.push(createVietnameseOilLamp(a05Strips,kit,[.55,.03,-.45],{scale:.92,intensity:2.2,distance:6,decay:1.6,color:'#ffca80'}))
 const a05Weave=station('A05_WEAVE',-3.5,-.5)
 const wovenBasket=place(a05Weave,'wicker_basket_01',[0,.02,0],{scale:.95});place(a05Weave,'wicker_basket_02',[.42,.02,-.25],{scale:.75})
 const showWovenBasket=completionReveal('A05_WEAVE',[wovenBasket])
 const weaver=createRigActor(root,kit,{body:'female',height:1.54,skin:'#c2926e',hair:'Hair_Buns',hairColor:'#171310',clothing:{top:'#1f1e1c',bottom:'#191817',hat:'non',scarf:true},idle:'Fixing_Kneeling',sample:true})
 weaver.g.position.set(-2.5,villageHeight(-2.5,-2.4),-2.4);targets.NPC_WEAVER=weaver.g;weaver.g.userData.interactionBone=weaver.g.getObjectByName('spine_03')
 // A06_DIG & A06_BASKET (east side: excavation trench & basket line)
 const a06Dig=station('A06_DIG',2.5,-1.5)
 const mound=new T.Mesh(kit.track(new T.CylinderGeometry(.55,.82,.38,16)),earth);mound.position.set(0,.19,0);a06Dig.add(mound)
 const hoe=new T.Mesh(kit.track(new T.CylinderGeometry(.025,.025,.85,8)),wood);hoe.position.set(.25,.42,.15);hoe.rotation.z=.45;a06Dig.add(hoe)
 place(a06Dig,'wicker_basket_02',[-.35,.02,.2],{scale:.8})
 const sourceFill=new T.Mesh(kit.track(new T.CylinderGeometry(.2,.17,.08,12)),earth);sourceFill.position.set(-.35,.24,.2);a06Dig.add(sourceFill)
 const showSourceFill=completionReveal('A06_DIG',[sourceFill])
 oilLamps.push(createVietnameseOilLamp(a06Dig,kit,[.62,.02,-.42],{scale:.9,intensity:2.0,distance:6,decay:1.6,color:'#ffca80'}))
 const a06Basket=station('A06_BASKET',3.5,-.5)
 const basketFills:T.Object3D[]=[]
 for(const [bx,bz] of [[-.28,-.15],[.18,.12],[.45,-.2]] as const){place(a06Basket,'wicker_basket_02',[bx,.02,bz],{scale:.72});const dirtFill=new T.Mesh(kit.track(new T.CylinderGeometry(.18,.15,.08,12)),earth);dirtFill.position.set(bx,.22,bz);a06Basket.add(dirtFill);basketFills.push(dirtFill)}
 const showBasketLine=completionReveal('A06_BASKET',basketFills)
 const excavator=createRigActor(root,kit,{body:'male',height:1.64,skin:'#b88764',hair:'Hair_SimpleParted',hairColor:'#171310',clothing:{top:'#201f1d',bottom:'#191817',hat:'taibeo',scarf:true,belt:true},idle:'Idle_Loop',sample:true})
 excavator.g.position.set(2.5,villageHeight(2.5,-2.4),-2.4);targets.NPC_EXCAVATOR=excavator.g;excavator.g.userData.interactionBone=excavator.g.getObjectByName('spine_03')
 // A10_LISTEN & A10_CHANT (center north dike: work chant station)
 const weaveWork=createWorkbench({actor:weaver,kit,kind:'weave',stations:[{id:'A05_STRIPS',object:a05Strips},{id:'A05_WEAVE',object:a05Weave}]})
 const digWork=createWorkbench({actor:excavator,kit,kind:'dig',stations:[{id:'A06_DIG',object:a06Dig},{id:'A06_BASKET',object:a06Basket,carry:true}]})
 const a10Listen=station('A10_LISTEN',-.5,-2.2)
 const post=new T.Mesh(kit.track(new T.CylinderGeometry(.045,.055,1.65,10)),wood);post.position.y=.82;a10Listen.add(post)
 const postShelf=new T.Mesh(kit.track(new T.CylinderGeometry(.12,.08,.03,14)),wood);postShelf.position.y=1.64;a10Listen.add(postShelf)
 oilLamps.push(createVietnameseOilLamp(a10Listen,kit,[0,1.655,0],{scale:.86,intensity:2.4,distance:7,decay:1.5,color:'#ffd494'}))
 const a10Chant=station('A10_CHANT',.8,-2.2)
 place(a10Chant,'wooden_stool_01',[0,0,0],{scale:.85});place(a10Chant,'ceramic_pot',[.32,0,-.15],{scale:.65})
 const chanter=createRigActor(root,kit,{body:'male',height:1.62,skin:'#b98f70',hair:'Hair_SimpleParted',hairColor:'#1a1612',clothing:{top:'#485b32',bottom:'#3b4929',style:'soldier',hat:'taibeo',scarf:true,camoCape:true,belt:true},sample:true})
 const chantWork=createWorkbench({actor:chanter,kit,kind:'rhythm',stations:[{id:'A10_LISTEN',object:a10Chant,offset:[0,0,-.5]},{id:'A10_CHANT',object:a10Chant,offset:[0,0,-.5]}]})
 return {heightAt:villageHeight,floor:r2.floor,targets,endpoints:new Map(),pipes:[],links:[],camera:{position:[0,2.3,6.2],target:[0,1.0,-.8],min:2.2,max:7.5,polar:1.42},update:(t,dt,st)=>{
  const completed=st.completed??[]
  showCrossWeave(completed);showWovenBasket(completed);showSourceFill(completed);showBasketLine(completed)
  if(completed.includes('A06_BASKET'))sourceFill.visible=false
  const alert=st.atmosphere==='ALERT'
  weaver.g.userData.ambientReaction=alert?'LISTENING':'ROUTINE'
  excavator.g.userData.ambientReaction=alert?'LISTENING':'ROUTINE'
  chantWork.update(dt,{active:st.active??st.selectedTarget,reduced:st.reduced,paused:alert,hidden:st.hidden})
  weaveWork.update(dt,{active:st.active??st.selectedTarget,reduced:st.reduced,paused:alert||st.active==='NPC_WEAVER',hidden:st.hidden})
  digWork.update(dt,{active:st.active??st.selectedTarget,reduced:st.reduced,paused:alert||st.active==='NPC_EXCAVATOR',hidden:st.hidden})
  for(const l of oilLamps)l.update(t,st.reduced)
 }}
}

/** S4 · Khu sinh hoạt cộng đồng và văn nghệ — Performance stage (A07), Điểm đăng ký tòng quân + Bàn thờ Tổ quốc (A09), market stalls (A11), Cedar Falls table (A23). */
export function buildCommunity(scene:T.Scene,kit:Kit,renderer:T.WebGLRenderer):ZoneEnv{
 const {r2}=buildVillage(scene,kit,renderer,'S4'),root=new T.Group();root.name='S4_R2_COMMUNITY_CULTURE';scene.add(root)
 configureMoonlitField(scene)
 const nightFill=new T.HemisphereLight('#a8bbd3','#403024',1.1);scene.add(nightFill)
 const moonFill=new T.DirectionalLight('#bbccea',1.2);moonFill.position.set(-8,14,-5);scene.add(moonFill)
 for(const [x,z] of [[2.8,-1.8],[0,1.2]]){const lamp=new T.PointLight('#ffd19a',2.2,6.5,1.5);lamp.position.set(x,1.55,z);root.add(lamp)}
 const wood=pbr(kit,'rough_wood',{repeat:[1.5,1],color:'#8a6946'}),darkWood=pbr(kit,'rough_wood',{repeat:[1,1],color:'#472b1b'}),bamboo=pbr(kit,'bamboo_wall_02',{repeat:[2,2],color:'#bfa571'}),bambooWoven=pbr(kit,'bamboo_wall',{repeat:[2,1.4],color:'#cdb27a'}),thatch=pbr(kit,'thatch_roof_angled',{repeat:[2,1.5],side:T.DoubleSide})
 const cloth=kit.track(new T.MeshStandardMaterial({color:'#c8b896',roughness:.9})),altarWood=kit.track(new T.MeshStandardMaterial({color:'#6e2d20',roughness:.52}))
 const targets:Record<string,T.Object3D>={},oilLamps:VietnameseOilLamp[]=[]
 const station=(id:string,x:number,z:number)=>{const g=new T.Group();g.position.set(x,villageHeight(x,z),z);root.add(g);const proxy=new T.Mesh(kit.track(new T.BoxGeometry(.95,.95,.95)),kit.track(new T.MeshBasicMaterial({visible:false})));proxy.position.y=.48;g.add(proxy);g.userData.interactionAnchor=new T.Vector3(0,.68,0);targets[id]=g;return g}

 // A07_WATCH & A07_CHORUS (west side: cultural performance platform & benches, đèn dầu truyền thống, văn công nón tai bèo + áo choàng vải dù)
 const a07Watch=station('A07_WATCH',-2.5,-1.8)
 const stagePlat=new T.Mesh(kit.track(new T.BoxGeometry(1.7,.18,1.2)),wood);stagePlat.position.y=.09;a07Watch.add(stagePlat)
 oilLamps.push(createVietnameseOilLamp(a07Watch,kit,[-.65,.18,.45],{scale:.86,intensity:1.8,distance:5.5,decay:1.5,color:'#ffcf8c'}))
 oilLamps.push(createVietnameseOilLamp(a07Watch,kit,[.65,.18,.45],{scale:.86,intensity:1.8,distance:5.5,decay:1.5,color:'#ffcf8c'}))
 const a07Chorus=station('A07_CHORUS',-3.5,-.5)
 const bench=new T.Mesh(kit.track(new T.BoxGeometry(1.2,.05,.36)),bamboo);bench.position.y=.38;a07Chorus.add(bench)
 for(const x of [-.48,.48])for(const z of [-.12,.12]){const leg=new T.Mesh(kit.track(new T.BoxGeometry(.05,.38,.05)),wood);leg.position.set(x,.19,z);a07Chorus.add(leg)}
 const troupe=createRigActor(root,kit,{body:'female',height:1.56,skin:'#c59672',hair:'Hair_Buns',hairColor:'#17120e',clothing:{top:'#485b32',bottom:'#394728',style:'soldier',hat:'taibeo',scarf:true,camoCape:true,belt:true},idle:'Idle_Loop',sample:true})
 troupe.g.position.set(-2.5,villageHeight(-2.5,-2.5),-2.5);targets.NPC_TROUPE=troupe.g;troupe.g.userData.interactionBone=troupe.g.getObjectByName('spine_03')

 // ---- A09_LISTEN & A09_FAREWELL: Gian nhà vách phên tre "ĐIỂM ĐĂNG KÝ TÒNG QUÂN", Bàn thờ Tổ quốc treo cờ Mặt trận & Bộ bàn trà tre ----
 {
  const hall=new T.Group();hall.position.set(3.05,villageHeight(3.05,-1.65),-1.65);root.add(hall)
  // Vách phên tre đan chữ L phía sau và bên phải + cột tre + mái lá cao thoáng không chắn tầm nhìn camera
  const backWall=new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(2.95,2.25,.06))),bambooWoven);backWall.position.set(.05,1.125,-1.32);backWall.receiveShadow=true;hall.add(backWall)
  const sideWall=new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(.06,2.25,2.75))),bambooWoven);sideWall.position.set(1.48,1.125,.02);sideWall.receiveShadow=true;hall.add(sideWall)
  const partition=new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(.05,2.05,.52))),bambooWoven);partition.position.set(-.08,1.025,-1.04);partition.receiveShadow=true;hall.add(partition)
  for(const [px,pz] of [[-1.4,-1.3],[-.08,-1.3],[1.46,-1.3],[1.46,1.35]] as const){
   const post=new T.Mesh(kit.track(new T.CylinderGeometry(.048,.055,2.35,10)),wood);post.position.set(px,1.175,pz);post.castShadow=true;hall.add(post)
  }
  const roof=new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(3.25,.14,2.95))),thatch);roof.position.set(.08,2.38,0);roof.rotation.x=.12;roof.castShadow=true;hall.add(roof)
  // Áo xanh bộ đội treo trên vách phên sau lưng cán bộ ghi danh
  const hungJacket=new T.Mesh(kit.track(new T.BoxGeometry(.22,.46,.04)),kit.track(new T.MeshStandardMaterial({color:'#4c5a37',roughness:.92})));hungJacket.position.set(-.58,1.52,-1.26);hungJacket.rotation.z=.08;hall.add(hungJacket)

  // Bàn thờ Tổ quốc bên phải vách phên: bàn gỗ cao sơn nâu đỏ, cờ Mặt trận Dân tộc Giải phóng miền Nam (đỏ - xanh lam, sao vàng), bình hoa cúc vàng, mâm ngũ quả, 3 chén nước & ống hương đỏ
  const altarX=.68,altarZ=-1.02
  const altarTop=new T.Mesh(kit.track(new T.BoxGeometry(1.06,.045,.52)),altarWood);altarTop.position.set(altarX,1.04,altarZ);altarTop.castShadow=true;hall.add(altarTop)
  const altarApron=new T.Mesh(kit.track(new T.BoxGeometry(.98,.24,.46)),altarWood);altarApron.position.set(altarX,.9,altarZ);hall.add(altarApron)
  for(const lx of [-.47,.47])for(const lz of [-.21,.21]){
   const leg=new T.Mesh(kit.track(new T.BoxGeometry(.055,1.02,.055)),altarWood);leg.position.set(altarX+lx,.51,altarZ+lz);leg.castShadow=true;hall.add(leg)
  }
  const flagTex=kit.track(canvasTexture(384,256,(c,w,h)=>{
   c.fillStyle='#cc2222';c.fillRect(0,0,w,h/2)
   c.fillStyle='#3c8fd1';c.fillRect(0,h/2,w,h/2)
   c.fillStyle='#f8d32d';c.beginPath()
   const cx=w/2,cy=h/2,R1=54,R2=21
   for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2===0?R1:R2;const x=cx+Math.cos(a)*rad,y=cy+Math.sin(a)*rad;if(i===0)c.moveTo(x,y);else c.lineTo(x,y)}
   c.closePath();c.fill()
  }))
  const flagMesh=new T.Mesh(kit.track(new T.PlaneGeometry(.86,.56)),kit.track(new T.MeshStandardMaterial({map:flagTex,roughness:.85,side:T.DoubleSide})))
  flagMesh.position.set(altarX,1.56,-1.28);hall.add(flagMesh)

  // Bình gốm trắng hoa lam cắm hoa cúc vàng + lá xanh
  const porcelainTex=kit.track(canvasTexture(128,128,(c,w,h)=>{
   c.fillStyle='#f4f6f8';c.fillRect(0,0,w,h);c.strokeStyle='#2b4f8c';c.lineWidth=4
   c.strokeRect(0,10,w,h-20);for(let i=0;i<5;i++){c.beginPath();c.arc(16+i*24,64,10,0,Math.PI*2);c.stroke()}
  }))
  const porcelainMat=kit.track(new T.MeshStandardMaterial({map:porcelainTex,roughness:.25}))
  const vase=new T.Mesh(kit.track(new T.LatheGeometry([[0,0],[.045,0],[.062,.08],[.04,.16],[.048,.21]].map(([a,b])=>new T.Vector2(a,b)),18)),porcelainMat)
  vase.position.set(altarX+.28,1.062,altarZ+.04);hall.add(vase)
  const yellowFlowerMat=kit.track(new T.MeshStandardMaterial({color:'#f2cb2e',roughness:.75})),leafStemMat=kit.track(new T.MeshStandardMaterial({color:'#3f6b2a',roughness:.85}))
  for(const [fx,fy,fz] of [[0,.27,0],[-.05,.25,.03],[.055,.26,.02],[-.03,.29,-.03],[.04,.28,-.02],[0,.24,.05]] as const){
   const stem=new T.Mesh(kit.track(new T.CylinderGeometry(.004,.004,.12,6)),leafStemMat);stem.position.set(altarX+.28+fx*.5,1.22,altarZ+.04+fz*.5);hall.add(stem)
   const bloom=new T.Mesh(kit.track(new T.SphereGeometry(.026,10,8)),yellowFlowerMat);bloom.scale.y=.65;bloom.position.set(altarX+.28+fx,1.062+fy,altarZ+.04+fz);hall.add(bloom)
  }
  // Đĩa trái cây xanh, 3 chén nước nhỏ & ống hương đỏ
  const plateMat=kit.track(new T.MeshStandardMaterial({color:'#dce3e6',roughness:.35})),fruitMat=kit.track(new T.MeshStandardMaterial({color:'#5d8a34',roughness:.7}))
  const fruitPlate=new T.Mesh(kit.track(new T.CylinderGeometry(.11,.08,.02,16)),plateMat);fruitPlate.position.set(altarX-.28,1.072,altarZ+.04);hall.add(fruitPlate)
  for(const [ox,oz] of [[-.035,-.02],[.035,-.02],[0,.035],[0,-.005]] as const){
   const fr=new T.Mesh(kit.track(new T.SphereGeometry(.034,10,8)),fruitMat);fr.position.set(altarX-.28+ox,1.105,altarZ+.04+oz);hall.add(fr)
  }
  const cupMat=kit.track(new T.MeshStandardMaterial({color:'#e5d8b5',roughness:.45}))
  for(const cx of [-.065,0,.065]){
   const cup=new T.Mesh(kit.track(new T.CylinderGeometry(.016,.012,.026,12)),cupMat);cup.position.set(altarX+cx,1.075,altarZ+.08);hall.add(cup)
  }
  const incenseTube=new T.Mesh(kit.track(new T.CylinderGeometry(.026,.026,.18,14)),kit.track(new T.MeshStandardMaterial({color:'#a62019',roughness:.4})))
  incenseTube.position.set(altarX+.42,1.152,altarZ-.05);hall.add(incenseTube)
 }

 // Bàn ghi danh "ĐIỂM ĐĂNG KÝ TÒNG QUÂN" tại A09_LISTEN ([2.5, -1.8]); xoay 180 độ để thanh niên đứng phía trước bàn đối diện cán bộ tuyển quân
 const a09Listen=station('A09_LISTEN',2.5,-1.8)
 a09Listen.rotation.y=Math.PI
 const desk=new T.Mesh(kit.track(new T.BoxGeometry(1.06,.05,.64)),darkWood);desk.position.y=.72;desk.castShadow=true;a09Listen.add(desk)
 for(const x of [-.46,.46])for(const z of [-.26,.26]){const leg=new T.Mesh(kit.track(new T.BoxGeometry(.052,.72,.052)),darkWood);leg.position.set(x,.36,z);a09Listen.add(leg)}
 const ledger=new T.Mesh(kit.track(new T.BoxGeometry(.34,.022,.24)),kit.track(new T.MeshStandardMaterial({color:'#f0ead8',roughness:.9})));ledger.position.set(.12,.756,-.04);a09Listen.add(ledger)
 // Biển tên tam giác gỗ nâu đỏ in chữ trắng "ĐIỂM ĐĂNG KÝ TÒNG QUÂN"
 const signTex=kit.track(canvasTexture(320,128,(c,w,h)=>{
  c.fillStyle='#7c331d';c.fillRect(0,0,w,h)
  c.strokeStyle='#c9935b';c.lineWidth=5;c.strokeRect(4,4,w-8,h-8)
  c.fillStyle='#fff9eb';c.textAlign='center';c.font='bold 28px sans-serif'
  c.fillText('ĐIỂM ĐĂNG KÝ',w/2,52)
  c.fillText('TÒNG QUÂN',w/2,94)
 }))
 const signPrism=new T.Group();signPrism.position.set(-.18,.795,-.2);a09Listen.add(signPrism)
 const signBody=new T.Mesh(kit.track(new T.CylinderGeometry(.075,.075,.31,3)),kit.track(new T.MeshStandardMaterial({color:'#6e2c18',roughness:.6})))
 signBody.rotation.z=Math.PI/2;signBody.rotation.x=-Math.PI/6;signPrism.add(signBody)
 const signFace=new T.Mesh(kit.track(new T.PlaneGeometry(.3,.118)),kit.track(new T.MeshStandardMaterial({map:signTex,roughness:.48})))
 signFace.position.set(0,.015,-.042);signFace.rotation.y=Math.PI;signFace.rotation.x=.48;signPrism.add(signFace)
 const signFaceBack=new T.Mesh(kit.track(new T.PlaneGeometry(.3,.118)),kit.track(new T.MeshStandardMaterial({map:signTex,roughness:.48})))
 signFaceBack.position.set(0,.015,.042);signFaceBack.rotation.x=-.48;signPrism.add(signFaceBack)
 oilLamps.push(createVietnameseOilLamp(a09Listen,kit,[-.36,.745,.16],{scale:.76,intensity:1.35,distance:4.5,decay:1.6,color:'#ffd08a'}))

 // Cán bộ tuyển quân ngồi ghế tựa sau bàn ghi danh (đối diện thanh niên đăng ký)
 const chairSeat=new T.Mesh(kit.track(new T.BoxGeometry(.44,.04,.42)),darkWood);chairSeat.position.set(2.5,villageHeight(2.5,-2.32)+.43,-2.32);root.add(chairSeat)
 const chairBack=new T.Mesh(kit.track(new T.BoxGeometry(.44,.46,.04)),darkWood);chairBack.position.set(2.5,villageHeight(2.5,-2.32)+.68,-2.51);root.add(chairBack)
 const recruiter=createRigActor(root,kit,{body:'male',height:1.62,skin:'#bf906c',hair:'Hair_SimpleParted',brows:true,hairColor:'#181410',clothing:{top:'#444d33',bottom:'#252620',style:'soldier',belt:'leather'},idle:'Sitting_Idle_Loop',sample:true})
 recruiter.g.position.set(2.5,villageHeight(2.5,-2.28)-.06,-2.28);recruiter.g.rotation.y=0

 // A09_FAREWELL ([3.5, -0.5]): Bộ bàn ghế tre nan dọc + ấm trà gốm trắng hoa lam + gói khăn kỷ vật & mảnh thư
 const a09Farewell=station('A09_FAREWELL',3.5,-.5)
 const teaTable=new T.Mesh(kit.track(new T.BoxGeometry(.76,.045,.54)),bamboo);teaTable.position.y=.52;teaTable.castShadow=true;a09Farewell.add(teaTable)
 for(const x of [-.32,.32])for(const z of [-.21,.21]){const leg=new T.Mesh(kit.track(new T.CylinderGeometry(.024,.024,.52,8)),bamboo);leg.position.set(x,.26,z);a09Farewell.add(leg)}
 // Ghế trường kỷ tre có tay vịn đặt cạnh bàn trà
 const bambooSettee=new T.Group();bambooSettee.position.set(-.62,0,-.15);bambooSettee.rotation.y=Math.PI/2;a09Farewell.add(bambooSettee)
 const setteeSeat=new T.Mesh(kit.track(new T.BoxGeometry(1.12,.04,.44)),bamboo);setteeSeat.position.y=.38;bambooSettee.add(setteeSeat)
 const setteeBack=new T.Mesh(kit.track(new T.BoxGeometry(1.12,.36,.035)),bamboo);setteeBack.position.set(0,.58,-.2);bambooSettee.add(setteeBack)
 for(const x of [-.52,.52])for(const z of [-.18,.18]){const leg=new T.Mesh(kit.track(new T.CylinderGeometry(.024,.024,.48,8)),bamboo);leg.position.set(x,.24,z);bambooSettee.add(leg)}
 // Bình trà gốm trắng hoa lam trên bàn tre
 const teapotMat=kit.track(new T.MeshStandardMaterial({color:'#eef3f7',roughness:.24}))
 const teapot=new T.Mesh(kit.track(new T.CylinderGeometry(.062,.068,.13,16)),teapotMat);teapot.position.set(-.18,.61,.06);a09Farewell.add(teapot)
 const teapotBand=new T.Mesh(kit.track(new T.CylinderGeometry(.069,.069,.035,16)),kit.track(new T.MeshStandardMaterial({color:'#2d5394',roughness:.3})));teapotBand.position.set(-.18,.61,.06);a09Farewell.add(teapotBand)
 const scarfParcel=new T.Mesh(kit.track(new T.BoxGeometry(.26,.04,.22)),cloth);scarfParcel.position.set(.14,.565,-.04);a09Farewell.add(scarfParcel)
 const showFarewell=completionReveal('A09_FAREWELL',[scarfParcel])

 // Thanh niên đăng ký tòng quân (NPC_YOUTH): áo xanh chàm, quần sẫm, thắt lưng kaki, khăn rằn quấn đầu & cổ đúng như tư liệu hình ảnh
 const youth=createRigActor(root,kit,{body:'male',height:1.65,skin:'#bd8d69',hair:'Hair_SimpleParted',brows:true,hairColor:'#171310',clothing:{top:'#2d4178',bottom:'#23252b',scarf:true,headScarf:true,belt:'leather'},idle:'Idle_Loop',sample:true})
 youth.g.position.set(2.5,villageHeight(2.5,-1.45),-1.45);targets.NPC_YOUTH=youth.g;youth.g.userData.interactionBone=youth.g.getObjectByName('spine_03')

 // A11_BROWSE & A11_CONNECT (south foreground: storytelling rural market stalls)
 const a11Browse=station('A11_BROWSE',-1.2,1.2)
 const stall1=new T.Mesh(kit.track(new T.BoxGeometry(1.15,.04,.75)),bamboo);stall1.position.y=.52;a11Browse.add(stall1)
 for(const x of [-.5,.5])for(const z of [-.3,.3]){const leg=new T.Mesh(kit.track(new T.CylinderGeometry(.024,.024,.52,8)),bamboo);leg.position.set(x,.26,z);a11Browse.add(leg)}
 place(a11Browse,'wicker_basket_01',[-.28,.54,0],{scale:.62});place(a11Browse,'wooden_bowl_01',[.25,.54,.1],{scale:.95})
 const a11Connect=station('A11_CONNECT',1.2,1.2)
 const stall2=new T.Mesh(kit.track(new T.BoxGeometry(1.15,.04,.75)),bamboo);stall2.position.y=.52;a11Connect.add(stall2)
 for(const x of [-.5,.5])for(const z of [-.3,.3]){const leg=new T.Mesh(kit.track(new T.CylinderGeometry(.024,.024,.52,8)),bamboo);leg.position.set(x,.26,z);a11Connect.add(leg)}
 place(a11Connect,'wicker_basket_02',[-.25,.54,0],{scale:.62});place(a11Connect,'ceramic_pot',[.25,.54,0],{scale:.55})
 const food=new T.Group();a11Browse.add(food)
 const foodMaterial=kit.track(new T.MeshStandardMaterial({color:'#e5d5ad',roughness:.9}))
 for(let i=0;i<3;i++){const paper=new T.Mesh(kit.track(new T.CylinderGeometry(.14,.14,.012,18)),foodMaterial);paper.position.set(.25,.58+i*.014,.1);food.add(paper)}
 const showFood=completionReveal('A11_BROWSE',[food])
 const sharedParcel=new T.Group();a11Connect.add(sharedParcel)
 const parcel=new T.Mesh(kit.track(new T.BoxGeometry(.28,.16,.25)),cloth);parcel.position.set(0,.63,.12);sharedParcel.add(parcel)
 const tieMaterial=kit.track(new T.MeshStandardMaterial({color:'#6b7550',roughness:.95}))
 for(const [w,h,d] of [[.025,.165,.255],[.285,.165,.025]] as const){const tie=new T.Mesh(kit.track(new T.BoxGeometry(w,h,d)),tieMaterial);tie.position.copy(parcel.position);sharedParcel.add(tie)}
 const showSharedParcel=completionReveal('A11_CONNECT',[sharedParcel])
 const rhythmWork=createWorkbench({actor:troupe,kit,kind:'rhythm',stations:[{id:'A07_WATCH',object:a07Watch,offset:[0,.18,-.25],height:1.24},{id:'A07_CHORUS',object:a07Watch,offset:[0,.18,-.25],height:1.24}]})
 const farewellWork=createWorkbench({actor:youth,kit,kind:'parcel',stations:[{id:'A09_LISTEN',object:a09Listen,height:.94},{id:'A09_FAREWELL',object:a09Farewell,height:.94}]})
 const market=createRigActor(root,kit,{body:'female',height:1.53,skin:'#bb8f6e',hair:'Hair_Buns',hairColor:'#171310',clothing:{top:'#38291f',bottom:'#1b1a18',hat:'non',scarf:true},sample:true})
 const marketWork=createWorkbench({actor:market,kit,kind:'parcel',stations:[{id:'A11_BROWSE',object:a11Browse,height:.88},{id:'A11_CONNECT',object:a11Connect,height:.88}]})
 // A23_CAMPAIGN (center north: Cedar Falls 01/1967 historical context sand table)
 const a23=station('A23_CAMPAIGN',0,-2.2)
 const tableTop=new T.Mesh(kit.track(new T.BoxGeometry(1.35,.08,.95)),wood);tableTop.position.y=.72;a23.add(tableTop)
 for(const x of [-.58,.58])for(const z of [-.38,.38]){const leg=new T.Mesh(kit.track(new T.BoxGeometry(.06,.72,.06)),wood);leg.position.set(x,.36,z);a23.add(leg)}
 const mapRelief=new T.Mesh(kit.track(new T.BoxGeometry(1.15,.03,.76)),kit.track(new T.MeshStandardMaterial({color:'#6c7a55',roughness:.8})));mapRelief.position.y=.775;a23.add(mapRelief)
 for(const [mx,mz,col] of [[-.32,-.15,'#c97a4b'],[.25,.12,'#8fc5a4'],[0,-.05,'#e6c37a'],[.35,-.2,'#7fb6ff']] as const){
  const pin=new T.Mesh(kit.track(new T.CylinderGeometry(.04,.05,.08,12)),kit.track(new T.MeshStandardMaterial({color:col})));pin.position.set(mx,.82,mz);a23.add(pin)
 }
 return {heightAt:villageHeight,floor:r2.floor,targets,endpoints:new Map(),pipes:[],links:[],camera:{position:[0,2.3,6.2],target:[0,1.0,-.8],min:2.2,max:7.5,polar:1.42},update:(t,dt,st)=>{
  const completed=st.completed??[]
  showFarewell(completed);showFood(completed);showSharedParcel(completed)
  const alert=st.atmosphere==='ALERT'
  troupe.g.userData.ambientReaction=alert?'LISTENING':'ROUTINE'
  youth.g.userData.ambientReaction=alert?'LISTENING':'ROUTINE'
  recruiter.g.userData.ambientReaction=alert?'LISTENING':'ROUTINE'
  troupe.setTalking(!alert&&st.active==='NPC_TROUPE')
  youth.setTalking(!alert&&st.active==='NPC_YOUTH')
  recruiter.setIdle(!alert&&(st.active==='A09_LISTEN'||st.active==='NPC_YOUTH')?'Sitting_Talking_Loop':'Sitting_Idle_Loop')
  rhythmWork.update(dt,{active:st.active??st.selectedTarget,reduced:st.reduced,paused:alert||st.active==='NPC_TROUPE',hidden:st.hidden})
  farewellWork.update(dt,{active:st.active??st.selectedTarget,reduced:st.reduced,paused:alert||st.active==='NPC_YOUTH',hidden:st.hidden})
  marketWork.update(dt,{active:st.active??st.selectedTarget,reduced:st.reduced,paused:alert,hidden:st.hidden})
  for(const l of oilLamps)l.update(t,st.reduced)
 }}
}
