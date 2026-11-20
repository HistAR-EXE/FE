import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {installRuntimeAudioProof,readRuntimeAudioProof} from './runtime-audio-proof.mjs'
const [output,build]=process.argv.slice(2),out=path.resolve(output),base='http://127.0.0.1:5440'
mkdirSync(out,{recursive:true});const result={scope:'Guest spatial interaction fixtures; not account/canonical acceptance',checks:[],errors:[]}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5440','--strictPort'],{windowsHide:true,stdio:'ignore'})
let browser
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const dir=path.join(out,String(viewport.width));mkdirSync(dir,{recursive:true})
  const context=await browser.newContext({viewport,hasTouch:viewport.width<500,serviceWorkers:'block',recordVideo:{dir,size:viewport}}),page=await context.newPage();page.setDefaultTimeout(30000)
  await installRuntimeAudioProof(page);page.on('pageerror',e=>result.errors.push(e.message))
  await page.addInitScript(()=>{if(!sessionStorage.getItem('timelens-proof-nav:guest'))sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'L3-D',position:[0,.5],heading:Math.PI,rice:0,last:null,q1:[],facts:[],callbackSeen:true,mode:'STORY'}))})
  const load=async()=>{await page.goto(base+'/living-world');const consent=page.getByTestId('consent-decline');if(await consent.count())await consent.click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000})}
  const approach=async id=>{const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await toggle.click();await page.locator(`.lw-alternatives [data-target="${id}"]`).click();await expect(page.locator('main')).toHaveAttribute('data-arrived',id);await toggle.click();const close=page.locator('.lw-dialog .lw-close');if(await close.count())await close.click()}
  const pick=async id=>{const point=await page.locator(`[data-scene-target="${id}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy})),rect=await page.locator('canvas').boundingBox();await page.mouse.click(rect.x+point.x,rect.y+point.y);await page.waitForTimeout(200);result.checks.push({pick:id,point,lastPick:await page.locator('canvas').getAttribute('data-last-pick')});await page.screenshot({path:path.join(dir,'last-pick.png')})}
  await load();await approach('SYN_ENTRANCE');await pick('SYN_ENTRANCE');await expect(page.getByText(/Còn phát hiện chưa được máy chủ/)).toBeVisible();result.checks.push({viewport,missingFoundations:'BLOCKED'})
  await page.evaluate(()=>{const k='timelens-proof-nav:guest',n=JSON.parse(sessionStorage.getItem(k));n.facts=['ENTRANCE_CONFIRMED','AIR_MEANING_CONFIRMED','STRUCT_MEANING_CONFIRMED','KITCHEN_MEANING_CONFIRMED','CARE_MEANING_CONFIRMED'];sessionStorage.setItem(k,JSON.stringify(n))});await load()
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh không gian',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
  await approach('SYN_ENTRANCE');await expect(page.locator('[data-scene-target="SYN_ENTRANCE"]')).toBeVisible();await page.screenshot({path:path.join(dir,'model-before.png')})
  await pick('SYN_ENTRANCE');await expect(page.getByText(/Đã chọn Lối vào/)).toBeVisible();await expect(page.locator('canvas')).toHaveAttribute('data-model-camera-inside','true');await page.screenshot({path:path.join(dir,'selected-entrance.png')});
  await pick('SYN_ENTRANCE');await expect(page.getByText(/Đã bỏ chọn/)).toBeVisible();result.checks.push({viewport,sameNodeCancels:'PASS'});
  await pick('SYN_ENTRANCE');await pick('SYN_AIR');await expect(page.getByText(/Hai điểm này chưa diễn tả/)).toBeVisible();result.checks.push({viewport,wrongRelation:'REJECTED'})
  for(const [a,b] of [['ENTRANCE','STRUCTURE'],['AIR','LIVING'],['SUPPORT','COMMUNITY']]){await pick('SYN_'+a);await pick('SYN_'+b)}
  await expect(page.getByText('Tổng hợp đã được ghi nhận.')).toBeVisible();await page.screenshot({path:path.join(dir,'model-connected.png')});await page.getByRole('button',{name:'Bỏ qua / tiếp tục khám phá'}).click()
  const nav=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')));expect(nav.synthesisDraft).toHaveLength(3);result.checks.push({viewport,resumeDraft:nav.synthesisDraft})
  const gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL)});expect(gpu).not.toMatch(/swiftshader|llvmpipe/i)
  const captures=await readRuntimeAudioProof(page);captures.forEach((c,i)=>{writeFileSync(path.join(dir,`audio-${i}.webm`),Buffer.from(c.base64,'base64'));delete c.base64});result.checks.push({viewport,gpu,audio:captures});await load();await expect(page.getByRole('button',{name:/Atlas ký ức · 6/})).toBeVisible()
   await page.evaluate(()=>{const k='timelens-proof-nav:guest',n=JSON.parse(sessionStorage.getItem(k));n.zone='L2-D';n.position=[0,2];n.heading=Math.PI;sessionStorage.setItem(k,JSON.stringify(n))});await load();await approach('MODEL_COMPARE');await pick('MODEL_COMPARE');await page.screenshot({path:path.join(dir,'L2-D-comparison.png')});await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')).modelCompared===true);await load();await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')).modelCompared)).toBe(true);await approach('MODEL_COMPARE');await pick('MODEL_COMPARE');await expect(page.getByText(/Các lớp đã trở về vị trí gần nhau/)).toBeVisible();result.checks.push({viewport,L2DComparisonResume:'PASS'})
   const route=async(id,title)=>{await page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true}).click();await page.locator(`.lw-alternatives [data-target="ROUTE_${id}"]`).click();await expect(page.locator('main')).toHaveAttribute('data-arrived','ROUTE_'+id);await page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true}).click();await page.locator('canvas').focus();await page.keyboard.press('e');await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible({timeout:30000});await expect(page.locator('main')).toHaveAttribute('data-transfer','off',{timeout:30000})}
   await route('MODEL_MIDDLE','Thành phố nhiều tầng · lớp giữa');await route('MIDDLE_MODEL','Trạm ký ức cấu trúc');result.checks.push({viewport,L2DRoundtrip:'PASS'});await page.evaluate(()=>{const k='timelens-proof-nav:guest',n=JSON.parse(sessionStorage.getItem(k));n.zone='L3-D';n.position=[0,2];sessionStorage.setItem(k,JSON.stringify(n))});await load();await route('SYNTHESIS_WATER','Nguồn nước và đời sống · hồ sơ diễn giải');await route('WATER_SYNTHESIS','Mạch Sống · một cộng đồng hiện ra');result.checks.push({viewport,L3DRoundtrip:'PASS'});
   await approach('ROUTE_EPILOGUE_RETURN');await page.locator('canvas').focus();await page.keyboard.press('e');
   await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Củ Chi hôm nay · ký ức và tri ân',exact:true})).toBeVisible();
   await expect(page.locator('main')).toHaveAttribute('data-transfer','off');
   await page.screenshot({path:path.join(dir,'epilogue-arrival.png')});result.checks.push({viewport,epilogueRoute:'PASS',scope:'Guest confirmed-fact fixture; backend gate tested separately'});
   await context.close()
 }
 expect(result.errors).toEqual([]);result.result='PASS'
}catch(e){result.result='FAIL';result.error=String(e);throw e}finally{writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser?.close();server.kill()}
