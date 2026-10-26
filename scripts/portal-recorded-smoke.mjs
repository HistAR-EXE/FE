import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
const origin='http://127.0.0.1:5196'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5196','--strictPort'],{stdio:'ignore'})
let browser
try {
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,300))}
 browser=await chromium.launch({channel:'msedge',headless:true})
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 await page.addInitScript(()=>{
  localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false}))
  for(const [k,v] of Object.entries({timelens_token:'test',timelens_user_id:'test',timelens_display_name:'Test',timelens_email_verified:'1'}))localStorage.setItem(k,v)
  // Simulate a teammate machine with no system/browser Vietnamese speech support.
  Object.defineProperty(window,'speechSynthesis',{value:undefined,configurable:true})
  Object.defineProperty(window,'SpeechSynthesisUtterance',{value:undefined,configurable:true})
  window.__portalClips=[]
  const NativeAudio=window.Audio
  window.Audio=function(src){const a=new NativeAudio(src);if(String(src).includes('/narration-v1/'))window.__portalClips.push(a);else window.__portalMusic=a;return a}
 })
 await page.route('**://*/api/**',r=>r.fulfill({json:{success:true,data:new URL(r.request().url()).pathname==='/api/profile/me'?{id:'test',displayName:'Test',email:'test@example.test',emailVerified:true,role:'USER',tier:'PREMIUM',activeVisitSites:[]}:[]}}))
 await page.goto(origin+'/time-portal/dia-dao-cu-chi',{waitUntil:'domcontentloaded'})
 await page.getByRole('heading',{name:'Cổng Thời Gian',exact:true}).click()
 await page.waitForFunction(()=>window.__portalClips.at(-1)?.currentTime>.1&&!window.__portalClips.at(-1).paused)
 assert.ok(await page.evaluate(()=>window.__portalClips.at(-1).duration>5))
 await page.waitForFunction(()=>window.__portalMusic.currentTime>.1&&window.__portalMusic.volume<.09)
 const before=await page.evaluate(()=>window.__portalClips.length)
 await page.getByRole('tab',{name:'Khoảnh khắc 2',exact:true}).click()
 await page.waitForFunction(n=>window.__portalClips.length>n,before)
 await page.waitForFunction(()=>window.__portalClips.at(-1).currentTime>.1)
 assert.ok(await page.evaluate(()=>window.__portalClips.slice(0,-1).every(a=>a.paused)))
 await page.getByRole('button',{name:'Xem ảnh lớn',exact:false}).last().click()
 await page.waitForFunction(()=>window.__portalClips.at(-1).paused&&window.__portalMusic.paused)
 await page.getByRole('button',{name:'Đóng',exact:true}).click()
 await page.waitForFunction(()=>!window.__portalClips.at(-1).paused)
 await page.goto(origin+'/about',{waitUntil:'domcontentloaded'})
 assert.ok(await page.evaluate(()=>window.__portalClips.every(a=>a.paused)))
 console.log('PASS: real Vietnamese MP3 decodes/plays with speechSynthesis unavailable; music duck, segment switch, pause/resume and cleanup')
}finally{await browser?.close();server.kill()}
