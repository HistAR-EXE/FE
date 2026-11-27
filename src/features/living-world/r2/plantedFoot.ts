import * as T from 'three'

/** Preserve a planted foot while the animation continues to move the hip and knee. */
export function plantFoot(hip:T.Object3D,knee:T.Object3D,foot:T.Object3D,target:T.Vector3,orientation:T.Quaternion):boolean {
 const start=hip.getWorldPosition(new T.Vector3()),joint=knee.getWorldPosition(new T.Vector3()),end=foot.getWorldPosition(new T.Vector3())
 const upper=start.distanceTo(joint),lower=joint.distanceTo(end),distance=start.distanceTo(target)
 if(distance<1e-6||upper<1e-6||lower<1e-6||distance>upper+lower+.001||distance<Math.abs(upper-lower))return false
 const direction=target.clone().sub(start).normalize(),pole=joint.clone().sub(start)
 pole.addScaledVector(direction,-pole.dot(direction))
 if(pole.lengthSq()<1e-8){pole.set(0,0,1);pole.addScaledVector(direction,-pole.dot(direction));if(pole.lengthSq()<1e-8)pole.set(1,0,0)}
 pole.normalize()
 const along=(upper*upper+distance*distance-lower*lower)/(2*distance)
 const bend=start.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,upper*upper-along*along)))
 const aim=(bone:T.Object3D,child:T.Object3D,point:T.Vector3)=>{
  const at=bone.getWorldPosition(new T.Vector3()),from=child.getWorldPosition(new T.Vector3()).sub(at).normalize(),to=point.clone().sub(at).normalize()
  const world=bone.getWorldQuaternion(new T.Quaternion()).premultiply(new T.Quaternion().setFromUnitVectors(from,to))
  bone.quaternion.copy(bone.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(world));bone.updateMatrixWorld(true)
 }
 aim(hip,knee,bend);aim(knee,foot,target)
 foot.quaternion.copy(foot.parent!.getWorldQuaternion(new T.Quaternion()).invert().multiply(orientation));foot.updateMatrixWorld(true)
 return true
}
