import * as T from 'three'
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js'
import type {Kit} from '../time-portal/tunnel3d/kit'

// Draw-call reduction for rigid, flat-coloured Lambert parts (G2 performance closeout).
// Each part's material colour is copied into a constant per-vertex colour, so the merged
// mesh shades exactly like the separate meshes it replaces (same Lambert model, same
// linear colour), but costs one draw instead of one per part. Only meshes that never move
// relative to `parent` may be merged: callers exclude anything animated, re-materialled,
// picked by identity or posed by IK.
const colourable=(o:T.Object3D):o is T.Mesh<T.BufferGeometry,T.MeshLambertMaterial>=>
 o instanceof T.Mesh&&!(o instanceof T.InstancedMesh)&&o.material instanceof T.MeshLambertMaterial&&!o.material.map&&!o.material.transparent&&!o.material.vertexColors&&!!o.geometry.attributes.normal

export function vertexColourMaterial(kit:Kit){return kit.memo('lw-vertex-colour-lambert',()=>new T.MeshLambertMaterial({vertexColors:true}))}

/** Merge the direct rigid mesh children of `parent` (in parent space). Returns the merged mesh or null. */
export function mergeRigidChildren(parent:T.Object3D,kit:Kit,exclude:readonly T.Object3D[]=[]){
 const parts=parent.children.filter(o=>colourable(o)&&!exclude.includes(o)) as T.Mesh<T.BufferGeometry,T.MeshLambertMaterial>[]
 if(parts.length<2)return null
 return replace(parent,parts,part=>{part.updateMatrix();return part.matrix},kit)
}

/** Merge rigid meshes anywhere below `root` into one root-space mesh (static scenery only). */
export function mergeStaticDescendants(root:T.Object3D,kit:Kit,accept:(mesh:T.Mesh)=>boolean){
 root.updateMatrixWorld(true)
 const inverse=root.matrixWorld.clone().invert(),parts:T.Mesh<T.BufferGeometry,T.MeshLambertMaterial>[]=[]
 root.traverse(o=>{if(o!==root&&colourable(o)&&accept(o))parts.push(o)})
 if(parts.length<2)return null
 return replace(root,parts,part=>new T.Matrix4().multiplyMatrices(inverse,part.matrixWorld),kit)
}

function replace(parent:T.Object3D,parts:T.Mesh<T.BufferGeometry,T.MeshLambertMaterial>[],matrixOf:(m:T.Mesh)=>T.Matrix4,kit:Kit){
 const colour=new T.Color()
 // Indexed and non-indexed parts (e.g. polyhedra) can be mixed: fall back to non-indexed for all.
 // Flat-shaded parts get baked face normals so the merged smooth material keeps their faceted look.
 const indexed=parts.every(p=>!!p.geometry.index&&!p.material.flatShading)
 const copies=parts.map(part=>{
  let g=new T.BufferGeometry();if(part.geometry.index)g.setIndex(part.geometry.index.clone())
  for(const name of ['position','normal'] as const)g.setAttribute(name,part.geometry.attributes[name].clone())
  g.applyMatrix4(matrixOf(part))
  if(!indexed&&g.index){const flat=g.toNonIndexed();g.dispose();g=flat}
  if(part.material.flatShading)g.computeVertexNormals()
  colour.copy(part.material.color)
  const count=g.attributes.position.count,colours=new Float32Array(count*3)
  for(let i=0;i<count;i++)colour.toArray(colours,i*3)
  g.setAttribute('color',new T.BufferAttribute(colours,3));return g
 })
 const merged=mergeGeometries(copies);copies.forEach(g=>g.dispose())
 if(!merged)return null
 const mesh=new T.Mesh(kit.track(merged),vertexColourMaterial(kit))
 mesh.castShadow=parts.some(p=>p.castShadow);mesh.receiveShadow=parts.some(p=>p.receiveShadow);mesh.name=parent.name?parent.name+'_MERGED':'LW_MERGED'
 parent.add(mesh);parts.forEach(p=>p.removeFromParent())
 return mesh
}
