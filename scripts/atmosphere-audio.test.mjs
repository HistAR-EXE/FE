import test from 'node:test'
import assert from 'node:assert/strict'
import {createDistantAtmosphereCue} from '../src/features/living-world/distantAtmosphereAudio.ts'

test('distant atmosphere fades in, fades out, and cannot restart after disposal',()=>{
 const targets=[],nodes=[]
 const node=()=>{const n={connect(){},disconnect(){this.disconnected=true},start(){this.started=true},stop(){this.stopped=(this.stopped??0)+1},gain:{value:0,cancelScheduledValues(){},setTargetAtTime(value,at,timeConstant){targets.push({value,at,timeConstant})}},frequency:{value:0},Q:{value:0}};nodes.push(n);return n}
 const context={currentTime:4,state:'running',createBufferSource:node,createBiquadFilter:node,createGain:node}
 const cue=createDistantAtmosphereCue(context,{},{});assert.deepEqual(targets,[])
 cue.setAlert(true);assert.ok(targets.at(-1).value>0&&targets.at(-1).value<1);assert.ok(targets.at(-1).timeConstant>=1)
 const count=targets.length;cue.setAlert(true);assert.equal(targets.length,count)
 cue.setAlert(false);assert.equal(targets.at(-1).value,0)
 cue.close();cue.close();assert.equal(nodes[0].stopped,1);assert.ok(nodes.every(n=>n.disconnected))
 const stopped=targets.length;cue.setAlert(true);assert.equal(targets.length,stopped)
})
