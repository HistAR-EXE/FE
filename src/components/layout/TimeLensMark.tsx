import {useState} from 'react'

/** Keep the existing home link legible when its optional CDN image is unavailable. */
export function TimeLensMark(){
 const [failed,setFailed]=useState(false)
 if(failed)return <svg data-testid="timelens-brand-fallback" className="h-10 w-8 shrink-0 text-[#0275FB]" viewBox="0 0 40 48" aria-hidden="true"><rect x="2" y="6" width="36" height="36" rx="12" fill="currentColor" fillOpacity=".1"/><circle cx="20" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M20 15V24L26 28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><circle cx="30" cy="13" r="3.5" fill="#dfbd81"/></svg>
 return <img src="/brand/icon-192.png" alt="" className="h-10 w-8 shrink-0 object-contain" onError={()=>setFailed(true)}/>
}
