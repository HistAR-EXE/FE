import test from 'node:test'
import assert from 'node:assert/strict'
const m=await import('../src/features/living-world/worldQueue.ts').catch(()=>({}))
const store=()=>{const rows=new Map();return {all:async()=>[...rows.values()],put:async row=>{rows.set(row.id,structuredClone(row))},remove:async id=>{rows.delete(id)}}}
test('lost acknowledgement replays identical request and keeps work after more than eight network failures',async()=>{
 assert.equal(typeof m.flushWorldQueue,'function')
 const db=store();await db.put({id:'one',owner:'alice',status:'PENDING',createdAt:1,intent:{actionType:'START_EXPERIENCE',targetId:'',payload:{}}})
 const sent=[];let online=false
 const transport={state:async()=>({revision:7,releaseVersion:1}),send:async r=>{sent.push(structuredClone(r));if(!online)throw new Error('network');return {revision:8}}}
 for(let i=0;i<10;i++)await m.flushWorldQueue(db,'alice',transport)
 assert.equal((await db.all()).length,1);online=true;await m.flushWorldQueue(db,'alice',transport)
 assert.equal((await db.all()).length,0);assert.deepEqual(sent[0],sent[10])
})
test('queue never sends another account actions and waits for rejected dependencies',async()=>{
 assert.equal(typeof m.flushWorldQueue,'function')
 const db=store();for(const row of [{id:'a',owner:'bob',createdAt:0},{id:'b',owner:'alice',createdAt:1,status:'REJECTED_REQUIRES_ACTION'},{id:'c',owner:'alice',createdAt:2,dependsOn:'b'}])await db.put({...row,status:row.status??'PENDING',intent:{actionType:'SELECT_MODE',targetId:'FREE',payload:{}}})
 let count=0;await m.flushWorldQueue(db,'alice',{state:async()=>({revision:0,releaseVersion:1}),send:async()=>{count++;return{revision:1}}})
 assert.equal(count,0);assert.equal((await db.all()).length,3)
})
test('a confirmed dependency rejection is retried against fresh state, not a stale revision',async()=>{
 const db=store();await db.put({id:'dependency-action',owner:'alice',status:'PENDING',createdAt:1,intent:{actionType:'STRUCTURED_INTERACTION',targetId:'',payload:{}}})
 let revision=1,first=true;const sent=[]
 const transport={state:async()=>({revision,releaseVersion:1}),send:async wire=>{sent.push(wire);if(first){first=false;throw {status:400,message:'DEPENDENCY_MISSING'}}assert.equal(wire.expectedRevision,4);return{revision:5}}}
 await m.flushWorldQueue(db,'alice',transport);revision=4;await m.flushWorldQueue(db,'alice',transport)
 assert.equal((await db.all()).length,0);assert.notEqual(sent[0].actionId,sent[1].actionId)
})
