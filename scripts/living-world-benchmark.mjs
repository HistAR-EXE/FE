import { chromium } from '@playwright/test'
import {spawn} from 'node:child_process'
import {writeFileSync} from 'node:fs'
const production=process.env.LW_BENCH_MODE==='production'
const output=process.env.LW_BENCH_OUTPUT||`../docs/superpowers/g2/2026-11-01-living-world/evidence/${production?'production-probe':'desktop-benchmark'}.json`
const args=['node_modules/vite/bin/vite.js',...(production?['preview','--outDir','../.superpowers/living-world-g2-demo']:[]),'--host','127.0.0.1','--port','5196','--strictPort']
const server=spawn(process.execPath,args,{env:{...process.env,VITE_LIVING_WORLD_INTERNAL:'true'},stdio:'ignore',windowsHide:true})
let browser
try{
 for(let i=0;i<120;i++){try{if((await fetch('http://127.0.0.1:5196')).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']})
 const page=await browser.newPage({viewport:{width:1365,height:900}}),cdp=await page.context().newCDPSession(page)
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:50,downloadThroughput:1250000,uploadThroughput:1250000})
 const started=performance.now();await page.goto('http://127.0.0.1:5196/living-world?debug=1',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Trạm thời gian',exact:true}).waitFor();const previewMs=performance.now()-started
 await page.locator('.lw-canvas canvas').waitFor();const canvasReadyMs=performance.now()-started
 await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click()
 const snapshots=[]
 for(let i=0;i<5;i++){
  await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp trên',exact:true}).click();await page.getByRole('button',{name:'Góc lao động · một bữa ăn bắt đầu ở đây',exact:true}).click();await page.getByRole('button',{name:'Hơi thở của lòng đất',exact:true}).click()
  snapshots.push(await page.evaluate(()=>({canvases:document.querySelectorAll('canvas').length,heapBytes:performance.memory?.usedJSHeapSize??null})))
 }
 const duration=Number(process.env.LW_BENCH_MS??600000)
 console.log(`Desktop benchmark running ${duration}ms; this is NOT an Android qualification.`)
 await page.locator('.lw-canvas').scrollIntoViewIfNeeded()
 let driving=true
 const measurement=page.evaluate(async duration=>{
  const times=[],start=performance.now();let last=start
  await new Promise(resolve=>{const frame=now=>{if(document.visibilityState==='visible')times.push(now-last);last=now;if(now-start>=duration)resolve();else requestAnimationFrame(frame)};requestAnimationFrame(frame)})
  const fps=times.map(ms=>1000/Math.max(0.01,ms)).sort((a,b)=>a-b)
  return {durationMs:performance.now()-start,samples:times.length,p10Fps:fps[Math.floor(fps.length*.1)],medianFps:fps[Math.floor(fps.length*.5)],heapBytes:performance.memory?.usedJSHeapSize??null,userAgent:navigator.userAgent,resources:performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize}))}
 },duration).finally(()=>{driving=false})
 const driver=(async()=>{let i=0;while(driving){
  await page.getByRole('heading',{level:1}).click();await page.keyboard.press(['w','a','s','d'][i++%4])
  const box=await page.locator('.lw-canvas').boundingBox();if(box){await page.mouse.move(box.x+box.width*.45,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.55,box.y+box.height*.55,{steps:8});await page.mouse.up()}
  await new Promise(r=>setTimeout(r,2000))
 }})()
 const result=await measurement;await driver
 writeFileSync(output,JSON.stringify({scope:`Desktop headless Chromium software renderer / ${production?'minified internal build':'Vite development build'}. Diagnostic only; NOT Android 30FPS/heat qualification.`,interaction:'Five zone cycles then repeated WASD and real Playwright pointer camera drag approximately every 2s',network:'10Mbps throughput;50ms latency;cache disabled',previewMs,canvasReadyMs,fiveCycles:snapshots,...result},null,2))
 console.log(JSON.stringify({previewMs,canvasReadyMs,p10Fps:result.p10Fps,durationMs:result.durationMs}))
}finally{await browser?.close();server.kill()}
