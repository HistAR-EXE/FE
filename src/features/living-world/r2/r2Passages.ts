import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import {passages,passagePoints,passageSample} from '../undergroundContinuity'
import {pbr} from './r2Assets'
/** Door frames, bent approach and handholds. Lights are never interaction targets. */
export function buildPassages(scene:T.Scene,kit:Kit,zone:string){
 const targets:Record<string,T.Object3D>={}
 const wood=pbr(kit,'rough_wood',{repeat:[.5,1],color:'#74573c',normalScale:.4})
 const earth=['L1-C','L2-C','L3-B','L3-C'].includes(zone)?pbr(kit,'clay_plaster',{repeat:[2,2],color:'#a88059',side:T.DoubleSide,normalScale:.25}):null
 for(const p of Object.values(passages).filter(p=>p.from===zone&&zone!=='S1')){
  const pts=passagePoints(p),opening=passageSample(pts,.2).point,g=new T.Group();g.name='DOOR_'+p.id;g.userData.passage=p.id;g.position.set(...opening);g.rotation.y=Math.atan2(p.out[0],p.out[1]);scene.add(g)
  if(earth){const positions:number[]=[],uv:number[]=[],indices:number[]=[],rings=30,steps=12
   for(let i=0;i<=rings;i++){const s=passageSample(pts,i/rings);for(let j=0;j<=steps;j++){const a=j/steps*Math.PI,w=Math.cos(a)*.48;positions.push(s.point[0]+Math.cos(s.heading)*w,s.point[1]+Math.sqrt(Math.max(0,1-Math.cos(a)**6))*1.4,s.point[2]-Math.sin(s.heading)*w);uv.push(j/steps,i/rings*3)}}
   for(let i=0;i<rings;i++)for(let j=0;j<steps;j++){const a=i*(steps+1)+j,b=a+steps+1;indices.push(a,b,a+1,b,b+1,a+1)}const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(positions,3));shell.setAttribute('uv',new T.Float32BufferAttribute(uv,2));shell.setIndex(indices);shell.computeVertexNormals();scene.add(new T.Mesh(kit.track(shell),earth))}
  const rod=(a:T.Vector3,b:T.Vector3,r=.035,parent:T.Object3D=g)=>{const m=new T.Mesh(kit.track(new T.CylinderGeometry(r,r,a.distanceTo(b),8)),wood);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());parent.add(m);return m}
  for(const x of [-.4,.4])rod(new T.Vector3(x,0,0),new T.Vector3(x,1,0))
  const curve=new T.CatmullRomCurve3([new T.Vector3(-.4,1,0),new T.Vector3(-.28,1.28,0),new T.Vector3(0,1.36,0),new T.Vector3(.28,1.28,0),new T.Vector3(.4,1,0)])
  g.add(new T.Mesh(kit.track(new T.TubeGeometry(curve,16,.035,6,false)),wood))
  const proxy=new T.Mesh(kit.track(new T.BoxGeometry(.72,1.25,.18)),kit.track(new T.MeshBasicMaterial({visible:false})));proxy.position.y=.625;g.add(proxy);g.userData.interactionAnchor=new T.Vector3(0,.65,0);targets['ROUTE_'+p.id]=g
  if(p.rise){for(let i=0;i<9;i++){const s=passageSample(pts,.35+i*.075),rung=new T.Mesh(kit.track(new T.BoxGeometry(.56,.055,.18)),wood);rung.position.set(s.point[0],s.point[1]+.025,s.point[2]);rung.rotation.y=s.heading;scene.add(rung)}
   for(const side of [-1,1])for(let i=1;i<pts.length;i++){const a=new T.Vector3(...pts[i-1]),b=new T.Vector3(...pts[i]),offset=new T.Vector3(-p.out[1]*side*.31,.52,p.out[0]*side*.31);rod(a.add(offset),b.add(offset),.025,scene)}}
  // Opaque earth at the far turn occludes streaming, not a luminous portal or UI marker.
  const last=pts.at(-1)!,cap=new T.Mesh(kit.track(new T.PlaneGeometry(.94,1.45)),kit.track(new T.MeshStandardMaterial({color:'#120c08',roughness:1,side:T.DoubleSide})));cap.position.set(last[0],last[1]+.7,last[2]);cap.rotation.y=Math.atan2(p.out[0],p.out[1]);scene.add(cap)
 }
 return targets
}
