// G2 closeout benchmark: same method as scripts/living-world-benchmark.mjs + s2-performance.mjs
// (headless Chromium, 10Mbps/50ms, cache disabled), split into first-usable / 3D-ready / network / FPS.
// Usage (from FE/): node scripts/g2-closeout-benchmark.mjs <outDir> <label> [runs] [fpsMs] [fontDelayMs]
import {chromium} from '@playwright/test'
import {spawn} from 'node:child_process'
import {writeFileSync} from 'node:fs'
const [,,outDir,label,runsArg='5',fpsArg='60000',fontDelayArg='-1']=process.argv
const RUNS=Number(runsArg),FPS_MS=Number(fpsArg),FONT_DELAY=Number(fontDelayArg)
const PORT=5196,BASE=`http://127.0.0.1:${PORT}`
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',outDir,'--host','127.0.0.1','--port',String(PORT),'--strictPort'],{env:{...process.env,HISTAR_LOCAL_API_TARGET:process.env.API||'http://127.0.0.1:8089'},stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
let browser
const result={label,build:outDir,date:new Date().toISOString(),method:(process.env.LW_BENCH_GPU==='real'?'headed Google Chrome channel':'headless Chromium shell')+' (Playwright '+(await import('@playwright/test/package.json',{with:{type:'json'}})).default.version+')'+(process.env.LW_BENCH_GPU==='real'?' hardware GPU flags':' SwiftShader')+', viewport1365x900, CDP 10Mbps/50ms, cache disabled, no video recording',fontScenario:FONT_DELAY<0?'external fonts unreachable (egress refuses fonts.googleapis.com in this sandbox) — fail fast':`external font CSS answered after ${FONT_DELAY}ms (simulated slow third-party)`,cold:[],fps:{}}
async function newPage(){
 const ctx=await browser.newContext({viewport:{width:1365,height:900},serviceWorkers:'block'})
 const page=await ctx.newPage(),cdp=await ctx.newCDPSession(page)
 await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:50,downloadThroughput:1250000,uploadThroughput:1250000})
 if(FONT_DELAY>=0)await ctx.route(/fonts\.(googleapis|gstatic)\.com/,async r=>{await sleep(FONT_DELAY);await r.fulfill({status:200,contentType:'text/css',body:'/* simulated */'})})
 return {ctx,page}
}
async function enterS2(page){await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click();const t=performance.now();await page.getByLabel('Cách khám phá').selectOption('FREE');await page.locator('canvas[data-s2-assets]').waitFor();return performance.now()-t}
async function fps(page,ms){
 let driving=true
 const m=page.evaluate(async ms=>{const times=[],start=performance.now();let last=start,hiddenFrames=0,unfocusedFrames=0;await new Promise(res=>{const tick=now=>{if(document.visibilityState!=='visible')hiddenFrames++;if(!document.hasFocus())unfocusedFrames++;times.push(now-last);last=now;if(now-start>=ms)res();else requestAnimationFrame(tick)};requestAnimationFrame(tick)});const s=[...times].sort((a,b)=>a-b),fps=times.map(t=>1000/Math.max(.01,t)).sort((a,b)=>a-b);const c=document.querySelector('canvas');return{durationMs:performance.now()-start,samples:times.length,hiddenFrames,unfocusedFrames,validWindow:hiddenFrames===0&&!times.some(t=>t>900),p10Fps:fps[Math.floor(fps.length*.1)],medianFps:fps[Math.floor(fps.length*.5)],p50FrameMs:s[Math.floor(s.length*.5)],p90FrameMs:s[Math.floor(s.length*.9)],p99FrameMs:s[Math.floor(s.length*.99)],heapBytes:performance.memory?.usedJSHeapSize??null,canvasCount:document.querySelectorAll('canvas').length,render:c?.dataset.s2Render?JSON.parse(c.dataset.s2Render):null,assets:c?.dataset.s2Assets?JSON.parse(c.dataset.s2Assets):null}},ms).finally(()=>{driving=false})
 while(driving){await page.getByRole('heading',{level:1}).click().catch(()=>{});await page.keyboard.press('d');const box=await page.locator('.lw-canvas').boundingBox();if(box){await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.52,{steps:8});await page.mouse.up()}await sleep(2000)}
 return m
}
try{
 for(let i=0;i<120;i++){try{if((await fetch(BASE)).ok)break}catch{}await sleep(500)}
 browser=await chromium.launch(process.env.LW_BENCH_GPU==='real'?{channel:'chrome',headless:false,args:['--ignore-gpu-blocklist']}:{...(process.env.CHROME_EXE?{executablePath:process.env.CHROME_EXE}:{}),headless:true,args:['--enable-unsafe-swiftshader']})
 for(let r=0;r<RUNS;r++){
  const {ctx,page}=await newPage()
  const t0=performance.now();await page.goto(`${BASE}/living-world?debug=1`,{waitUntil:'commit'})
  await page.getByRole('heading',{name:'Trạm thời gian',exact:true}).waitFor();const firstUsableMs=performance.now()-t0
  await page.locator('.lw-canvas canvas').waitFor();const s0CanvasMs=performance.now()-t0
  const nav=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0],res=performance.getEntriesByType('resource');const paint=Object.fromEntries(performance.getEntriesByType('paint').map(p=>[p.name,Math.round(p.startTime)]));return{domContentLoaded:Math.round(n.domContentLoadedEventEnd),paint,resourceCount:res.length,encodedBytes:res.reduce((a,r)=>a+(r.encodedBodySize||0),0),transferBytes:res.reduce((a,r)=>a+(r.transferSize||0),0),external:res.filter(r=>!r.name.startsWith(location.origin)).map(r=>({name:r.name.slice(0,70),start:Math.round(r.startTime),end:Math.round(r.responseEnd)})),slowest:[...res].sort((a,b)=>b.responseEnd-a.responseEnd).slice(0,4).map(r=>({name:r.name.replace(location.origin,'').slice(0,60),start:Math.round(r.startTime),end:Math.round(r.responseEnd),bytes:r.encodedBodySize}))}})
  const s2ReadyMs=await enterS2(page)
  const s2Net=await page.evaluate(()=>{const res=performance.getEntriesByType('resource');return{resourceCount:res.length,encodedBytes:res.reduce((a,r)=>a+(r.encodedBodySize||0),0),transferBytes:res.reduce((a,r)=>a+(r.transferSize||0),0),s2Chunks:res.filter(r=>/s2Environment|worldSceneResources|WorldScene|three\.module/.test(r.name)).map(r=>({name:r.name.replace(location.origin,''),bytes:r.encodedBodySize}))}})
  result.cold.push({run:r+1,firstUsableMs:Math.round(firstUsableMs),s0CanvasMs:Math.round(s0CanvasMs),s2ThreeDReadyAfterEnterMs:Math.round(s2ReadyMs),nav,afterS2:s2Net})
  console.log(label,'cold',r+1,Math.round(firstUsableMs),Math.round(s0CanvasMs),Math.round(s2ReadyMs))
  if(r===RUNS-1&&FPS_MS>0){
   result.fps.S2=await fps(page,FPS_MS);console.log(label,'S2 fps',JSON.stringify(result.fps.S2).slice(0,200))
   await page.getByLabel('Cách khám phá').selectOption('STORY');await page.locator('.lw-canvas canvas').waitFor();await sleep(1500)
   result.fps.S0=await fps(page,FPS_MS);console.log(label,'S0 fps',JSON.stringify(result.fps.S0).slice(0,200))
   const gpu=await page.locator('canvas').first().evaluate(c=>{const gl=c.getContext('webgl2')??c.getContext('webgl'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'not exposed'});result.gpu=gpu
  }
  await ctx.close()
 }
 const med=k=>{const v=result.cold.map(c=>c[k]).sort((a,b)=>a-b);return{min:v[0],median:v[Math.floor(v.length/2)],max:v[v.length-1]}}
 result.summary={firstUsableMs:med('firstUsableMs'),s0CanvasMs:med('s0CanvasMs'),s2ThreeDReadyAfterEnterMs:med('s2ThreeDReadyAfterEnterMs'),S2p10Fps:result.fps.S2?.p10Fps,S2medianFps:result.fps.S2?.medianFps,S0p10Fps:result.fps.S0?.p10Fps}
 writeFileSync(process.env.LW_BENCH_OUTPUT||`test-results/${label}.json`,JSON.stringify(result,null,1));console.log(JSON.stringify(result.summary))
}finally{await browser?.close();server.kill()}
