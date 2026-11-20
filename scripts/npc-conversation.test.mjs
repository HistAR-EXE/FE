import test from 'node:test'
import assert from 'node:assert/strict'
import {cookReply} from '../src/features/living-world/npcConversation.ts'
import {enterZone,initialShell,startApproach,advanceShell,arrivedInteraction,isSafeWorldPoint} from '../src/features/living-world/worldModel.ts'

test('cook conversation is reachable without occupying the stove',()=>{
 assert.ok(isSafeWorldPoint([.5,-1.5],'L1-C'))
 let state=startApproach(enterZone(initialShell(),'L1-C'),'NPC_COOK')
 for(let i=0;i<500&&state.path.length;i++)state=advanceShell(state,.1)
 assert.equal(arrivedInteraction(state),'NPC_COOK')
})
test('cook callback needs both confirmed meanings, in either discovery order',()=>{
 const base=cookReply('COMMUNITY',[])
 assert.equal(cookReply('COMMUNITY',['KITCHEN_MEANING_CONFIRMED']),base)
 assert.equal(cookReply('COMMUNITY',['CARE_MEANING_CONFIRMED']),base)
 const facts=Object.freeze(['CARE_MEANING_CONFIRMED','KITCHEN_MEANING_CONFIRMED'])
 assert.notEqual(cookReply('COMMUNITY',facts),base)
 assert.equal(cookReply('COMMUNITY',[...facts].reverse()),cookReply('COMMUNITY',facts))
 assert.notEqual(cookReply('SMOKE',[]),cookReply('SMOKE',['KITCHEN_SMOKE_PATH_CORRECT']))
 assert.equal(facts.length,2)
})
