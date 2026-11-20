import * as T from 'three'
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js'
import type {Kit} from '../../time-portal/tunnel3d/kit'
import {gltfReady} from './r2Assets'
import {buildAuthoredCharacter} from './authoredCharacter'
import {elbowPoint} from './armPose'

// Rigged people for the playable build: Quaternius Universal Base Characters [Standard] + Universal Animation
// Library [Standard] (CC0). Bodies are the free "Superhero" bases, proportion-adjusted toward an ordinary build
// at runtime (narrower shoulders, slimmer limbs). Clothing is a PROCEDURAL PLACEHOLDER shell that inherits the
// body's skin weights; production garments must be authored in Blender and pass Curator review.
// The returned adapter keeps the createWorldActor API (g/legs/left/right/reach/contact), so gameplay code is unchanged.

export const R2_CHAR_FILES=['Superhero_Male_FullBody','Superhero_Female_FullBody','Hair_SimpleParted','Hair_Buns','Eyebrows_Regular','Eyebrows_Female','UAL1_Runtime']
export type Clothing={top:string;bottom:string;style?:'baba'|'modern';hat?:'non';scarf?:boolean}
export type RigOptions={body:'male'|'female';height:number;skin:string;hair:'Hair_SimpleParted'|'Hair_Buns';brows?:boolean;hairColor:string;clothing:Clothing;crouch?:boolean;idle?:string;sample?:boolean}
export type RigActor={g:T.Group;contact:T.Mesh;legs:T.Object3D[];left:T.Object3D;right:T.Object3D;reach:(target:T.Vector3|null)=>void;grip:(left:T.Vector3|null,right:T.Vector3|null)=>void;tick:(dt:number,reduced:boolean)=>void;setCrouch:(on:boolean)=>void;setTalking:(on:boolean)=>void;setIdle:(clip:string)=>void;dispose:()=>void}

const live=new Set<RigActor>()
export const tickRigActors=(dt:number,reduced:boolean)=>{for(const a of live)a.tick(dt,reduced)}
export const clearRigActors=()=>{for(const a of live)a.dispose();live.clear()}

let fabric:T.Texture|undefined,checker:T.Texture|undefined
const fabricTex=()=>fabric??=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d')!;x.fillStyle='#fff';x.fillRect(0,0,256,256);let s=11;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<2600;i++){x.fillStyle=`rgba(0,0,0,${r()*.08})`;x.fillRect(r()*256,r()*256,1+r()*2,6+r()*30)}for(let y=0;y<256;y+=3){x.fillStyle='rgba(0,0,0,0.03)';x.fillRect(0,y,256,1)}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.colorSpace=T.SRGBColorSpace;return t})()
const checkerTex=()=>checker??=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d')!;for(let i=0;i<8;i++)for(let j=0;j<8;j++){x.fillStyle=(i+j)%2?'#1a1a1a':'#e8e4da';x.fillRect(i*16,j*16,16,16)}const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(6,6);t.colorSpace=T.SRGBColorSpace;return t})()

