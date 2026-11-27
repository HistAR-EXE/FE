import * as T from 'three'

/** Field lighting transition, applied after the shared village and before moon/station lights. */
export function configureMoonlitField(scene:T.Scene){
 // The analytic sky is geometry: assigning scene.background does not replace it.
 // Include WorldScene's base lights as well as the village's own daylight sources.
 scene.traverse(o=>{
  if((o as T.Object3D&{isSky?:boolean}).isSky)o.visible=false
  if(o instanceof T.DirectionalLight||o instanceof T.HemisphereLight){o.intensity=0;o.castShadow=false}
 })
 scene.background=new T.Color('#18242e')
 scene.fog=new T.FogExp2('#1d2b36',.022)
 // Retain neutral PMREM for the loaded PBR materials, at a night-readable level.
 scene.environmentIntensity=.18
}

/** Keep authored result meshes separate from the station's permanent pick proxy. */
export function completionReveal(id:string,objects:readonly T.Object3D[]){
 const update=(completed:readonly string[])=>{const visible=completed.includes(id);for(const object of objects)object.visible=visible}
 update([])
 return update
}
