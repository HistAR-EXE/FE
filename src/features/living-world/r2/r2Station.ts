import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import type {ZoneEnv} from '../zoneEnvironments'
import {pbr,ensureUv1,place,canvasTexture,leafCard,cardClump,preload,roomEnvironment} from './r2Assets'
import {createRigActor,R2_CHAR_FILES,type RigActor} from './r2Actors'

// S0 · Trạm thời gian — R2 integration into the playable build (LOOKDEV CANDIDATE, fictional present-day station).
// Gameplay frame is unchanged: walk grid |x|<3.5, |z|<2.5; Kha at (-2,-1); MACHINE at (0,-1), approached from (0,0).
// Zones in the hall: operations (Kha's desk, left), boarding (console + gangway, centre), portal (Chrono Vessel bay, back).
const MATERIALS=['terrazzo_tiles','brushed_concrete','metal_plate','concrete_panels','bark_brown_01','forest_leaves_02','red_dirt_mud_01']
export const prepareStation=()=>preload({materials:MATERIALS,models:['metal_tool_chest','industrial_wall_lamp'],chars:R2_CHAR_FILES})
export type StationEnv=ZoneEnv&{kha:RigActor}

export function buildStation(scene:T.Scene,kit:Kit,renderer:T.WebGLRenderer):StationEnv{
 const room=roomEnvironment(renderer);kit.track(room);scene.environment=room.texture;scene.environmentIntensity=.75
 const box=(w:number,h:number,d:number,m:T.Material,p:[number,number,number],parent:T.Object3D,r:[number,number,number]=[0,0,0])=>{const o=new T.Mesh(kit.track(ensureUv1(new T.BoxGeometry(w,h,d))),m);o.position.set(...p);o.rotation.set(...r);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
 const cyl=(r1:number,r2:number,h:number,m:T.Material,p:[number,number,number],parent:T.Object3D,rot:[number,number,number]=[0,0,0],seg=24)=>{const o=new T.Mesh(kit.track(ensureUv1(new T.CylinderGeometry(r1,r2,h,seg))),m);o.position.set(...p);o.rotation.set(...rot);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
 const std=(o:T.MeshStandardMaterialParameters)=>kit.track(new T.MeshStandardMaterial(o))
 const glow=(c:string,i:number)=>std({color:'#000',emissive:c,emissiveIntensity:i})
 const concrete=pbr(kit,'brushed_concrete',{repeat:[6,2],color:'#c9ccd0'}),panel=pbr(kit,'concrete_panels',{repeat:[5,2],color:'#d4d6d8'})
 const metalD=pbr(kit,'metal_plate',{metal:1,color:'#5b6066',rough:.8}),terr=pbr(kit,'terrazzo_tiles',{repeat:[11,9],rough:.55,color:'#8e9296'})
 const metal=std({color:'#a7aeb5',metalness:1,roughness:.32}),copper=std({color:'#b87342',metalness:1,roughness:.32}),dark=std({color:'#16191c',metalness:.6,roughness:.4}),green=std({color:'#2f5e48',metalness:.2,roughness:.55})
 scene.background=new T.Color('#c9d6dc');scene.fog=new T.Fog('#c9d6dc',30,90)

 // ---- hall shell 22 × 18 × 7.5 (x −11…11, z −10…8) ----
 const W=22,D=18,H=7.5,cz=-1,hall=new T.Group();scene.add(hall)
 const floor=box(W,.2,D,terr,[0,-.1,cz],hall);floor.castShadow=false
 box(W,.3,D,concrete,[0,H,cz],hall)
 box(.4,H,D,panel,[-W/2,H/2,cz],hall);box(.4,H,D,panel,[W/2,H/2,cz],hall);box(W,H,.4,panel,[0,H/2,cz+D/2],hall)
 // back wall with a panoramic window onto present-day Củ Chi (x −10…−1, y 0.9…6.2)
 const back=cz-D/2;box(W,.9,.4,concrete,[0,.45,back],hall);box(W,1.3,.4,concrete,[0,H-.65,back],hall);box(12,5.3,.4,concrete,[5,3.55,back],hall)
 for(let x=-10.2;x<=-1;x+=1.5)box(.14,5.3,.3,dark,[x,3.55,back],hall)
 box(9.4,.12,.3,dark,[-5.6,3.4,back],hall)
 // light strips on the side fins; roof trusses; hanging fixtures are emissive (no extra lights)
 for(let z=-8;z<=6;z+=2.8){box(.25,H-.6,.18,metalD,[W/2-.35,H/2,z],hall);box(.03,H-1.6,.05,glow('#cfe6ff',1.4),[W/2-.47,H/2,z+.4],hall);box(.25,H-.6,.18,metalD,[-W/2+.35,H/2,z],hall)}
 for(let x=-9;x<=9;x+=4.5){box(.25,.5,D,metalD,[x,H-.4,cz],hall);box(.18,.18,D,metalD,[x,H-1.2,cz],hall)}
 for(const x of [-6.75,-2.25,2.25,6.75])for(const z of [-5,2.5]){box(2.6,.08,.22,dark,[x,H-1.05,z],hall);box(2.4,.03,.12,glow('#fff4e4',2),[x,H-1.1,z],hall)}
 // floor zoning: operations (blue tape), boarding lane (amber chevrons), portal bay (ring)
 const tape=(w:number,d:number,x:number,z:number,c:string,r=0)=>{const m=new T.Mesh(kit.track(new T.PlaneGeometry(w,d)),std({color:c,roughness:.6}));m.rotation.set(-Math.PI/2,0,r);m.position.set(x,.012,z);m.receiveShadow=true;hall.add(m)}
 for(const [x,z,w,d] of [[-3.6,-2.2,.06,3.4],[-1.5,-2.2,.06,3.4],[-2.55,-.5,2.1,.06],[-2.55,-3.9,2.1,.06]] as const)tape(w,d,x,z,'#4c87b8')
 for(let i=0;i<6;i++)tape(.5,.08,0,.4-i*.45,'#d9963f',0)
 tape(.06,3,-.6,-1.1,'#d9963f');tape(.06,3,.6,-1.1,'#d9963f')

 // ---- Chrono Vessel bay (portal zone) ----
 const V=new T.Group();V.position.set(0,0,-5.4);scene.add(V)
 cyl(4.2,4.2,.08,dark,[0,.02,0],V,[0,0,0],96)
 const mark=canvasTexture(1024,1024,(x,w)=>{x.clearRect(0,0,w,w);x.translate(w/2,w/2);x.strokeStyle='rgba(255,190,120,0.9)';x.lineWidth=5;x.beginPath();x.arc(0,0,480,0,7);x.stroke();x.setLineDash([24,18]);x.lineWidth=3;x.beginPath();x.arc(0,0,440,0,7);x.stroke();x.setLineDash([]);for(let i=0;i<72;i++){const a=i/72*6.283,L=i%6===0?40:16;x.beginPath();x.moveTo(Math.cos(a)*480,Math.sin(a)*480);x.lineTo(Math.cos(a)*(480-L),Math.sin(a)*(480-L));x.stroke()}});kit.track(mark)
 const markMat=std({map:mark,transparent:true,emissive:'#ffb070',emissiveMap:mark,emissiveIntensity:.15,roughness:.4,depthWrite:false})
 const mk=new T.Mesh(kit.track(new T.CircleGeometry(4.1,96)),markMat);mk.rotation.x=-Math.PI/2;mk.position.y=.065;V.add(mk)
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2,g=new T.Group();g.position.set(Math.cos(a)*1.9,0,Math.sin(a)*1.4);g.rotation.y=-a;V.add(g);box(.7,.35,.7,metalD,[0,.18,0],g);cyl(.16,.16,1.5,metal,[-.3,1,0],g,[0,0,.55]);cyl(.1,.1,1.2,copper,[-.55,1.45,0],g,[0,0,.55]);box(.5,.2,.35,metalD,[-.85,1.95,0],g)}
 cyl(.55,.7,1.2,metalD,[0,.6,0],V,[0,0,0],32)
 const coreMat=glow('#7fd6ff',1.2);for(let i=0;i<12;i++){const a=i/12*6.283;box(.05,.75,.02,coreMat,[Math.cos(a)*.62,.65,Math.sin(a)*.62],V,[0,-a,0])}
 const pod=new T.Group();pod.position.set(0,1.95,0);V.add(pod)
 const hull=new T.Mesh(kit.track(new T.CapsuleGeometry(.95,1.5,12,48)),std({color:'#e4e7ea',metalness:.15,roughness:.3}));hull.rotation.z=Math.PI/2;hull.scale.set(1,1,.92);hull.castShadow=true;pod.add(hull)
 const canopy=new T.Mesh(kit.track(new T.SphereGeometry(.97,48,24,-.9,1.8,.55,.9)),std({color:'#0c1a22',roughness:.05,metalness:.3}));canopy.scale.set(1.35,1,.93);pod.add(canopy)
 for(const sx of [-1,1]){const band=new T.Mesh(kit.track(new T.TorusGeometry(.97,.04,10,64)),copper);band.rotation.y=Math.PI/2;band.position.x=sx*.55;pod.add(band)}
 const seamMat=glow('#7fd6ff',.8);const seam=new T.Mesh(kit.track(new T.TorusGeometry(.96,.012,6,64)),seamMat);seam.rotation.y=Math.PI/2;seam.position.x=1.15;pod.add(seam)
 cyl(.5,.5,.25,dark,[1.75,0,0],pod,[0,0,Math.PI/2],32);cyl(.32,.4,.2,glow('#ffb070',1),[1.9,0,0],pod,[0,0,Math.PI/2],32)
 box(.55,.12,.55,green,[0,1.35,.15],V);box(.55,.7,.12,green,[0,1.75,-.12],V,[-.2,0,0])
 // phase ring: segmented plates + copper coils (spins up on activation)
 const ring=new T.Group();ring.position.set(0,2.6,-.2);ring.rotation.set(.12,0,.05);V.add(ring)
 const RR=2.55,seg=new T.InstancedMesh(kit.track(new T.BoxGeometry(.32,.42,.34)),metal,56),m4=new T.Matrix4()
 for(let i=0;i<56;i++){const a=i/56*6.283;m4.compose(new T.Vector3(Math.cos(a)*RR,Math.sin(a)*RR,0),new T.Quaternion().setFromEuler(new T.Euler(0,0,a)),new T.Vector3(1,1,1));seg.setMatrixAt(i,m4)}
 seg.castShadow=true;ring.add(seg)
 ring.add(new T.Mesh(kit.track(new T.TorusGeometry(RR-.28,.07,16,180)),copper),new T.Mesh(kit.track(new T.TorusGeometry(RR+.26,.05,12,180)),copper))
 const innerMat=glow('#9fe4ff',.6);ring.add(new T.Mesh(kit.track(new T.TorusGeometry(RR-.4,.012,8,200)),innerMat))
 const veilMat=kit.track(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},power:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader:'uniform float time;uniform float power;varying vec2 vUv;void main(){vec2 p=vUv-.5;float r=length(p)*2.0;float a=atan(p.y,p.x);float s=.5+.5*sin(a*6.0+r*16.0-time*3.0);vec3 c=mix(vec3(.5,.85,1.0),vec3(1.0,.8,.5),s*r);float alpha=smoothstep(1.0,.7,r)*power*(.35+.5*s);gl_FragColor=vec4(c,alpha);}'}))
 const veil=new T.Mesh(kit.track(new T.CircleGeometry(RR-.42,64)),veilMat);ring.add(veil)
 for(const sx of [-1,1]){box(.5,2.6,.6,metalD,[sx*2.75,1.3,-.2],V);cyl(.12,.12,3.2,copper,[sx*2.4,.6,.9],V,[Math.PI/2,0,0],16)}
 place(V,'metal_tool_chest',[3.6,0,1.8],{rotY:-.8})
 const coreLight=new T.PointLight('#8fdcff',3,7,2);coreLight.position.set(0,1.1,1);V.add(coreLight)
 // gangway from the boarding console to the pod
 const gang=new T.Group();gang.position.set(0,0,-2.4);scene.add(gang);box(1.1,.08,2.4,metalD,[0,.32,0],gang);for(const sx of [-1,1]){cyl(.02,.02,2.4,metal,[sx*.55,1.2,0],gang,[Math.PI/2,0,0],8);for(const z of [-1,0,1])cyl(.02,.02,.9,metal,[sx*.55,.78,z],gang,[0,0,0],8)}

 // ---- boarding console: the real interaction point (MACHINE target) ----
 const machine=new T.Group();scene.add(machine);machine.add(V,gang)
 const con=new T.Group();con.position.set(0,0,-1.15);machine.add(con)
 cyl(.28,.36,1,metalD,[0,.5,0],con,[0,0,0],8)
 const screen=canvasTexture(512,320,(x,w,h)=>{x.fillStyle='#071820';x.fillRect(0,0,w,h);x.fillStyle='#7fd6ff';x.font='600 30px sans-serif';x.fillText('MỐC ĐÍCH: 01/1967',24,56);x.fillStyle='#e6b07a';x.fillText('CỦ CHI · TÁI DỰNG',24,104);x.strokeStyle='rgba(127,214,255,.6)';x.lineWidth=3;x.strokeRect(24,140,w-48,60);x.fillStyle='rgba(255,255,255,.75)';x.font='22px sans-serif';x.fillText('Đặt tay để khởi động',40,180);x.fillText('Bối cảnh tái dựng · không phải ghi chép',24,250)});kit.track(screen)
 const screenMat=std({color:'#000',emissive:'#fff',emissiveMap:screen,emissiveIntensity:.8})
 box(.9,.56,.05,screenMat,[0,1.18,.05],con,[-.55,0,0]);box(.96,.62,.04,dark,[0,1.17,.02],con,[-.55,0,0])
 const palmMat=glow('#ffb070',.6);const palm=new T.Mesh(kit.track(new T.CircleGeometry(.11,32)),palmMat);palm.rotation.x=-Math.PI/2+.55;palm.position.set(0,1.02,.32);con.add(palm)

 // ---- P2 time axis: a holographic dial that unfolds over the console when the player opens it (FINAL Baseline 8.1) ----
 // Nodes: 01/1967 (open, amber) + three locked marks (1948/1968/1975 — shown as locked, content not verified, §3.5).
 const dial=new T.Group();dial.position.set(0,2.3,-.75);dial.rotation.x=-.12;dial.scale.setScalar(.001);dial.visible=false;machine.add(dial)
 const dialMat=kit.track(new T.MeshBasicMaterial({color:'#9fe4ff',transparent:true,opacity:.95,depthWrite:false}))
 dial.add(new T.Mesh(kit.track(new T.TorusGeometry(.46,.014,8,96)),dialMat),new T.Mesh(kit.track(new T.TorusGeometry(.3,.004,6,96)),dialMat))
 const eraNodes:{id:string;mesh:T.Mesh;open:boolean}[]=[]
 const nodeLabel=(text:string,open:boolean)=>{const t=kit.track(canvasTexture(256,64,(x,w,h)=>{x.clearRect(0,0,w,h);x.font=(open?'700 34px':'500 28px')+' sans-serif';x.textAlign='center';x.fillStyle=open?'#ffcf8a':'rgba(160,200,215,.75)';x.fillText(text,w/2,44)}));const sp=new T.Sprite(kit.track(new T.SpriteMaterial({map:t,transparent:true,depthWrite:false})));sp.scale.set(.3,.075,1);return sp}
 ;([['1967-01','01/1967',true,Math.PI/2],['1948','1948 · khóa',false,Math.PI*1.1],['1968','1968 · khóa',false,Math.PI*1.55],['1975','1975 · khóa',false,-Math.PI*.1]] as const).forEach(([id,text,open,a])=>{
  const m=new T.Mesh(kit.geo('r2-p2-node-'+(open?'o':'l'),()=>new T.SphereGeometry(open?.045:.03,16,12)),open?glow('#ffb070',1.6):std({color:'#3a4a52',emissive:'#203038',emissiveIntensity:.4}));m.position.set(Math.cos(a)*.46,Math.sin(a)*.46,0);dial.add(m)
  const l=nodeLabel(text,open);l.position.set(Math.cos(a)*.66,Math.sin(a)*.62,0);dial.add(l);eraNodes.push({id,mesh:m,open})})
 const sitePin=nodeLabel('Bến Dược · site tham chiếu',true);sitePin.scale.set(.5,.125,1);sitePin.position.set(0,-.12,0);sitePin.visible=false;dial.add(sitePin)
 let dialOpen=0

 // ---- operations desk (Kha) ----
 const G=new T.Group();G.position.set(-3.3,0,-2.5);G.rotation.y=.6;scene.add(G)
 box(3.4,.85,.8,dark,[0,.42,0],G);box(3.6,.06,1,concrete,[0,.88,.05],G)
 const titles=['THỜI TUYẾN','HỒ SƠ THỜI GIAN','TỌA ĐỘ ĐÍCH','LÕI NĂNG LƯỢNG','GIÁM SÁT']
 titles.forEach((title,k)=>{const t=canvasTexture(512,300,(x,w,h)=>{x.fillStyle='#06141a';x.fillRect(0,0,w,h);x.strokeStyle='rgba(127,214,255,0.18)';for(let i=0;i<w;i+=32){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke()}x.fillStyle='#e6b07a';x.font='600 26px sans-serif';x.fillText(title,20,40);x.strokeStyle='#7fd6ff';x.lineWidth=2;x.beginPath();for(let i=0;i<w;i+=8)x.lineTo(i,h*.6+Math.sin(i*.04+k)*30*(k%2?1:.5));x.stroke()});kit.track(t);const a=(k-2)*.2;box(.68,.42,.03,std({color:'#000',emissive:'#fff',emissiveMap:t,emissiveIntensity:.8}),[(k-2)*.7,1.3+(k%2)*.05,-.2+Math.abs(k-2)*.1],G,[-.08,-a,0])})
 place(G,'industrial_wall_lamp',[-1.9,2,-.6],{rotY:.4})
 const opsLight=new T.PointLight('#9fdcff',1.5,4,2);opsLight.position.set(0,2,.4);G.add(opsLight)
 const kha=createRigActor(scene,kit,{body:'male',height:1.76,skin:'#c99a7a',hair:'Hair_SimpleParted',brows:true,hairColor:'#0f0d0c',clothing:{top:'#1f2a33',bottom:'#2a2f35',style:'modern'}})

 // ---- timeline wall (right) ----
 const tl=canvasTexture(1536,576,(x,w,h)=>{const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,'#071319');g.addColorStop(1,'#0c1f26');x.fillStyle=g;x.fillRect(0,0,w,h);x.strokeStyle='rgba(127,214,255,0.5)';x.lineWidth=4;x.beginPath();x.moveTo(60,h*.55);x.lineTo(w-60,h*.55);x.stroke()
  for(const [y,f] of [['1945',.08],['1954',.22],['1967',.42],['1975',.58],['1995',.76],['2026',.92]] as const){const X=60+(w-120)*f,hot=y==='1967';x.fillStyle=hot?'#e6b07a':'rgba(127,214,255,0.8)';x.beginPath();x.arc(X,h*.55,hot?18:10,0,7);x.fill();x.font=(hot?'700 50px':'500 34px')+' sans-serif';x.textAlign='center';x.fillText(y,X,h*.55-40)}
  x.textAlign='left';x.fillStyle='rgba(255,255,255,0.85)';x.font='600 32px sans-serif';x.fillText('BẢN ĐỒ THỜI TUYẾN',60,70);x.fillStyle='rgba(255,255,255,0.5)';x.font='22px sans-serif';x.fillText('Các mốc minh họa · trạm thời gian là bối cảnh hư cấu',60,110)});kit.track(tl)
 box(8,3,.08,std({color:'#000',emissive:'#fff',emissiveMap:tl,emissiveIntensity:.7}),[W/2-.6,3.4,-.5],scene,[0,-Math.PI/2,0])

 // ---- outside: present-day Củ Chi (rubber rows, red-earth road, tile-roof houses) ----
 const out=new T.Group();out.position.set(0,-1.2,back-2);scene.add(out)
 const gnd=new T.Mesh(kit.track(ensureUv1(new T.PlaneGeometry(260,160))),pbr(kit,'forest_leaves_02',{repeat:[50,30],color:'#9aa070'}));gnd.rotation.x=-Math.PI/2;gnd.position.z=-80;out.add(gnd)
 const road=new T.Mesh(kit.track(ensureUv1(new T.PlaneGeometry(6,160))),pbr(kit,'red_dirt_mud_01',{repeat:[2,50]}));road.rotation.x=-Math.PI/2;road.rotation.z=.35;road.position.set(-10,.02,-80);out.add(road)
 let s=7;const R=()=>((s=(s*1664525+1013904223)>>>0)/4294967296),rows:[number,number][]=[]
 for(let row=0;row<10;row++)for(let col=0;col<28;col++)rows.push([-50+col*3.4+(row%2)*1.7+(R()-.5)*.3,-14-row*5.5+(R()-.5)*.3])
 const trunks=new T.InstancedMesh(kit.track(new T.CylinderGeometry(.14,.2,7,8)),pbr(kit,'bark_brown_01',{repeat:[1,3],color:'#b8b0a0'}),rows.length)
 const leaf=std({map:leafCard('broad',.25,9),color:'#e8f2d8',alphaTest:.45,side:T.DoubleSide,roughness:.75}),crowns=new T.InstancedMesh(kit.track(cardClump(3.2)),leaf,rows.length*2)
 rows.forEach(([x,z],i)=>{m4.compose(new T.Vector3(x,3.5,z),new T.Quaternion(),new T.Vector3(1,1,1));trunks.setMatrixAt(i,m4);for(let k=0;k<2;k++){m4.compose(new T.Vector3(x+(R()-.5)*1.6,7+R()*1.6,z+(R()-.5)*1.6),new T.Quaternion().setFromEuler(new T.Euler(R()*.4,R()*6,R()*.4)),new T.Vector3().setScalar(1+R()*.5));crowns.setMatrixAt(i*2+k,m4)}})
 out.add(trunks,crowns)
 const tile=std({color:'#a4552f',roughness:.8}),wall=std({color:'#e6dccb',roughness:.9})
 for(const [x,z,r] of [[-22,-10,.3],[-15,-12,.1],[8,-11,-.2]] as const){box(6,3,5,wall,[x,1.5,z],out,[0,r,0]);const rf=new T.Mesh(kit.track(new T.ConeGeometry(4.8,2.2,4)),tile);rf.position.set(x,4.1,z);rf.rotation.y=r+Math.PI/4;out.add(rf)}

 // ---- light: sun through the window, low fill, environment set by WorldScene ----
 const sun=new T.DirectionalLight('#fff0dc',2.2);sun.position.set(-12,14,-24);sun.target.position.set(-1,0,-1);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:70});sun.shadow.bias=-.0004;sun.shadow.normalBias=.03;scene.add(sun,sun.target)
 scene.add(new T.HemisphereLight('#e8f0ff','#4a4038',1.1))
 for(const [x,z] of [[-4,-4],[4,-4],[-4,3],[4,3]] as const){const l=new T.PointLight('#fff1e0',9,14,1.6);l.position.set(x,H-1.3,z);scene.add(l)}

 let power=0,spin=0
 return {kha,heightAt:()=>0,floor,targets:{MACHINE:machine},endpoints:new Map(),pipes:[],links:[],camera:{position:[0,2.2,6.2],target:[0,1.3,-2],min:2.2,max:7,polar:1.42},update:(t,dt,st)=>{
  // before/after activation: console palm → core → seam → ring spin-up → veil
  // the machine powers up only when it is activated (P2 confirmed → departure), not when the console sheet is merely open
  const want=st.working||(st.active==='MACHINE'&&!st.p2)?1:0;power+=(want-power)*Math.min(1,dt*(want?1.4:.8))
  const p2=st.p2&&st.p2!=='OFF'?st.p2:null;dialOpen+=((p2?1:0)-dialOpen)*(st.reduced?1:Math.min(1,dt*4));dial.visible=dialOpen>.02;dial.scale.setScalar(Math.max(.001,dialOpen*1.8))
  if(dial.visible){dial.rotation.z=st.reduced?0:Math.sin(t*.3)*.04;for(const n of eraNodes)if(n.open)n.mesh.scale.setScalar(st.p2Era===n.id?1.25+(st.reduced?0:Math.sin(t*5)*.15):1);sitePin.visible=p2==='CONFIRM'}
  coreMat.emissiveIntensity=1.2+power*3.5;seamMat.emissiveIntensity=.8+power*2.5;innerMat.emissiveIntensity=.6+power*2.4;markMat.emissiveIntensity=.15+power*.9;palmMat.emissiveIntensity=.6+power*2+(st.reduced?0:Math.sin(t*4)*.2*(1-power))
  coreLight.intensity=3+power*10;veilMat.uniforms.power.value=power;veilMat.uniforms.time.value=st.reduced?0:t
  spin+=dt*(st.reduced?0:.05+power*1.6);ring.rotation.z=spin
  pod.position.y=1.95+(st.reduced?0:Math.sin(t*1.3)*.02*(1+power))
 }}
}
