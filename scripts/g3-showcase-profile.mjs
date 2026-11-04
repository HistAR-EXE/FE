import {chromium} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {spawn} from 'node:child_process'
const out=path.resolve(process.argv[2]),base=process.argv[3]??'http://127.0.0.1:5398'
mkdirSync(out,{recursive:true})
const server=process.argv[4]?spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',process.argv[4],'--host','127.0.0.1','--port',new URL(base).port,'--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8094'}}):null
if(server)for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,300))}
const browser=await chromium.launch({channel:'chrome',headless:false,args:['--ignore-gpu-blocklist']})
try{
 const context=await browser.newContext({viewport:{width:1365,height:900},serviceWorkers:'block'})
 const page=await context.newPage(),cdp=await context.newCDPSession(page)
 await cdp.send('Profiler.enable');await cdp.send('Profiler.start')
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true})
 await cdp.send('Tracing.start',{categories:'devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline',transferMode:'ReturnAsStream'})
 await page.addInitScript(()=>{window.__longTasks=[];new PerformanceObserver(list=>window.__longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration,name:e.name})))).observe({type:'longtask',buffered:true})})
 const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base+'/living-world');const consent=page.getByTestId('consent-decline');if(await consent.count())await consent.click()
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000})
 const frames=page.evaluate(()=>new Promise(resolve=>{const values=[],end=performance.now()+10000;let last=performance.now();const tick=t=>{values.push({at:t,ms:t-last});last=t;if(t<end)requestAnimationFrame(tick);else resolve(values)};requestAnimationFrame(tick)}))
 await page.locator('canvas').focus();for(const k of ['w','a','s','d']){await page.keyboard.down(k);await page.waitForTimeout(2200);await page.keyboard.up(k)}
 const result={base,scope:'Cold S0 CPU trace and ten-second hardware GPU walk sample; unthrottled network',frames:await frames,longTasks:await page.evaluate(()=>window.__longTasks),marks:await page.evaluate(()=>performance.getEntriesByType('mark').map(m=>({name:m.name,start:m.startTime}))),errors,canvas:await page.locator('canvas').evaluate(c=>({...c.dataset})),browser:browser.version()}
 result.build=process.argv[4]??'external server';result.buildSHA256=process.env.LW_PROFILE_BUILD_SHA256??'see build manifest';result.capturedAt=new Date().toISOString()
 result.gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'})
 const {profile}=await cdp.send('Profiler.stop');writeFileSync(path.join(out,'cpu-profile.json'),JSON.stringify(profile))
 await page.screenshot({path:path.join(out,'S0-avatar.png')})
 const completed=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));await cdp.send('Tracing.end');const {stream}=await completed
 let trace='';for(;;){const r=await cdp.send('IO.read',{handle:stream});trace+=r.data;if(r.eof)break}await cdp.send('IO.close',{handle:stream})
 writeFileSync(path.join(out,'trace.json'),trace);writeFileSync(path.join(out,'profile.json'),JSON.stringify(result,null,2))
 console.log(JSON.stringify({errors,longTasks:result.longTasks,worstMs:Math.max(...result.frames.map(f=>f.ms))}))
}finally{await browser.close();server?.kill()}
