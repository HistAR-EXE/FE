import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import {elbowPoint} from '../src/features/living-world/r2/armPose.ts'
test('downward work reach bends toward the elbow pole while preserving upper arm length',()=>{
 const s=new T.Vector3(0,1,0),dir=new T.Vector3(0,-.4,.8).normalize(),pole=new T.Vector3(0,-1,-.3)
 const e=elbowPoint(s,dir,pole,.27,.8),off=e.clone().sub(s),perp=pole.clone().addScaledVector(dir,-pole.dot(dir))
 assert.ok(off.dot(perp)>0,'elbow must bend toward, not away from, the downward pole')
 assert.ok(Math.abs(off.length()-.27)<1e-6)
 assert.ok(Number.isFinite(elbowPoint(s,dir,dir,.27,.8).length()))
})
