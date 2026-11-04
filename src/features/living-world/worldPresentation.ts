export async function readWhileCurrent<T>(read:()=>Promise<T>,isCurrent:()=>boolean):Promise<T|null>{
 if(!isCurrent())return null
 const result=await read()
 return isCurrent()?result:null
}
export function canPresentMoment(moment:boolean,panel:string,talk:string|null,visibility:string){
 return moment&&panel==='WORLD'&&talk===null&&visibility==='visible'
}
