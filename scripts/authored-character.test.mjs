import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as T from 'three'
import {buildAuthoredCharacter} from '../src/features/living-world/r2/authoredCharacter.ts'

function rig(){
 const b=fs.readFileSync(new URL('../src/features/living-world/r2/assets/chars/UAL1_Runtime.glb',import.meta.url))
 const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12))),nodes=j.nodes.map(n=>{const o=new T.Bone();o.name=n.name;o.position.fromArray(n.translation??[0,0,0]);o.quaternion.fromArray(n.rotation??[0,0,0,1]);return o})
 j.nodes.forEach((n,i)=>n.children?.forEach(c=>nodes[i].add(nodes[c])))
 return nodes[65]
}
test('authored sample has independent garments and normalized finite skinning across work poses',()=>{
 const model=buildAuthoredCharacter(rig(),{skin:'#bc926f',hair:'#211914',top:'#4e5639',bottom:'#35332a',female:true})
 let count=0,triangles=0
 model.updateMatrixWorld(true)
 model.traverse(o=>{
  assert.doesNotMatch(o.name,/superhero|placeholder/i)
  if(!o.isSkinnedMesh)return
  count++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3
  const {skinWeight:w,skinIndex:idx,position:p}=o.geometry.attributes
  for(let i=0;i<w.count;i++){
   let sum=0;for(let k=0;k<4;k++){sum+=w.getComponent(i,k);assert.ok(idx.getComponent(i,k)<o.skeleton.bones.length)}
   assert.ok(Math.abs(sum-1)<1e-5);assert.ok(Number.isFinite(p.getX(i)))
  }
  for(const bend of [0,-.8,-1.4]){
   model.getObjectByName('lowerarm_l').rotation.x=bend;model.updateMatrixWorld(true)
   for(let i=0;i<p.count;i+=17){const v=o.getVertexPosition(i,new T.Vector3());assert.ok(Number.isFinite(v.length())&&v.length()<4,'no exploded/skinning vertices')}
  }
 })
 assert.ok(count>=5,'skin, shirt, trousers, hair and details are separately authored')
 assert.ok(triangles<40000,'sample remains in a mobile-scale geometry budget')
 assert.equal(model.userData.artStatus,'REVIEW_CANDIDATE')
})

test('sleeve roots share shoulder support instead of rotating entirely with the upper arm',()=>{
 const model=buildAuthoredCharacter(rig(),{skin:'#bc926f',hair:'#211914',top:'#4e5639',bottom:'#35332a',female:false})
 const shirt=model.getObjectByName('authored-shirt'),a=shirt.geometry.attributes
 let roots=0,supported=0
 for(let i=0;i<a.position.count;i++)if(Math.abs(a.position.getX(i))>.17&&Math.abs(a.position.getX(i))<.22&&a.position.getY(i)>1.41){
  roots++;for(let k=0;k<4;k++)if(/spine_03|clavicle/.test(shirt.skeleton.bones[a.skinIndex.getComponent(i,k)].name)&&a.skinWeight.getComponent(i,k)>.1){supported++;break}
 }
 assert.ok(roots>0);assert.ok(supported/roots>.75,'shoulder seam needs chest/clavicle influence')
})

test('coincident armhole seams stay closed when the shoulder and arm rotate',()=>{
 const model=buildAuthoredCharacter(rig(),{skin:'#bc926f',hair:'#211914',top:'#4e5639',bottom:'#35332a',female:false})
 const shirt=model.getObjectByName('authored-shirt'),p=shirt.geometry.attributes.position,groups=new Map()
 for(let i=0;i<p.count;i++){
  const v=new T.Vector3().fromBufferAttribute(p,i)
  if(Math.abs(v.x)<.13||Math.abs(v.x)>.22||v.y<1.23||v.y>1.45)continue
  const key=v.toArray().map(n=>n.toFixed(5)).join(',');groups.set(key,[...(groups.get(key)??[]),i])
 }
 const seams=[...groups.values()].filter(g=>g.length>1)
 assert.ok(seams.length>=20,'both sleeves must share a real armhole boundary')
 for(const angle of [-1.1,0,.8]){
  for(const side of ['l','r']){model.getObjectByName('upperarm_'+side).rotation.y=angle;model.getObjectByName('clavicle_'+side).rotation.x=angle*.2}
  model.updateMatrixWorld(true)
  for(const indices of seams){const a=shirt.getVertexPosition(indices[0],new T.Vector3());for(const i of indices.slice(1))assert.ok(a.distanceTo(shirt.getVertexPosition(i,new T.Vector3()))<.0001,'seam tears under pose')}
 }
})
