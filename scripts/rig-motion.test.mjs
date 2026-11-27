import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync} from 'node:fs'
import * as T from 'three'
const file=new URL('../src/features/living-world/r2/rigMotion.ts',import.meta.url)
const finish=existsSync(file)?(await import(file.href)).finishPoseTransition:()=>{}
test('switching to reduced motion during an active crossfade finishes the current pose without advancing time',()=>{
 const g=new T.Group(),mixer=new T.AnimationMixer(g)
 const pose=(name,y)=>mixer.clipAction(new T.AnimationClip(name,1,[new T.NumberKeyframeTrack('.position[y]',[0,1],[y,y])]))
 const standing=pose('standing',1).play(),crouch=pose('crouch',0).setEffectiveWeight(1).fadeIn(.25).play()
 standing.fadeOut(.25);mixer.update(.05);assert.ok(g.position.y>.7)
 const time=mixer.time
 finish([standing,crouch],crouch);mixer.update(0)
 assert.ok(Math.abs(g.position.y)<1e-8,'reduced mode must not freeze the partial standing/crouch blend')
 assert.equal(standing.getEffectiveWeight(),0);assert.equal(crouch.getEffectiveWeight(),1)
 for(let i=0;i<20;i++)mixer.update(0)
 assert.equal(mixer.time,time);assert.ok(Math.abs(g.position.y)<1e-8)
})