function bodyOf(root:T.Object3D){let body:T.SkinnedMesh|null=null;root.traverse(o=>{if(!body&&o instanceof T.SkinnedMesh&&/Superhero/i.test((o.material as T.Material).name))body=o});return body as T.SkinnedMesh|null}
/** Garment shell cut from the body by dominant bone, inflated along normals, Laplacian-smoothed; inherits skin weights. */
/** Keep only the vertices a garment actually uses (garments are a fraction of the body; full copies were ~MBs per actor). */
function compact(g:T.BufferGeometry){
 const idx=g.index!.array,map=new Map<number,number>(),order:number[]=[]
 const out=new Uint32Array(idx.length);for(let i=0;i<idx.length;i++){let n=map.get(idx[i]);if(n===undefined){n=order.length;map.set(idx[i],n);order.push(idx[i])}out[i]=n}
 for(const name of Object.keys(g.attributes)){const a=g.attributes[name] as T.BufferAttribute,ctor=a.array.constructor as new(n:number)=>T.TypedArray,arr=new ctor(order.length*a.itemSize);for(let i=0;i<order.length;i++)for(let k=0;k<a.itemSize;k++)arr[i*a.itemSize+k]=a.array[order[i]*a.itemSize+k];g.setAttribute(name,new T.BufferAttribute(arr,a.itemSize,a.normalized))}
 g.setIndex(new T.BufferAttribute(order.length<65536?new Uint16Array(out):out,1))
}
function shell(kit:Kit,body:T.SkinnedMesh,pick:(bone:string,i:number,P:T.BufferAttribute)=>boolean,inflate:(bone:string,i:number,P:T.BufferAttribute)=>number,color:string,{map,rough=.93,smooth=0}:{map?:T.Texture;rough?:number;smooth?:number}={}){
 const g0=body.geometry,P=g0.attributes.position as T.BufferAttribute,N=g0.attributes.normal as T.BufferAttribute,SI=g0.attributes.skinIndex as T.BufferAttribute,SW=g0.attributes.skinWeight as T.BufferAttribute
 const names=body.skeleton.bones.map(b=>b.name),dom:string[]=new Array(P.count)
 for(let i=0;i<P.count;i++){let bi=0,bw=-1;for(let k=0;k<4;k++){const w=SW.getComponent(i,k);if(w>bw){bw=w;bi=SI.getComponent(i,k)}}dom[i]=names[bi]}
 const idx=g0.index!.array,keep:number[]=[]
 for(let i=0;i<idx.length;i+=3)if(pick(dom[idx[i]],idx[i],P)&&pick(dom[idx[i+1]],idx[i+1],P)&&pick(dom[idx[i+2]],idx[i+2],P))keep.push(idx[i],idx[i+1],idx[i+2])
 const g=new T.BufferGeometry();const pos=new Float32Array(P.count*3)
 for(let i=0;i<P.count;i++){const d=inflate(dom[i],i,P);pos[i*3]=P.getX(i)+N.getX(i)*d;pos[i*3+1]=P.getY(i)+N.getY(i)*d;pos[i*3+2]=P.getZ(i)+N.getZ(i)*d}
 const p=new T.BufferAttribute(pos,3);g.setAttribute('position',p);g.setAttribute('skinIndex',SI.clone());g.setAttribute('skinWeight',SW.clone());if(g0.attributes.uv)g.setAttribute('uv',g0.attributes.uv.clone());g.setIndex(keep)
 if(smooth>0){
  const nb=new Map<number,Set<number>>(),add=(u:number,v:number)=>{let s=nb.get(u);if(!s){s=new Set();nb.set(u,s)}s.add(v)}
  for(let i=0;i<keep.length;i+=3){const [a,b,c]=[keep[i],keep[i+1],keep[i+2]];add(a,b);add(a,c);add(b,a);add(b,c);add(c,a);add(c,b)}
  const key=(i:number)=>`${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`,groups=new Map<string,number[]>()
  for(const v of nb.keys()){const k=key(v);const list=groups.get(k)??[];list.push(v);groups.set(k,list)}
  for(const arr of groups.values())if(arr.length>1){const all=new Set<number>();arr.forEach(v=>nb.get(v)!.forEach(x=>all.add(x)));arr.forEach(v=>nb.set(v,all))}
  for(let it=0;it<smooth;it++){const next=new Map<number,[number,number,number]>();for(const [v,ns] of nb){let x=0,y=0,z=0;ns.forEach(n=>{x+=p.getX(n);y+=p.getY(n);z+=p.getZ(n)});const k=ns.size;next.set(v,[p.getX(v)*.5+x/k*.5,p.getY(v)*.5+y/k*.5,p.getZ(v)*.5+z/k*.5])}for(const [v,q] of next)p.setXYZ(v,...q)}
 }
 compact(g)
 g.computeVertexNormals()
 const m=new T.SkinnedMesh(kit.track(g),kit.track(new T.MeshStandardMaterial({color,roughness:rough,map:map??fabricTex(),side:T.DoubleSide})))
 m.bind(body.skeleton,body.bindMatrix);m.castShadow=true;m.frustumCulled=false;body.parent!.add(m);return m
}
/** Drop body triangles fully hidden by garments: no skin poking through cloth when joints bend. */
function hideCovered(body:T.SkinnedMesh,TOP:Set<string>,LEG:Set<string>,shoes:boolean,hN:(i:number,P:T.BufferAttribute)=>number){
 const g=body.geometry,P=g.attributes.position as T.BufferAttribute,SI=g.attributes.skinIndex as T.BufferAttribute,SW=g.attributes.skinWeight as T.BufferAttribute,names=body.skeleton.bones.map(b=>b.name)
 const covered=(i:number)=>{let bi=0,bw=-1;for(let k=0;k<4;k++){const w=SW.getComponent(i,k);if(w>bw){bw=w;bi=SI.getComponent(i,k)}}const b=names[bi],h=hN(i,P);if(h>.84)return false;return TOP.has(b)||LEG.has(b)||b==='pelvis'||(shoes&&/foot|ball/.test(b))}
 const idx=g.index!.array,keep:number[]=[];for(let i=0;i<idx.length;i+=3)if(!(covered(idx[i])&&covered(idx[i+1])&&covered(idx[i+2])))keep.push(idx[i],idx[i+1],idx[i+2])
 // shares the body's vertex buffers (no copy) and is cached per body/style, so actors of one kind share it
 const key=g.uuid+(shoes?':s':':b');let ng=hiddenCache.get(key)
 if(!ng){ng=new T.BufferGeometry();for(const [n,a] of Object.entries(g.attributes))ng.setAttribute(n,a);ng.setIndex(keep);ng.boundingSphere=g.boundingSphere;hiddenCache.set(key,ng)}
 body.geometry=ng
}
const hiddenCache=new Map<string,T.BufferGeometry>()
function dress(kit:Kit,root:T.Object3D,{top,bottom,style='baba',hat,scarf}:Clothing){
 const body=bodyOf(root);if(!body)return
 body.geometry.computeBoundingBox();const bb=body.geometry.boundingBox!,H=bb.max.y-bb.min.y,y0=bb.min.y,hN=(i:number,P:T.BufferAttribute)=>(P.getY(i)-y0)/H,long=style==='baba'
 const TOP=new Set(['spine_01','spine_02','spine_03','clavicle_l','clavicle_r','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r']),LEG=new Set(['thigh_l','thigh_r','calf_l','calf_r','root'])
 // straight hem (no garment edge following the groin crease → no 'leotard' silhouette)
 shell(kit,body,(b,i,P)=>(TOP.has(b)&&hN(i,P)>(long?.4:.53))||(b==='pelvis'&&hN(i,P)>(long?.42:.54))||(b==='neck_01'&&hN(i,P)<.86)||(long&&b.startsWith('thigh')&&hN(i,P)>.4),(b,i,P)=>{const h=hN(i,P);let d=.022;if(h<.6)d+=(.6-h)*(long?.32:.12);if(/lowerarm/.test(b))d=long?.03:.022;return d+(long?.01:.018)},top,{smooth:8})
 shell(kit,body,(b,i,P)=>LEG.has(b)||((b==='pelvis'||b==='spine_01')&&hN(i,P)<=(long?.62:.58))||((b==='foot_l'||b==='foot_r')&&hN(i,P)>.045),(_b,i,P)=>.028+Math.max(0,.45-hN(i,P))*(long?.09:.03),bottom,{smooth:6})
 if(style==='modern')shell(kit,body,(b,i,P)=>/foot|ball/.test(b)||(/calf/.test(b)&&hN(i,P)<.09),()=>.012,'#3a3430',{rough:.7})
 else shell(kit,body,(b,i,P)=>/foot|ball/.test(b)&&hN(i,P)<.02,()=>.006,'#2a2018',{rough:.8})
 if(scarf)shell(kit,body,(b,i,P)=>b==='neck_01'&&hN(i,P)>.78&&hN(i,P)<.88,()=>.05,'#ffffff',{map:checkerTex()})
 hideCovered(body,TOP,LEG,style==='modern',hN)
 if(hat==='non'){const head=root.getObjectByName('Head')!;const cone=new T.Mesh(kit.geo('r2-non-la',()=>new T.ConeGeometry(.26,.17,40,1,true)),kit.memo('r2-non-la-mat',()=>new T.MeshStandardMaterial({color:'#d9c9a0',roughness:.85,side:T.DoubleSide})));const wp=head.getWorldPosition(new T.Vector3()).add(new T.Vector3(0,.2,0));head.worldToLocal(wp);cone.position.copy(wp);cone.castShadow=true;head.add(cone)}
}
function rebind(src:T.Object3D,target:T.Object3D,color:string,kit:Kit){
 const out:T.SkinnedMesh[]=[]
 src.traverse(o=>{if(!(o instanceof T.SkinnedMesh))return;const bones=o.skeleton.bones.map(b=>(target.getObjectByName(b.name) as T.Bone)??b);const mat=kit.track((o.material as T.MeshStandardMaterial).clone());mat.color.set(color);const m=new T.SkinnedMesh(o.geometry,mat);m.bind(new T.Skeleton(bones,o.skeleton.boneInverses),o.bindMatrix);m.castShadow=true;m.frustumCulled=false;out.push(m)})
 return out
}
/** Ordinary-build adjustment of the Superhero base (bind-pose bone offsets/scales; mesh and rig stay CC0 originals). */
function ordinaryBuild(root:T.Object3D,female:boolean){
 // Applied after every mixer update (clips animate translation/scale of every bone).
 const k=female?.9:.84,ops:(()=>void)[]=[]
 for(const side of ['l','r']){
  const clav=root.getObjectByName('clavicle_'+side),upper=root.getObjectByName('upperarm_'+side),lower=root.getObjectByName('lowerarm_'+side),thigh=root.getObjectByName('thigh_'+side)
  if(upper)ops.push(()=>{upper.position.multiplyScalar(k);upper.scale.multiplyScalar(.87)})
  if(lower)ops.push(()=>lower.scale.multiplyScalar(1/.87*.93))
  if(clav)ops.push(()=>clav.scale.set(clav.scale.x,clav.scale.y*.92,clav.scale.z*.92))
  if(thigh)ops.push(()=>thigh.scale.set(thigh.scale.x*.94,thigh.scale.y,thigh.scale.z*.94))
 }
 const chest=root.getObjectByName('spine_03'),neck=root.getObjectByName('neck_01')
 if(chest)ops.push(()=>chest.scale.set(chest.scale.x*.9,chest.scale.y*.96,chest.scale.z*.9))
 if(neck)ops.push(()=>neck.scale.set(neck.scale.x/.9*.97,neck.scale.y/.96,neck.scale.z/.9*.97))
 const bones=['clavicle_l','clavicle_r','upperarm_l','upperarm_r','lowerarm_l','lowerarm_r','thigh_l','thigh_r','spine_03','neck_01'].map(n=>root.getObjectByName(n)).filter((b):b is T.Object3D=>!!b)
 const rest=bones.map(b=>({b,p:b.position.clone(),s:b.scale.clone()}))
 // reset first so bones a clip does not animate never compound
 return {reset:()=>{for(const r of rest){r.b.position.copy(r.p);r.b.scale.copy(r.s)}},apply:()=>{for(const f of ops)f()}}
}

