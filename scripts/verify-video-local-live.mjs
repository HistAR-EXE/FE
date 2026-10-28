import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const base='http://localhost:5173'
let ready=false
for(let i=0;i<90;i++){
 try{const r=await fetch(base+'/api/profile/me',{signal:AbortSignal.timeout(3000)});if(r.status===401){ready=true;break}}catch{}
 await new Promise(r=>setTimeout(r,1000))
}
assert.ok(ready,'Local backend did not become ready')
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'teacher-standard@histar.local',password:'B2BTest@2026!'})})
assert.equal(login.status,200)
const auth=(await login.json()).data
const response=await fetch(base+'/api/me/explore/videos',{headers:{Authorization:`Bearer ${auth.accessToken}`}})
const payload=await response.json()
assert.equal(response.status,200,JSON.stringify(payload))
assert.equal(payload.data.videos.length,7)
assert.ok(payload.data.videos.every(v=>v.xp===30&&!Object.hasOwn(v,'correctOption')))
assert.ok(payload.data.videos.every(v=>!v.id.includes('cedar')))
const range=await fetch(base+'/videos/cu-chi/tunnel-digging.mp4',{headers:{Range:'bytes=0-1023'}})
assert.equal(range.status,206)
await range.body?.cancel()
const browser=await chromium.launch({channel:'msedge',headless:true})
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
 await context.addInitScript(({auth})=>{
  const values={timelens_token:auth.accessToken,timelens_user_id:auth.userId,timelens_display_name:auth.displayName||'Giáo viên',timelens_role:auth.role||'TEACHER',timelens_tier:auth.tier||'FREE',timelens_email_verified:'1',timelens_mode:'online','timelens:product-tour-complete':'true',histar_consent_v1:JSON.stringify({analytics:false,camera:false,gps:false})}
  for(const[k,v]of Object.entries(values))if(v)localStorage.setItem(k,String(v))
 },{auth})
 const page=await context.newPage()
 await page.goto(base+'/explore#cu-chi-videos',{waitUntil:'domcontentloaded'})
 await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'})
 const library=page.locator('#cu-chi-videos')
 await library.locator('.ev-card').nth(6).waitFor({timeout:45000})
 assert.equal(await library.locator('.ev-card').count(),7)
 await library.locator('.ev-card').first().click()
 const video=library.locator('video')
 await page.waitForFunction(()=>document.querySelector('#cu-chi-videos video')?.controls, null, {timeout:30000})
 await video.evaluate(async v=>{v.muted=true;await v.play()})
 await page.waitForFunction(()=>{const v=document.querySelector('#cu-chi-videos video');return v&&v.currentTime>2},null,{timeout:30000})
 await video.evaluate(v=>v.pause())
 assert.equal(await library.getByRole('alert').count(),0)
 await library.screenshot({path:'../docs/explore-videos/local-live.png'})
 await writeFile('../docs/explore-videos/local-live-verification.json',JSON.stringify({apiStatus:response.status,videoCount:payload.data.videos.length,rangeStatus:range.status,realBackend:true,apiMocking:false,browserPlayback:true,port:18080,verifiedAt:new Date().toISOString()},null,2))
 console.log('PASS: live backend 18080 via frontend5173;7videos;HTTP206;real Edge playback;no API mocks')
}finally{await browser.close()}
