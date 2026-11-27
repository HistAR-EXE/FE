import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import {plantFoot} from '../src/features/living-world/r2/plantedFoot.ts'

test('planted foot retains world contact and orientation through a moving hip',()=>{
 const root=new T.Group(),hip=new T.Bone(),knee=new T.Bone(),foot=new T.Bone()
 root.add(hip);hip.add(knee);knee.add(foot);hip.position.set(0,.9,0);knee.position.set(0,-.45,.08);foot.position.set(0,-.45,-.08);root.rotation.y=.6;root.updateMatrixWorld(true)
 const target=foot.getWorldPosition(new T.Vector3()),orientation=foot.getWorldQuaternion(new T.Quaternion())
 for(const shift of [-.03,0,.03]){
  hip.position.x=shift;hip.position.y=.86;hip.rotation.x=.15;knee.rotation.x=-.2;root.updateMatrixWorld(true)
  assert.equal(plantFoot(hip,knee,foot,target,orientation),true)
  assert.ok(foot.getWorldPosition(new T.Vector3()).distanceTo(target)<1e-5)
  assert.ok(foot.getWorldQuaternion(new T.Quaternion()).angleTo(orientation)<1e-5)
 }
 assert.equal(plantFoot(hip,knee,foot,new T.Vector3(5,0,0),orientation),false)
})
