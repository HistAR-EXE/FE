type V3=[number,number,number]
/** Side view keeps the work surface between the camera and the opposite wall, rather than behind the torso. */
export function roomActionFrame(position:[number,number],heading:number,contact:V3,aspect:number):{camera:V3;look:V3}{
 const fw=[Math.sin(heading),Math.cos(heading)],side=aspect<1?.95:.8,back=aspect<1?.45:.8
 return {camera:[position[0]-fw[0]*back+fw[1]*side,Math.max(1.1,Math.min(1.5,contact[1]+.7)),position[1]-fw[1]*back-fw[0]*side],look:[contact[0],contact[1]+.1,contact[2]]}
}
export function showRoomActor(s:{portrait:boolean;firstPerson:boolean;contact:boolean;distance:number}):boolean{
 if(s.portrait&&s.contact)return false
 return s.contact?s.distance>.75:!s.firstPerson&&s.distance>=1.1
}
