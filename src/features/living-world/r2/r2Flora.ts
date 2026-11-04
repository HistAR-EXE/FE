import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import {canvasTexture,pbr,leafCard} from './r2Assets'

// Procedural broadleaf trees and bushes (original geometry + original leaf cards, no downloads).
// Replaces the decimated Poly Haven "island" trees, whose simplification broke branches and whose alpha leaves
// shimmered/vanished with distance. Species are deliberately generic (RECONSTRUCTED / UNVERIFIED): planting a
// sourced Củ Chi 1967 species list is WS11 work, not something this module claims.

let seed=1;const R=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)
const wind={value:0}
export const tickFlora=(t:number,reduced:boolean)=>{wind.value=reduced?0:t}

/** Dense leaf-cluster card with alpha that survives mipmapping (no see-through "holes" at distance). */
function crownTexture(hue:number,light:number,s:number){
 seed=s
 const t=canvasTexture(256,256,(x)=>{x.clearRect(0,0,256,256)
  // soft dark core so the cluster stays opaque at low mip levels
  const g=x.createRadialGradient(128,128,10,128,128,118);g.addColorStop(0,`hsla(${hue*360},45%,${light*55}%,1)`);g.addColorStop(.75,`hsla(${hue*360},45%,${light*60}%,.95)`);g.addColorStop(1,'hsla(0,0%,0%,0)');x.fillStyle=g;x.beginPath();x.arc(128,128,112,0,7);x.fill()
  for(let i=0;i<520;i++){const a=R()*6.283,d=Math.sqrt(R())*118,px=128+Math.cos(a)*d,py=128+Math.sin(a)*d*.9,L=10+R()*12,W=4+R()*4,l=(light+(R()-.5)*.18+(py<128?.06:-.04))*100
   x.save();x.translate(px,py);x.rotate(R()*6.283);x.fillStyle=`hsl(${(hue+(R()-.5)*.05)*360},${40+R()*25}%,${l}%)`;x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(W,L*.45,0,L);x.quadraticCurveTo(-W,L*.45,0,0);x.fill();x.restore()}})
 t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;return t
}
/** Wind sway in the vertex shader (crowns move, trunks stay planted). */
function sway(m:T.MeshStandardMaterial,amp:number){
 m.onBeforeCompile=sh=>{sh.uniforms.uWind=wind
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uWind;').replace('#include <begin_vertex>',`#include <begin_vertex>
  #ifdef USE_INSTANCING
  vec4 wp = instanceMatrix * vec4(transformed,1.0);
  #else
  vec4 wp = vec4(transformed,1.0);
  #endif
  float h = max(0.0, position.y - 1.5);
  transformed.x += sin(uWind*1.3 + wp.x*.35 + wp.z*.21) * ${amp.toFixed(3)} * h;
  transformed.z += cos(uWind*1.1 + wp.z*.31) * ${(amp*.7).toFixed(3)} * h;`)}
 m.customProgramCacheKey=()=>'r2-sway-'+amp
}
function crownCard(size:number){const g=new T.BufferGeometry(),parts=[0,1,2].map(i=>{const p=new T.PlaneGeometry(size,size*.8);p.rotateY(i*Math.PI/3);return p});const m=mergeGeometries(parts)!;parts.forEach(p=>p.dispose());g.copy(m);m.dispose()
 // spherical normals: soft, volumetric crown shading
 const pos=g.attributes.position,n=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){const v=new T.Vector3(pos.getX(i),pos.getY(i)+size*.25,pos.getZ(i)).normalize();n.set([v.x,v.y,v.z],i*3)}g.setAttribute('normal',new T.BufferAttribute(n,3));return g}
type Variant={wood:T.BufferGeometry;crown:T.BufferGeometry}
/** One tree variant: tapered trunk, 3–5 branches, 9–16 crown clusters at branch ends (merged). */
function treeVariant(s:number,height:number,spread:number):Variant{
 seed=s;const wood:T.BufferGeometry[]=[],crowns:T.BufferGeometry[]=[]
 const limb=(a:T.Vector3,b:T.Vector3,r0:number,r1:number)=>{const len=a.distanceTo(b),c=new T.CylinderGeometry(r1,r0,len,7,1);c.translate(0,len/2,0);c.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()));c.translate(a.x,a.y,a.z);wood.push(c)}
 const base=new T.Vector3(),top=new T.Vector3((R()-.5)*.4,height*.62,(R()-.5)*.4);limb(base,top,.24+R()*.06,.12);limb(top,top.clone().add(new T.Vector3(0,height*.2,0)),.12,.06)
 const ends:T.Vector3[]=[top.clone().add(new T.Vector3(0,height*.24,0))]
 const branches=3+Math.floor(R()*3)
 for(let i=0;i<branches;i++){const a=i/branches*6.283+R()*.8,from=top.clone().add(new T.Vector3(0,-R()*height*.15,0)),to=from.clone().add(new T.Vector3(Math.cos(a)*spread*(.6+R()*.4),height*(.12+R()*.18),Math.sin(a)*spread*(.6+R()*.4)));limb(from,to,.1,.04);ends.push(to)}
 for(const e of ends){const n=2+Math.floor(R()*3);for(let k=0;k<n;k++){const sz=2+R()*1.6,c=crownCard(sz);c.rotateY(R()*6.283);c.translate(e.x+(R()-.5)*1.2,e.y+(R()-.3)*.9,e.z+(R()-.5)*1.2);crowns.push(c)}}
 const w=mergeGeometries(wood.map(g=>g.toNonIndexed()))!,cr=mergeGeometries(crowns)!;wood.forEach(g=>g.dispose());crowns.forEach(g=>g.dispose())
 w.setAttribute('uv1',w.attributes.uv);return {wood:w,crown:cr}
}
export type FloraItem={p:[number,number,number];r?:number;s?:number}
/** Instanced trees from 3 variants (≈1.6k triangles per tree incl. crowns). */
export function plantTrees(parent:T.Object3D,kit:Kit,items:FloraItem[],{hue=.27,light=.42,s=17}:{hue?:number;light?:number;s?:number}={}){
 if(!items.length)return
 const bark=pbr(kit,'bark_brown_01',{repeat:[1,3],color:'#9a8d7c'})
 const variants=[treeVariant(s,7,2.2),treeVariant(s+5,8.5,2.8),treeVariant(s+11,6,1.8)]
 const leafMats=[0,1,2].map(i=>{const m=kit.track(new T.MeshStandardMaterial({map:kit.track(crownTexture(hue+(i-1)*.015,light+(i-1)*.04,s*7+i)),alphaTest:.4,side:T.DoubleSide,roughness:.8}));sway(m,.012);return m})
 const m4=new T.Matrix4()
 variants.forEach((v,vi)=>{const mine=items.filter((_,i)=>i%3===vi);if(!mine.length)return
  const wood=new T.InstancedMesh(kit.track(v.wood),bark,mine.length),crown=new T.InstancedMesh(kit.track(v.crown),leafMats[vi],mine.length)
  mine.forEach((t,i)=>{m4.compose(new T.Vector3(...t.p),new T.Quaternion().setFromEuler(new T.Euler(0,t.r??R()*6.28,0)),new T.Vector3().setScalar(t.s??1));wood.setMatrixAt(i,m4);crown.setMatrixAt(i,m4)})
  for(const im of [wood,crown]){im.castShadow=true;im.receiveShadow=true;im.computeBoundingSphere();parent.add(im)}})
}
/** Low bushes / undergrowth: clustered crown cards, light sway. */
export function plantBushes(parent:T.Object3D,kit:Kit,items:FloraItem[],{hue=.25,s=41}:{hue?:number;light?:number;s?:number}={}){
 if(!items.length)return
 const g=kit.track(crownCard(.95));g.translate(0,.32,0)
 // bushes use the sparse leaf card (no opaque core): low, airy undergrowth instead of solid blobs
 const m=kit.track(new T.MeshStandardMaterial({map:leafCard('broad',hue,s),alphaTest:.45,side:T.DoubleSide,roughness:.85}));sway(m,.03)
 const im=new T.InstancedMesh(g,m,items.length*2),m4=new T.Matrix4();seed=s
 items.forEach((t,i)=>{for(let k=0;k<2;k++){m4.compose(new T.Vector3(t.p[0]+(R()-.5)*.6,t.p[1],t.p[2]+(R()-.5)*.6),new T.Quaternion().setFromEuler(new T.Euler(0,R()*6.28,0)),new T.Vector3().setScalar((t.s??1)*(.55+R()*.35)));im.setMatrixAt(i*2+k,m4)}})
 im.castShadow=true;im.receiveShadow=true;im.computeBoundingSphere();parent.add(im)
}
