import * as T from 'three'
import {Kit} from '../time-portal/tunnel3d/kit'
import {mergeRigidChildren} from './worldBatching'
export function createWorldActor(root:T.Object3D,kit:Kit,color:string,scarf=false){
 const material=(c:string)=>kit.memo('actor-material:'+c,()=>new T.MeshLambertMaterial({color:c}))
 const sphere=kit.geo('traveler-sphere',()=>new T.SphereGeometry(1,12,8)),cylinder=kit.geo('traveler-cylinder',()=>new T.CylinderGeometry(1,1,1,8))
 const mesh=(geo:T.BufferGeometry,c:string,at:[number,number,number],parent:T.Object3D=root)=>{const m=new T.Mesh(geo,material(c));m.position.set(...at);parent.add(m);return m}
 const ellipsoid=(size:[number,number,number],c:string,at:[number,number,number],parent:T.Object3D=root)=>{const m=mesh(sphere,c,at,parent);m.scale.set(...size);return m}
 const rod=(a:[number,number,number],b:[number,number,number],r:number,c:string,parent:T.Object3D=root)=>{const v=new T.Vector3(...a),end=new T.Vector3(...b),m=mesh(cylinder,c,[0,0,0],parent);m.position.copy(v).add(end).multiplyScalar(.5);m.scale.set(r,v.distanceTo(end),r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(v).normalize());return m}
  const g=new T.Group();root.add(g)
  // Tailored torso with collar/buttons, articulated shoulders/elbows, face/hair and sandals.
  const torsoProfile=[[.2,.5],[.26,.65],[.23,.94],[.17,1.12],[.1,1.16]].map(([x,y])=>new T.Vector2(x,y))
  const torso=mesh(kit.geo('s2-torso',()=>new T.LatheGeometry(torsoProfile,16)),color,[0,0,0],g);torso.scale.z=.65
  ellipsoid([.09,.09,.09],'#ba906a',[0,1.18,0],g);ellipsoid([.15,.2,.14],'#cba47b',[0,1.4,0],g)
  const hair=ellipsoid([.155,.13,.145],'#302d28',[0,1.52,-.015],g);hair.rotation.x=-.15
  for(const x of [-.055,.055])ellipsoid([.013,.017,.008],'#342b25',[x,1.41,.13],g)
  ellipsoid([.025,.035,.04],'#bd9068',[0,1.37,.14],g)
  rod([-.045,1.3,.12],[.045,1.3,.12],.007,'#82604a',g)
  for(const x of [-1,1]){const collar=ellipsoid([.075,.1,.03],'#d2b98a',[x*.07,1.08,.12],g);collar.rotation.z=x*.5}
  for(let i=0;i<4;i++)ellipsoid([.012,.012,.01],'#584933',[0,.7+i*.085,.166],g)
  if(scarf){const cloth=mesh(kit.geo('s2-scarf',()=>new T.TorusGeometry(.16,.035,6,20)),'#a99c7a',[0,1.48,0],g);cloth.rotation.x=Math.PI/2;rod([.12,1.46,-.08],[.15,1.2,-.1],.035,'#a99c7a',g)}
  const arm=(side:number)=>{const joint=new T.Group();joint.position.set(side*.24,1.04,0);g.add(joint);ellipsoid([.075,.2,.075],color,[0,-.15,0],joint);ellipsoid([.055,.17,.055],'#c39c73',[0,-.45,.025],joint);ellipsoid([.06,.075,.045],'#c39c73',[0,-.61,.025],joint);return joint}
  const left=arm(-1),right=arm(1)
  const legs=[-1,1].map(side=>{const leg=new T.Group();leg.position.set(side*.115,.56,0);g.add(leg);ellipsoid([.095,.27,.09],'#45483b',[0,-.23,0],leg);ellipsoid([.1,.045,.18],'#41392e',[0,-.51,.07],leg);rod([-.07,-.46,.08],[.07,-.46,.08],.02,'#887555',leg);return leg})
  // Rigid body and leg parts render as one vertex-coloured draw each; IK-posed arm segments stay separate.
  mergeRigidChildren(g,kit);for(const leg of legs)mergeRigidChildren(leg,kit)
  const reach=(target:T.Vector3|null)=>{
   g.updateMatrixWorld(true)
   for(const [joint,side] of [[left,-1],[right,1]] as const){
    if(!target){joint.rotation.x=0;const [upper,lower,hand]=joint.children;upper.position.set(0,-.15,0);upper.scale.set(.075,.2,.075);upper.quaternion.identity();lower.position.set(0,-.45,.025);lower.scale.set(.055,.17,.055);lower.quaternion.identity();hand.position.set(0,-.61,.025);continue}
    joint.rotation.set(0,0,0);joint.updateMatrixWorld(true);const end=joint.worldToLocal(target.clone().add(new T.Vector3(side*.07,0,0)));end.clampLength(0,.74);const elbow=end.clone().multiplyScalar(.5).add(new T.Vector3(side*.1,-.12,-.08))
    const segment=(m:T.Object3D,a:T.Vector3,b:T.Vector3,r:number)=>{m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,a.distanceTo(b)*.5,r);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize())}
    segment(joint.children[0],new T.Vector3(),elbow,.075);segment(joint.children[1],elbow,end,.055);joint.children[2].position.copy(end)
   }
  }
  // Moving actors use soft ground-contact shadows; scenery shadow map is baked once per scene load.
  g.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=false})
  const contact=new T.Mesh(kit.geo('s2-contact',()=>new T.CircleGeometry(.32,24)),kit.track(new T.MeshBasicMaterial({color:'#463b25',transparent:true,opacity:.13,depthWrite:false})));contact.rotation.x=-Math.PI/2;contact.scale.set(1,1.3,1);contact.position.y=.005;root.add(contact)
  return{g,left,right,legs,reach,contact}
}
