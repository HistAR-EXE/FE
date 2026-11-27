import type {Camera,Material,Scene,WebGLRenderer} from 'three'
import {Mesh,MeshPhysicalMaterial,WebGLRenderTarget} from 'three'

type WarmupRenderer=Pick<WebGLRenderer,'compile'|'properties'>&Partial<Pick<WebGLRenderer,'getRenderTarget'|'setRenderTarget'|'getActiveCubeFace'|'getActiveMipmapLevel'>>
type Program={isReady:()=>boolean;getUniforms?:()=>unknown}

/** Cancellable counterpart of the installed Three renderer's compileAsync polling.
 * Its timer dereferences disposed material properties after a scene switch. Stop polling before cleanup.
 * Keep renderer reuse and immediate controls/DOM cleanup; never postpone disposal of an old scene.
 */
export async function warmWorldShaders(renderer:WarmupRenderer,scene:Scene,camera:Camera,cancelled:()=>boolean){
 if(cancelled())return
 const materials=renderer.compile(scene,camera)
 if(cancelled())return
 let programs=collectPrograms(renderer,materials)
 await waitForPrograms(programs,cancelled)
 if(cancelled())return
 let transmission=false
 scene.traverseVisible?.(object=>{if(object instanceof Mesh&&(Array.isArray(object.material)?object.material:[object.material]).some(m=>m instanceof MeshPhysicalMaterial&&m.transmission>0))transmission=true})
 const getTarget=renderer.getRenderTarget?.bind(renderer),setTarget=renderer.setRenderTarget?.bind(renderer)
 if(transmission&&getTarget&&setTarget&&getTarget()===null){
  // Glass renders opaque scenery again into a linear intermediate target. Prepare
  // those variants too; compiling only for the canvas misses that entire pass.
  // Keep global outputColorSpace unchanged: Three includes it separately in the
  // cache key. Wait above before binding a target to avoid flushing pending links.
  const face=renderer.getActiveCubeFace?.()??0,mip=renderer.getActiveMipmapLevel?.()??0
  const target=new WebGLRenderTarget(1,1,{depthBuffer:false,stencilBuffer:false})
  try{setTarget(target);if(!cancelled())for(const material of renderer.compile(scene,camera))materials.add(material)}
  finally{setTarget(null,face,mip);target.dispose()}
  if(cancelled())return
  programs=collectPrograms(renderer,materials)
  await waitForPrograms(programs,cancelled)
 }
 // Three initializes uniforms/attributes lazily on the first render. Doing every
 // program in that single frame can block input for seconds on integrated GPUs.
 // Prime each cache in its own task, checking cancellation before touching it.
 for(const program of programs){
  if(cancelled())return
  if(program.getUniforms){program.getUniforms();await new Promise<void>(resolve=>setTimeout(resolve,0))}
 }
}

function collectPrograms(renderer:WarmupRenderer,materials:Iterable<Material>){
 // A shared material can compile several geometry/skin/side variants. currentProgram
 // is only the last one; rendering earlier variants before linking finishes stalls GL.
 return new Set([...materials].flatMap(material=>{
  const properties=renderer.properties.get(material) as {currentProgram?:Program;programs?:Map<string,Program>}
  return [...(properties.programs?.values()??[]),...(properties.currentProgram?[properties.currentProgram]:[])]
 }))
}

function waitForPrograms(programs:Set<Program>,cancelled:()=>boolean){
 const pending=[...programs]
 return new Promise<void>(resolve=>{
  const check=()=>{
   if(cancelled()){resolve();return}
   if(pending.every(program=>program.isReady())){resolve();return}
   setTimeout(check,10)
  }
  check()
 })
}
