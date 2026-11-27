import {spawnQaPreview} from './qa-preview.mjs'
import {chromium,expect} from '@playwright/test'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const fe=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const [output,build]=process.argv.slice(2),out=path.resolve(output),candidate=path.resolve(build),base='http://127.0.0.1:5463',reducedStart=process.env.LW_SCENE_REDUCED_START==='true'
mkdirSync(out,{recursive:true})
const result={scope:'Synthetic guest scene/actual rig contact, camera and motion QA; not canonical account journey or historical approval',buildIndexSha256:createHash('sha256').update(readFileSync(path.join(candidate,'index.html'))).digest('hex'),checks:[],errors:[],scenes:{}}
result.reducedStart=reducedStart;result.scopedZone=process.env.LW_SCENE_ONLY??'ALL_FOUR'
const server=spawnQaPreview(5463,build)
let browser,page
const save=()=>writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2)),check=id=>{result.checks.push(id);save();console.log(id)}
const assertContacts=(actors,label)=>{for(const a of actors){expect(a.activeContact,label+' '+a.workbench.kind).toBe(true);expect(a.contactFrame).toHaveLength(2);for(const h of a.contactFrame){expect(h.unreachable).toBe(false);expect(h.error).toBeLessThan(.065)}}}
const qc=()=>page.locator('.lw-canvas canvas').evaluate(c=>JSON.parse(c.dataset.characterQc||'{"actors":[]}').actors.filter(a=>a.workbench))
try{
 let served=false;for(let i=0;i<450;i++){try{const response=await fetch(base);if(response.ok&&createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex')===result.buildIndexSha256){served=true;break}}catch{}await new Promise(r=>setTimeout(r,200))};if(!served)throw new Error('Local QA preview did not serve the pinned candidate; see server log')
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 for(const [zone,n,first,second] of [['S2',2,'A03_BATTER','A03_SPREAD'],['S3',3,'A06_DIG','A06_BASKET'],['S4',3,'A07_WATCH','A07_CHORUS'],['L2-B',1,'L2B_RECORDS','L2B_LETTER']].filter(([z])=>!process.env.LW_SCENE_ONLY||z===process.env.LW_SCENE_ONLY)){
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:reducedStart?'reduce':'no-preference',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>result.errors.push(e.message))
  await page.addInitScript(zone=>sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone,position:zone.startsWith('L')?[0,0]:[0,2],heading:Math.PI,rice:0,last:null,facts:['MS_SYNTHESIS_COMPLETE'],mode:'STORY',activities:[],modelCompared:true,callbackSeen:true})),zone)
  await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click();await page.waitForFunction(()=>document.querySelector('.lw-canvas canvas')?.dataset.readiness==='ready',null,{timeout:90000})
  result.gpu??=await page.locator('.lw-canvas canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL)})
  expect(result.gpu).not.toMatch(/swiftshader|llvmpipe/i)
  await expect.poll(async()=>(await qc()).length).toBe(n)
  await expect.poll(async()=>(await qc()).every(a=>a.activeContact&&a.contactFrame?.length===2&&a.contactFrame.every(h=>!h.unreachable&&h.error<.065&&h.blend>.99)),{timeout:30000}).toBe(true);result.scenes[zone]={initial:await qc()};save()
  for(const a of result.scenes[zone].initial){
   expect(a.activeContact,zone+' '+a.workbench.kind).toBe(true)
   expect(a.contactFrame).toHaveLength(2)
   for(const hand of a.contactFrame){expect(hand.unreachable,zone+' '+a.workbench.kind+' '+JSON.stringify(hand)).toBe(false);expect(hand.error,zone+' '+a.workbench.kind).toBeLessThan(.065)}
  }
  for(const a of result.scenes[zone].initial)for(const v of a.workbench.screenHands??[]){expect(Math.abs(v[0])).toBeLessThan(1);expect(Math.abs(v[1])).toBeLessThan(1);expect(Math.abs(v[2])).toBeLessThan(1)}
  result.scenes[zone].contactSamples={count:0,maxError:0}
  for(let i=0;i<12;i++){await page.waitForTimeout(350);for(const a of await qc())for(const h of a.contactFrame??[]){expect(h.unreachable,zone+' '+a.workbench.kind+' over time').toBe(false);expect(h.error).toBeLessThan(.065);result.scenes[zone].contactSamples.maxError=Math.max(result.scenes[zone].contactSamples.maxError,h.error)}result.scenes[zone].contactSamples.count++}
  check(zone+'-actual-rig-two-hand-contact')
  result.scenes[zone].camera=await page.locator('.lw-canvas canvas').evaluate(c=>JSON.parse(c.dataset.meetingCamera||'null'))
  await page.screenshot({path:path.join(out,zone+'-scene.png')})
  const assist=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await assist.click();await page.locator(`.lw-alternatives [data-target="${second}"]`).click();await expect(page.locator('main')).toHaveAttribute('data-arrived',second)
  await expect.poll(async()=>(await qc()).every(a=>a.activeContact&&a.contactFrame?.length===2&&a.contactFrame.every(h=>!h.unreachable&&h.error<.065&&h.blend>.99))&& (zone==='L2-B'||(await qc()).some(a=>a.workbench.target===second&&a.workbench.phase===(reducedStart?'STILL':'WORK'))),{timeout:30000}).toBe(true);result.scenes[zone].selected=await qc();assertContacts(result.scenes[zone].selected,zone+' selected');save();for(const a of result.scenes[zone].selected)for(const h of a.contactFrame??[]){expect(h.unreachable).toBe(false);expect(h.error).toBeLessThan(.065)}
  if(zone!=='L2-B')expect(result.scenes[zone].selected.some(a=>a.workbench.target===second&&a.workbench.phase===(reducedStart?'STILL':'WORK'))).toBe(true)
  await page.screenshot({path:path.join(out,zone+'-selected.png')});check(zone+'-selected-station-one-tap')
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(1500)
  const still=await qc();await page.waitForTimeout(1200);const again=await qc()
  for(let i=0;i<still.length;i++){expect(still[i].workbench.phase).toBe('STILL');expect(again[i].workbench.elapsed).toBe(still[i].workbench.elapsed);expect(again[i].workbench.handles).toEqual(still[i].workbench.handles)}
  for(const a of again){expect(a.activeContact).toBe(true);for(const h of a.contactFrame??[]){expect(h.unreachable).toBe(false);expect(h.error).toBeLessThan(.065)}}
  assertContacts(again,zone+' reduced');result.scenes[zone].reduced=again;check(zone+'-reduced-motion-still-contact')
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(800);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:path.join(out,zone+'-portrait.png')});check(zone+'-portrait-layout')
  await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:900});await page.waitForTimeout(700)
  result.scenes[zone].frames=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();function tick(now){frames.push(now-last);last=now;if(frames.length<180)requestAnimationFrame(tick);else{const sorted=[...frames].sort((a,b)=>a-b);resolve({count:frames.length,averageMs:frames.reduce((a,b)=>a+b)/frames.length,p50Ms:sorted[90],p95Ms:sorted[171],maxMs:sorted.at(-1)})}}requestAnimationFrame(tick)}));save()
  await context.close()
 }
 expect(result.errors).toEqual([]);result.result='PASS'
}catch(error){result.result='FAIL';result.error=String(error);if(page){result.failureQc=await qc().catch(()=>null);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{})}throw error}finally{save();await browser?.close();server.kill()}
