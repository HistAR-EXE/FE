import test from 'node:test'
import assert from 'node:assert/strict'
let guide
try{guide=await import('../src/features/living-world/m2JourneyGuidance.ts')}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e}
test('new craft guidance returns to missing preparation and then leads to the real next target',()=>{
 assert.ok(guide,'M2 guidance module exists')
 assert.equal(guide.describeM2Station('A05_WEAVE',[]).nextTarget,'A05_STRIPS')
 assert.equal(guide.describeM2Station('A05_STRIPS',[]).phase,'TRY')
 assert.equal(guide.describeM2Station('A05_STRIPS',['A05_STRIPS']).nextTarget,'A05_WEAVE')
})
test('completed surface scenes offer a reflection and real onward zone without inventing progress',()=>{
 assert.ok(guide)
 const done=['A05_STRIPS','A05_WEAVE','A06_DIG','A06_BASKET','A10_LISTEN','A10_CHANT']
 const story=guide.describeM2Station('A10_CHANT',done)
 assert.equal(story.phase,'REFLECT');assert.equal(story.nextZone,'S4');assert.match(story.body,/thúng|đất|câu hò/)
 assert.equal(guide.describeM2Station('UNKNOWN',[]),null)
 assert.ok(guide.m2ZoneGoals.S3)
})

test('meeting guidance preserves the records prerequisite and leads to reflection after the letter',()=>{
 assert.equal(guide.describeM2Station('L2B_LETTER',[]).nextTarget,'L2B_RECORDS')
 assert.equal(guide.describeM2Station('L2B_RECORDS',['L2B_RECORDS']).nextTarget,'L2B_LETTER')
 assert.equal(guide.describeM2Station('L2B_LETTER',['L2B_RECORDS','L2B_LETTER']).nextZone,'L2-C')
})
