import test from 'node:test'
import assert from 'node:assert/strict'
import * as T from 'three'
import {Sky} from 'three/addons/objects/Sky.js'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import * as kitModule from '../src/features/time-portal/tunnel3d/kit.ts'
import * as batching from '../src/features/living-world/worldBatching.ts'

let presentation
try { presentation = await import('../src/features/living-world/m2ScenePresentation.ts') } catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error
}

test('moonlit field replaces visible analytic daylight and inherited daylight lights without black PBR', () => {
  assert.ok(presentation, 'M2 scene presentation helper must exist')
  const scene = new T.Scene(), sky = new Sky(), environment = new T.Texture()
  scene.environment = environment
  scene.environmentIntensity = .6
  const daylights = [new T.DirectionalLight('#fff4d4', 3), new T.HemisphereLight('#e8f6de', '#50402c', 2.4), new T.DirectionalLight('#ffe2bd', 3), new T.HemisphereLight('#cfe0ff', '#5a3f2a', .45)]
  const lamp = new T.PointLight('#ffca80', 2.2, 6), ground = new T.Mesh(new T.PlaneGeometry(2, 2), new T.MeshStandardMaterial())
  scene.add(sky, ...daylights, lamp, ground)
  presentation.configureMoonlitField(scene)
  assert.equal(sky.visible, false, 'background alone cannot hide an analytic Sky mesh')
  for (const light of daylights) assert.equal(light.intensity, 0, 'daylight added by both WorldScene and village must be suppressed')
  assert.equal(lamp.intensity, 2.2, 'local warm station lighting survives')
  assert.equal(ground.visible, true)
  assert.equal(scene.environment, environment, 'keep the already-loaded neutral PMREM')
  assert.ok(scene.environmentIntensity >= .1 && scene.environmentIntensity <= .25, 'PBR stays readable at night')
  const background = scene.background, fog = scene.fog
  assert.ok(background instanceof T.Color)
  assert.ok(background.b > background.r && background.g > background.r, 'night backdrop is cool')
  assert.ok(Math.max(background.r, background.g, background.b) < .08, 'night backdrop must not look like daytime')
  assert.ok(fog instanceof T.FogExp2)
  assert.ok(fog.color.b > fog.color.r)
  // The moon/fill are added after the reset and keep their authored intensity.
  const moon = new T.DirectionalLight('#c4dcff', 1.85)
  scene.add(moon)
  assert.equal(moon.intensity, 1.85)
  ground.geometry.dispose(); ground.material.dispose(); environment.dispose(); sky.geometry.dispose(); sky.material.dispose()
})

// Browser-only asset/rig loading is replaced at that boundary. The real scene builders,
// Three.js geometry/materials, batching, station transforms and update callbacks execute.
function loadSceneModule(file, dependencies) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}}).outputText
  const exports = {}
  vm.runInNewContext(compiled, {exports, require:id=>{
    if (id === 'three') return T
    assert.ok(id in dependencies, `Unexpected scene dependency ${id}`)
    return dependencies[id]
  }}, {filename:file})
  return exports
}
const rig = parent=>{
  const g = new T.Group(), left = new T.Group(), right = new T.Group(), contact = new T.Group()
  g.add(left, right); parent.add(g, contact)
  return {g, left, right, contact, legs:[], reach(){}, setIdle(){}, setTalking(){}}
}
const texture = ()=>new T.Texture()
const assets = {
  pbr:(kit,_id,options={})=>kit.track(new T.MeshStandardMaterial({color:options.color??'#ffffff'})),
  ensureUv1:g=>g,
  place:(parent,id,position,{scale=1,rotY=0}={})=>{
    const model = new T.Group(); model.name=id; model.position.set(...position); model.scale.setScalar(scale); model.rotation.y=rotY; parent.add(model); return model
  },
  scatter:()=>[], canvasTexture:texture, leafCard:texture, cardClump:size=>new T.PlaneGeometry(size,size), preload:async()=>{},
  skyEnvironment:(_renderer,scene)=>{const sky=new Sky();scene.add(sky);return {sky,rt:{texture:new T.Texture(),dispose(){}}}},
}
const village = loadSceneModule('../src/features/living-world/r2/r2Village.ts', {
  './r2Flora':{plantTrees(){},plantBushes(){}}, './r2Assets':assets,
  './r2Actors':{createRigActor:rig,R2_CHAR_FILES:[]}, './vietnameseOilLamp':await import('../src/features/living-world/r2/vietnameseOilLamp.ts'),
  '../m2ScenePresentation':presentation, '../m2Workbench':await import('../src/features/living-world/m2Workbench.ts'),
})
const envKit = loadSceneModule('../src/features/living-world/worldEnvKit.ts', {
  '../time-portal/tunnel3d/kit':kitModule, 'three/addons/utils/BufferGeometryUtils.js':{mergeGeometries},
})
const s2Module = loadSceneModule('../src/features/living-world/s2Environment.ts', {
  '../time-portal/tunnel3d/kit':kitModule, './worldActor':{}, './worldBatching':batching,
  'three/addons/utils/BufferGeometryUtils.js':{mergeGeometries}, './worldEnvKit':envKit,
  './worldModel':{isSafeWorldPoint:()=>true}, './m2ScenePresentation':presentation, './m2Workbench':await import('../src/features/living-world/m2Workbench.ts'),
})

