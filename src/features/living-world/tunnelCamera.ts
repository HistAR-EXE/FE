import type {Vector3} from 'three'

/** Keep the target and camera's near-plane footprint inside the existing carved volume. */
export function clampTunnelCamera(target:Vector3,camera:Vector3,anchor:Vector3,inside:(x:number,y:number,z:number)=>boolean){
 const direction=camera.clone().sub(target)
 const clear=(p:Vector3)=>inside(p.x,p.y,p.z)&&[[-.04,0,0],[.04,0,0],[0,-.04,0],[0,.04,0],[0,0,-.04],[0,0,.04]].every(([x,y,z])=>inside(p.x+x,p.y+y,p.z+z))
 // An offset shoulder target can leave the arched corridor before the camera itself hits a wall.
 if(!clear(target)){target.copy(anchor);camera.copy(target).add(direction)}
 const length=direction.length();if(length===0)return
 direction.normalize()
 let safe=0
 const point=target.clone()
 for(let k=.02;k<length+.02;k+=.02){const distance=Math.min(k,length);point.copy(target).addScaledVector(direction,distance);if(!clear(point))break;safe=distance}
 // Never force the old 25 cm minimum through a nearby wall, or extend a first-person orbit.
 camera.copy(target).addScaledVector(direction,safe===length?length:Math.max(0,safe-.02))
}
