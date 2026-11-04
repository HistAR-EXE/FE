import test from 'node:test'
import assert from 'node:assert/strict'
import {warmWorldShaders} from '../src/features/living-world/warmWorldShaders.ts'
test('scene cancellation stops shader polling before disposed programs are accessed',async()=>{
 let cancelled=false,disposed=false,reads=0
 const program={isReady:()=>{assert.equal(disposed,false);reads++;return false}}
 const renderer={compile:()=>new Set([{}]),properties:{get:()=>({currentProgram:program})}}
 const warm=warmWorldShaders(renderer,{}, {},()=>cancelled)
 cancelled=true;disposed=true;await warm
 assert.equal(reads,1)
})
test('readiness waits for every compiled program and cancellation before compile does no work',async()=>{
 let ready=false,compiled=0
 const renderer={compile:()=>{compiled++;return new Set([{}])},properties:{get:()=>({currentProgram:{isReady:()=>ready}})}}
 await warmWorldShaders(renderer,{}, {},()=>true);assert.equal(compiled,0)
 const pending=warmWorldShaders(renderer,{}, {},()=>false);setTimeout(()=>{ready=true},15);await pending;assert.equal(compiled,1)
})
