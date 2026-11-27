import {Vector3,type PerspectiveCamera} from 'three'
import type {OrbitControls} from 'three/addons/controls/OrbitControls.js'
type Controls=Pick<OrbitControls,'target'|'minDistance'|'maxDistance'|'minPolarAngle'|'maxPolarAngle'|'minAzimuthAngle'|'maxAzimuthAngle'|'enableDamping'|'enabled'|'update'>
type View={zoom:number;command:number}
/** Owns a temporary inspection camera; turntable yaw is applied to the model, not the room. */
export function createModelViewerCamera(camera:PerspectiveCamera,controls:Controls){
 let saved:{position:Vector3;target:Vector3;fov:number;limits:number[];damping:boolean;enabled:boolean}|null=null,lastCommand=-1,lastAspect=0
 const pose=(position:Vector3,target:Vector3)=>{
  // Flush any old OrbitControls damping before assigning an exact pose.
  controls.enableDamping=false;controls.update();camera.position.copy(position);controls.target.copy(target);controls.update()
 }
 return {update(view:View|null,aspect:number){
  if(view){
   if(!saved){saved={position:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,limits:[controls.minDistance,controls.maxDistance,controls.minPolarAngle,controls.maxPolarAngle,controls.minAzimuthAngle,controls.maxAzimuthAngle],damping:controls.enableDamping,enabled:controls.enabled};lastCommand=-1}
   controls.enabled=true;controls.enableDamping=false;controls.minDistance=1;controls.maxDistance=2.2;controls.minPolarAngle=1.15;controls.maxPolarAngle=1.55;controls.minAzimuthAngle=-.65;controls.maxAzimuthAngle=.65
   if(view.command!==lastCommand){
    const zoom=Number.isFinite(view.zoom)?Math.max(.75,Math.min(1.5,view.zoom)):1,target=new Vector3(0,1.1,-.8)
    pose(target.clone().add(new Vector3(0,.45,1.8).divideScalar(zoom)),target);lastCommand=view.command
   }
   if(aspect!==lastAspect||camera.fov!==(aspect<1?100:70)){camera.fov=aspect<1?100:70;camera.updateProjectionMatrix();lastAspect=aspect}
  }else if(saved){
   const previous=saved;saved=null;lastCommand=-1;lastAspect=0
   ;[controls.minDistance,controls.maxDistance,controls.minPolarAngle,controls.maxPolarAngle,controls.minAzimuthAngle,controls.maxAzimuthAngle]=previous.limits
   pose(previous.position,previous.target);camera.fov=previous.fov;camera.updateProjectionMatrix();camera.lookAt(previous.target);controls.enableDamping=previous.damping;controls.enabled=previous.enabled
  }
 }}
}
