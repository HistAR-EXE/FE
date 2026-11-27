import * as T from 'three'
/** Bend the elbow toward its pole; avoids the mirrored, raised-elbow solution. */
export function elbowPoint(shoulder:T.Vector3,direction:T.Vector3,pole:T.Vector3,length:number,angle:number){
 const axis=new T.Vector3().crossVectors(direction,pole)
 if(axis.lengthSq()<1e-8)axis.crossVectors(direction,new T.Vector3(0,0,1))
 if(axis.lengthSq()<1e-8)axis.set(1,0,0)
 return shoulder.clone().add(direction.clone().applyAxisAngle(axis.normalize(),angle).multiplyScalar(length))
}
