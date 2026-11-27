type V3=[number,number,number]
/** Include the low writing surface as well as the standing organizer in the small meeting room. */
export function meetingFieldOfView(aspect:number):number{return aspect<1?95:85}
/** Frame both speakers from the side instead of placing the viewer behind the player's torso. */
export function conversationFrame(player:[number,number],speaker:V3,aspect:number):{camera:V3;look:V3}{
 const dx=speaker[0]-player[0],dz=speaker[2]-player[1],length=Math.hypot(dx,dz)||1
 const x=(player[0]+speaker[0])/2,z=(player[1]+speaker[2])/2,distance=aspect<1?2.8:1.7
 return {camera:[x-dz/length*distance,1.5,z+dx/length*distance],look:[x,Math.max(1,speaker[1]),z]}
}
/** Side view keeps the work surface between the camera and the opposite wall, rather than behind the torso. */
export function roomActionFrame(position:[number,number],heading:number,contact:V3,aspect:number,kitchen=false):{camera:V3;look:V3}{
 if(kitchen)return contact[2]<-2
  ?{camera:[-2,1.55,-.9],look:[.3,.4,-2.65]}
  :{camera:[-2.35,1.6,.1],look:[-1.3,.5,-1]}
 const fw=[Math.sin(heading),Math.cos(heading)],side=kitchen?1.4:aspect<1?.95:.8,back=kitchen?.15:aspect<1?.45:.8
 return {camera:[position[0]-fw[0]*back+fw[1]*side,Math.max(1.1,Math.min(1.5,contact[1]+.7)),position[1]-fw[1]*back-fw[0]*side],look:[contact[0],contact[1]+.1,contact[2]]}
}
export function kitchenFieldOfView(aspect:number,inspection:boolean,action:boolean):number{
 return inspection?95:action?(aspect<1?70:55):40
}
export function showRoomActor(s:{portrait:boolean;firstPerson:boolean;contact:boolean;distance:number}):boolean{
 if(s.portrait&&s.contact)return false
 return s.contact?s.distance>.75:!s.firstPerson&&s.distance>=1.1
}