test('S2 rice paper and sandal straps appear only after their accepted steps', () => {
  const scene=new T.Scene(), kit=new kitModule.Kit()
  const env=s2Module.createS2(scene,kit,{floor:new T.Mesh(),person:(_c,_s,_r,parent)=>rig(parent)})
  const paper=env.targets.A03_SPREAD.children.filter(o=>o.geometry?.parameters.radiusTop===.16)
  const straps=env.targets.A12_STRAP.children.filter(o=>o.geometry?.type==='TorusGeometry')
  assert.equal(paper.length,3);assert.equal(straps.length,2)
  const update=completed=>env.update(1,[0,2],0,false,'IDLE',0,false,true,()=>{},()=>{},completed)
  update([])
  for(const result of [...paper,...straps])assert.equal(result.visible,false,'finished craft must not pre-exist action')
  update(['A03_BATTER','A03_SPREAD'])
  for(const result of paper)assert.equal(result.visible,true)
  for(const result of straps)assert.equal(result.visible,false)
  update(['A12_SOLE','A12_STRAP'])
  for(const result of straps)assert.equal(result.visible,true)
  for(const result of paper)assert.equal(result.visible,false,'fresh account state removes previous work')
  kit.dispose()
})

test('S3 builder suppresses village daylight and reveals basket/dirt results from completed state', () => {
  const scene=new T.Scene(), kit=new kitModule.Kit()
  const baseSun=new T.DirectionalLight('#fff4d4',3), baseFill=new T.HemisphereLight('#e8f6de','#50402c',2.4)
  scene.add(baseSun,baseFill)
  const env=village.buildField(scene,kit,{})
  const sky=scene.children.find(o=>o.isSky)
  assert.equal(sky.visible,false,'real field builder must reset inherited analytic daylight')
  assert.equal(baseSun.intensity,0);assert.equal(baseFill.intensity,0)
  const stars=[];scene.traverse(o=>{if(o instanceof T.Points)stars.push(o)})
  assert.equal(stars.length,1)
  assert.ok([...stars[0].geometry.attributes.position.array].every(Number.isFinite),'celestial backdrop coordinates must be finite')
  const moonDiscs=[];scene.traverse(o=>{if(o.geometry?.type==='SphereGeometry'&&o.material?.isMeshBasicMaterial&&o.material.fog===false)moonDiscs.push(o)})
  assert.equal(moonDiscs.length,1)
  const camera=new T.PerspectiveCamera(40,1.6,.1,120)
  camera.position.fromArray(env.camera.position);camera.lookAt(new T.Vector3(...env.camera.target));camera.updateMatrixWorld(true)
  scene.updateMatrixWorld(true)
  const moonOnScreen=moonDiscs[0].getWorldPosition(new T.Vector3()).project(camera)
  assert.ok(Math.abs(moonOnScreen.x)<1&&Math.abs(moonOnScreen.y)<1&&moonOnScreen.z<1,'moon cue should enter the initial camera frame, before foliage occlusion review')
  const activeDirections=[];scene.traverse(o=>{if(o instanceof T.DirectionalLight&&o.intensity>0)activeDirections.push(o)})
  assert.equal(activeDirections.length,1,'only the newly authored moon remains directional')
  assert.ok(activeDirections[0].color.b>activeDirections[0].color.r)
  const basket=env.targets.A05_WEAVE.getObjectByName('wicker_basket_01')
  const fills=env.targets.A06_BASKET.children.filter(o=>o.geometry?.parameters.radiusTop===.18)
  const sourceFill=env.targets.A06_DIG.children.find(o=>o.geometry?.parameters.radiusTop===.2)
  assert.equal(fills.length,3)
  const update=completed=>env.update(1,.016,{reduced:true,working:false,active:null,completed})
  update([]);assert.equal(basket.visible,false);for(const fill of fills)assert.equal(fill.visible,false)
  update(['A06_DIG']);assert.equal(sourceFill.visible,true);for(const fill of fills)assert.equal(fill.visible,false)
  update(['A05_STRIPS','A05_WEAVE','A06_DIG','A06_BASKET'])
  assert.equal(basket.visible,true);for(const fill of fills)assert.equal(fill.visible,true)
  assert.equal(sourceFill.visible,false,'the source basket empties when the line receives the soil')
  update([]);assert.equal(basket.visible,false);for(const fill of fills)assert.equal(fill.visible,false)
  kit.dispose()
})

