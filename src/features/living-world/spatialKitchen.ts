import {smokeOrder} from './coreProofs'

/** Local selection only. The existing structured action remains authoritative. */
export function selectSmokeNode(path:readonly string[],node:string){
 if(!smokeOrder.includes(node))return {path:[...path],result:'INVALID' as const}
 const next=path.length>=smokeOrder.length?[node]:[...path,node]
 if(next.some((part,i)=>part!==smokeOrder[i]))return {path:[],result:'WRONG' as const}
 return {path:next,result:next.length===smokeOrder.length?'COMPLETE' as const:'SELECTED' as const}
}
export const kitchenNodes=[
 {id:'HEARTH',label:'Nguồn nhiệt',at:[1.5,-2.3]},
 {id:'CHANNEL',label:'Rãnh dẫn khói',at:[.45,-2.78]},
 {id:'DIFFUSION',label:'Khoang phân tán',at:[-1.9,-2.75]},
 {id:'COMMUNITY',label:'Bữa ăn cộng đồng',at:[-1.12,-.86]},
] as const
