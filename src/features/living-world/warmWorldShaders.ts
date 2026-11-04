import type {Camera,Scene,WebGLRenderer} from 'three'

/** Cancellable counterpart of the installed Three renderer's compileAsync polling.
 * Its timer dereferences disposed material properties after a scene switch. Stop polling before cleanup.
 * Keep renderer reuse and immediate controls/DOM cleanup; never postpone disposal of an old scene.
 */
export async function warmWorldShaders(renderer:Pick<WebGLRenderer,'compile'|'properties'>,scene:Scene,camera:Camera,cancelled:()=>boolean){
 if(cancelled())return
 const materials=renderer.compile(scene,camera)
 const programs=[...materials].flatMap(material=>{
  const properties=renderer.properties.get(material) as {currentProgram?:{isReady:()=>boolean}}
  return properties.currentProgram?[properties.currentProgram]:[]
 })
 await new Promise<void>(resolve=>{
  const check=()=>{
   if(cancelled()){resolve();return}
   if(programs.every(program=>program.isReady())){resolve();return}
   setTimeout(check,10)
  }
  check()
 })
}
