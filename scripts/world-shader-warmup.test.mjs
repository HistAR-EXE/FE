import test from 'node:test'
import assert from 'node:assert/strict'
import {warmWorldShaders} from '../src/features/living-world/warmWorldShaders.ts'
import {Scene,PerspectiveCamera,Mesh,BoxGeometry,MeshPhysicalMaterial,ACESFilmicToneMapping,SRGBColorSpace,WebGLRenderTarget} from 'three'

test('transmission keeps global output space stable while compiling both render-target contexts',async()=>{
 const scene=new Scene(),material=new MeshPhysicalMaterial({transmission:.8}),mesh=new Mesh(new BoxGeometry(),material);scene.add(mesh)
 const compiled=[],initialized=[],programs=new Map();let target=null,disposed=false
 const renderer={toneMapping:ACESFilmicToneMapping,outputColorSpace:SRGBColorSpace,getRenderTarget:()=>target,setRenderTarget:next=>{target=next;if(next){assert.ok(next instanceof WebGLRenderTarget);next.addEventListener('dispose',()=>{disposed=true})}},compile:()=>{assert.equal(renderer.outputColorSpace,SRGBColorSpace,'global output participates in Three program cache keys');const pass=target?'linear':'display';compiled.push(pass);programs.set(pass,{isReady:()=>true,getUniforms:()=>initialized.push(pass)});return new Set([material])},properties:{get:()=>({programs})}}
 await warmWorldShaders(renderer,scene,new PerspectiveCamera(),()=>false)
 assert.deepEqual(compiled,['display','linear']);assert.deepEqual(initialized,['display','linear']);assert.equal(renderer.toneMapping,ACESFilmicToneMapping);assert.equal(renderer.outputColorSpace,SRGBColorSpace)
 assert.equal(target,null);assert.equal(disposed,true)
 mesh.geometry.dispose();material.dispose()
})
test('failed transmission warm-up restores tone mapping and output color space',async()=>{
 const scene=new Scene(),material=new MeshPhysicalMaterial({transmission:1}),mesh=new Mesh(new BoxGeometry(),material);scene.add(mesh)
 let target=null,disposed=false
 const renderer={toneMapping:ACESFilmicToneMapping,outputColorSpace:SRGBColorSpace,getRenderTarget:()=>target,setRenderTarget:next=>{target=next;next?.addEventListener('dispose',()=>{disposed=true})},compile:()=>{if(target)throw new Error('linear compile failed');return new Set([material])},properties:{get:()=>({})}}
 await assert.rejects(warmWorldShaders(renderer,scene,new PerspectiveCamera(),()=>false),/linear compile failed/)
 assert.equal(renderer.toneMapping,ACESFilmicToneMapping);assert.equal(renderer.outputColorSpace,SRGBColorSpace);mesh.geometry.dispose();material.dispose()
 assert.equal(target,null);assert.equal(disposed,true)
})
test('display programs finish linking before switching to the transmission target',async()=>{
 const scene=new Scene(),material=new MeshPhysicalMaterial({transmission:1}),mesh=new Mesh(new BoxGeometry(),material);scene.add(mesh)
 let target=null,ready=false,switches=0
 const renderer={toneMapping:ACESFilmicToneMapping,outputColorSpace:SRGBColorSpace,getRenderTarget:()=>target,setRenderTarget:next=>{if(next){assert.equal(ready,true,'do not force GPU synchronization while display linking is pending');switches++}target=next},compile:()=>new Set([material]),properties:{get:()=>({currentProgram:{isReady:()=>ready}})}}
 setTimeout(()=>{ready=true},15);await warmWorldShaders(renderer,scene,new PerspectiveCamera(),()=>false)
 assert.equal(target,null);assert.equal(switches,1);mesh.geometry.dispose();material.dispose()
})
test('cancellation from compile does not inspect disposed material properties',async()=>{
 let cancelled=false
 const renderer={compile:()=>{cancelled=true;return new Set([{}])},properties:{get:()=>assert.fail('disposed material was inspected')}}
 await warmWorldShaders(renderer,{}, {},()=>cancelled)
})

test('material initialization yields to the event loop between GPU programs',async()=>{
 const events=[]
 const programs=[1,2].map(id=>({isReady:()=>true,getUniforms:()=>events.push('program'+id)}))
 const renderer={compile:()=>new Set([{}]),properties:{get:()=>({programs:new Map(programs.map((p,i)=>[String(i),p]))})}}
 setTimeout(()=>events.push('input'),0)
 await warmWorldShaders(renderer,{}, {},()=>false)
 assert.ok(events.includes('program1')&&events.includes('program2'),'initialize both programs before the first complete render')
 assert.ok(events.indexOf('input')<events.indexOf('program2'),'input must run before the second GPU initialization')
})
test('cancellation between GPU initialization jobs prevents access to disposed programs',async()=>{
 let cancelled=false,initialized=0
 const first={isReady:()=>true,getUniforms:()=>{initialized++;setTimeout(()=>{cancelled=true},0)}}
 const second={isReady:()=>true,getUniforms:()=>{assert.equal(cancelled,false);initialized++}}
 const renderer={compile:()=>new Set([{}]),properties:{get:()=>({programs:new Map([['first',first],['second',second]])})}}
 await warmWorldShaders(renderer,{}, {},()=>cancelled)
 assert.equal(initialized,1)
})

test('shared material waits for all compiled geometry variants, not only the last current program',async()=>{
 let ready=false,settled=false,variantReads=0
 const current={isReady:()=>true},earlier={isReady:()=>{variantReads++;return ready}}
 const renderer={compile:()=>new Set([{},{}]),properties:{get:()=>({currentProgram:current,programs:new Map([['skinned',earlier],['plain',current]])})}}
 const pending=warmWorldShaders(renderer,{}, {},()=>false).then(()=>{settled=true})
 await new Promise(resolve=>setTimeout(resolve,20))
 assert.equal(settled,false,'must not render while an earlier compiled variant is still linking')
 assert.ok(variantReads>0)
 ready=true;await pending
})
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
