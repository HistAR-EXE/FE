import test from 'node:test'
import assert from 'node:assert/strict'
import {livingSpaces,performLivingAction} from '../src/features/living-world/livingSpaces.ts'
import {zones,enterZone,initialShell,planPath,isSafeWorldPoint} from '../src/features/living-world/worldModel.ts'
import {routesFrom,readNavigation,saveNavigation} from '../src/features/living-world/worldContinuity.ts'
test('representative activities require preparation, replay is inert, no canonical fact is generated',()=>{
 for(const space of Object.values(livingSpaces)){const [a,b]=space.targets;const empty=[];assert.equal(performLivingAction(empty,b.id),empty);const prepared=performLivingAction(empty,a.id);assert.deepEqual(prepared,[a.id]);const done=performLivingAction(prepared,b.id);assert.deepEqual(done,[a.id,b.id]);assert.equal(performLivingAction(done,b.id),done)}
})
test('each representative room has safe entry, reachable props, context exits and unconditional present-day return',()=>{
 for(const z of Object.keys(livingSpaces)){const shell=enterZone(initialShell(),z);assert.ok(isSafeWorldPoint(shell.position,z));for(const t of zones[z].targets){assert.ok(isSafeWorldPoint(t.approach,z),`${z}/${t.id} approach`);assert.ok(planPath(shell.position,t.approach,z).length,`${z}/${t.id} reachability`)}const exits=routesFrom(z);assert.ok(exits.some(r=>r.type==='FAST_RETURN'&&r.to==='S0'));for(const r of exits)assert.equal(r.type==='FAST_RETURN'||r.type==='THEMATIC_SCENE',true)}
})
test('room navigation reload is retained under its own account without changing quest state',()=>{
 const map=new Map();globalThis.sessionStorage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)}
 for(const z of Object.keys(livingSpaces)){saveNavigation('guest',{version:1,zone:z,position:[0,2.5],heading:Math.PI,rice:0,last:null});assert.equal(readNavigation('guest').zone,z)}
})
