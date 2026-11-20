import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import type {ZoneEnv} from '../zoneEnvironments'
import type {Zone} from '../worldModel'
import {place,preload,r2Texture,pbr,roomEnvironment,canvasTexture} from './r2Assets'
import {R2_CHAR_FILES} from './r2Actors'
import {passages,passagePoints,passageFloor,passageRoof} from '../undergroundContinuity'
import {tunnelLayouts,isTunnelZone} from '../tunnelLayouts'

// Enterable tunnel sections for L1-B / L1-D / L2-A / L3-A (G3 immersive integration, LOOKDEV CANDIDATE).
// RECONSTRUCTED · THEMATIC: the network is a gameplay layout, not a surveyed plan. Historical reference (UNESCO 7038,
// Bến Dược): passages ~62 × 104 cm (L1/L2), 75 × 95 cm (L3); hatch L1→L2 43 × 48 cm; vents 10–15 cm.
// Gameplay dimensions: passages 75 cm wide × 120 cm high so the third-person camera and a crouching Avatar fit
// (adaptation recorded in SCENE-HISTORICAL-REGISTER.csv); hatches and vents keep their historical size.
// The walk grid (worldModel) and this carved mask both come from tunnelLayouts.ts: each layer has its own layout.

const MATERIALS=['clay_plaster','red_dirt_mud_01','excavated_soil_wall','dirt_floor','rough_wood','bamboo_wall_02']
export const prepareTunnel=()=>preload({materials:MATERIALS,models:['vintage_oil_lamp','wooden_bowl_01','ceramic_pot','wicker_basket_02','wooden_bucket_01','wicker_basket_01','wooden_stool_01','wooden_broom','pot_enamel_01'],chars:R2_CHAR_FILES})

type Seg={a:[number,number];b:[number,number];r:number;h:number}
type Room={c:[number,number];r:number;h:number}
const HIGH=1.2
/** Visual carve for one layer: walk centrelines subdivided and nudged sideways (meander) — the walk grid stays on the centre. */
function zoneLayout(zone:Zone){
 const l=tunnelLayouts[isTunnelZone(zone)?zone:'L1-B'],extra:Seg[]=[]
 for(const s of l.segs){const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],len=Math.hypot(dx,dz),n=Math.max(1,Math.round(len/.8)),px=-dz/(len||1),pz=dx/(len||1)
  let prev:[number,number]=[...s.a]
  for(let k=1;k<=n;k++){const t=k/n,w=k<n?Math.sin(k*2.3+s.a[0]*1.7+s.a[1])*l.meander:0,next:[number,number]=[s.a[0]+dx*t+px*w,s.a[1]+dz*t+pz*w];extra.push({a:prev,b:next,r:l.half,h:l.high});prev=next}}
 return {rooms:l.rooms as Room[],extra,tone:l.tone,depth:l.depth,lay:l}
}
const segDist=(px:number,pz:number,s:Seg)=>{const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],t=T.MathUtils.clamp(((px-s.a[0])*dx+(pz-s.a[1])*dz)/(dx*dx+dz*dz),0,1);return Math.hypot(px-s.a[0]-dx*t,pz-s.a[1]-dz*t)}
const nz=(x:number,z:number,k=1)=>Math.sin(x*7.1*k+Math.sin(z*5.3*k))*Math.cos(z*6.7*k+Math.sin(x*4.1*k))

