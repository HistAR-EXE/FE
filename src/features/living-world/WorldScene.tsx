import {useEffect,useLayoutEffect,useRef} from 'react'
import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {Kit} from '../time-portal/tunnel3d/kit'
import {type Shell,type Point} from './worldModel'
import {prepareWorldZone,buildPreparedS2,buildPreparedZone,prepareR2Zone} from './worldSceneResources'
import {zones,isSafeWorldPoint,openHeading} from './worldModel'
import {createWorldActor} from './worldActor'
import {routesFrom} from './worldContinuity'
import type {A04Phase} from './a04Experience'
import {clampTunnelCamera} from './tunnelCamera'
import {isLivingZone} from './livingSpaces'
import {roomActionFrame,conversationFrame,showRoomActor,kitchenFieldOfView,meetingFieldOfView} from './roomPresentation'
import {disposeWorldScene} from './disposeWorldScene'
import {passages,passagePoints,passageArrival,passageSample,type V3} from './undergroundContinuity'
import {warmWorldShaders} from './warmWorldShaders'
import {kitchenPixelRatio} from './kitchenQuality'
import type {AtmospherePhase} from './worldAtmosphere'
import type {ModelView} from './worldModelMedia'
import {createModelViewerCamera} from './modelViewerCamera'

const gripOf=(a:unknown)=>(a as {grip?:(l:THREE.Vector3|null,r:THREE.Vector3|null)=>void}).grip
type Props={modelView?:ModelView;atmosphere?:AtmospherePhase;selectedTarget?:string;passageMotion?:{id:string;phase:string;token:number};onPassageComplete?:()=>void;completed?:string[];onImpact?:()=>void;onPartnerImpact?:()=>void;proof?:boolean;departing?:boolean;controlsActive?:boolean;view?:'walk'|'xray';onReady?:(zone:Shell['zone'])=>void;shell:Shell;rice:number;a04Phase?:A04Phase;working:boolean;airConfirmed:boolean;structureConfirmed:boolean;linkMode:boolean;path:string[];pairs:string[][];talk?:string|null;hatch?:string;firstPerson?:boolean;p2?:string;p2Era?:string|null;onBusy:(busy:boolean)=>void;onMove:(p:Point)=>void;onWalk?:(p:Point)=>void;onPick:(id:string)=>void;onFailure:()=>void}
type Label={id:string;object:THREE.Object3D;element:HTMLSpanElement;actor?:boolean}
export default function WorldScene(props:Props){
 const host=useRef<HTMLDivElement>(null),live=useRef(props)
 const walkCamera=useRef<{zone:string;position:THREE.Vector3;target:THREE.Vector3;firstPerson:boolean}|null>(null)
 const rendererRef=useRef<THREE.WebGLRenderer|null>(null)
 useEffect(()=>{live.current=props},[props])
 // OrbitControls disconnects from canvas.getRootNode(). Dispose before React detaches the canvas,
 // otherwise its document key listener is removed from the detached root and retains the whole scene.
 useLayoutEffect(()=>{
  const element=host.current;if(!element)return
  let cancelled=false,cleanup=()=>{}
  const zone=props.shell.zone
  // G3 immersive: the default journey streams the R2 runtime + this zone's optimized assets; ?debug=1 keeps the G2/G3 CP1 scenes.
  // Underground layers always use the per-layer R2 tunnels (also in ?debug=1), so walk grid, targets and visuals agree (G3 WS6/QA).
  const immersive=!!props.proof||zone==='S1'||zone==='S3'||zone==='S4'||zone.startsWith('L'),xray=props.view==='xray',loadStart=performance.now()
  // Per-zone streaming measurement: R2 runtime asset bytes fetched while this zone prepared (Resource Timing).
  const r2Bytes=()=>{let encoded=0,files=0;for(const e of performance.getEntriesByType('resource') as PerformanceResourceTiming[])if(/\.(webp|glb)(\?|$)/.test(e.name)&&e.name.includes('/assets/')){encoded+=e.encodedBodySize||e.transferSize||0;files++}return{encoded,files}},bytesBefore=r2Bytes()
  let R:Awaited<ReturnType<typeof prepareR2Zone>>|null=null
  let renderer:THREE.WebGLRenderer
  try{renderer=rendererRef.current??(rendererRef.current=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power'}))}catch{live.current.onFailure();return}
  // The kitchen's warm lamps exceeded display range and washed dark cloth out
  // to pale patches. Compress highlights while preserving the authored colors.
  renderer.toneMapping=zone==='L1-C'?THREE.ACESFilmicToneMapping:THREE.NoToneMapping;renderer.toneMappingExposure=1;renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.setSize(Math.max(1,element.clientWidth),Math.max(1,element.clientHeight))
  renderer.domElement.dataset.readiness='preview'
  renderer.domElement.setAttribute('aria-label','Bản xem trước không gian; đang tải chi tiết. Menu và sơ đồ 2D có thể dùng.')
  element.append(renderer.domElement)
  const previewKit=new Kit(),preview=new THREE.Scene(),previewCamera=new THREE.PerspectiveCamera(55,Math.max(1,element.clientWidth)/Math.max(1,element.clientHeight),.1,100)
  preview.background=new THREE.Color(zone==='S0'?'#243b41':zone.startsWith('L')?'#493525':'#718374')
  const previewFloor=new THREE.Mesh(previewKit.track(new THREE.PlaneGeometry(24,24)),previewKit.track(new THREE.MeshBasicMaterial({color:zone==='S0'?'#89938c':'#8a7254'})))
  previewFloor.rotation.x=-Math.PI/2;preview.add(previewFloor)
  const previewAvatar=createWorldActor(preview,previewKit,'#b4945c');previewAvatar.g.position.set(...[props.shell.position[0],0,props.shell.position[1]] as [number,number,number])
  previewCamera.position.set(0,3,7);previewCamera.lookAt(0,1,0);renderer.render(preview,previewCamera)
  // R2 first-usable: the preview is already playable — WASD/arrow keys move the Avatar on the same walk grid while the
  // full scene streams in (the move is accepted by the page's walk model, not faked). Stops when the full scene takes over.
  let previewFrame=0;const previewLoop=()=>{previewFrame=requestAnimationFrame(previewLoop);const sh=live.current.shell;previewAvatar.g.position.set(sh.position[0],0,sh.position[1]);previewAvatar.g.rotation.y=sh.heading;renderer.render(preview,previewCamera)};previewFrame=requestAnimationFrame(previewLoop)
  const previewKeys:Record<string,[number,number]>={w:[0,-.5],arrowup:[0,-.5],s:[0,.5],arrowdown:[0,.5],a:[-.5,0],arrowleft:[-.5,0],d:[.5,0],arrowright:[.5,0]}
  const previewKey=(e:KeyboardEvent)=>{const step=previewKeys[e.key.toLowerCase()];if(!step||!live.current.controlsActive||(e.target instanceof HTMLElement&&e.target.matches('input,select,textarea')))return;const sh=live.current.shell,next:Point=[Math.round((sh.position[0]+step[0])*2)/2,Math.round((sh.position[1]+step[1])*2)/2];if(!isSafeWorldPoint(next,zone))return;e.preventDefault();(live.current.onWalk??live.current.onMove)(next);renderer.domElement.dataset.lastMove=String(Math.round(performance.now()))}
  window.addEventListener('keydown',previewKey)
  const stopPreview=()=>{cancelAnimationFrame(previewFrame);window.removeEventListener('keydown',previewKey)}
  cleanup=()=>{stopPreview();previewKit.dispose();renderer.domElement.remove()}
  void Promise.all([prepareWorldZone(zone),immersive?prepareR2Zone(zone).then(m=>{R=m}):null]).then(async()=>{
  if(cancelled)return
  stopPreview();previewKit.dispose()
  renderer.domElement.dataset.readiness='building'
  const kit=new Kit(),scene=new THREE.Scene(),labels:Label[]=[]
  // Dynamic resolution: start at the device ratio (≤1.5) and step down/up within [0.6, max] from measured frame time,
  // so weak GPUs keep interaction responsive instead of dropping frames (sharpness trades first, never gameplay).
  const maxRatio=Math.min(window.devicePixelRatio,1.5);let ratio=maxRatio,frameSum=0,frameCount=0,lastAdjust=0;const kitchenFrames:number[]=[];renderer.setPixelRatio(ratio);renderer.domElement.tabIndex=0
  renderer.domElement.setAttribute('aria-label','Mô hình 3D. Chạm đối tượng để tới gần, chạm lại để quan sát. WASD để đi. Có điều khiển tương đương bằng bàn phím bên cạnh.')
  element.append(renderer.domElement)
  cleanup=()=>{kit.dispose();renderer.domElement.remove()}
  const captureRequests=new Set<string>()
  const captureResult=(requestId:string,result:{dataUrl?:string;error?:string})=>window.dispatchEvent(new CustomEvent('timelens-capture-frame-result',{detail:{requestId,...result}}))
  const captureRequest=(event:Event)=>{const id=(event as CustomEvent<{requestId?:unknown}>).detail?.requestId;if(typeof id!=='string'||!id||id.length>100)return;if(captureRequests.size>=4){captureResult(id,{error:'Đang chụp khung hình khác. Hãy thử lại.'});return}captureRequests.add(id)}
  window.addEventListener('timelens-capture-frame',captureRequest)
  const releaseCapture=()=>{window.removeEventListener('timelens-capture-frame',captureRequest);for(const id of captureRequests)captureResult(id,{error:'Không gian đã thay đổi. Hãy chụp lại.'});captureRequests.clear()}
  const captureEarlyCleanup=cleanup;cleanup=()=>{releaseCapture();captureEarlyCleanup()}
  const camera=new THREE.PerspectiveCamera(40,1,.1,120)
  const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false
  const viewerCamera=createModelViewerCamera(camera,controls);let wasModelViewer=false
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motionPreference.matches;controls.enableDamping=!reduced
  const motionChanged=()=>{reduced=motionPreference.matches;controls.enableDamping=!reduced};motionPreference.addEventListener('change',motionChanged)
  const motionEarlyCleanup=cleanup;cleanup=()=>{motionPreference.removeEventListener('change',motionChanged);motionEarlyCleanup()}
  const begin=()=>live.current.onBusy(true),end=()=>live.current.onBusy(false);controls.addEventListener('start',begin);controls.addEventListener('end',end)
  const hemi=new THREE.HemisphereLight('#e8f6de','#50402c',2.4);scene.add(hemi);const sun=new THREE.DirectionalLight('#fff4d4',3);sun.position.set(3,8,4);scene.add(sun)
  // Static scenery shadows are baked once per scene load; moving actors use contact shadows.
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10});sun.shadow.bias=-.001
  const tunnelWalk=!!R&&zone.startsWith('L')&&!xray
  let insideVolume:((x:number,y:number,z:number)=>boolean)|null=null
  let rigNpc:ReturnType<NonNullable<typeof R>['createRigActor']>|null=null,camClamp:((target:THREE.Vector3,cam:THREE.Vector3)=>void)|null=null
  const s2=zone==='S2'?(R?buildPreparedS2(scene,kit,R.buildVillage(scene,kit,renderer).r2):buildPreparedS2(scene,kit)):null
  let env:ReturnType<typeof buildPreparedZone>|null=null
  if(zone!=='S2'){
   if(R&&zone==='S5'){env=R.buildMemorial(scene,kit);camClamp=(_t,c)=>{c.y=Math.max(.35,c.y);c.z=Math.max(-3.2,c.z)}}
   else if(R&&zone==='S1'){env=R.buildForest(scene,kit,renderer);const H=R.villageHeight;camClamp=(_t,c)=>{c.y=Math.max(c.y,H(c.x,c.z)+.35)}}
   else if(R&&zone==='S3'){env=R.buildField(scene,kit,renderer);const H=R.villageHeight;camClamp=(_t,c)=>{c.y=Math.max(c.y,H(c.x,c.z)+.35)}}
   else if(R&&zone==='S4'){env=R.buildCommunity(scene,kit,renderer);const H=R.villageHeight;camClamp=(_t,c)=>{c.y=Math.max(c.y,H(c.x,c.z)+.35)}}
   else if(R&&zone==='S0'){const st=R.buildStation(scene,kit,renderer);env=st;rigNpc=st.kha;camClamp=(_t,c)=>{c.x=THREE.MathUtils.clamp(c.x,-10.4,10.4);c.z=THREE.MathUtils.clamp(c.z,-9.5,7.5);c.y=THREE.MathUtils.clamp(c.y,.4,6.8)}}
   else if(R&&isLivingZone(zone)){const room=R.buildLivingSpace(scene,kit,zone,renderer);env=room;insideVolume=room.inside;camClamp=(t,c)=>{const sh=live.current.shell;clampTunnelCamera(t,c,new THREE.Vector3(sh.position[0],.85+THREE.MathUtils.smoothstep(1.3-sh.position[1],0,.6)*.7,sh.position[1]),room.inside)}}
   else if(tunnelWalk&&R){env=R.buildTunnel(scene,kit,zone,renderer);const inside=R.tunnelInside;insideVolume=inside;camClamp=(t,c)=>{const s=live.current.shell;clampTunnelCamera(t,c,new THREE.Vector3(s.position[0],live.current.firstPerson?.92:.85,s.position[1]),inside)}}
   else if(R&&zone.startsWith('L')&&xray)env=R.buildXray(scene,kit,zone,renderer)
   else env=buildPreparedZone(zone,scene,kit)
  }
  if(R&&s2){const H=R.villageHeight;camClamp=(_t,c)=>{c.y=Math.max(c.y,H(c.x,c.z)+.35)}}
  if(R){
   // R2 builders bring their own physically based lighting; legacy lights stay for the X-ray cutaway only.
   hemi.visible=false;sun.visible=false;sun.castShadow=false
   renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=tunnelWalk?1.25:xray?1.1:zone==='S0'?1.05:1
   // Three resolves deprecated PCFSoft to PCF on the first shadow render. Select
   // that same mode before warm-up so shader cache keys do not change afterward.
   renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=true
  }
  if(R){const b=r2Bytes();renderer.domElement.dataset.r2Zone=JSON.stringify({zone,view:tunnelWalk?'walk':xray?'xray':'surface',r2BytesThisZone:b.encoded-bytesBefore.encoded,r2FilesThisZone:b.files-bytesBefore.files,r2BytesSession:b.encoded,prepareMs:Math.round(performance.now()-loadStart)})}
  if(s2){camera.position.set(7,6,9);controls.target.set(0,.6,-.7);controls.minDistance=4;controls.maxDistance=20;controls.minAzimuthAngle=-Math.PI/3;controls.maxAzimuthAngle=Math.PI/3;controls.maxPolarAngle=1.25}
  if(env){const c=env.camera;camera.position.set(...c.position);controls.target.set(...c.target);controls.minDistance=c.min;controls.maxDistance=c.max;controls.maxPolarAngle=c.polar;controls.minAzimuthAngle=-Math.PI/2.6;controls.maxAzimuthAngle=Math.PI/2.6;if(zone!=='S0'){sun.position.set(-2,9,5);hemi.intensity=2.8}else{sun.color.set('#ffd9a8');sun.position.set(-6,6,3)}}
  // Tunnel readability: a soft warm fill that travels with the Avatar (gameplay light, not a depicted lamp).
  const fill=tunnelWalk?new THREE.PointLight('#ffcf9a',1.1,3.6,1.5):null;if(fill)scene.add(fill)
  const doors=R&&zone.startsWith('L')&&!xray?R.buildPassages(scene,kit,zone):{}
  const pickables:THREE.Object3D[]=[]
  const label=(object:THREE.Object3D,id:string,text:string,actor=false)=>{
   const el=document.createElement('span');el.className=actor?'lw-scene-label lw-actor-label':'lw-scene-label';el.textContent=text;el.setAttribute('aria-hidden','true')
   if(actor)el.dataset.sceneActor=id;else{el.dataset.sceneTarget=id;if(object.userData.passage)el.dataset.affordance='door';object.userData.target=id;pickables.push(object)}
   element.append(el);labels.push({id,object,element:el,actor})
  }
  const floor=(s2?.floor??env!.floor) as THREE.Object3D;floor.userData.floor=true;pickables.push(floor)
  const avatar=s2?.avatar??(R?R.createRigActor(scene,kit,{body:'male',height:1.68,skin:'#d0a283',hair:'Hair_SimpleParted',brows:true,hairColor:'#1a1410',clothing:{top:'#5d6650',bottom:'#8a7d63',style:'modern'},crouch:zone.startsWith('L'),sample:zone==='L1-C'}):createWorldActor(scene,kit,'#b4945c'))
  const npc=s2?.npc??rigNpc??(zone==='S0'?createWorldActor(scene,kit,'#3f5f73',true):null)
  if(npc&&!s2){npc.g.position.set(-2,0,-1);npc.contact.position.set(-2,.005,-1)}
  const chrono=new THREE.Mesh(kit.geo('chrono',()=>new THREE.IcosahedronGeometry(R?.08:.16,R?3:1)),kit.track(R?new THREE.MeshStandardMaterial({color:'#0a1a16',emissive:'#9fe8d0',emissiveIntensity:tunnelWalk?.7:zone==='S1'?.9:2.2 /* S1: never a beacon next to a Q1 clue */,roughness:.3}):new THREE.MeshBasicMaterial({color:'#c6f2da'})));scene.add(chrono)
  chrono.visible=!s2&&zone!=='S1'&&zone!=='S3'&&zone!=='S4' // Surface R2 zones with rigged actors keep Chrono in the guide panel rather than a floating sphere.
  if(npc)label(npc.g,zone==='S0'?'KHA':'NPC_A04',zone==='S0'?'Kha':'Người cùng làm')
  if(env?.targets.MACHINE)label(env.targets.MACHINE,'MACHINE','Máy thời gian')
  if(s2){
   label(s2.mortar,'A04','Cối giã gạo');label(s2.playerGrip,'STROKE_LEFT','Chày · nắm / nâng / hạ');label(s2.npcGrip,'STROKE_RIGHT','Nhịp người cùng làm');label(s2.before,'RICE_BEFORE','Lúa còn vỏ');label(s2.after,'RICE_AFTER','Gạo · so sánh')
   for(const target of zones.S2.targets)if(target.id!=='A04'&&s2.targets?.[target.id])label(s2.targets[target.id],target.id,target.label)
  }
  const endpoints=env?.endpoints??new Map<string,THREE.Vector3>(),pipes=env?.pipes??[],links=env?.links??[]
  // Q1 ground clues + decoys are all real pickable objects (pointer/tap or E); optional scene labels never name what they are.
  if(zone==='S1'&&env){for(const id of ['Q1_TRAIL','Q1_LEAVES','Q1_HATCH','S1_DECOY_1','S1_DECOY_2'])if(env.targets[id])label(env.targets[id],id,'Mặt đất');if(env.targets.NPC_LIAISON)label(env.targets.NPC_LIAISON,'NPC_LIAISON','Chiến sĩ giao liên')}
  if(isLivingZone(zone)&&env){for(const target of zones[zone].targets)if(env.targets[target.id])label(env.targets[target.id],target.id,target.label)}
  if(env&&(zone==='L2-D'||zone==='L3-D'||zone==='S3'||zone==='S4'||zone==='S5'))for(const target of zones[zone].targets)if(env.targets[target.id])label(env.targets[target.id],target.id,target.label)
  if(zone==='L1-B'&&env){for(const [id,text] of [['AIR_SURFACE_OPENING','Lỗ mở'],['AIR_PASSAGE','Đoạn dẫn'],['AIR_INTERIOR','Không gian trong'],['LINK_AIR_LIFE','Liên hệ đời sống']] as const)label(env.targets[id],id,text)}
  else if(zone.startsWith('L')&&env){const t=env.targets;['Lớp trên','Lớp giữa','Lớp dưới'].forEach((text,i)=>{if(t[`STRUCT_LAYER_${i+1}`])label(t[`STRUCT_LAYER_${i+1}`],`STRUCT_LAYER_${i+1}`,text)});if(t.STRUCT_LINK_12)label(t.STRUCT_LINK_12,'STRUCT_LINK_12','Chuyển 1–2');if(t.STRUCT_LINK_23)label(t.STRUCT_LINK_23,'STRUCT_LINK_23','Chuyển 2–3');if(t.L2D_NICHE)label(t.L2D_NICHE,'L2D_NICHE','Góc diễn giải L2-D')}
  // In-world wayfinding by route type (thematic / temporal / knowledge); never presented as a surveyed tunnel.
  const markers:{group:THREE.Group;update:(t:number,reduced:boolean)=>void}[]=[]
  if(props.proof)for(const r of routesFrom(zone)){if(r.target==='MACHINE'||r.id==='FOREST_ENTRANCE'||r.type==='KNOWLEDGE_LINK')continue;if(doors[r.target]){label(doors[r.target],r.target,r.label);continue;} /* Q1: the concealed hatch itself is the way down — no route proxy/label over it */const m={group:new THREE.Group(),update:(_t:number,_reduced:boolean)=>{}};const proxy=new THREE.Mesh(kit.geo('route-proxy',()=>new THREE.BoxGeometry(.55,.5,.55)),kit.memo('route-proxy-material',()=>new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})));proxy.position.y=.25;m.group.add(proxy);m.group.position.set(r.at[0],env?env.heightAt(r.at[0],r.at[1]):0,r.at[1]);m.group.rotation.y=Math.atan2(-r.at[0],-r.at[1])*.35;if(env&&r.at[1]>0)m.group.scale.setScalar(.72);if(R&&zone.startsWith('L'))m.group.scale.setScalar(.5);scene.add(m.group);markers.push(m);label(m.group,r.target,r.label)}
  label(avatar.g,'AVATAR','Bạn',true)
  if(s2){const geometries=new Set<THREE.BufferGeometry>();let instanceBytes=0;scene.traverse(o=>{if(o instanceof THREE.Mesh)geometries.add(o.geometry);if(o instanceof THREE.InstancedMesh)instanceBytes+=o.instanceMatrix.array.byteLength+(o.instanceColor?.array.byteLength??0)});let bufferBytes=instanceBytes;for(const g of geometries){for(const a of Object.values(g.attributes))bufferBytes+=a.array.byteLength;if(g.index)bufferBytes+=g.index.array.byteLength}renderer.domElement.dataset.s2Assets=JSON.stringify({uniqueGeometryCount:geometries.size,geometryAndInstanceBufferBytes:bufferBytes,groundTextureRGBABytes:256*256*4,shadowMapPixels:1024*1024,external3DFileBytes:0,note:'Generated CPU buffer bytes; texture RGBA estimate; GPU allocation/driver overhead not measured'})}
  // G3 Phase 2: third-person follow camera on walkable surface zones (S0/S2) of the default journey.
  // Underground cutaway zones keep the orbit viewer until their enterable interiors land (Phase 5).
  const follow=(!!props.proof||zone==='S1'||zone==='S3'||zone==='S4'||tunnelWalk)&&(zone==='S0'||zone==='S1'||zone==='S2'||zone==='S3'||zone==='S4'||tunnelWalk)
  const colliders:THREE.Object3D[]=[]
  const keys=new Set<string>();let lastDrag=-10,lastMoveSent=0,roomOrbitIntent:string|null=null
  const followTarget=new THREE.Vector3(),camOffset=new THREE.Vector3(),shoulder=new THREE.Vector3(),sph=new THREE.Spherical()
  if(follow){
   camera.fov=tunnelWalk?74:55;camera.near=tunnelWalk?.04:.1;camera.updateProjectionMatrix()
   controls.minDistance=tunnelWalk?.05:2.2;controls.maxDistance=tunnelWalk?2.2:7;controls.minPolarAngle=tunnelWalk?.4:.35;controls.maxPolarAngle=tunnelWalk?2.6:1.42;controls.minAzimuthAngle=-Infinity;controls.maxAzimuthAngle=Infinity;controls.rotateSpeed=.7;controls.zoomSpeed=.6
   const exclude=new Set<THREE.Object3D>([avatar.g,chrono,...(npc?[npc.g]:[]),...markers.map(m=>m.group)])
   // R2 zones clamp the camera analytically (hall box / terrain height / carved tunnel); legacy zones raycast.
   if(!camClamp)scene.traverse(o=>{if(!(o instanceof THREE.Mesh)||o instanceof THREE.InstancedMesh||o instanceof THREE.SkinnedMesh)return;let at:THREE.Object3D|null=o;while(at){if(exclude.has(at))return;at=at.parent}colliders.push(o)})
   const s0=live.current.shell,ty=tunnelWalk?.62:1.15,dist=tunnelWalk?2:4,lift=tunnelWalk?.36:.85;followTarget.set(s0.position[0],ty,s0.position[1]);controls.target.copy(followTarget)
   const back=(tunnelWalk?openHeading(zone,s0.position,s0.heading):s0.heading)+Math.PI;camera.position.set(followTarget.x+Math.sin(back)*dist,followTarget.y+lift,followTarget.z+Math.cos(back)*dist)
   controls.addEventListener('start',()=>{lastDrag=(performance.now()-started)/1000})
   renderer.domElement.dataset.camera='third-person'
  }
  // WASD target: nearest walk-grid point ahead, sliding along walls/corridors when straight ahead is blocked.
  const snap=(v:number)=>Math.round(v*2)/2
  const stepTarget=(px:number,pz:number,dx:number,dz:number):[number,number]|null=>{for(const ang of [0,.45,-.45,.9,-.9,1.35,-1.35])for(const d of [.9,1.3]){const c=Math.cos(ang),sn=Math.sin(ang),vx=dx*c-dz*sn,vz=dx*sn+dz*c,tx=snap(px+vx*d),tz=snap(pz+vz*d);if((tx!==snap(px)||tz!==snap(pz))&&isSafeWorldPoint([tx,tz],zone))return[tx,tz]}return null}
  const typing=(e:KeyboardEvent)=>e.target instanceof HTMLElement&&e.target.matches('input,select,textarea')
  const keyDown=(e:KeyboardEvent)=>{if(!follow||typing(e)||!live.current.controlsActive)return;const k=e.key.toLowerCase();if('wasd'.includes(k)&&k.length===1){keys.add(k);e.preventDefault()}if(k==='c'){const sh=live.current.shell,back=sh.heading+Math.PI,d=tunnelWalk?1.45:4;camera.position.set(controls.target.x+Math.sin(back)*d,controls.target.y+(tunnelWalk?.12:.85),controls.target.z+Math.cos(back)*d)}}
  const keyUp=(e:KeyboardEvent)=>{keys.delete(e.key.toLowerCase())}
  const blurKeys=()=>keys.clear()
  window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blurKeys)
  const fwd=new THREE.Vector3(),right=new THREE.Vector3(),dir=new THREE.Vector3(),toCam=new THREE.Vector3(),camRay=new THREE.Raycaster()
  const lineGeo=kit.track(new THREE.BufferGeometry()),linePositions=new Float32Array(36);lineGeo.setAttribute('position',new THREE.BufferAttribute(linePositions,3));lineGeo.setDrawRange(0,0)
  const lineMaterial=kit.track(new THREE.LineBasicMaterial({color:'#f3e6a8',depthTest:false})),line=new THREE.LineSegments(lineGeo,lineMaterial);line.renderOrder=3;scene.add(line);let lastPath:string[]|null=null,lastPairs:string[][]|null=null
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down:Point=[0,0]
  const hitAt=(e:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);for(const object of pickables)if(object.userData.interactionBone)object.traverse(child=>{if(child instanceof THREE.SkinnedMesh)child.computeBoundingSphere()});const sh=live.current.shell,kitchen=zone==='L1-C'&&!!sh.intent?.startsWith('Q4_')&&!sh.path.length&&Math.hypot(sh.position[0],sh.position[1]+1.5)<.2;const candidates=pickables.filter(o=>kitchen?!['A02_PREPARE','A02_SMOKE','NPC_COOK'].includes(o.userData.target):!String(o.userData.target??'').startsWith('Q4_'));return ray.intersectObjects(candidates,true)[0]}
  const targetOf=(object:THREE.Object3D)=>{let at:THREE.Object3D|null=object;while(at&&!at.userData.target)at=at.parent;return at?.userData.target as string|undefined}
  const pointerDown=(e:PointerEvent)=>{down=[e.clientX,e.clientY]}
  const pointerMove=(e:PointerEvent)=>{if(live.current.modelView){renderer.domElement.style.cursor='grab';return}if(e.buttons&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>7)roomOrbitIntent=live.current.shell.intent;const hit=hitAt(e);renderer.domElement.style.cursor=hit&&targetOf(hit.object)?'pointer':'grab'}
  const pointerUp=(e:PointerEvent)=>{if(!live.current.controlsActive)return;if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>7)return;const hit=hitAt(e);if(!hit)return;const id=targetOf(hit.object);renderer.domElement.dataset.lastPick=id??'GROUND';if(id)live.current.onPick(id);else if(hit.object.userData.floor)live.current.onMove(tunnelWalk?[snap(hit.point.x),snap(hit.point.z)]:[hit.point.x,hit.point.z])}
  const lost=(e:Event)=>{e.preventDefault();live.current.onFailure()}
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp);renderer.domElement.addEventListener('webglcontextlost',lost)
  const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix()});resize.observe(element)
  let frame=0;const started=performance.now(),projected=new THREE.Vector3(),bounds=new THREE.Box3(),center=new THREE.Vector3(),top=new THREE.Vector3(),bottom=new THREE.Vector3()
  let ready=false,lastStat=-1,previous=0,poseStat=-1
  const restored=tunnelWalk&&walkCamera.current?.zone===zone?walkCamera.current:null
  let fpLast=restored?.firstPerson??false,camStatAt=0,focusedIntent:string|null=null
  const lastTunnelOffset=new THREE.Vector3(-Math.sin(live.current.shell.heading),0,-Math.cos(live.current.shell.heading))
  if(restored){camera.position.copy(restored.position);controls.target.copy(restored.target);controls.minDistance=.05;controls.maxDistance=fpLast?.06:2.2}
  const npcFacing=new THREE.Vector3(),hatchAt=new THREE.Vector3(2.5,0,-2.5),descCam=new THREE.Vector3();let departT=0,descT=0
  let passageKey='',passageStart=0,passageReported=false,gripping=false,interactW=0
  let contactNow:THREE.Vector3|null=null
  const lastContact=new THREE.Vector3()
  const animate=()=>{
   frame=requestAnimationFrame(animate);const p=live.current,s=p.shell,t=(performance.now()-started)/1000,dt=Math.min(.1,t-previous)
   const viewing=zone==='L2-D'&&!!p.modelView,closing=wasModelViewer&&!viewing,cameraFree=!viewing&&!closing
   const viewHeight=viewing&&element.clientWidth<640?element.clientHeight*.58:element.clientHeight,viewAspect=element.clientWidth/Math.max(1,viewHeight)
   if(camera.aspect!==viewAspect){camera.aspect=viewAspect;camera.updateProjectionMatrix()}
   viewerCamera.update(viewing?p.modelView!:null,camera.aspect);if(closing)focusedIntent=s.intent
   const rise=isLivingZone(zone)?THREE.MathUtils.smoothstep(1.3-s.position[1],0,.6)*.63:0,eyeHeight=.92+rise,aimHeight=.62+rise
   if(previous>0){frameSum+=t-previous;frameCount++;if(zone==='L1-C')kitchenFrames.push(t-previous)}previous=t
   if(t-lastAdjust>1.5&&frameCount>=8){const avg=frameSum/frameCount,next=zone==='L1-C'?kitchenPixelRatio(ratio,maxRatio,kitchenFrames):avg>.045?Math.max(.6,ratio-.15):avg<.022?Math.min(maxRatio,ratio+.1):ratio;frameSum=0;frameCount=0;kitchenFrames.length=0;lastAdjust=t;if(Math.abs(next-ratio)>.01){ratio=next;renderer.setPixelRatio(ratio);renderer.setSize(element.clientWidth,element.clientHeight);renderer.domElement.dataset.pixelRatio=ratio.toFixed(2)}}
   if(s2)s2.update(t,s.position,s.heading,!!s.path.length,p.a04Phase??'IDLE',p.rice,p.working,reduced,()=>live.current.onImpact?.(),()=>live.current.onPartnerImpact?.(),p.completed,p.talk??p.selectedTarget,p.atmosphere==='ALERT',document.hidden)
   else{
    const moving=!!s.path.length;avatar.g.position.set(s.position[0],0,s.position[1]);avatar.g.rotation.y=s.heading;avatar.contact.position.set(s.position[0],.005,s.position[1])
    avatar.legs.forEach((leg,i)=>{leg.rotation.x=moving&&!reduced?Math.sin(t*9+i*Math.PI)*.32:0});avatar.left.rotation.x=moving&&!reduced?Math.sin(t*9)*.25:0;avatar.right.rotation.x=moving&&!reduced?-Math.sin(t*9)*.25:0
    if(npc){const talking=p.talk==='KHA'||p.talk==='MACHINE';if(npc===rigNpc)rigNpc?.setTalking(p.talk==='KHA');npcFacing.set(s.position[0],0,s.position[1]);const want=talking?Math.atan2(npcFacing.x-npc.g.position.x,npcFacing.z-npc.g.position.z):.5;npc.g.rotation.y+=(want-npc.g.rotation.y)*Math.min(1,dt*4);npc.g.position.y=reduced?0:Math.sin(t*1.6)*.008
     npc.reach(p.talk==='MACHINE'||(talking&&!reduced&&Math.sin(t*1.2)>.3)?new THREE.Vector3(0,1.4,-1.05):null)}
    env?.update(t,dt,{reduced,working:p.working||!!p.departing,active:p.departing?'MACHINE':p.talk??null,hatch:p.hatch,p2:p.p2,p2Era:p.p2Era,completed:p.completed,selectedTarget:p.selectedTarget,hidden:document.hidden,player:p.passageMotion?null:s.position,atmosphere:p.atmosphere,modelView:p.modelView})
    // Q1 hatch: kneel and sweep, lift the lid with both hands, then crawl down into the shaft (S1 only, rigged Avatar).
    if(zone==='S1'&&R){const rig=avatar as unknown as {setIdle?:(c:string)=>void;setCrouch?:(b:boolean)=>void;reach:(v:THREE.Vector3|null)=>void},h=p.hatch??'HIDDEN',busy=h==='SWEEPING'||h==='OPENING'
     const atHatch=['SWEEPING','REVEALED','OPENING','OPEN','DESCENDING'].includes(h)&&Math.hypot(hatchAt.x-s.position[0],hatchAt.z-s.position[1])<1.6
     if(atHatch)avatar.g.rotation.y=Math.atan2(hatchAt.x-s.position[0],hatchAt.z-s.position[1])
     // kneel to sweep and lift; crouch at the open edge; crawl down
     rig.setIdle?.(atHatch&&(busy||h==='REVEALED')?'Fixing_Kneeling':'Idle_Loop');rig.reach(h==='OPENING'&&!reduced?hatchAt.clone().setY(.25):null)
     if(h==='OPEN'&&atHatch)rig.setCrouch?.(true)
     if(h==='DESCENDING'){descT+=dt;const k=reduced?1:Math.min(1,descT/1.6),a=Math.min(1,k/.35),d=Math.max(0,(k-.35)/.65);rig.setCrouch?.(true)
      avatar.g.position.set(s.position[0]+(hatchAt.x-s.position[0])*a,-1.5*d*d,s.position[1]+(hatchAt.z-s.position[1])*a);avatar.contact.visible=d<.2}
     else{descT=0;if(!(h==='OPEN'&&atHatch))rig.setCrouch?.(false);avatar.contact.visible=true}}
   }
   for(const m of markers)m.update(t,reduced)
   if(tunnelWalk){chrono.visible=false /* R2 retest: in a 0.7 m passage the orb always landed on the Avatar's head or in the sight line; Chrono speaks through short barks underground */;chrono.position.set(s.position[0]+Math.sin(s.heading)*.9+Math.cos(s.heading)*.25,1+(reduced?0:Math.sin(t*2)*.03),s.position[1]+Math.cos(s.heading)*.9-Math.sin(s.heading)*.25)} // ahead-left of the Avatar, out of the sight line; hidden in first person
   else chrono.position.set(s.position[0]-.7,1.8+(reduced?0:Math.sin(t*2)*.1),s.position[1]+.2)
   for(const mesh of pipes)(mesh.material as THREE.MeshLambertMaterial).color.set(p.airConfirmed?'#8fc5a4':'#2b2016')
   for(const mesh of links)(mesh.material as THREE.MeshLambertMaterial).color.set(p.structureConfirmed?'#8fc5a4':'#7fb6ff') // KNOWLEDGE_LINK colour (not a walkable passage)
   if(p.path!==lastPath||p.pairs!==lastPairs){lastPath=p.path;lastPairs=p.pairs;const segments:THREE.Vector3[]=[];if(s.zone==='L1-B')for(let i=1;i<p.path.length;i++){const a=endpoints.get(p.path[i-1]),b=endpoints.get(p.path[i]);if(a&&b)segments.push(a,b)}else for(const pair of p.pairs){const a=endpoints.get(pair[0]),b=endpoints.get(pair[1]);if(a&&b)segments.push(a,b)}linePositions.fill(0);segments.forEach((v,i)=>v.toArray(linePositions,i*3));lineGeo.attributes.position.needsUpdate=true;lineGeo.setDrawRange(0,segments.length)}
   // P4→P5 departure (S0 only, during the temporal transfer; skippable from the transfer bar): the Avatar walks the
   // gangway into the pod, Kha runs the console, the vessel powers up and the camera pulls back to show its scale.
   if(p.departing&&zone==='S0'&&rigNpc){
    departT+=dt;const k=Math.min(1,departT/1.6)
    const from=new THREE.Vector3(s.position[0],0,s.position[1]),gang=new THREE.Vector3(0,.36,-2.4),pod=new THREE.Vector3(0,1.1,-4.6)
    const at=k<.55?from.clone().lerp(gang,k/.55):gang.clone().lerp(pod,(k-.55)/.45);avatar.g.position.copy(at);avatar.g.rotation.y=Math.PI;avatar.g.visible=k<.97
    rigNpc.setIdle('Interact');rigNpc.g.rotation.y=-2.4
    controls.target.lerp(new THREE.Vector3(0,2,-5),Math.min(1,dt*2));camera.position.lerp(new THREE.Vector3(5.6,3.1,2.6),Math.min(1,dt*1.6))
   }
   else if(follow&&zone==='S1'&&p.hatch==='DESCENDING'){
    // camera transition: rise behind the Avatar and look down into the shaft as they go below ground
    descCam.set(s.position[0]+(s.position[0]-hatchAt.x)*.6,2.1,s.position[1]+(s.position[1]-hatchAt.z)*.6+.4)
    controls.target.lerp(hatchAt.clone().setY(-.5),Math.min(1,dt*(reduced?60:2.4)));camera.position.lerp(descCam,Math.min(1,dt*(reduced?60:1.8)))
   }
   else if(follow&&cameraFree){
   // G3/G4 rooms: the Avatar's hands follow the room's contact point (bowl, bag, tray, rope…) and it kneels for low objects
   const contactAt=!p.passageMotion&&(isLivingZone(zone)||zone==='S5')?(env as {hands?:()=>THREE.Vector3|null}|null)?.hands?.()??null:null;contactNow=contactAt
   if(R&&isLivingZone(zone)&&'setCrouch' in avatar&&typeof avatar.setCrouch==='function')avatar.setCrouch(s.position[1]>=1.4||!!contactAt&&contactAt.y<.8)
   if((isLivingZone(zone)||zone==='S5')&&!p.passageMotion){avatar.reach(contactAt);if(contactAt){const dx=contactAt.x-s.position[0],dz=contactAt.z-s.position[1];if(Math.hypot(dx,dz)>.15)avatar.g.rotation.y=Math.atan2(dx,dz)}}
   if(tunnelWalk){const fp=!!p.firstPerson;if(fp!==fpLast){fpLast=fp;focusedIntent=null;controls.minDistance=.05;controls.maxDistance=fp?.06:2.2;if(fp){const fw=new THREE.Vector3(Math.sin(s.heading),0,Math.cos(s.heading));controls.target.set(s.position[0]+fw.x*.06,eyeHeight,s.position[1]+fw.z*.06);camera.position.set(s.position[0],eyeHeight,s.position[1])}else{const back=s.heading+Math.PI;controls.target.set(s.position[0],aimHeight,s.position[1]);camera.position.set(s.position[0]+Math.sin(back)*2,.98,s.position[1]+Math.cos(back)*2)}}}
    // keep the camera rig on the Avatar (preserves the player's chosen orbit angle and zoom)
    const fpOn=tunnelWalk&&!!p.firstPerson,desired=new THREE.Vector3(s.position[0],fpOn?eyeHeight:tunnelWalk?aimHeight:1.15,s.position[1]);if(tunnelWalk&&!fpOn){shoulder.copy(controls.target).sub(camera.position);shoulder.y=0;if(shoulder.lengthSq()>1e-4){shoulder.normalize();desired.x+=-shoulder.z*.26;desired.z+=shoulder.x*.26}}/* R2 CAMERA-TP: aim low (0.62 m) and 0.26 m to the side from a camera at ~1 m, so the crouching Avatar sits low at the frame edge and the passage stays visible. (A look-ahead aim was tried and rejected: at bends the aim point falls into the wall and the clamp collapses the camera.) *//* over-the-shoulder in narrow passages so the Avatar never blocks the view */const delta=desired.clone().sub(controls.target);controls.target.add(delta);camera.position.add(delta)
    // while walking and not recently dragged, ease the camera behind the Avatar's heading
    if(zone==='S1'&&['SWEEPING','REVEALED','OPENING','OPEN'].includes(p.hatch??'')&&t-lastDrag>1.5&&Math.hypot(hatchAt.x-s.position[0],hatchAt.z-s.position[1])<1.6){camOffset.copy(camera.position).sub(controls.target);sph.setFromVector3(camOffset);const want=Math.atan2(hatchAt.x-s.position[0],hatchAt.z-s.position[1])+Math.PI;let d=want-sph.theta;d=Math.atan2(Math.sin(d),Math.cos(d));sph.theta+=d*Math.min(1,dt*(reduced?60:1.4));sph.phi+=(.95-sph.phi)*Math.min(1,dt*(reduced?60:1.2));camOffset.setFromSpherical(sph);camera.position.copy(controls.target).add(camOffset)}
    if(s.path.length&&t-lastDrag>1.5){camOffset.copy(camera.position).sub(controls.target);sph.setFromVector3(camOffset);const want=s.heading+Math.PI;let d=want-sph.theta;d=Math.atan2(Math.sin(d),Math.cos(d));sph.theta+=d*Math.min(1,dt*(reduced?.8:1.6));camOffset.setFromSpherical(sph);camera.position.copy(controls.target).add(camOffset)}
    // camera-relative WASD (continuous): re-target a short step ahead, throttled
    if(keys.size&&p.controlsActive){fwd.copy(controls.target).sub(camera.position);fwd.y=0;fwd.normalize();right.crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();dir.set(0,0,0);if(keys.has('w'))dir.add(fwd);if(keys.has('s'))dir.sub(fwd);if(keys.has('d'))dir.add(right);if(keys.has('a'))dir.sub(right);if(dir.lengthSq()>0&&t-lastMoveSent>.12){lastMoveSent=t;dir.normalize();const next=stepTarget(s.position[0],s.position[1],dir.x,dir.z);if(next){(p.onWalk??p.onMove)(next);renderer.domElement.dataset.lastMove=String(Math.round(performance.now()))}}}
    if(!p.controlsActive)keys.clear()
   }
   if(!closing){controls.enabled=!!p.controlsActive||viewing;controls.update()}
   // Reframe once on arrival, including floor hatches. Previously only a moving path turned the camera,
   // so the last corner left the view facing a wall after the Avatar had already turned to the object.
   if(cameraFree&&tunnelWalk&&!s.path.length&&s.intent&&s.intent!==focusedIntent){
    const target=labels.find(l=>l.id===s.intent)
    if(target){
     bounds.setFromObject(target.object);bounds.getCenter(center)
     if(target.object.userData.interactionAnchor instanceof THREE.Vector3)center.copy(target.object.userData.interactionAnchor).applyMatrix4(target.object.matrixWorld)
     const eye=new THREE.Vector3(s.position[0],eyeHeight,s.position[1]),direction=center.clone().sub(eye).normalize()
     const distance=p.firstPerson?.055:1.25
     controls.target.copy(eye);camera.position.copy(eye).addScaledVector(direction,-distance)
     focusedIntent=s.intent
    }
   }
   if(s.path.length||!s.intent)focusedIntent=null
   if(cameraFree&&follow&&camClamp){
    camClamp(controls.target,camera.position)
    if(tunnelWalk&&p.firstPerson&&camera.position.distanceTo(controls.target)<.012){
     controls.target.set(s.position[0],eyeHeight,s.position[1]);camera.position.copy(controls.target).addScaledVector(lastTunnelOffset,.055);camClamp(controls.target,camera.position)
    }
    // Adaptive TP may shorten below 70 cm inside the existing carve. A fixed OrbitControls minimum
    // otherwise pushes it back into the wall each frame and can collapse it into a vertical view.
    // Restore a horizontal shoulder orbit only when collision collapses TP to zero length.
    // OrbitControls otherwise reconstructs that degenerate vector pointing straight down.
    if(tunnelWalk&&!p.firstPerson&&camera.position.distanceTo(controls.target)<.012){
     controls.target.set(s.position[0],aimHeight,s.position[1]);camera.position.set(s.position[0]-Math.sin(s.heading)*.9,aimHeight+.12,s.position[1]-Math.cos(s.heading)*.9);camClamp(controls.target,camera.position)
    }
    if(tunnelWalk&&camera.position.distanceTo(controls.target)>.02)lastTunnelOffset.copy(camera.position).sub(controls.target).normalize()
   }
   const travel=p.passageMotion;let motionVisible=false
   if(travel&&(travel.phase==='DEPARTING'||travel.phase==='ARRIVING')){
    const key=travel.token+':'+travel.phase;if(key!==passageKey){passageKey=key;passageStart=t;passageReported=false}
    const k=Math.min(1,(t-passageStart)/(reduced?1.2:3.2)),arriving=travel.phase==='ARRIVING'
    let points=arriving?passageArrival(travel.id).points:passagePoints(passages[travel.id])
    if(zone==='S1'&&arriving)points=[[2.5,-1.3,-2.5],[2.5,-.8,-2.5],[2.5,-.05,-2.5],[2,0,-1.5]] as V3[]
    if(!(zone==='S1'&&!arriving)){
     const sample=passageSample(points,k),pos=new THREE.Vector3(...sample.point);avatar.g.position.copy(pos);avatar.g.rotation.y=sample.heading
     if('setCrouch' in avatar&&typeof avatar.setCrouch==='function')avatar.setCrouch(!(zone==='S1'&&k>.72))
     const forward=new THREE.Vector3(Math.sin(sample.heading),0,Math.cos(sample.heading)),eye=pos.clone().add(new THREE.Vector3(0,.7,0)).addScaledVector(forward,.3),blend=arriving&&p.firstPerson?THREE.MathUtils.smoothstep(k,.8,1):0
     controls.target.copy(eye);const desired=pos.clone().addScaledVector(forward,-(1.2*(1-blend)+.055*blend)).add(new THREE.Vector3(0,.98,0)).addScaledVector(new THREE.Vector3(forward.z,0,-forward.x),.18*(1-blend))
     if(zone==='S1'){desired.set(1.6,1.75,.7);controls.target.set(pos.x,Math.max(.25,pos.y+.75),pos.z)} // r16: the climber walked into the old fixed camera (0.6 m)
     // r16 PO continuity: on a ladder/shaft the follow camera used to trail 1.2 m behind the body straight into the earth
     // (black frames, rungs through the lens). Vertical sections now hand the camera to the room side of the opening,
     // looking into the shaft at the climbing body, and hand it back to the normal follow/eye view on arrival.
     const rise=passages[travel.id].rise;let roomPivot:THREE.Vector3|null=null
     if(zone!=='S1'){const ti=arriving?points.findIndex(q=>q[1]===0):rise?points.findIndex((_q,i)=>i+1<points.length&&points[i+1][1]!==0):1
      if(ti>=0){const thr=new THREE.Vector3(...points[ti]),end=new THREE.Vector3(...(arriving?points.at(-1)!:points[0])),away=end.clone().sub(thr).setY(0)
       if(away.lengthSq()>1e-4){away.normalize();const anchor=end.clone().addScaledVector(away,arriving?.6:.8).setY(.95),w=arriving?1-THREE.MathUtils.smoothstep(k,.82,1):1 // departures stay in the room from the first frame (the follow camera collapsed against the wall behind a door and showed the face)
        desired.lerp(anchor,w);controls.target.lerp(pos.clone().add(new THREE.Vector3(0,.55,0)),w)
        // the collision clamp pivots on the room-side floor point: pivoting on a body still inside the shaft pulled the camera into its face
        if(w>.5)roomPivot=end.clone().setY(.95)}}}
     camera.position.copy(desired);if(insideVolume){if(roomPivot)clampTunnelCamera(roomPivot.clone(),camera.position,roomPivot,insideVolume);else clampTunnelCamera(controls.target,camera.position,pos.clone().add(new THREE.Vector3(0,.8,0)),insideVolume)}
     // r16 PO: the old single reach target pulled both hands together above the head (crossed wrists). Ladder/shaft
     // sections now grip the two side rails separately, alternating hand over hand; crawl sections keep the clip's own arms.
     const motion=passages[travel.id].motion,leftV=new THREE.Vector3(forward.z,0,-forward.x)
     if(motion==='crawl'){avatar.reach(null);gripOf(avatar)?.(null,null)}
     else if(gripOf(avatar)&&(arriving?k<.8:k>.22)){const cyc=k*Math.PI*6,base=motion==='up'?.8:.6,hand=(side:number,phase:number)=>pos.clone().addScaledVector(forward,.32).addScaledVector(leftV,side*.19).add(new THREE.Vector3(0,base+(reduced?0:.07*Math.sin(cyc+phase)),0));avatar.reach(null);gripOf(avatar)!(hand(1,0),hand(-1,Math.PI));gripping=true}
     else if(gripOf(avatar)){avatar.reach(null);gripOf(avatar)!(null,null)}
     else avatar.reach(pos.clone().addScaledVector(forward,.25).add(new THREE.Vector3(0,1.05,0)))
    }
    motionVisible=!(arriving&&p.firstPerson&&k>.98)&&(zone==='S1'||camera.position.distanceTo(avatar.g.position.clone().add(new THREE.Vector3(0,.7,0)))>.65);avatar.g.visible=motionVisible;avatar.contact.visible=false
    renderer.domElement.dataset.passageMotion=JSON.stringify({visible:motionVisible,id:travel.id,phase:travel.phase,progress:+k.toFixed(3),position:avatar.g.position.toArray(),heading:avatar.g.rotation.y,rig:'Crouch_Fwd_Loop + per-hand rail grip IK',truth:'THEMATIC_SCENE'})
    if(k===1&&!passageReported){passageReported=true;requestAnimationFrame(()=>live.current.onPassageComplete?.())}
   }else{passageKey='';delete renderer.domElement.dataset.passageMotion;if(gripping){gripOf(avatar)?.(null,null);gripping=false}}
   R?.tickRigActors(dt,reduced);R?.tickFlora(t,reduced)
   // Keep kitchen readability light outside the torso. The old 20 cm offset
   // put a point light inside clothing, producing pale shoulder/chest patches.
   if(fill)fill.position.set(s.position[0]+(zone==='L1-C'?Math.sin(s.heading)*.9:0),zone==='L1-C'?1.65:1.05,s.position[1]+(zone==='L1-C'?Math.cos(s.heading)*.9:.2))
   // G3/G4 rooms: while the hands are on an object, an over-the-shoulder framing shows the contact (first person hid it),
   // then eases back to the player's own view. Collision-clamped inside the room volume.
   // Keep the inspected object in view after its motion settles. A deliberate orbit releases
   // this framing until a different object is selected; walking and exits remain available.
   const kitchenAction=zone==='L1-C'&&!s.path.length&&!!s.intent?.startsWith('A02_')&&s.intent!==roomOrbitIntent
   const selected=isLivingZone(zone)&&!s.path.length&&(p.talk===s.intent||s.intent==='NPC_COOK'||kitchenAction)&&s.intent!==roomOrbitIntent?env?.targets[s.intent??'']:null
   const selectedAt=selected?.userData.interactionBone instanceof THREE.Object3D?selected.userData.interactionBone.getWorldPosition(new THREE.Vector3()):selected?.userData.interactionAnchor instanceof THREE.Vector3?selected.localToWorld(selected.userData.interactionAnchor.clone()):null
   const viewAt=contactNow??selectedAt
   if(zone==='S5'&&!travel&&!s.path.length&&s.intent!==roomOrbitIntent){
    const station=env?.targets[s.intent??'']
    if(station){
     const look=station.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.22,0))
     const want=look.clone().add(new THREE.Vector3(camera.aspect<1?1.55:1.15,.95,2.35))
     controls.target.lerp(look,Math.min(1,dt*3))
     camera.position.lerp(want,Math.min(1,dt*3))
    }
   }
   if(viewAt)lastContact.copy(viewAt)
   interactW+=((viewAt?1:0)-interactW)*Math.min(1,dt*(viewAt?3.5:2.5))
   if(isLivingZone(zone)&&interactW>.01&&!travel){const heading=Math.atan2(lastContact.x-s.position[0],lastContact.z-s.position[1]),frame=s.intent==='NPC_COOK'&&selectedAt?conversationFrame(s.position,selectedAt.toArray(),camera.aspect):roomActionFrame(s.position,heading,lastContact.toArray(),camera.aspect,zone==='L1-C')
    const want=new THREE.Vector3(...frame.camera),look=new THREE.Vector3(...frame.look)
    controls.target.lerp(look,interactW);camera.position.lerp(want,interactW);if(insideVolume)clampTunnelCamera(controls.target,camera.position,look,insideVolume)}
   // close tunnel camera: hide the Avatar rather than fill the screen with its back
   if(tunnelWalk){
    // Hide the local Avatar when collision compresses the third-person rig into its body; never fade shared materials.
    const d=camera.position.distanceTo(controls.target),fp=!!p.firstPerson,o=fp||d<1.1?0:1
    // No partial fade (transparent sorting showed the face through the back; dithering read as a glitch): the camera sits
    // behind the shoulder, and hides the local Avatar below 1.1 m to preserve a usable view in a narrow passage.
    avatar.g.visible=travel&&(travel.phase==='DEPARTING'||travel.phase==='ARRIVING')?motionVisible:isLivingZone(zone)?showRoomActor({portrait:camera.aspect<1,firstPerson:fp,contact:interactW>.1,distance:camera.position.distanceTo(avatar.g.position.clone().setY(1))}):o>0
    renderer.domElement.dataset.roomContact=JSON.stringify({active:!!contactNow,avatarVisible:avatar.g.visible,portrait:camera.aspect<1})
    renderer.domElement.dataset.camera=fp?'first-person':'third-person'
    if(t-camStatAt>1){camStatAt=t;renderer.domElement.dataset.cameraView=JSON.stringify({lookYaw:+Math.atan2(controls.target.x-camera.position.x,controls.target.z-camera.position.z).toFixed(2),avatarYaw:+avatar.g.rotation.y.toFixed(2),distance:+d.toFixed(2),opacity:+o.toFixed(2)})} // QA: camera faces the way the Avatar faces?
   }
   if(cameraFree&&follow&&!camClamp){toCam.copy(camera.position).sub(controls.target);const len=toCam.length();camRay.set(controls.target,toCam.normalize());camRay.far=len;const hit=camRay.intersectObjects(colliders,false)[0];if(hit&&hit.distance<len)camera.position.copy(controls.target).addScaledVector(toCam,Math.max(.6,hit.distance-.25))}
   // OrbitControls ran before arrival/action/passage framing and collision. Render with
   // the final target rather than the stale rotation from the player's previous pose.
   const modelInspection=(viewing||zone==='L3-D')&&!p.passageMotion&&Math.hypot(s.position[0],s.position[1]-.5)<.3
   element.dataset.modelInspection=String(modelInspection)
   const kitchenInspection=zone==='L1-C'&&!!s.intent?.startsWith('Q4_')&&!s.path.length&&Math.hypot(s.position[0],s.position[1]+1.5)<.2
   element.dataset.kitchenInspection=String(kitchenInspection)
   if(zone==='L1-C'){const fov=kitchenFieldOfView(camera.aspect,kitchenInspection,kitchenAction);if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix()}renderer.domElement.dataset.kitchenCamera=JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,action:kitchenAction,inspection:kitchenInspection})}
   if(zone==='L2-B'){const fov=meetingFieldOfView(camera.aspect);if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix()}}
   if(kitchenInspection){camera.position.set(0,2,-1);controls.target.set(-.25,.25,-2);renderer.domElement.dataset.modelCameraInside=String(insideVolume?.(0,2,-1)??false)}
   if(modelInspection&&!viewing){
    // A wide workstation view includes all relation points in portrait as well
    // as landscape, inside the carved chamber; walking away releases it.
    // Stay in the chamber: the entrance at z=2 has a low ceiling. Fit portrait
    // by widening the lens, never by placing the camera inside that ceiling.
    camera.fov=camera.aspect<.75?100:85;camera.updateProjectionMatrix();camera.position.set(0,1.5,1.2);controls.target.set(0,.9,-1)
    renderer.domElement.dataset.modelCameraInside=String(insideVolume?.(camera.position.x,camera.position.y,camera.position.z)??false)
   }
   if(viewing){avatar.g.visible=false;camClamp?.(controls.target,camera.position);renderer.domElement.dataset.modelCameraInside=String(insideVolume?.(camera.position.x,camera.position.y,camera.position.z)??false)}
   if(zone==='L2-D'){const layers:string[]=[];scene.traverse(o=>{if(o.userData.modelLayer&&o.visible)layers.push(o.userData.modelLayer)});renderer.domElement.dataset.modelViewPose=JSON.stringify({active:viewing,camera:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,avatar:[s.position[0],s.position[1],s.heading],layers,yaw:env?.targets.MODEL_COMPARE?.rotation.y??0,zoom:p.modelView?.zoom??1})}
   if(zone==='L2-B')renderer.domElement.dataset.meetingCamera=JSON.stringify({position:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,aspect:camera.aspect,inside:insideVolume?.(camera.position.x,camera.position.y,camera.position.z)??false})
   wasModelViewer=viewing;camera.lookAt(controls.target)
   renderer.setViewport(0,element.clientHeight-viewHeight,element.clientWidth,viewHeight);renderer.render(scene,camera);
   if(captureRequests.size){for(const requestId of captureRequests){try{const frame=document.createElement('canvas'),scale=Math.min(1,960/renderer.domElement.width,540/renderer.domElement.height);frame.width=Math.max(1,Math.round(renderer.domElement.width*scale));frame.height=Math.max(1,Math.round(renderer.domElement.height*scale));const ctx=frame.getContext('2d');if(!ctx)throw new Error('Không tạo được ảnh trên thiết bị này.');ctx.drawImage(renderer.domElement,0,0,frame.width,frame.height);captureResult(requestId,{dataUrl:frame.toDataURL('image/png')})}catch{captureResult(requestId,{error:'Không đọc được khung hình 3D. Hãy thử lại khi cảnh đã mở.'})}}captureRequests.clear()}
   if(!ready){ready=true;renderer.domElement.dataset.readiness='ready';live.current.onReady?.(zone)}
   if(t-poseStat>.1){poseStat=t;renderer.domElement.dataset.avatarPose=JSON.stringify({zone,position:s.position,heading:s.heading,moving:s.path.length>0,lookYaw:Math.atan2(controls.target.x-camera.position.x,controls.target.z-camera.position.z)})}
   const w=element.clientWidth,h=viewHeight
   const projectedLabels: {entry:Label;x:number;y:number;top:number;width:number;height:number}[]=[]
   for(const entry of labels){
    bounds.setFromObject(entry.object);bounds.getCenter(center);if(entry.object.userData.interactionAnchor instanceof THREE.Vector3)center.copy(entry.object.userData.interactionAnchor).applyMatrix4(entry.object.matrixWorld);if(entry.object.userData.interactionBone instanceof THREE.Object3D)entry.object.userData.interactionBone.getWorldPosition(center);projected.copy(center).project(camera)
    const visible=entry.object.visible&&entry.object.parent?.visible!==false&&projected.z>=-1&&projected.z<=1
    entry.element.hidden=!visible;if(!visible)continue
    const x=(projected.x*.5+.5)*w,y=(-projected.y*.5+.5)*h;entry.element.dataset.cx=String(x);entry.element.dataset.cy=String(y)
    top.set(center.x,bounds.max.y,center.z).project(camera)
    projectedLabels.push({entry,x,y,top:(-top.y*.5+.5)*h,width:entry.element.offsetWidth,height:entry.element.offsetHeight})
    if(entry.actor){top.set(center.x,bounds.max.y,center.z).project(camera);bottom.set(center.x,bounds.min.y,center.z).project(camera);entry.element.dataset.screenHeight=String(Math.abs(top.y-bottom.y)*h*.5)}
   }
   // Keep captions off model anchors and each other as the camera changes.
   // Captions remain non-interactive; actual mesh raycasts and HTML equivalents are unchanged.
   const occupied:{x:number;y:number;width:number;height:number}[]=[]
   const intersects=(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number})=>a.x<b.x+b.width+5&&a.x+a.width+5>b.x&&a.y<b.y+b.height+5&&a.y+a.height+5>b.y
   for(const item of projectedLabels.sort((a,b)=>Number(!!a.entry.actor)-Number(!!b.entry.actor))){
    const {entry,x,y,width,height}=item
    const candidates=[{x:x-width/2,y:item.top-height-12}]
    for(const gap of [28,56,84,112])for(const side of [-1,1])candidates.push({x:x-width/2+side*gap,y:item.top-height-12},{x:x-width/2+side*gap,y:y+gap},{x:x-width/2+side*gap,y:y-gap-height})
    const at=candidates.find(c=>c.x>=8&&c.y>=8&&c.x+width<=w-8&&c.y+height<=h-8&&!occupied.some(r=>intersects({...c,width,height},r))&&!projectedLabels.some(other=>intersects({...c,width,height},{x:other.x-9,y:other.y-9,width:18,height:18})))
    entry.element.hidden=!at
    if(at){entry.element.style.transform='none';entry.element.style.left=`${at.x}px`;entry.element.style.top=`${at.y}px`;occupied.push({...at,width,height})}
   }
   if(Math.floor(t)!==lastStat){lastStat=Math.floor(t);renderer.domElement.dataset[s2?'s2Render':'zoneRender']=JSON.stringify({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures})
    if(['L1-C','S2','S3','S4','L2-B'].includes(zone)){const actors:unknown[]=[];let legacyMeshes=0;scene.traverse(o=>{if(o.userData.characterArt)actors.push({art:o.userData.characterArt,ambientReaction:o.userData.ambientReaction,position:o.position.toArray(),activeContact:o.userData.activeContact,contactFrame:o.userData.contactFrame,footFrame:o.userData.footFrame,workbench:o.userData.workbench?{...o.userData.workbench,screenHands:(o.userData.workbench.handles as number[][]).map(v=>new THREE.Vector3().fromArray(v).project(camera).toArray())}:undefined});if(o instanceof THREE.Mesh&&/superhero/i.test(o.name))legacyMeshes++});renderer.domElement.dataset.characterQc=JSON.stringify({actors,legacyMeshes})}
   }
  };
  cleanup=()=>{motionPreference.removeEventListener('change',motionChanged);releaseCapture();if(tunnelWalk)walkCamera.current={zone,position:camera.position.clone(),target:controls.target.clone(),firstPerson:fpLast};cancelAnimationFrame(frame);R?.clearRigActors();resize.disconnect();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blurKeys);controls.removeEventListener('start',begin);controls.removeEventListener('end',end);controls.dispose();live.current.onBusy(false);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp);renderer.domElement.removeEventListener('webglcontextlost',lost);labels.forEach(l=>l.element.remove());scene.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose()});disposeWorldScene(scene);kit.dispose();renderer.renderLists.dispose();renderer.domElement.remove()}
  performance.mark('lw-'+zone+'-compile-start');await warmWorldShaders(renderer,scene,camera,()=>cancelled);performance.mark('lw-'+zone+'-compile-end');
  if(!cancelled)animate()
  }).catch((error:unknown)=>{console.error('[living-world] scene build failed',error);cleanup();if(!cancelled)live.current.onFailure()})
  return()=>{cancelled=true;cleanup()}
 },[props.shell.zone,props.proof,props.view])
 useLayoutEffect(()=>()=>{rendererRef.current?.dispose();rendererRef.current=null},[])
 return <div className="lw-canvas" ref={host} aria-label="Mô hình tương tác: chọn chính vật thể để đến gần và tương tác. Có điều khiển tương đương bên cạnh." />
}
