// Usage (tooling dir with @gltf-transform/{core,extensions,functions}@4, meshoptimizer, sharp installed):
//   node build-r2-runtime-assets.mjs <assets-src lookdev folder> <FE/src/features/living-world/r2/assets>
// Deps are intentionally NOT added to FE/package.json (offline asset step, not part of the app build).
// R2 runtime asset build: optimized copies of the R2 lookdev sources (Poly Haven CC0 + Quaternius CC0).
import {NodeIO} from '@gltf-transform/core'
import {ALL_EXTENSIONS} from '@gltf-transform/extensions'
import {dedup,prune,resample,weld,simplify,textureCompress,meshopt,quantize} from '@gltf-transform/functions'
import {MeshoptEncoder,MeshoptSimplifier} from 'meshoptimizer'
import sharp from 'sharp'
import {readdirSync,mkdirSync,statSync,writeFileSync} from 'node:fs'
const [,,SRC,OUT]=process.argv
await MeshoptEncoder.ready;await MeshoptSimplifier.ready
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder})
for(const d of ['tex','models','chars'])mkdirSync(`${OUT}/${d}`,{recursive:true})
const report=[]
const log=(file,src)=>{const b=statSync(file).size;report.push({file:file.replace(OUT+'/',''),bytes:b,source:src});console.log(file.replace(OUT+'/',''),(b/1024).toFixed(0)+'KB')}
// textures: ground/floor sets at 1024, others 512; webp
const big=new Set(['red_laterite_soil_stones','dirt_floor','brown_mud_leaves_01','terrazzo_tiles','excavated_soil_wall','red_dirt_mud_01','forest_leaves_02'])
for(const f of readdirSync(`${SRC}/textures`)){const id=f.replace(/_(Diffuse|arm|nor_gl)_1k\.jpg$/,'');const size=big.has(id)&&!f.includes('_arm_')?1024:512;const out=`${OUT}/tex/${f.replace('_1k.jpg','.webp')}`;await sharp(`${SRC}/textures/${f}`).resize(size,size).webp({quality:f.includes('nor_gl')?88:78}).toFile(out);log(out,`polyhaven:${id}`)}
async function glb(src,out,{tex=512,simp=0,keepClips=null,stripMesh=false}={}){
 const doc=await io.read(src)
 if(keepClips)for(const a of doc.getRoot().listAnimations())if(!keepClips.includes(a.getName()))a.dispose()
 if(stripMesh){for(const n of doc.getRoot().listNodes())if(n.getMesh()){n.getMesh().dispose();n.setMesh(null);n.setSkin(null)}for(const m of doc.getRoot().listMaterials())m.dispose();for(const t of doc.getRoot().listTextures())t.dispose()}
 const ops=[dedup(),prune(),resample()]
 if(simp)ops.push(weld(),simplify({simplifier:MeshoptSimplifier,ratio:simp,error:0.02}))
 ops.push(textureCompress({encoder:sharp,targetFormat:'webp',resize:[tex,tex],quality:80}),meshopt({encoder:MeshoptEncoder,level:'medium'}))
 await doc.transform(...ops);await io.write(out,doc);log(out,src.split('/').slice(-1)[0])
}
const env={vintage_oil_lamp:{},wooden_bowl_01:{},wooden_bucket_01:{},wicker_basket_01:{},wicker_basket_02:{},wooden_stool_01:{},ceramic_pot:{},pot_enamel_01:{},wooden_broom:{},metal_tool_chest:{},industrial_wall_lamp:{},tree_stump_01:{simp:.3},fern_02:{},grass_medium_01:{simp:.4},shrub_01_lod:{simp:.25},island_tree_01_lod:{simp:.08,tex:1024},island_tree_02_lod:{simp:.08,tex:1024}}
for(const [id,o] of Object.entries(env))await glb(`${SRC}/models/${id}.glb`,`${OUT}/models/${id}.glb`,o)
for(const id of ['Superhero_Male_FullBody','Superhero_Female_FullBody','Hair_SimpleParted','Hair_Buns','Eyebrows_Regular','Eyebrows_Female'])await glb(`${SRC}/chars/${id}.glb`,`${OUT}/chars/${id}.glb`,{tex:512})
await glb(`${SRC}/chars/UAL1_Standard.glb`,`${OUT}/chars/UAL1_Runtime.glb`,{keepClips:['Idle_Loop','Walk_Loop','Crouch_Fwd_Loop','Crouch_Idle_Loop','Interact','Idle_Talking_Loop','Sitting_Idle_Loop','Sitting_Talking_Loop','Fixing_Kneeling','PickUp_Table','Push_Loop'],stripMesh:true})
writeFileSync(`${OUT}/runtime-assets.json`,JSON.stringify({generated:new Date().toISOString(),note:'Optimized runtime copies of R2 lookdev assets (CC0). LOOKDEV CANDIDATE / placeholder — not final art.',files:report},null,1))
console.log('total',(report.reduce((a,r)=>a+r.bytes,0)/1048576).toFixed(2),'MB')
