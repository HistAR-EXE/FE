import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import type {ZoneEnv} from '../zoneEnvironments'

/** Authored contemporary reflection courtyard. Architectural interpretation pending review. */
export function buildMemorial(scene:T.Scene,kit:Kit):ZoneEnv & {hands:()=>T.Vector3|null} {
 const stone=kit.track(new T.MeshStandardMaterial({color:'#c5bca7',roughness:.9}))
 const darkStone=kit.track(new T.MeshStandardMaterial({color:'#666d68',roughness:.85}))
 const wood=kit.track(new T.MeshStandardMaterial({color:'#70513b',roughness:.9}))
 const leaf=kit.track(new T.MeshStandardMaterial({color:'#415b39',roughness:1}))
 const flower=kit.track(new T.MeshStandardMaterial({color:'#f0e5c2',roughness:.8}))
 const box=(size:[number,number,number],at:[number,number,number],material:T.Material)=>{
  const mesh=new T.Mesh(kit.track(new T.BoxGeometry(...size)),material)
  mesh.position.set(...at);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh
 }
 scene.background=new T.Color('#cadad9');scene.fog=new T.Fog('#cadad9',16,48)
 scene.add(new T.HemisphereLight('#e8f2ee','#78715d',2))
 const sun=new T.DirectionalLight('#ffe4b8',3);sun.position.set(-5,8,4);scene.add(sun)
 const floor=box([12,.12,11],[0,-.06,0],stone)
 for(let x=-5;x<=5;x++)box([.015,.005,10],[x,.004,0],darkStone)
 for(let z=-4;z<=4;z++)box([11,.005,.015],[0,.004,z],darkStone)
 box([5,2.5,.35],[0,1.25,-3.6],darkStone)
 const plaque=box([2.7,1.1,.06],[0,1.5,-3.38],stone)
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=384
 const ctx=canvas.getContext('2d')!
 ctx.fillStyle='#c5bca7';ctx.fillRect(0,0,1024,384);ctx.fillStyle='#333c36';ctx.textAlign='center'
 ctx.font='48px serif';ctx.fillText('KÝ ỨC VÀ TRI ÂN',512,145)
 ctx.font='28px sans-serif';ctx.fillText('Củ Chi hôm nay',512,215)
 ctx.font='22px sans-serif';ctx.fillText('Không gian diễn giải hiện đại',512,282)
 const texture=kit.track(new T.CanvasTexture(canvas));texture.colorSpace=T.SRGBColorSpace
 const inscription=new T.Mesh(kit.track(new T.PlaneGeometry(2.6,.98)),kit.track(new T.MeshBasicMaterial({map:texture})))
 inscription.position.set(0,1.5,-3.34);scene.add(inscription)
 const offering=box([1.2,.16,.65],[-1.5,.82,-1.7],stone)
 box([.25,.74,.3],[-1.5,.37,-1.7],darkStone)
 const bouquet=new T.Group();scene.add(bouquet)
 for(let i=0;i<7;i++){
  const blossom=new T.Group();blossom.position.set(-.19+i*.06,.015,Math.sin(i)*.07);bouquet.add(blossom)
  for(let ring=0;ring<2;ring++)for(let petal=0;petal<7;petal++){
   const angle=petal*Math.PI*2/7+ring*.4
   const mesh=new T.Mesh(kit.track(new T.SphereGeometry(1,8,6)),flower)
   mesh.scale.set(.027,.009,.045);mesh.position.set(Math.sin(angle)*(.023+ring*.012),ring*.012,Math.cos(angle)*(.023+ring*.012));mesh.rotation.y=angle
   blossom.add(mesh)
  }
  const stem=new T.Mesh(kit.track(new T.CylinderGeometry(.003,.003,.23,5)),leaf)
  stem.rotation.x=Math.PI/2;stem.position.set(0,-.01,.14);blossom.add(stem)
 }
 bouquet.position.set(-1.5,.94,-1.7)
 const urn=new T.Mesh(kit.track(new T.CylinderGeometry(.28,.2,.45,24)),darkStone)
 urn.position.set(0,.55,-2);scene.add(urn)
 box([.65,.3,.65],[0,.15,-2],stone)
 const incense=new T.Group();scene.add(incense)
 const incenseMaterial=kit.track(new T.MeshStandardMaterial({color:'#87603b',roughness:1}))
 for(let i=0;i<3;i++){
  const stick=new T.Mesh(kit.track(new T.CylinderGeometry(.006,.006,.38,6)),incenseMaterial)
  stick.position.set((i-1)*.04,.19,0);incense.add(stick)
 }
 incense.position.set(0,.7,-2);incense.visible=false
 const smokeCanvas=document.createElement('canvas');smokeCanvas.width=64;smokeCanvas.height=64
 const smokeCtx=smokeCanvas.getContext('2d')!,gradient=smokeCtx.createRadialGradient(32,32,0,32,32,32)
 gradient.addColorStop(0,'rgba(225,221,210,.45)');gradient.addColorStop(1,'rgba(225,221,210,0)');smokeCtx.fillStyle=gradient;smokeCtx.fillRect(0,0,64,64)
 const smokeMap=kit.track(new T.CanvasTexture(smokeCanvas))
 const smoke=Array.from({length:8},()=>{const sprite=new T.Sprite(kit.track(new T.SpriteMaterial({map:smokeMap,transparent:true,depthWrite:false})));scene.add(sprite);return sprite})
 let previous:string|null=null,started=0,handTarget:T.Vector3|null=null
 const bench=box([1.5,.12,.55],[2,.45,-.8],wood)
 for(const x of [1.45,2.55])box([.12,.4,.45],[x,.2,-.8],darkStone)
 for(const x of [-4.6,4.6])for(const z of [-3,1,4]){
  box([.2,2.4,.2],[x,1.2,z],wood)
  const crown=new T.Mesh(kit.track(new T.IcosahedronGeometry(1.1,2)),leaf)
  crown.position.set(x,2.9,z);crown.scale.set(1,1.2,1);scene.add(crown)
 }
 return {floor,heightAt:()=>0,targets:{MEMORIAL_READ:plaque,MEMORIAL_FLOWERS:offering,MEMORIAL_INCENSE:urn,MEMORIAL_QUIET:bench},
  endpoints:new Map(),pipes:[],links:[],camera:{position:[0,3,6],target:[0,1,-1.5],min:2,max:9,polar:1.4},
  hands:()=>handTarget,
  update:(time,_delta,state)=>{
   const phase=state.completed?.find(value=>value.startsWith('A01_'))??''
   if(phase!==previous){started=previous===null?time-3:time;previous=phase}
   const elapsed=state.reduced?3:time-started
   const placing=phase.endsWith('_OFFERED')&&elapsed<2
   const progress=T.MathUtils.smoothstep(elapsed,0,2)
   const flowers=phase.startsWith('A01_FLOWERS_')
   const burning=phase==='A01_INCENSE_OFFERED'||phase==='A01_INCENSE_REFLECTING'
   bouquet.position.set(-1.5,.94+(placing&&flowers?Math.sin(progress*Math.PI)*.12:0),-1.7+(placing&&flowers?.3*(1-progress):0))
   incense.visible=burning
   incense.position.y=.7+(placing&&burning?.15*(1-progress):0)
   smoke.forEach((sprite,i)=>{const k=(time*.16+i/8)%1;sprite.visible=burning&&!state.reduced;sprite.position.set(Math.sin(time+i)*.025*k,1.08+k*.6,-2);sprite.scale.setScalar(.05+k*.16);sprite.material.opacity=(1-k)*.35})
   handTarget=placing?(flowers?bouquet.position.clone():incense.position.clone().add(new T.Vector3(0,.15,0))):null
  }}
}
