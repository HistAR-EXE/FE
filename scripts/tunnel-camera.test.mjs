import test from 'node:test'
import assert from 'node:assert/strict'
import {Vector3} from 'three'
import {clampTunnelCamera} from '../src/features/living-world/tunnelCamera.ts'

const corridor=(x,y,z)=>Math.abs(x)<.3&&y>.05&&y<1&&Math.abs(z)<3
test('FP camera is never pushed beyond its requested short orbit',()=>{
 const target=new Vector3(0,.92,.06),camera=new Vector3(0,.92,0)
 clampTunnelCamera(target,camera,new Vector3(0,.92,0),corridor)
 assert.ok(camera.distanceTo(target)<=.061)
 assert.ok(corridor(camera.x,camera.y,camera.z))
})
test('a shoulder target outside the carved passage falls back to the safe anchor',()=>{
 const target=new Vector3(.4,.62,0),camera=new Vector3(.4,.98,-2)
 clampTunnelCamera(target,camera,new Vector3(0,.92,0),corridor)
 assert.equal(target.x,0)
 assert.ok(corridor(camera.x,camera.y,camera.z))
})
test('camera clears a close wall instead of forcing the old minimum distance through it',()=>{
 const inside=(x,y,z)=>corridor(x,y,z)&&z>-.12
 const target=new Vector3(0,.92,0),camera=new Vector3(0,.92,-2)
 clampTunnelCamera(target,camera,target.clone(),inside)
 assert.ok(camera.z>-.12)
 assert.ok(camera.distanceTo(target)<.12)
})
test('clearance covers near-plane corners rather than only the camera centre',()=>{
 const target=new Vector3(0,.92,0),camera=new Vector3(.8,.92,-1)
 clampTunnelCamera(target,camera,target.clone(),corridor)
 for(const dx of [-.04,.04])assert.ok(corridor(camera.x+dx,camera.y,camera.z))
})
