import * as T from 'three'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import type {ZoneEnv} from '../zoneEnvironments'
import type {Zone} from '../worldModel'
import {pbr,ensureUv1,roomEnvironment} from './r2Assets'
import {buildTunnel} from './r2Tunnel'

// X-ray / cutaway observation mode for Q2/Q3, built from the SAME carved-tunnel data, props and materials as the
// walkable interiors (r2Tunnel). Only the presentation changes: translucent clay "casts" of the passages, the footprint
// floor, and the layers stacked in one cut block. INTERPRETIVE DIAGRAM: vertical spacing between layers is compressed
// (game layout, not survey depths — Bến Dược L1 ~4 m, L2 ~6 m, L3 7–10 m per R01). No route is PHYSICAL_VERIFIED.
const GAP=2.7 // R2 XRAY: more vertical separation so the four layers no longer overlap (still a compressed diagram)
export function buildXray(scene:T.Scene,kit:Kit,zone:Zone,renderer:T.WebGLRenderer):ZoneEnv{
 const env=roomEnvironment(renderer);kit.track(env);scene.environment=env.texture;scene.environmentIntensity=.7;scene.background=new T.Color('#1b1815');scene.fog=null
 const sun=new T.DirectionalLight('#fff1dc',1.6);sun.position.set(4,9,6);scene.add(sun,new T.HemisphereLight('#e6dccd','#2a2018',.8))
 // G3 WS6: four layers in one cut block — surface (S1 forest floor) + L1 (this L1 section, else L1-D) + L2 + L3.
 // The layer the player is in stays solid and framed; the others are dimmed so the current position reads at a glance.
 const layers:Zone[]=[zone.startsWith('L1')?zone:'L1-D','L2-A','L3-A'],current=Math.max(0,layers.indexOf(zone))
 const targets:Record<string,T.Object3D>={},endpoints=new Map<string,T.Vector3>(),links:T.Mesh[]=[],pipes:T.Mesh[]=[]
 let floor:T.Mesh|null=null
 layers.forEach((lz,i)=>{
  const g=new T.Group();g.position.y=(current-i)*GAP;scene.add(g)
  const sub=buildTunnel(scene,kit,lz,renderer,{parent:g,xray:true})
  for(const [k,v] of Object.entries(sub.targets))if(!targets[k])targets[k]=v
  if(i===current)floor=sub.floor
  else g.traverse(o=>{const m=o as T.Mesh;if(!m.isMesh||!m.material||Array.isArray(m.material))return;const c=kit.track((m.material as T.MeshStandardMaterial).clone());c.transparent=true;c.opacity=Math.min(c.opacity,.16);c.depthWrite=false;m.material=c})
  const frame=new T.LineSegments(kit.track(new T.EdgesGeometry(new T.BoxGeometry(8.8,.02,6.3))),kit.memo(i===current?'r2-xray-frame-on':'r2-xray-frame-off',()=>new T.LineBasicMaterial({color:i===current?'#ffcf8a':'#7a6450',transparent:true,opacity:i===current?.95:.18})));frame.position.set(0,g.position.y,.75);scene.add(frame)
 })
 scene.updateMatrixWorld(true)
 const at=(o:T.Object3D|undefined,dy=0)=>o?o.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,dy,0)):new T.Vector3()
 const glowMat=(c:string)=>kit.track(new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.25,roughness:.6}))
 const rod=(a:T.Vector3,b:T.Vector3,r:number,c:string)=>{const m=new T.Mesh(kit.geo('r2-xray-rod-'+r,()=>new T.CylinderGeometry(r,r,1,12)),glowMat(c));m.position.copy(a).add(b).multiplyScalar(.5);m.scale.y=a.distanceTo(b);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());scene.add(m);return m}
 const top=(current+0)*GAP+1.75  // ground surface above the top layer
 if(zone==='L1-B'){
  endpoints.set('OPENING',at(targets.AIR_SURFACE_OPENING).setY(top));endpoints.set('PASSAGE',at(targets.AIR_PASSAGE,.2));endpoints.set('INTERIOR',at(targets.AIR_INTERIOR,-.3))
  // vent pipe reaching the surface + the passage as an air path (coloured once AIR_PATH_CORRECT is a verified fact)
  const v=at(targets.AIR_SURFACE_OPENING);pipes.push(rod(v.clone().setY(1.1),v.clone().setY(top),.05,'#3a2a1c'),rod(endpoints.get('PASSAGE')!,endpoints.get('INTERIOR')!,.035,'#3a2a1c'))
 }else{
  for(const n of [1,2,3])if(targets[`STRUCT_LAYER_${n}`])endpoints.set(`STRUCT_LAYER_${n}`,at(targets[`STRUCT_LAYER_${n}`],.6))
  // the hatch of the upper layer drops to the layer below (staggered, R01) — drawn as a shaft between the two casts
  for(const [id,from] of [['STRUCT_LINK_12',0],['STRUCT_LINK_23',1]] as const){const h=targets[id];if(!h)continue;const p=at(h),below=p.clone().setY((current-from-1)*GAP+.05);links.push(rod(p,below,.12,'#e1c991'))}
 }
 // the cut block: ground slab on top, strata lines on the section faces, outline of the cut volume
 const depth=(layers.length-1)*GAP+2.2,cy=top-depth/2
 const ground=new T.Mesh(kit.track(ensureUv1(new T.PlaneGeometry(8.8,6.3))),pbr(kit,'red_dirt_mud_01',{repeat:[3,2]}));const gm=ground.material as T.MeshStandardMaterial;gm.transparent=true;gm.opacity=.45;gm.depthWrite=false;gm.side=T.DoubleSide
 ground.rotation.x=-Math.PI/2;ground.position.set(0,top,.75);scene.add(ground)
 // surface layer (S1 forest floor, reconstructed): the entry hatch above the L1 shaft and a few trunk stubs for orientation
 const surf=kit.memo('r2-xray-surface',()=>new T.MeshStandardMaterial({color:'#6b5a3a',transparent:true,opacity:.55,roughness:.9}))
 // THEMATIC_SCENE (amber): the Q1 hatch on the surface → the L1-A entry shaft. Interpretive, not a surveyed connection.
 {const l1y=(current-0)*GAP;const r=rod(new T.Vector3(0,top,3.4),new T.Vector3(0,l1y+1.4,3.5),.03,'#e6a94f');r.renderOrder=2}
 const hatchTop=new T.Mesh(kit.geo('r2-xray-hatch',()=>new T.BoxGeometry(.48,.03,.54)),kit.memo('r2-xray-hatch-mat',()=>new T.MeshStandardMaterial({color:'#8c6a48',roughness:.9})));hatchTop.position.set(0,top+.03,3.3);scene.add(hatchTop)
 for(const [x,z,h] of [[-3.6,-1.8,1.1],[-1.8,3.2,1.4],[2.6,2.9,1.2],[3.7,-.4,1],[-3.9,1.6,.9]] as const){const tr=new T.Mesh(kit.geo('r2-xray-trunk',()=>new T.CylinderGeometry(.08,.12,1,8).translate(0,.5,0)),surf);tr.scale.y=h;tr.position.set(x,top,z);scene.add(tr)}
 const box=new T.LineSegments(kit.track(new T.EdgesGeometry(new T.BoxGeometry(8.8,depth,6.3))),kit.memo('r2-xray-edge',()=>new T.LineBasicMaterial({color:'#e6b07a',transparent:true,opacity:.6})));box.position.set(0,cy,.75);scene.add(box)
 const strata=kit.memo('r2-xray-strata',()=>new T.LineBasicMaterial({color:'#8a6a4c',transparent:true,opacity:.16}))
 for(let y=top-.6;y>top-depth;y-=.55){const pts=[new T.Vector3(-4.4,y,-2.4),new T.Vector3(4.4,y,-2.4),new T.Vector3(4.4,y,3.9)];scene.add(new T.Line(kit.track(new T.BufferGeometry().setFromPoints(pts)),strata))}
 const midY=(current-(layers.length-1)/2)*GAP+.6
 return {heightAt:()=>0,floor:floor!,targets,endpoints,pipes,links,camera:{position:[8.8,top+2.6,10],target:[0,midY,.4],min:4,max:18,polar:1.4},update:()=>{}}
}