let insideFn:((x:number,y:number,z:number)=>boolean)|null=null
/** True when a point is inside the carved space of the most recently built tunnel (camera collision). */
export const tunnelInside=(x:number,y:number,z:number)=>insideFn?insideFn(x,y,z):true
export function buildTunnel(scene:T.Scene,kit:Kit,zone:Zone,renderer:T.WebGLRenderer,opts:{parent?:T.Object3D;xray?:boolean}={}):ZoneEnv{
 const host=opts.parent??scene,xray=!!opts.xray
 const modelLayers:T.Mesh[]=[],modelLinks:T.Mesh[]=[],relationLines:{mesh:T.Line;id:string}[]=[]
 const lay=zoneLayout(zone),segs=lay.extra,rooms=lay.rooms,wet=lay.depth==='L3',T_=(id:string,dy=0):[number,number,number]=>{const p=lay.lay.targets[id]?.at??[0,0];return [p[0],dy,p[1]]}
 if(!xray){const env=roomEnvironment(renderer);kit.track(env);scene.environment=env.texture;scene.environmentIntensity=.06;scene.background=new T.Color('#060403');scene.fog=new T.Fog('#0b0806',3,11)}
 // ---- carved shell: one heightfield whose arch height follows the distance to the nearest corridor/room ----
 const doorPoints=Object.values(passages).filter(p=>p.from===zone).flatMap(passagePoints),x0=Math.min(-4.4,...doorPoints.map(p=>p[0]-.6)),x1=Math.max(4.4,...doorPoints.map(p=>p[0]+.6)),z0=Math.min(-2.4,...doorPoints.map(p=>p[2]-.6)),z1=Math.max(3.9,...doorPoints.map(p=>p[2]+.6)),step=.035,nx=Math.round((x1-x0)/step),nzc=Math.round((z1-z0)/step)
 const heightAt=(x:number,z:number)=>{let h=passageFloor(zone,x,z)-.03
  const wob=nz(x,z)*.035+nz(x,z,2.7)*.015
  for(const s of segs){const u=(segDist(x,z,s)+wob)/s.r;if(u<1)h=Math.max(h,s.h*Math.sqrt(1-u**6)*(1+nz(x*.5,z*.5)*.04))}
  for(const r of rooms){const u=(Math.hypot(x-r.c[0],z-r.c[1])+wob*1.4)/r.r;if(u<1)h=Math.max(h,r.h*Math.sqrt(1-u**5))}
  return Math.max(h,passageRoof(zone,x,z))}
 if(!xray)insideFn=(x,y,z)=>y>passageFloor(zone,x,z)+.05&&y<heightAt(x,z)-.08
 const g=new T.BufferGeometry(),pos=new Float32Array((nx+1)*(nzc+1)*3),uv=new Float32Array((nx+1)*(nzc+1)*2),idx:number[]=[]
 for(let j=0;j<=nzc;j++)for(let i=0;i<=nx;i++){const x=x0+i*step,z=z0+j*step,y=heightAt(x,z),k=j*(nx+1)+i;pos.set([x,y,z],k*3);uv.set([(x+z)*.9,(y+(x-z)*.22)*.9],k*2)}
 for(let j=0;j<nzc;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+1,d=c+1;if(pos[a*3+1]<0&&pos[b*3+1]<0&&pos[c*3+1]<0&&pos[d*3+1]<0)continue;idx.push(a,b,c,b,d,c)} // winding faces the inside
 g.setAttribute('position',new T.BufferAttribute(pos,3));g.setAttribute('uv',new T.BufferAttribute(uv,2));g.setAttribute('uv1',new T.BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals()
 const earth=kit.track(new T.MeshStandardMaterial({map:r2Texture('clay_plaster_Diffuse.webp',[1.2,1.2]),normalMap:r2Texture('red_dirt_mud_01_nor_gl.webp',[1.6,1.6]),roughnessMap:r2Texture('red_dirt_mud_01_arm.webp',[1.3,1.3]),aoMap:r2Texture('excavated_soil_wall_arm.webp',[1,1]),color:lay.tone,roughness:wet?.8:1,metalness:0,side:T.DoubleSide}))
 for(const t of [earth.map,earth.normalMap,earth.roughnessMap,earth.aoMap])if(t)kit.track(t)
 // QC (G3 QA Lighting & material): dry clay walls read as glossy/streaky under the lamps — keep them matte, softer relief;
 // only L3 keeps a damp sheen from the roughness map.
 // R2 QC-MATERIAL: L3 still showed a strong wet sheen and repeated relief — keep only a faint damp response, flatter relief.
 if(!wet){earth.roughnessMap=null;earth.roughness=1;earth.normalScale.set(.55,.55)}else{earth.roughnessMap=null;earth.roughness=1;earth.normalScale.set(.25,.25);earth.color.multiplyScalar(.88)} // R2 retest: roughnessMap×1 still read glossy under the lamps → matte, damp read only from darker tone
 if(xray){earth.transparent=true;earth.opacity=.42;earth.depthWrite=false}
 const shell=new T.Mesh(kit.track(g),earth);shell.castShadow=shell.receiveShadow=true;host.add(shell)
 const floor=new T.Mesh(kit.track((()=>{const fg=new T.PlaneGeometry(x1-x0,z1-z0,Math.ceil((x1-x0)/.12),Math.ceil((z1-z0)/.12)).rotateX(-Math.PI/2).translate((x0+x1)/2,0,(z0+z1)/2),fp=fg.attributes.position;for(let i=0;i<fp.count;i++)fp.setY(i,passageFloor(zone,fp.getX(i),fp.getZ(i)));fg.computeVertexNormals();return fg})()),pbr(kit,'dirt_floor',{repeat:[6,4.5],color:wet?'#6d5444':'#9c7a62'}));floor.receiveShadow=true;host.add(floor)
 floor.geometry.setAttribute('uv1',floor.geometry.attributes.uv)
 if(xray){floor.visible=false;const fg=new T.BufferGeometry(),fp=pos.slice();for(let q=1;q<fp.length;q+=3)fp[q]=.005;fg.setAttribute('position',new T.BufferAttribute(fp,3));fg.setAttribute('uv',new T.BufferAttribute(uv,2));fg.setIndex(idx);fg.computeVertexNormals();const cast=new T.Mesh(kit.track(fg),pbr(kit,'dirt_floor',{repeat:[1,1],color:wet?'#6d5444':'#9c7a62',side:T.DoubleSide}));cast.receiveShadow=true;host.add(cast)}
 if(!xray)host.add(new T.HemisphereLight('#7a6450','#1a120c',.3))
 const targets:Record<string,T.Object3D>={},lights:T.PointLight[]=[],flames:T.Mesh[]=[]
 const flameMat=kit.memo('r2-flame',()=>new T.MeshStandardMaterial({color:'#000',emissive:'#ffcf8a',emissiveIntensity:12}))
 const lamp=(x:number,y:number,z:number,i=1.6)=>{place(host,'vintage_oil_lamp',[x,y,z],{scale:.75});const l=new T.PointLight('#ffb56a',xray?0:i,5.5,1.7);l.position.set(x,y+.2,z);if(!xray)host.add(l);lights.push(l);const f=new T.Mesh(kit.geo('r2-flame-geo',()=>new T.SphereGeometry(.016,8,6)),flameMat);f.position.set(x,y+.17,z);host.add(f);flames.push(f)}
 const beamMat=kit.memo('r2-beam',()=>new T.MeshBasicMaterial({color:'#fff2d8',transparent:true,opacity:.1,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}))
 const beam=(x:number,z:number,top:number,r:number)=>{const m=new T.Mesh(kit.geo('r2-beam-'+r,()=>{const c=new T.CylinderGeometry(r*.7,r*1.4,top,20,1,true);c.translate(0,top/2,0);return c}),beamMat);m.position.set(x,0,z);host.add(m);const s=new T.SpotLight('#fff1d6',6,top+2,.35,.6,1.2);s.position.set(x,top+.5,z);s.target.position.set(x,0,z);if(!xray)host.add(s,s.target);m.visible=!xray;return m}
 const proxy=(at:[number,number,number],size:[number,number,number])=>{const m=new T.Mesh(kit.geo('r2-proxy-'+size.join(),()=>new T.BoxGeometry(...size)),kit.memo('r2-proxy-mat',()=>new T.MeshBasicMaterial({visible:false})));m.position.set(...at);host.add(m);return m}
 const wood=pbr(kit,'rough_wood',{repeat:[.5,.5],color:'#8b6a4c'})
 const hatch=(x:number,z:number,id:string)=>{const grp=new T.Group();grp.position.set(x,0,z);host.add(grp)
  const hole=new T.Mesh(kit.geo('r2-hatch-hole',()=>new T.PlaneGeometry(.43,.48)),kit.memo('r2-hole-mat',()=>new T.MeshBasicMaterial({color:'#020101'})));hole.rotation.x=-Math.PI/2;hole.position.y=.006;grp.add(hole)
  for(const [w,d,px,pz] of [[.55,.06,0,-.27],[.55,.06,0,.27],[.06,.48,-.245,0],[.06,.48,.245,0]] as const){const f=new T.Mesh(kit.geo(`r2-hf-${w}-${d}`,()=>new T.BoxGeometry(w,.05,d)),wood);f.position.set(px,.025,pz);f.castShadow=true;grp.add(f)}
  const lid=new T.Mesh(kit.geo('r2-hatch-lid',()=>new T.BoxGeometry(.47,.04,.52)),wood);lid.position.set(.42,.06,.1);lid.rotation.y=.4;grp.add(lid)
  targets[id]=grp;return grp}
 // spawn: entry shaft with daylight from the surface hatch (THEMATIC entry; not a surveyed entrance)
 if(zone==='L1-A')beam(0,3.62,HIGH+.3,.17) // r16 PO: daylight only under the surface hatch; deeper shafts open onto dark tunnels (a lit cone there read as a portal and washed over the climbing Avatar). Kept behind the spawn camera so the follow camera never sits inside the light cone
 lamp(.32,.02,3.55,1.2);for(const [x,y,z,i] of lay.lay.lamps)lamp(x,y,z,i)
 if(zone==='L1-A'){
  // Visible shaft/steps, two branches and the upward return: interpretive entry, not a surveyed site.
  // QA (L1-A arrival): the entry opening is in the CEILING above the shaft (the hatch the player came through), and the
  // foot-holds are cut into the north wall — nothing on the walkable floor for the Avatar to clip through.
  {const h=hatch(0,3.62,'ENTRANCE_SHAFT');h.position.y=1.48;h.rotation.x=Math.PI}for(let i=0;i<4;i++){const step=new T.Mesh(kit.geo('r2-entry-hold',()=>new T.BoxGeometry(.32,.06,.16)),wood);step.position.set(0,.25+i*.3,3.82);host.add(step)}
 }else if(zone==='L1-B'){
  // vent: bamboo pipe through the ceiling, 12 cm bore (R01: 10–15 cm), daylight shaft
  const vo=T_('AIR_SURFACE_OPENING'),vent=new T.Group();vent.position.set(vo[0],0,vo[2]+.5);host.add(vent)
  const pipe=new T.Mesh(kit.geo('r2-vent-pipe',()=>new T.CylinderGeometry(.06,.06,.5,14,1,true)),pbr(kit,'bamboo_wall_02',{repeat:[.3,1],color:'#b8a77a',side:T.DoubleSide}));pipe.position.y=1.3;vent.add(pipe)
  beam(vo[0],vo[2]+.5,1.4,.05);const vp=proxy([0,0,0],[.4,.5,.4]);vent.add(vp);vp.position.set(0,1.05,0);targets.AIR_SURFACE_OPENING=vent
  targets.AIR_PASSAGE=proxy(T_('AIR_PASSAGE',.55),[.55,.9,.4])
  const io=T_('AIR_INTERIOR');targets.AIR_INTERIOR=proxy([io[0],1.1,io[2]-.05],[1.4,.5,.3])
  const life=new T.Group();life.position.set(io[0]+.1,0,io[2]+.2);host.add(life)
  const mat=new T.Mesh(kit.geo('r2-mat',()=>new T.BoxGeometry(1.1,.02,.65)),pbr(kit,'bamboo_wall_02',{repeat:[1.5,1],color:'#d8c49a'}));mat.position.y=.012;mat.receiveShadow=true;life.add(mat)
  place(life,'wooden_bowl_01',[-.2,.03,.05]);place(life,'ceramic_pot',[.45,0,-.15],{scale:.8})
  life.add(proxy([0,.25,0],[1.1,.5,.7]));targets.LINK_AIR_LIFE=life
 }else if(zone==='L2-D'||zone==='L3-D'){
  const modelLight=new T.PointLight('#ffe0ac',2.4,5,1.5);modelLight.position.set(0,1.8,.3);host.add(modelLight)
  // Original teaching model inside a walkable room. Generic historical principles,
  // THEMATIC_SCENE / RECONSTRUCTED; no surveyed room location or weapon store.
  const table=new T.Mesh(kit.track(new T.BoxGeometry(2.6,.12,1.6)),wood);table.position.set(0,.64,-.8);host.add(table)
  for(const x of [-1.1,1.1])for(const z of [-1.4,-.2]){const leg=new T.Mesh(kit.track(new T.BoxGeometry(.09,.65,.09)),wood);leg.position.set(x,.32,z);host.add(leg)}
  const clay=kit.track(new T.MeshStandardMaterial({color:'#b98a62',roughness:.95}))
  const modelRoot=new T.Group();host.add(modelRoot)
  if(zone==='L2-D'){
   modelRoot.position.set(0,.76,-.8)
   // Authored teaching cutaway: staggered openings are readable from the room,
   // not an archaeological plan. The top plate represents the surface.
   for(let i=0;i<4;i++){
    const section=new T.Shape();section.moveTo(-.9,-.07);section.lineTo(.9,-.07);section.lineTo(.9,.07);section.lineTo(-.9,.07);section.closePath()
    if(i<3)for(const x of [-.55+i*.12,.28-i*.08]){const hole=new T.Path();hole.absellipse(x,0,.17,.047,0,Math.PI*2,true);section.holes.push(hole)}
    const geometry=new T.ExtrudeGeometry(section,{depth:.8,bevelEnabled:false,curveSegments:16});geometry.translate(0,0,-.4)
    const slab=new T.Mesh(kit.track(geometry),clay);slab.position.set((i-1.5)*.06,i*.18,0);modelRoot.add(slab);modelLayers.push(slab)
    const title=['L3','L2','L1','Mặt đất'][i],texture=kit.track(canvasTexture(256,64,c=>{c.fillStyle='#241e15';c.fillRect(0,0,256,64);c.fillStyle='#f3e2bb';c.textAlign='center';c.font='30px sans-serif';c.fillText(title,128,43)}))
    const tag=new T.Mesh(kit.track(new T.PlaneGeometry(.32,.08)),kit.track(new T.MeshBasicMaterial({map:texture})));tag.position.set(.68,0,.405);slab.add(tag)
   }
   for(let i=0;i<3;i++){
    const link=new T.Mesh(kit.track(new T.CylinderGeometry(.018,.018,1,10)),kit.track(new T.MeshStandardMaterial({color:'#d4b37a',roughness:.8})))
    modelRoot.add(link);modelLinks.push(link)
   }
   targets.MODEL_COMPARE=modelRoot;modelRoot.userData.interactionAnchor=new T.Vector3(0,.25,0)
  }else{
   const names=['ENTRANCE','STRUCTURE','AIR','LIVING','SUPPORT','COMMUNITY']
   names.forEach((name,i)=>{const n=new T.Mesh(kit.track(new T.CylinderGeometry(.15,.18,.12,24)),kit.track(new T.MeshStandardMaterial({color:['#c09d65','#bc8151','#83b6ab','#91ae78','#c5a568','#aabe8b'][i],roughness:.8})));n.position.set((i%3-1)*.8,.82,-.7-Math.floor(i/3)*.6);host.add(n);targets['SYN_'+name]=n
    const caption=kit.track(canvasTexture(512,128,x=>{x.fillStyle='#201c15';x.fillRect(0,0,512,128);x.fillStyle='#f3e2bb';x.font='bold 27px sans-serif';x.textAlign='center';x.fillText(['Lối vào','Tổ chức không gian','Thông khí','Điều kiện sinh hoạt','Bếp · nước · chăm sóc','Cộng đồng'][i],256,75)}))
    const sign=new T.Mesh(kit.track(new T.PlaneGeometry(.66,.16)),kit.track(new T.MeshBasicMaterial({map:caption,side:T.DoubleSide})));sign.rotation.x=-Math.PI/2;sign.position.set(0,.08,.2);n.add(sign)})
   for(const [a,b,id] of [['ENTRANCE','STRUCTURE','ENTRANCE_STRUCTURE_ORGANIZES_SPACE'],['AIR','LIVING','AIR_SUPPORTS_LIVING_CONDITIONS'],['SUPPORT','COMMUNITY','KITCHEN_WATER_MEDICAL_SUPPORT_COMMUNITY']]){
    const points=[targets['SYN_'+a].position.clone(),targets['SYN_'+b].position.clone()];points.forEach(p=>p.y+=.09)
    const line=new T.Line(kit.track(new T.BufferGeometry().setFromPoints(points)),kit.track(new T.LineBasicMaterial({color:'#a6d3a1'})));line.visible=false;host.add(line);relationLines.push({mesh:line,id})
   }
  }
 }else if(zone==='L1-D' ||zone==='L2-A'){
  const layer=zone==='L1-D'?1:2,lo=T_(`STRUCT_LAYER_${layer}`),room=new T.Group();room.position.set(lo[0],0,lo[2]+.35);host.add(room)
  if(layer===2){const mat=new T.Mesh(kit.geo('r2-mat2',()=>new T.BoxGeometry(1.2,.02,.8)),pbr(kit,'bamboo_wall_02',{repeat:[1.5,1],color:'#cdb88e'}));mat.position.y=.012;room.add(mat);place(room,'wicker_basket_02',[.55,0,-.3],{rotY:.8});place(room,'wooden_bowl_01',[-.25,.03,0]);}
  else place(room,'wooden_bucket_01',[.15,0,-.2],{rotY:1})
  room.add(proxy([0,.6,0],[1,1.1,.8]));targets[`STRUCT_LAYER_${layer}`]=room
  {const id=layer===1?'STRUCT_LINK_12':'STRUCT_LINK_23',h=T_(id);hatch(h[0],h[2],id)}
  if(layer===2){
   // L2-D interpretive niche (THEMATIC): a clay section model on a low shelf; inspecting it opens the four-layer cutaway.
   const no=T_('L2D_NICHE'),niche=new T.Group();niche.position.set(no[0],0,no[2]);host.add(niche)
   const shelf=new T.Mesh(kit.geo('r2-l2d-shelf',()=>new T.BoxGeometry(.5,.3,.42)),wood);shelf.position.y=.15;shelf.castShadow=true;niche.add(shelf)
   const clay=kit.memo('r2-l2d-clay',()=>new T.MeshStandardMaterial({color:'#b98a62',roughness:.95}))
   for(let k=0;k<4;k++){const slab=new T.Mesh(kit.geo('r2-l2d-slab',()=>new T.BoxGeometry(.36,.035,.28)),clay);slab.position.set((k-1.5)*.03,.33+k*.07,0);niche.add(slab)}
   // The four-level teaching model is in the room, before the optional X-ray view.
   const linkMat=kit.memo('r2-model-link',()=>new T.MeshStandardMaterial({color:'#685439',roughness:1}))
   for(let k=0;k<3;k++){const link=new T.Mesh(kit.geo('r2-model-link',()=>new T.CylinderGeometry(.012,.012,.08,8)),linkMat);link.position.set(-.1+k*.08,.365+k*.07,.04);niche.add(link)}
   niche.add(proxy([0,.45,0],[.6,.9,.6]));targets.L2D_NICHE=niche
  }
 }else{
  // Deep structure observation: an educational section model, never an unsourced underground well.
  const wo=T_('STRUCT_LAYER_3'),room=new T.Group();room.position.set(wo[0],0,wo[2]+.35);host.add(room)
  const clay=kit.memo('r2-deep-model',()=>new T.MeshStandardMaterial({color:'#a17a55',roughness:1}))
  for(let k=0;k<4;k++){const slab=new T.Mesh(kit.geo('r2-deep-slab',()=>new T.BoxGeometry(.65,.065,.4)),clay);slab.position.set(k*.04,.08+k*.12,0);slab.receiveShadow=true;room.add(slab)}
  place(room,'wooden_bowl_01',[.6,.02,.1],{scale:.6})
  room.add(proxy([0,.5,0],[1,1,.9]));targets.STRUCT_LAYER_3=room
 }
 // reference frame: real section size (62 × 104 cm) drawn as a thin outline at the entry, for honesty about scale
 const ref=new T.LineSegments(kit.track(new T.EdgesGeometry(new T.PlaneGeometry(.62,1.04).translate(0,.52,0))),kit.memo('r2-ref-line',()=>new T.LineBasicMaterial({color:'#e6b07a',transparent:true,opacity:.55})));ref.position.set(0,.01,2.45);ref.visible=xray;host.add(ref) // scale reference only in the cutaway; in walk view it read as stray lines
 return {heightAt:(x,z)=>passageFloor(zone,x,z),floor,targets,endpoints:new Map(),pipes:[],links:[],camera:{position:[0,1,3.2],target:[0,.9,1.6],min:.7,max:1.8,polar:1.55},update:(t,_dt,s)=>{
  modelLayers.forEach((m,i)=>{m.position.y=i*(s.completed?.includes('MODEL_COMPARE')?.3:.18)})
  modelLinks.forEach((link,i)=>{
   const x=i%2===0?-.42:.38,a=modelLayers[i].position.clone().add(new T.Vector3(x,.04,.28)),b=modelLayers[i+1].position.clone().add(new T.Vector3(x-.06,-.04,.28)),direction=b.clone().sub(a)
   link.position.copy(a).add(b).multiplyScalar(.5);link.scale.y=direction.length();link.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize())
  })
  relationLines.forEach(r=>{r.mesh.visible=!!s.completed?.includes(r.id)})
  for(const [id,target] of Object.entries(targets))if(id.startsWith('SYN_')&&target instanceof T.Mesh){
   const selected=s.selectedTarget===id,material=target.material as T.MeshStandardMaterial
   material.emissive.set(selected?'#f7ce75':'#000000');material.emissiveIntensity=selected?.55:0
   // A static lift distinguishes selection without relying on colour or animated pulses.
   target.position.y=selected?.87:.82
  }
  for(let i=0;i<lights.length;i++){const k=s.reduced?1:1+Math.sin(t*9+i*1.7)*.06+Math.sin(t*23+i)*.03;if(lights[i].parent)lights[i].intensity=(i<2?1.6:1.3)*k;flames[i].scale.setScalar(k)}
 }}
}
