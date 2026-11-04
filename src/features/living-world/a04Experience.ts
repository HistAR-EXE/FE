// Presentation choreography only. Rice checkpoint and all rewards remain owned by existing contracts.
export type A04Phase='IDLE'|'DEMO'|'READY'|'HELD'|'RAISED'|'COMPARE'|'STORY'
export function stepA04(phase:A04Phase,action:string):{phase:A04Phase;stroke:boolean}{
 if(action==='LEAVE')return{phase:'IDLE',stroke:false}
 if(action==='DEMO')return{phase:'DEMO',stroke:false}
 if(action==='READY')return{phase:'READY',stroke:false}
 if(action==='COMPARE')return{phase:'COMPARE',stroke:false}
 if(action==='STORY')return{phase:'STORY',stroke:false}
 if(action==='GRIP'&&phase==='READY')return{phase:'HELD',stroke:false}
 if(action==='LIFT'&&phase==='HELD')return{phase:'RAISED',stroke:false}
 if(action==='RELEASE'&&phase==='RAISED')return{phase:'READY',stroke:true}
 return{phase,stroke:false}
}