test('S4 farewell parcel becomes a lasting result of witnessing the farewell', () => {
  const scene=new T.Scene(),kit=new kitModule.Kit(),env=village.buildCommunity(scene,kit,{})
  const parcel=env.targets.A09_FAREWELL.children.find(o=>o.geometry?.parameters.width===.26)
  const food=env.targets.A11_BROWSE.children.find(o=>o instanceof T.Group&&o.children.some(c=>c.geometry?.parameters.radiusTop===.14))
  const sharedParcel=env.targets.A11_CONNECT.children.find(o=>o instanceof T.Group&&o.children.some(c=>c.geometry?.parameters.width===.28))
  assert.ok(parcel)
  assert.ok(food);assert.ok(sharedParcel)
  env.update(1,.016,{reduced:true,working:false,active:null,completed:[]})
  assert.equal(parcel.visible,false)
  assert.equal(food.visible,false);assert.equal(sharedParcel.visible,false)
  env.update(2,.016,{reduced:true,working:false,active:null,completed:['A09_LISTEN','A09_FAREWELL']})
  assert.equal(parcel.visible,true)
  assert.equal(food.visible,false);assert.equal(sharedParcel.visible,false)
  env.update(3,.016,{reduced:true,working:false,active:null,completed:['A11_BROWSE','A11_CONNECT']})
  assert.equal(food.visible,true);assert.equal(sharedParcel.visible,true)
  assert.equal(parcel.visible,false)
  kit.dispose()
})

test('completion reveals persist through repeated updates and restore cleanly without moving pick targets', () => {
  assert.ok(presentation, 'M2 scene presentation helper must exist')
  const station = new T.Group(), result = new T.Mesh(new T.BoxGeometry(.3, .04, .2), new T.MeshStandardMaterial({color:'#c8b896'}))
  const proxy = new T.Mesh(new T.BoxGeometry(.95, .9, .95), new T.MeshBasicMaterial({visible:false}))
  result.position.set(.2, .5, 0); station.position.set(3.5, 0, -.5); station.add(proxy, result)
  const before = result.position.clone(), material = result.material, proxyGeometry = proxy.geometry
  const update = presentation.completionReveal('A09_FAREWELL', [result])
  assert.equal(result.visible, false, 'a finished parcel must not pre-exist completion')
  update(['A09_LISTEN']); assert.equal(result.visible, false)
  for (let i = 0; i < 20; i++) update(['A09_LISTEN', 'A09_FAREWELL'])
  assert.equal(result.visible, true)
  assert.deepEqual(result.position, before)
  assert.equal(result.material, material)
  assert.equal(proxy.visible, true); assert.equal(proxy.geometry, proxyGeometry)
  assert.equal(station.children.length, 2, 'updates allocate no duplicate payoff meshes')
  update([]); assert.equal(result.visible, false, 'reset or owner change removes the prior result')
  result.geometry.dispose(); result.material.dispose(); proxy.geometry.dispose(); proxy.material.dispose()
})

test('S4 evening performance removes inherited daylight while retaining readable stage lamps',()=>{
 const scene=new T.Scene(),kit=new kitModule.Kit(),day=new T.DirectionalLight('#fff4d4',3);scene.add(day)
 const env=village.buildCommunity(scene,kit,{})
 assert.equal(day.intensity,0,'The night performance must not inherit the midday sun')
 const lights=[];scene.traverse(o=>{if(o instanceof T.PointLight&&o.intensity>0)lights.push(o)})
 assert.ok(lights.length>=3,'stage, farewell and shared stalls remain legible at night')
 env.update(1,.016,{reduced:true,working:false,active:null,completed:[]});kit.dispose()
})
