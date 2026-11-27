import test from 'node:test'
import assert from 'node:assert/strict'
import {roomActionFrame,conversationFrame,showRoomActor} from '../src/features/living-world/roomPresentation.ts'
import * as T from 'three'
import * as presentation from '../src/features/living-world/roomPresentation.ts'

test('kitchen smoke framing stays in the open chamber instead of behind the inspection point',()=>{
 const frame=roomActionFrame([.5,-2.5],0,[.45,.45,-2.45],1.6,true)
 assert.ok(frame.camera[2]>-1.5,'camera must face the back-wall trench from the room')
 assert.ok(frame.camera[0]<-.9,'side view must separate the player from the smoke lid')
})
test('prep camera stays beside the table and outside the helpers walking route',()=>{
 const frame=roomActionFrame([-1,-.5],Math.PI,[-1.12,.55,-.86],1.6,true)
 assert.ok(frame.camera[0]<-2)
 for(const [x,z]of [[-1,-2],[.4,-1.2],[2.05,-.85],[.85,-1.65]])assert.ok(Math.hypot(frame.camera[0]-x,frame.camera[2]-z)>1.4)
})
test('kitchen lens returns from spatial inspection to action and walking lenses',()=>{
 assert.equal(presentation.kitchenFieldOfView(1.6,true,false),95)
 assert.equal(presentation.kitchenFieldOfView(1.6,false,true),55)
 assert.equal(presentation.kitchenFieldOfView(.46,false,true),70)
 assert.equal(presentation.kitchenFieldOfView(1.6,false,false),40)
})

test('conversation camera separates both speakers in landscape and portrait',()=>{
 for(const aspect of [.46,1.6]){
  const frame=conversationFrame([.5,-1.5],[1.15,1.2,-1.85],aspect),camera=new T.PerspectiveCamera(40,aspect,.1,100)
  camera.position.fromArray(frame.camera);camera.lookAt(new T.Vector3(...frame.look));camera.updateMatrixWorld(true)
  const a=new T.Vector3(.5,1.2,-1.5).project(camera),b=new T.Vector3(1.15,1.2,-1.85).project(camera)
  assert.ok(Math.abs(a.x-b.x)>.2)
  assert.ok(Math.abs(a.x)<.95&&Math.abs(b.x)<.95)
 }
})

test('portrait interaction leaves the work surface clear; desktop can show the shoulder',()=>{
 assert.equal(showRoomActor({portrait:true,firstPerson:true,contact:true,distance:1.5}),false)
 assert.equal(showRoomActor({portrait:true,firstPerson:false,contact:true,distance:1.5}),false)
 assert.equal(showRoomActor({portrait:false,firstPerson:false,contact:true,distance:1.5}),true)
 assert.equal(showRoomActor({portrait:false,firstPerson:false,contact:false,distance:.4}),false)
})
test('action framing keeps the contact in view and has enough lateral separation from the body',()=>{
 for(const aspect of [.46,1.6]){const f=roomActionFrame([-.5,-.5],Math.PI,[-1.12,.55,-.86],aspect)
  assert.ok(Math.abs(f.camera[0]+.5)>.6)
  assert.deepEqual(f.look,[-1.12,.65,-.86])
  assert.ok(f.camera[1]>.9&&f.camera[1]<1.7)
 }
})

test('meeting lens includes the low table in landscape and the selected work surface in portrait',()=>{
 assert.equal(typeof presentation.meetingFieldOfView,'function')
 for(const aspect of [.46,1.6]){
  const camera=new T.PerspectiveCamera(presentation.meetingFieldOfView(aspect),aspect,.1,120)
  if(aspect<1){const frame=roomActionFrame([-.5,-.5],Math.atan2(-.9,-.5),[-1.4,.55,-1],aspect);camera.position.fromArray(frame.camera);camera.lookAt(new T.Vector3(...frame.look))}
  else {camera.position.set(0,1.4,.8);camera.lookAt(0,1.1,-1.2)}
  camera.updateMatrixWorld(true)
  for(const p of [[-1.55,.54,-1.28],[-1.28,.6,-1.28]]){const v=new T.Vector3(...p).project(camera);assert.ok(Math.abs(v.x)<.95&&Math.abs(v.y)<.95,'writing hand remains inside the useful image')}
 }
})
