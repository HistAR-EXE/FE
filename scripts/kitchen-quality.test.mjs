import test from 'node:test'
import assert from 'node:assert/strict'
import {kitchenPixelRatio} from '../src/features/living-world/kitchenQuality.ts'
test('kitchen adapts to slow tail frames even when average FPS is above thirty',()=>{
 const frames=[...Array(60).fill(.0167),...Array(40).fill(.0334)]
 assert.ok(kitchenPixelRatio(1,1,frames)<1)
 assert.equal(kitchenPixelRatio(.6,1,frames),.6)
 assert.equal(kitchenPixelRatio(.8,1,Array(100).fill(.025)),.8)
 assert.ok(kitchenPixelRatio(.8,1,Array(100).fill(.0167))>.8)
 assert.equal(kitchenPixelRatio(1,1,Array(100).fill(.0167)),1)
})
