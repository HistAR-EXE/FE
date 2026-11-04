// G3 Immersive Checkpoint benchmark — DEFAULT route (/living-world, no debug tabs), R2 runtime.
// Measures per zone (S0 → S1 → S2 → L1-B tunnel): first-load bytes (JS/CSS/HTML before S0 is usable), R2 asset bytes streamed
// for that zone (canvas data-r2-zone, Resource Timing), prepare time, and frame times while the Avatar walks.
// v2 (G3 QA BENCH-CONTRACT): adds first-interactive (preview canvas + Menu actually opens + first movement), frame p99,
// JS heap (CDP, after GC) and renderer.info memory before/after >=5 zone cycles, deep zones L1-D/L2-A/L3-A, and a
// provenance block (build file hashes, git revision, browser, GPU, network). Exit code 0 is NOT a gate PASS: compare
// the JSON against the Baseline thresholds (first usable <=3 s @10 Mbps; 3D-ready reported separately).
// Usage (from FE/): node scripts/g3-immersive-benchmark.mjs <buildDir> <label> [runs] [fpsMs]
//   LW_BENCH_GPU=real → headed Google Chrome with the machine's GPU; otherwise headless SwiftShader (not a GPU figure).
//   LW_BENCH_NET=throttled → CDP 10 Mbps / 50 ms, cache disabled (default: unthrottled, cache disabled).
import {chromium} from '@playwright/test'
import {spawn} from 'node:child_process'
import {writeFileSync,readFileSync,readdirSync,statSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {join} from 'node:path'
const [,,buildDir='../.superpowers/living-world-g3-immersive',label='immersive',runsArg='3',fpsArg='15000']=process.argv
const RUNS=Number(runsArg),FPS_MS=Number(fpsArg),PORT=5197,BASE=`http://127.0.0.1:${PORT}`,real=process.env.LW_BENCH_GPU==='real'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',buildDir,'--host','127.0.0.1','--port',String(PORT),'--strictPort'],{env:{...process.env,HISTAR_LOCAL_API_TARGET:process.env.API||'http://127.0.0.1:8089'},stdio:'ignore'})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const result={label,build:buildDir,date:new Date().toISOString(),method:(real?'headed Chrome, hardware GPU':'headless Chromium, SwiftShader (CPU — not a GPU figure)')+`, viewport 1365x900, network ${process.env.LW_BENCH_NET==='throttled'?'10Mbps/50ms':'unthrottled'}, cache disabled`,runs:[]}
let browser
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex')
const walk=d=>readdirSync(d).flatMap(n=>{const f=join(d,n);return statSync(f).isDirectory()?walk(f):[f]})
const git=(cwd)=>{try{return execFileSync('git',['rev-parse','HEAD'],{cwd}).toString().trim()+(execFileSync('git',['status','--porcelain'],{cwd}).toString().trim()?' (+uncommitted changes)':'')}catch{return 'unavailable'}}
try{const files=walk(buildDir).filter(f=>/\.(html|js|css)$/.test(f));result.provenance={feGit:git('.'),beGit:git('../BE'),buildIndexSha256:sha(join(buildDir,'index.html')),buildCodeFiles:files.length,buildCodeSha256:createHash('sha256').update(files.sort().map(sha).join('')).digest('hex'),node:process.version,api:process.env.API||'http://127.0.0.1:8089'}}catch(e){result.provenance={error:String(e)}}
const heap=async cdp=>{try{await cdp.send('HeapProfiler.collectGarbage')}catch{/* optional */}const {metrics}=await cdp.send('Performance.getMetrics');const m=Object.fromEntries(metrics.map(x=>[x.name,x.value]));return{jsHeapUsed:m.JSHeapUsedSize,jsHeapTotal:m.JSHeapTotalSize,nodes:m.Nodes,listeners:m.JSEventListeners}}
const zoneStat=page=>page.evaluate(()=>({...JSON.parse(document.querySelector('.lw-canvas canvas')?.dataset.r2Zone||'null'),resourceScope:'Cumulative observed resources through this zone; includes prefetch; deduplicate URL before summing',resources:performance.getEntriesByType('resource').filter(e=>/\.(glb|webp|ktx2|bin)(\?|$)/.test(e.name)).map(e=>({url:e.name,encodedBytes:e.encodedBodySize,transferBytes:e.transferSize,startTime:e.startTime,duration:e.duration}))}))
const render=page=>page.evaluate(()=>{const c=document.querySelector('.lw-canvas canvas');return JSON.parse(c?.dataset.zoneRender||c?.dataset.s2Render||'null')})
async function frames(page,ms,keys){
 await page.locator('.lw-canvas canvas').focus()
 const m=page.evaluate(async ms=>{const t=[];let last=performance.now();const end=last+ms;await new Promise(res=>{const tick=now=>{t.push(now-last);last=now;if(now<end)requestAnimationFrame(tick);else res()};requestAnimationFrame(tick)});t.sort((a,b)=>a-b);const avg=t.reduce((a,b)=>a+b,0)/t.length;return{frames:t.length,avgMs:+avg.toFixed(2),fps:+(1000/avg).toFixed(1),p10Fps:+(1000/t[Math.floor(t.length*.9)]).toFixed(1),p95Ms:+t[Math.floor(t.length*.95)].toFixed(2),p99Ms:+t[Math.min(t.length-1,Math.floor(t.length*.99))].toFixed(2),worstMs:+t[t.length-1].toFixed(2)}},ms)
 for(const k of keys){await page.keyboard.down(k);await sleep(ms/keys.length);await page.keyboard.up(k)}
 return m
}
const waitZone=async(page,zone)=>{await page.waitForFunction(z=>JSON.parse(document.querySelector('.lw-canvas canvas')?.dataset.r2Zone||'{}').zone===z,zone,{timeout:600000});await sleep(1500)}
try{
 for(let i=0;i<60;i++){try{if((await fetch(BASE)).ok)break}catch{/* server starting */}await sleep(500)}
 browser=await chromium.launch(real?{channel:'chrome',headless:false,args:['--ignore-gpu-blocklist']}:{...(process.env.CHROME_EXE?{executablePath:process.env.CHROME_EXE}:{}),headless:true,args:['--enable-unsafe-swiftshader']})
 for(let r=0;r<RUNS;r++){let current={run:r+1,phase:'start'},ctxRef=null;try{
  const ctx=await browser.newContext({viewport:{width:1365,height:900},serviceWorkers:'block'}),page=await ctx.newPage(),cdp=await ctx.newCDPSession(page)
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true})
  if(process.env.LW_BENCH_NET==='throttled')await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:50,downloadThroughput:1250000,uploadThroughput:1250000})
  ctxRef=ctx;await page.addInitScript(()=>performance.setResourceTimingBufferSize(20000));const errors=current.pageErrors=[];page.on('pageerror',e=>errors.push(e.message));await cdp.send('Performance.enable')
  const t0=Date.now();await page.goto(`${BASE}/living-world`)
  if(await page.getByTestId('consent-decline').isVisible().catch(()=>false))await page.getByTestId('consent-decline').click()
  await page.getByRole('heading',{level:1}).filter({hasText:'Trạm thời gian'}).waitFor({timeout:120000});const usableMs=Date.now()-t0
  // first-interactive = preview canvas visible AND Menu really opens AND a movement key is accepted (not just a heading)
  await page.locator('.lw-canvas canvas').first().waitFor({timeout:120000});const previewMs=Date.now()-t0
  const menu=page.getByRole('button',{name:'Menu',exact:true});await menu.waitFor();await menu.click();await page.getByLabel('Cách khám phá').waitFor({timeout:120000});const menuMs=Date.now()-t0
  // close with the menu's own control (R2 BENCH-MENU: the Menu toggle is covered by the open menu)
  await page.getByRole('button',{name:'Đóng menu',exact:true}).click();await page.getByLabel('Cách khám phá').waitFor({state:'hidden'})
  // first ACCEPTED movement: re-press the key every 400 ms (a key held before the full scene attached its listener is never
  // seen) until the scene reports a move, max 120 s; the timestamp is when the move was accepted, not when we pressed.
  let moved=false;for(let k=0;k<300&&!moved;k++){await page.locator('.lw-canvas canvas').first().focus().catch(()=>{});await page.keyboard.down('s');await sleep(250);await page.keyboard.up('s');moved=await page.evaluate(()=>document.querySelector('.lw-canvas canvas')?.dataset.lastMove!==undefined);if(!moved)await sleep(150)}
  // lastMove is performance.now() inside the page; convert to wall clock via timeOrigin, relative to our navigation start t0
  const firstMoveMs=moved?Math.round(await page.evaluate(()=>performance.timeOrigin+Number(document.querySelector('.lw-canvas canvas').dataset.lastMove))-t0):null // null = movement not accepted within the window (reported, never guessed)
  const firstInteractiveMs=firstMoveMs===null?null:Math.max(previewMs,menuMs,firstMoveMs)
  const firstLoad=await page.evaluate(()=>{let js=0,css=0,other=0;for(const e of performance.getEntriesByType('resource')){const b=e.encodedBodySize||e.transferSize||0;if(/\.js(\?|$)/.test(e.name))js+=b;else if(/\.css(\?|$)/.test(e.name))css+=b;else if(!/\.(webp|glb)(\?|$)/.test(e.name))other+=b}return{js,css,other}})
  await waitZone(page,'S0');const s0ReadyMs=Date.now()-t0
  const gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'});if(real&&/swiftshader|llvmpipe|software/i.test(gpu))throw new Error('Hardware GPU required: '+gpu);
  const paint=await page.evaluate(()=>Object.fromEntries(performance.getEntriesByType('paint').map(e=>[e.name,Math.round(e.startTime)])))
  const run=current={...current,paint,gpu,userAgent:await page.evaluate(()=>navigator.userAgent),network:process.env.LW_BENCH_NET==='throttled'?'10Mbps/50ms':'unthrottled',headingMs:usableMs,previewMs,menuMs,firstMoveMs,firstInteractiveMs,s0ReadyMs,firstLoadBytes:firstLoad,heapS0:await heap(cdp),zones:{}}
  run.zones.S0={stream:await zoneStat(page),frames:await frames(page,FPS_MS,['w','a','s']),render:await render(page)}
  await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click();await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click()
  {const p2=page.getByRole('group',{name:'Trục thời gian'});await p2.waitFor({timeout:120000});await p2.getByRole('button',{name:/^01\/1967/}).click();await p2.getByRole('button',{name:/^Bến Dược/}).click()}
  const departAt=Date.now();await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click()
  run.transfers=[];run.streamedFiles={}
  // transfer = click on the route confirm → destination scene reports ready (waitZone's 1.5 s settle excluded); route type from worldContinuity ids
  const hop=async(id,zone)=>{const before=await page.evaluate(()=>performance.getEntriesByType('resource').length);const at=Date.now();await go(id);await page.waitForFunction(z=>JSON.parse(document.querySelector('.lw-canvas canvas')?.dataset.r2Zone||'{}').zone===z,zone,{timeout:600000});const ms=Date.now()-at;await sleep(1500)
   const files=await page.evaluate(n=>performance.getEntriesByType('resource').slice(n).filter(e=>/\.(glb|webp|ktx2|bin)(\?|$)/.test(e.name)).map(e=>({file:e.name.split('/').pop(),encodedBytes:e.encodedBodySize,transferBytes:e.transferSize})),before)
   run.transfers.push({route:id,zone,type:/^ROUTE_(RETURN_)/.test(id)?'FAST_RETURN':/LAYER_(MIDDLE|DEEP|UP|BACK)/.test(id)?'KNOWLEDGE_LINK':'THEMATIC_SCENE',ms});(run.streamedFiles[zone]??=[]).push(...files)}
  const go=async id=>{const d=page.locator('.lw-world-exits');if(!(await d.evaluate(el=>el.open)))await d.locator('summary').click();await d.locator(`[data-target="${id}"]`).click();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()}
  await page.waitForFunction(()=>JSON.parse(document.querySelector('.lw-canvas canvas')?.dataset.r2Zone||'{}').zone==='S1',null,{timeout:600000});run.transfers.push({route:'TIME_OUT (incl. 1.8 s skippable departure scene)',zone:'S1',type:'TEMPORAL_PORTAL',ms:Date.now()-departAt})
  await waitZone(page,'S1');run.zones.S1={stream:await zoneStat(page),frames:await frames(page,FPS_MS,['w','d','s']),render:await render(page)}
  const assist=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await assist.getAttribute('aria-expanded')==='false')await assist.click();await page.locator('.lw-alternatives [data-target="Q1_HATCH"]').click()
  for(const label of ['Quan sát kỹ mặt đất','Nhấc nắp','Chui xuống']){const pr=page.locator('.lw-prompt[data-target="Q1_HATCH"]');await pr.filter({hasText:label}).waitFor({timeout:120000});await pr.click()}
  {const at=Date.now();await page.waitForFunction(()=>JSON.parse(document.querySelector('.lw-canvas canvas')?.dataset.r2Zone||'{}').zone==='L1-A',null,{timeout:600000});run.transfers.push({route:'FOREST_ENTRANCE via hatch (from the crawl-down action, incl. 1.7 s crawl)',zone:'L1-A',type:'THEMATIC_SCENE',ms:Date.now()-at})}
  await waitZone(page,'L1-A');run.zones['L1-A']={stream:await zoneStat(page),frames:await frames(page,FPS_MS,['w','d','a']),render:await render(page)};
  await hop('ROUTE_ENTRANCE_SURFACE','S1');await hop('ROUTE_FOREST_LABOR','S2');run.zones.S2={cpuBuffers:await page.locator('.lw-canvas canvas').evaluate(el=>JSON.parse(el.dataset.s2Assets||'null')),heap:await heap(cdp),stream:await zoneStat(page),frames:await frames(page,FPS_MS,['d','w','a']),render:await render(page)}
  await go('ROUTE_LABOR_AIR')
  await waitZone(page,'L1-B');run.zones['L1-B']={stream:await zoneStat(page),frames:await frames(page,FPS_MS,['w','d','a']),render:await render(page)}
  // deep zones (Q3 representatives): L1-D → L2-A → L3-A, then back up the same knowledge links
  await hop('ROUTE_AIR_STRUCTURE','L1-D');run.zones['L1-D']={stream:await zoneStat(page),frames:await frames(page,FPS_MS,['w','a','d']),render:await render(page)}
  await hop('ROUTE_LAYER_MIDDLE','L2-A');run.zones['L2-A']={stream:await zoneStat(page),frames:await frames(page,FPS_MS,['w','a','d']),render:await render(page)}
  await hop('ROUTE_LAYER_DEEP','L3-A');run.zones['L3-A']={stream:await zoneStat(page),frames:await frames(page,FPS_MS,['w','a','d']),render:await render(page)}
  await hop('ROUTE_CALLBACK_L3-A','L1-B')
  // leak check: same scene state (L1-B) before and after >=5 surface↔underground cycles, heap measured after GC
  run.memoryBefore={heap:await heap(cdp),render:await render(page)}
  run.cycles=[];for(let cycle=0;cycle<5;cycle++){await hop('ROUTE_AIR_LABOR','S2');const surface=await render(page);await hop('ROUTE_LABOR_AIR','L1-B');run.cycles.push({cycle:cycle+1,surface,underground:await render(page),heap:await heap(cdp),frames:await frames(page,1500,['w','s'])})}
  run.memoryAfter={heap:await heap(cdp),render:await render(page)}
  run.pageErrors=errors;result.runs.push(run);console.log(JSON.stringify(run));await ctx.close()
  }catch(e){current.failed=String(e?.message??e).slice(0,600);result.runs.push(current);await ctxRef?.close().catch(()=>{});console.log('RUN FAILED (partial result kept)',current.failed)}
 }
}finally{await browser?.close();server.kill();writeFileSync(process.env.LW_BENCH_OUTPUT||`immersive-bench-${label}.json`,JSON.stringify(result,null,1))}
