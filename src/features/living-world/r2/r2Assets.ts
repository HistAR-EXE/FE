import * as T from 'three'
import {GLTFLoader,type GLTF} from 'three/addons/loaders/GLTFLoader.js'
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js'
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js'
import {Sky} from 'three/addons/objects/Sky.js'
import type {Kit} from '../../time-portal/tunnel3d/kit'

// G3 immersive integration: runtime loader for the optimized R2 asset set (public/living-world/r2, built by
// FE/scripts/build-r2-runtime-assets.mjs from Poly Haven CC0 + Quaternius CC0 sources).
// Everything loaded through here is LOOKDEV CANDIDATE / placeholder art, never final art.
// Assets live next to the code (not in public/, which is staged to the media CDN) and are emitted by Vite as hashed
// files on demand; the service worker does not precache them (workbox globPatterns exclude .webp/.glb).
const urls=import.meta.glob('./assets/**/*.{webp,glb}',{query:'?url',import:'default',eager:true}) as Record<string,string>
const url=(path:string)=>{const u=urls['./assets/'+path];if(!u)throw new Error('R2 asset missing from build: '+path);return u}
export const r2AssetUrls=()=>new Set(Object.values(urls).map(u=>new URL(u,location.href).href))
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
const gltfs=new Map<string,Promise<GLTF>>(),ready=new Map<string,GLTF>()
const textures=new Map<string,Promise<T.Texture>>(),readyTex=new Map<string,T.Texture>()
export function loadGltf(path:string){
 let p=gltfs.get(path)
 if(!p){p=loader.loadAsync(url(path)).then(g=>{ready.set(path,g);return g});p.catch(()=>gltfs.delete(path));gltfs.set(path,p)}
 return p
}
export const gltfReady=(path:string)=>{const g=ready.get(path);if(!g)throw new Error('R2 asset not preloaded: '+path);return g}
function loadTexture(file:string,srgb:boolean){
 let p=textures.get(file)
 if(!p){p=new T.TextureLoader().loadAsync(url('tex/'+file)).then(t=>{t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;if(srgb)t.colorSpace=T.SRGBColorSpace;readyTex.set(file,t);return t});p.catch(()=>textures.delete(file));textures.set(file,p)}
 return p
}
/** Preload everything a zone needs before the scene is built (streaming per zone; nothing preloads other zones). */
export async function preload({materials=[],models=[],chars=[]}:{materials?:string[];models?:string[];chars?:string[]}){
 await Promise.all([
  ...materials.flatMap(id=>[loadTexture(id+'_Diffuse.webp',true),loadTexture(id+'_nor_gl.webp',false),loadTexture(id+'_arm.webp',false)]),
  ...models.map(id=>loadGltf('models/'+id+'.glb')),
  ...chars.map(id=>loadGltf('chars/'+id+'.glb')),
 ])
}
const tex=(file:string,repeat:[number,number])=>{const base=readyTex.get(file);if(!base)throw new Error('R2 texture not preloaded: '+file);const t=base.clone();t.repeat.set(...repeat);t.needsUpdate=true;return t}
/** Poly Haven PBR set (Diffuse sRGB, GL normal, ARM). */
export function pbr(kit:Kit,id:string,{repeat=[1,1],color,normalScale=1,side,rough=1,metal=0}:{repeat?:[number,number];color?:string;normalScale?:number;side?:T.Side;rough?:number;metal?:number}={}){
 const arm=tex(id+'_arm.webp',repeat)
 const m=new T.MeshStandardMaterial({map:tex(id+'_Diffuse.webp',repeat),normalMap:tex(id+'_nor_gl.webp',repeat),roughnessMap:arm,metalnessMap:metal?arm:null,aoMap:arm,roughness:rough,metalness:metal,side:side??T.FrontSide})
 m.normalScale.set(normalScale,normalScale);if(color)m.color.set(color)
 for(const t of new Set([m.map,m.normalMap,m.roughnessMap,m.metalnessMap,m.aoMap]))if(t)kit.track(t)
 return kit.track(m)
}
export function ensureUv1(g:T.BufferGeometry){if(g.attributes.uv&&!g.attributes.uv1)g.setAttribute('uv1',g.attributes.uv);return g}
function prepModel(scene:T.Object3D){scene.traverse(o=>{if(!(o instanceof T.Mesh))return;o.castShadow=o.receiveShadow=true;const m=o.material as T.MeshStandardMaterial;if(m.transparent||m.alphaTest>0){m.transparent=false;m.alphaTest=Math.max(m.alphaTest,.5);m.depthWrite=true;m.side=T.DoubleSide}})}
export function model(id:string){const g=gltfReady('models/'+id+'.glb');if(!g.userData.prepped){prepModel(g.scene);g.userData.prepped=true}return g.scene.clone(true)}
export function place(parent:T.Object3D,id:string,pos:[number,number,number],{rotY=0,scale=1}:{rotY?:number;scale?:number}={}){const m=model(id);m.position.set(...pos);m.rotation.y=rotY;m.scale.setScalar(scale);parent.add(m);return m}
/** Instance every mesh of a model at many transforms. */
export function scatter(parent:T.Object3D,id:string,items:{p:[number,number,number];r?:number;s?:number}[],{castShadow=true}:{castShadow?:boolean}={}){
 const src=gltfReady('models/'+id+'.glb').scene;if(!items.length)return[];src.updateMatrixWorld(true);const out:T.InstancedMesh[]=[]
 if(!src.userData.prepped){prepModel(src);src.userData.prepped=true}
 src.traverse(o=>{if(!(o instanceof T.Mesh))return;const im=new T.InstancedMesh(o.geometry,o.material,items.length),m4=new T.Matrix4(),local=o.matrixWorld.clone()
  items.forEach((t,i)=>{m4.compose(new T.Vector3(...t.p),new T.Quaternion().setFromEuler(new T.Euler(0,t.r??0,0)),new T.Vector3().setScalar(t.s??1));im.setMatrixAt(i,m4.multiply(local))})
  im.castShadow=castShadow;im.receiveShadow=true;im.computeBoundingSphere();parent.add(im);out.push(im)})
 return out
}
export function canvasTexture(w:number,h:number,draw:(x:CanvasRenderingContext2D,w:number,h:number)=>void){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d')!,w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t}
const leafCache=new Map<string,T.Texture>()
/** Original procedural leaf-cluster alpha card (no downloaded texture). */
export function leafCard(kind:'broad'|'bamboo',hue:number,seed:number){
 const key=kind+hue+seed;let t=leafCache.get(key);if(t)return t
 let s=seed>>>0;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296)
 t=canvasTexture(256,256,(x)=>{x.clearRect(0,0,256,256);const n=kind==='bamboo'?130:170
  for(let i=0;i<n;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*108,px=128+Math.cos(a)*d,py=128+Math.sin(a)*d*.85,L=kind==='bamboo'?19+r()*13:11+r()*9,W=kind==='bamboo'?2.5+r()*1.5:5+r()*3.5,light=.18+r()*.22+(py<128?.05:-.03)
   x.save();x.translate(px,py);x.rotate(kind==='bamboo'?Math.PI/2+(r()-.5)*1.6+(px-128)/150:r()*6.28);x.fillStyle=`hsl(${(hue+(r()-.5)*.05)*360},${38+r()*25}%,${light*100}%)`
   x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(W,L*.4,0,L);x.quadraticCurveTo(-W,L*.4,0,0);x.fill();x.restore()}})
 leafCache.set(key,t);return t
}
export function cardClump(size=2){
 const parts=[0,1,2].map(i=>{const p=new T.PlaneGeometry(size,size);p.rotateY(i*Math.PI/3);p.rotateX((i-1)*.35);return p})
 const pos:number[]=[],uv:number[]=[],idx:number[]=[];let o=0
 for(const g of parts){pos.push(...g.attributes.position.array);uv.push(...g.attributes.uv.array);for(const k of g.index!.array)idx.push(k+o);o+=g.attributes.position.count;g.dispose()}
 const out=new T.BufferGeometry();out.setAttribute('position',new T.Float32BufferAttribute(pos,3));out.setAttribute('uv',new T.Float32BufferAttribute(uv,2))
 const n=new Float32Array(pos.length);for(let i=0;i<pos.length;i+=3){const v=new T.Vector3(pos[i],pos[i+1]+size*.15,pos[i+2]).normalize();n.set([v.x,v.y,v.z],i)}
 out.setAttribute('normal',new T.BufferAttribute(n,3));out.setIndex(idx);return out
}
/** Lighting environments without HDR downloads: studio room (S0, interiors) or an analytic sky (outdoors). */
export function roomEnvironment(renderer:T.WebGLRenderer){const pm=new T.PMREMGenerator(renderer);const env=new RoomEnvironment();const rt=pm.fromScene(env,.04);env.dispose();pm.dispose();return rt}
export function skyEnvironment(renderer:T.WebGLRenderer,scene:T.Scene,sunDir:T.Vector3){
 // The analytic sky is the visible backdrop only: its sun disc overflows half-float PMREM targets (NaN → black PBR),
 // so image-based lighting comes from the neutral room environment instead.
 const sky=new Sky();sky.scale.setScalar(100);const u=sky.material.uniforms;u.turbidity.value=6;u.rayleigh.value=1.6;u.mieCoefficient.value=.006;u.mieDirectionalG.value=.85;u.sunPosition.value.copy(sunDir)
 scene.add(sky);return {rt:roomEnvironment(renderer),sky}
}
/** Bytes actually fetched for the R2 runtime set since page load (Resource Timing; encoded = on-the-wire body). */
export function r2BytesSoFar(){const set=r2AssetUrls();let encoded=0,files=0;for(const e of performance.getEntriesByType('resource') as PerformanceResourceTiming[])if(set.has(e.name)){encoded+=e.encodedBodySize||e.transferSize||0;files++}return {encoded,files}}
export const r2Texture=(file:string,repeat:[number,number]=[1,1])=>tex(file,repeat)
