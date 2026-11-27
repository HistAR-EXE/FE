import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import {createModelViewerCamera} from '../src/features/living-world/modelViewerCamera.ts'

test('model inspection applies commands once and restores the previous camera and orbit limits',()=>{
 const camera=new T.PerspectiveCamera(40,1.6,.1,100);camera.position.set(.4,1.1,.9)
 const controls={target:new T.Vector3(.2,.8,-.4),minDistance:.05,maxDistance:2.2,minPolarAngle:.4,maxPolarAngle:2.6,minAzimuthAngle:-Infinity,maxAzimuthAngle:Infinity,enableDamping:true,enabled:false,update(){}}
 const before={position:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,min:controls.minDistance,max:controls.maxDistance,damping:controls.enableDamping}
 const viewer=createModelViewerCamera(camera,controls),view={yaw:0,zoom:1,command:0}
 viewer.update(view,1.6);assert.notEqual(camera.fov,before.fov);assert.equal(controls.enabled,true)
 camera.position.x+=.15;const orbit=camera.position.clone();viewer.update(view,1.6);assert.ok(camera.position.equals(orbit),'pointer orbit is not reset on every frame')
 viewer.update({...view,yaw:.3,command:1},1.6);assert.ok(!camera.position.equals(orbit))
 viewer.update({...view,yaw:.3,command:1},.8);assert.equal(camera.fov,100)
 viewer.update(null,.46);assert.ok(camera.position.distanceTo(before.position)<1e-10);assert.ok(controls.target.distanceTo(before.target)<1e-10);assert.equal(camera.fov,before.fov);assert.equal(controls.minDistance,before.min);assert.equal(controls.maxDistance,before.max);assert.equal(controls.enableDamping,before.damping);assert.equal(controls.enabled,false)
 camera.position.x=1;viewer.update(null,.46);assert.equal(camera.position.x,1,'closed viewer never reapplies an old snapshot')
})
