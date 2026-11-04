import * as THREE from 'three'

/** Release renderer subscriptions as well as scene-owned resources. Cached GLTF CPU data stays reusable. */
export function disposeWorldScene(scene:THREE.Scene){
 const resources=new Set<{dispose:()=>void}>()
 scene.traverse(object=>{
  if(object instanceof THREE.Mesh){
   resources.add(object.geometry)
   for(const material of Array.isArray(object.material)?object.material:[object.material]){
    resources.add(material)
    for(const value of Object.values(material))if(value instanceof THREE.Texture)resources.add(value)
   }
  }
  if(object instanceof THREE.SkinnedMesh)resources.add(object.skeleton)
  if(object instanceof THREE.DirectionalLight||object instanceof THREE.SpotLight||object instanceof THREE.PointLight)resources.add(object.shadow)
 })
 for(const resource of resources)resource.dispose()
}
