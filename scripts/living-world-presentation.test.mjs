import test from 'node:test'
import assert from 'node:assert/strict'
const m=await import('../src/features/living-world/worldPresentation.ts').catch(()=>({}))
test('a delayed response cannot cross an account boundary',async()=>{
 assert.equal(typeof m.readWhileCurrent,'function')
 let current=true,release
 const response=new Promise(resolve=>{release=resolve})
 const result=m.readWhileCurrent(()=>response,()=>current)
 current=false;release({facts:['private old facts']})
 assert.equal(await result,null)
})
test('only the actually visible world moment can be acknowledged',()=>{
 assert.equal(typeof m.canPresentMoment,'function')
 assert.equal(m.canPresentMoment(true,'ATLAS',null,'visible'),false)
 assert.equal(m.canPresentMoment(true,'WORLD','KHA','visible'),false)
 assert.equal(m.canPresentMoment(true,'WORLD',null,'hidden'),false)
 assert.equal(m.canPresentMoment(true,'WORLD',null,'visible'),true)
})
