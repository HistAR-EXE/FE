import {chromium} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs'
import path from 'node:path'
const out=path.resolve(process.argv[2]),build=process.argv[3]??'../.superpowers/living-world-g3-completion-r3'
mkdirSync(out,{recursive:true})
const base='http://127.0.0.1:5399',result={build,scope:'Assisted normal routes; one warm-up then five full cycles. Not direct picking or Android.',cycles:[],errors:[]}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5399','--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8094'}})
let browser,context,page,cdp
const save=()=>writeFileSync(path.join(out,'memory.json'),JSON.stringify(result,null,2))
const ready=zone=>page.waitForFunction(z=>{try{return JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').zone===z&&document.querySelector('canvas')?.dataset.readiness==='ready'&&!document.querySelector('.lw-transfer')}catch{return false}},zone)
const metrics=async()=>{await cdp.send('HeapProfiler.collectGarbage');return{heap:await cdp.send('Runtime.getHeapUsage'),dom:await cdp.send('Memory.getDOMCounters'),renderer:await page.locator('canvas').evaluate(c=>JSON.parse(c.dataset.zoneRender??c.dataset.s2Render??'null'))}}
const snapshot=async name=>{const file=path.join(out,name+'.heapsnapshot');writeFileSync(file,'');const chunk=({chunk})=>appendFileSync(file,chunk);cdp.on('HeapProfiler.addHeapSnapshotChunk',chunk);try{await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false})}finally{cdp.off('HeapProfiler.addHeapSnapshotChunk',chunk)}}
const approach=async id=>{const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await page.locator(`.lw-alternatives [data-target="${id}"]`).click()}
const route=async(id,to)=>{const close=page.locator('.lw-dialog .lw-close');if(await close.count())await close.click();const exits=page.locator('.lw-world-exits');if(!(await exits.evaluate(e=>e.open)))await exits.locator('summary').click();await exits.locator(`[data-target="ROUTE_${id}"]`).click();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await ready(to)}
try{
 for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--ignore-gpu-blocklist']})
 context=await browser.newContext({viewport:{width:1280,height:720},serviceWorkers:'block'})
 page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message));cdp=await context.newCDPSession(page)
 await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click();await ready('S0')
 result.gpu=await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'})
 if(/swiftshader|software|unavailable/i.test(result.gpu))throw Error('Hardware GPU required')
 for(let cycle=0;cycle<=5;cycle++){
  result.phase={cycle,zone:'S0'};save()
  await approach('MACHINE');await page.getByRole('group',{name:'Trục thời gian'}).waitFor()
  const go=page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true})
  if(!(await go.count())){await page.getByRole('button',{name:/^01\/1967/}).click();await page.getByRole('button',{name:/^Bến Dược/}).click()}
  await go.click();await ready('S1')
  await approach('Q1_HATCH')
  for(const label of [/Quan sát kỹ mặt đất|Gạt lớp lá/,/Nhấc nắp/,/Chui xuống/])await page.locator('.lw-prompt[data-target="Q1_HATCH"]').filter({hasText:label}).click()
  await ready('L1-A');await route('ENTRANCE_AIR','L1-B');await route('AIR_STRUCTURE','L1-D');await route('LAYER_MIDDLE','L2-A');await route('LAYER_DEEP','L3-A');await route('RETURN_L3-A','S0')
  const measured=await metrics();result.cycles.push({cycle,warmup:cycle===0,...measured});save();console.log(JSON.stringify({cycle,heap:measured.heap.usedSize,dom:measured.dom}))
  if(cycle===0||cycle===5){await snapshot(cycle===0?'warm':'after-five');await page.screenshot({path:path.join(out,`cycle-${cycle}-S0.png`)})}
 }
 result.uniqueAssets=await page.evaluate(()=>{const unique=new Map();for(const e of performance.getEntriesByType('resource'))if(/\.(glb|webp|ktx2|bin)(\?|$)/.test(e.name)){const prior=unique.get(e.name);if(!prior||prior.encodedBytes<e.encodedBodySize)unique.set(e.name,{url:e.name,encodedBytes:e.encodedBodySize,transferBytes:e.transferSize})}return[...unique.values()]})
}catch(error){result.error=error.stack;if(page)await page.screenshot({path:path.join(out,'FAILED.png')}).catch(()=>{});process.exitCode=1}
finally{save();await context?.close();await browser?.close();server.kill()}