export function createRigActor(parent:T.Object3D,kit:Kit,o:RigOptions):RigActor{
 const anim=gltfReady('chars/UAL1_Runtime.glb')
 const model=o.sample?buildAuthoredCharacter(anim.scene,{skin:o.skin,hair:o.hairColor,top:o.clothing.top,bottom:o.clothing.bottom,female:o.body==='female'}):SkeletonUtils.clone(gltfReady('chars/'+(o.body==='female'?'Superhero_Female_FullBody':'Superhero_Male_FullBody')+'.glb').scene)
 model.traverse(x=>{if(!(x instanceof T.Mesh))return;x.castShadow=true;x.receiveShadow=false;x.frustumCulled=false;if(o.sample){kit.track(x.geometry);kit.track(x.material as T.Material)}else{const m=kit.track((x.material as T.MeshStandardMaterial).clone());if(/Superhero/.test(m.name))m.color.multiply(new T.Color(o.skin));x.material=m}})
 if(!o.sample)for(const f of [o.hair,...(o.brows?[o.body==='female'?'Eyebrows_Female':'Eyebrows_Regular']:[])])for(const m of rebind(gltfReady('chars/'+f+'.glb').scene,model,o.hairColor,kit))model.add(m)
 model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),h=box.max.y-box.min.y
 if(!o.sample)dress(kit,model,o.clothing)
 const build=o.sample?{reset:()=>{},apply:()=>{}}:ordinaryBuild(model,o.body==='female')
 model.scale.setScalar(o.height/h)
 const g=new T.Group();g.name=o.sample?'authored-worker-review-sample':'legacy-rig';g.userData.characterArt=o.sample?'AUTHORED_SAMPLE_REVIEW_PENDING':'LEGACY_PLACEHOLDER';g.add(model);parent.add(g)
 const mixer=new T.AnimationMixer(model),actions=new Map<string,T.AnimationAction>()
 const action=(name:string)=>{let a=actions.get(name);if(!a){const clip=T.AnimationClip.findByName(anim.animations,name);if(!clip)return undefined;a=mixer.clipAction(clip);actions.set(name,a)}return a}
 let current='',crouch=!!o.crouch,talking=false,idle=o.idle??'Idle_Loop',speed=0,moveHold=0
 const play=(name:string,fade=.25)=>{if(name===current)return;const next=action(name);if(!next)return;const prev=actions.get(current);next.reset().setEffectiveWeight(1).fadeIn(fade).play();if(prev)prev.fadeOut(fade);current=name}
 play(crouch?'Crouch_Idle_Loop':idle,0)
 // Dummy joints keep the createWorldActor contract; their rotations are read as intent (arms raised) only.
 const legs=[new T.Object3D(),new T.Object3D()],left=new T.Object3D(),right=new T.Object3D()
 const contact=new T.Mesh(kit.geo('r2-contact',()=>new T.CircleGeometry(.3,24)),kit.memo('r2-contact-mat',()=>new T.MeshBasicMaterial({color:'#1e1810',transparent:true,opacity:.22,depthWrite:false})));contact.rotation.x=-Math.PI/2;contact.position.y=.006;parent.add(contact)
 // Two-bone arm IK toward a world target, blended on top of the playing clip.
 const arms=(['l','r'] as const).map(s=>({side:s==='l'?1:-1,upper:model.getObjectByName('upperarm_'+s)!,lower:model.getObjectByName('lowerarm_'+s)!,hand:model.getObjectByName('hand_'+s)!}))
 // r16 continuity: `grip` gives each hand its own world target (ladder rails / rungs); `reach` keeps the shared target.
 let reachTarget:T.Vector3|null=null,reachW=0,gripL:T.Vector3|null=null,gripR:T.Vector3|null=null
 const last=new T.Vector3().copy(g.position)
 const footBones=['foot_l','foot_r'].map(name=>model.getObjectByName(name))
 let footReference:T.Vector3[]|null=null,footAnimation='',footYaw=0,footSettled=0
 const vA=new T.Vector3(),vB=new T.Vector3(),vC=new T.Vector3(),vD=new T.Vector3(),q=new T.Quaternion(),qp=new T.Quaternion(),qw=new T.Quaternion()
 const aim=(bone:T.Object3D,child:T.Object3D,to:T.Vector3,w:number)=>{bone.getWorldPosition(vA);child.getWorldPosition(vB);vC.subVectors(vB,vA).normalize();vD.subVectors(to,vA).normalize();q.setFromUnitVectors(vC,vD);bone.getWorldQuaternion(qw);qw.premultiply(q);bone.parent!.getWorldQuaternion(qp);qp.invert().multiply(qw);bone.quaternion.slerp(qp,w);bone.updateMatrixWorld(true)}
 const ik=(w:number)=>{const pair=!!(gripL&&gripR);if((!reachTarget&&!pair)||w<=0)return;g.updateMatrixWorld(true)
  for(const a of arms){const target=pair?(a.side>0?gripL!:gripR!):reachTarget!;const S=a.upper.getWorldPosition(new T.Vector3()),E0=a.lower.getWorldPosition(new T.Vector3()),H0=a.hand.getWorldPosition(new T.Vector3()),l1=S.distanceTo(E0),l2=E0.distanceTo(H0)
   const handOrientation=a.hand.getWorldQuaternion(new T.Quaternion())
   const palmOffset=o.sample?new T.Vector3(0,.052*o.height/h,0).applyQuaternion(handOrientation):new T.Vector3()
   const side=new T.Vector3(pair?0:a.side*.06,0,0).applyQuaternion(g.quaternion),palmGoal=target.clone().add(side),P=palmGoal.clone().sub(palmOffset),d=T.MathUtils.clamp(S.distanceTo(P),Math.abs(l1-l2)+.001,(l1+l2)*.999),dir=P.clone().sub(S).normalize()
   const cosA=(l1*l1+d*d-l2*l2)/(2*l1*d),ang=Math.acos(T.MathUtils.clamp(cosA,-1,1)),pole=(pair?new T.Vector3(a.side*.9,-.7,-.25):new T.Vector3(a.side*.4,-1,-.3)).applyQuaternion(g.quaternion)
   // Rotate toward the elbow pole. The opposite sign raised both elbows above
   // the shoulders when reaching down to a work surface.
   const E=elbowPoint(S,dir,pole,l1,ang);aim(a.upper,a.lower,E,w);aim(a.lower,a.hand,S.clone().add(dir.multiplyScalar(d)),w)
   if(o.sample){
    const parentQ=a.hand.parent!.getWorldQuaternion(new T.Quaternion()).invert()
    a.hand.quaternion.slerp(parentQ.multiply(handOrientation),w);a.hand.updateMatrixWorld(true)
    const actual=a.hand.localToWorld(new T.Vector3(0,.052,0))
    g.userData['palmError'+a.side]=actual.distanceTo(palmGoal)
    g.userData['contact'+a.side]={
     side:a.side,root:g.getWorldPosition(new T.Vector3()).toArray(),
     shoulder:a.upper.getWorldPosition(new T.Vector3()).toArray(),
     elbow:a.lower.getWorldPosition(new T.Vector3()).toArray(),
     wrist:a.hand.getWorldPosition(new T.Vector3()).toArray(),palm:actual.toArray(),
     target:palmGoal.toArray(),toolTarget:target.toArray(),
     error:actual.distanceTo(palmGoal),reachDistance:S.distanceTo(P),
     maximumReach:l1+l2,unreachable:S.distanceTo(P)>(l1+l2)*.999,blend:w,
    }
   }
  }}
 const actor:RigActor={g,contact,legs,left,right,
  reach:t=>{reachTarget=t?t.clone():null},
  grip:(l,r)=>{gripL=l?l.clone():null;gripR=r?r.clone():null},
  setCrouch:on=>{crouch=on},setTalking:on=>{talking=on},setIdle:c=>{idle=c},
  tick:(dt,reduced)=>{
   const moved=last.distanceTo(g.position);last.copy(g.position);speed=dt>0?T.MathUtils.lerp(speed,moved/dt,.3):speed
   if(speed>.25)moveHold=.2;else moveHold=Math.max(0,moveHold-dt)
   const walking=moveHold>0,raised=left.rotation.x<-.5||right.rotation.x<-.5
   play(walking?(crouch?'Crouch_Fwd_Loop':'Walk_Loop'):crouch?'Crouch_Idle_Loop':talking?'Idle_Talking_Loop':idle)
   const a=actions.get(current);if(a)a.timeScale=walking&&!crouch?T.MathUtils.clamp(speed/1.4,.6,1.6):1
   build.reset();mixer.update(reduced&&!walking?0:dt);build.apply();model.updateMatrixWorld(true)
   // Ground the authored soles after retargeting. This corrects vertical root offsets;
   // horizontal foot locking still needs separate gait/contact verification.
   if(o.sample){
    const soles=model.getObjectByName('authored-sandals') as T.SkinnedMesh
    if(soles){let low=Infinity;const p=soles.geometry.attributes.position,v=new T.Vector3()
     for(let i=0;i<p.count;i++){soles.getVertexPosition(i,v).applyMatrix4(soles.matrixWorld);low=Math.min(low,v.y)}
     if(Number.isFinite(low)){model.position.y+=g.position.y-low;model.updateMatrixWorld(true)}
    }
   }
   reachW=T.MathUtils.lerp(reachW,reachTarget||(gripL&&gripR)||raised?1:0,Math.min(1,dt*8));ik(reachW)
   const activeContact=!!(reachTarget||(gripL&&gripR))&&!walking
   if(o.sample){
    const positions=footBones.map(b=>b?.getWorldPosition(new T.Vector3())??new T.Vector3())
    const turning=Math.abs(Math.atan2(Math.sin(g.rotation.y-footYaw),Math.cos(g.rotation.y-footYaw)))>.01
    if(walking||turning||footAnimation!==current){footReference=null;footSettled=0}
    else footSettled+=dt
    if(!footReference&&footSettled>.4)footReference=positions.map(p=>p.clone())
    g.userData.footFrame={capturedAt:performance.now(),animation:current,walking,turning,settled:!!footReference,root:g.position.toArray(),feet:positions.map((p,i)=>({side:i?'right':'left',position:p.toArray(),horizontalDrift:footReference?Math.hypot(p.x-footReference[i].x,p.z-footReference[i].z):null}))}
    footAnimation=current;footYaw=g.rotation.y
   }
   g.userData.activeContact=activeContact
   if(o.sample&&activeContact){
    g.userData.contactFrame=arms.map(a=>({...g.userData['contact'+a.side],capturedAt:performance.now(),animation:current}))
   }else{delete g.userData.contactFrame;delete g.userData.palmError1;delete g.userData['palmError-1']}
   if(typeof g.userData.afterPose==='function')g.userData.afterPose()
   contact.position.set(g.position.x,g.position.y+.006,g.position.z)
  },
  dispose:()=>{mixer.stopAllAction();mixer.uncacheRoot(model)}}
 live.add(actor);return actor
}
