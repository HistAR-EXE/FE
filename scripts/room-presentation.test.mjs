import test from 'node:test'
import assert from 'node:assert/strict'
import {roomActionFrame,showRoomActor} from '../src/features/living-world/roomPresentation.ts'

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
