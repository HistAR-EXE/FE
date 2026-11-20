import {chromium, expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync, writeFileSync} from 'node:fs'
import path from 'node:path'
import {installRuntimeAudioProof,readRuntimeAudioProof} from './runtime-audio-proof.mjs'

const [outArg, build] = process.argv.slice(2)
if (!outArg || !build) throw Error('Usage: recovery-rooms.browser.mjs OUTPUT BUILD')
const out = path.resolve(outArg), port = Number(process.env.LW_RECOVERY_PORT??(process.env.LW_RECOVERY_MOBILE==='true'?5412:5411)), base = `http://127.0.0.1:${port}`
const normal=process.env.LW_RECOVERY_NORMAL==='true'
const mobile=process.env.LW_RECOVERY_MOBILE==='true'
const quality=process.env.LW_WORLD_QUALITY==='true'
const viewport=mobile?{width:390,height:844}:{width:1440,height:900}
mkdirSync(out, {recursive:true})
const started=Date.now()
const result = {build, started:new Date(started).toISOString(), viewport, reducedMotion:mobile, scope:'Isolated guest L1-B start; real assisted walking and one E per authored passage. No facts/XP fixture. Room contact and art require separate review.', chapters:[], checks:[], errors:[]}
if(normal)result.scope='Fresh guest S0→P2→S1→L1→L2→L3→S1→S0. No fixture/debug teleport; explicit accessibility approach, real one-E passages and room actions. Hardware GPU, not a blind user study.'
const save = () => writeFileSync(path.join(out, 'results.json'), JSON.stringify(result,null,2))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port',String(port),'--strictPort'], {windowsHide:true,stdio:'ignore'})
let browser, context, page, video
try {
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 context=await browser.newContext({viewport,hasTouch:true,isMobile:mobile,reducedMotion:mobile?'reduce':'no-preference',serviceWorkers:'block',recordVideo:{dir:out,size:viewport}})
 page=await context.newPage(); video=page.video();result.videoOffsetSeconds=(Date.now()-started)/1000; page.setDefaultTimeout(20000)
 page.on('pageerror',e=>result.errors.push(e.message))
 if(process.env.LW_RECORD_AUDIO==='true')await installRuntimeAudioProof(page)
 if(quality)await page.addInitScript(()=>{window.__qaAudioContexts=[];const Native=window.AudioContext;window.AudioContext=class extends Native{constructor(...args){super(...args);window.__qaAudioContexts.push(this)}}})
 if(!normal)await page.addInitScript(()=>{if(sessionStorage.getItem('recovery-start'))return;sessionStorage.setItem('recovery-start','1');sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'L1-B',position:[3,.5],heading:0,rice:0,last:null,q1:[],facts:[],mode:'STORY'}))})
 await page.goto(base+'/living-world'); await page.getByTestId('consent-decline').click()
 const ready=async zone=>{await page.waitForFunction(z=>document.querySelector('canvas')?.dataset.readiness==='ready'&&JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').zone===z,zone,{timeout:60000});await expect(page.locator('main')).not.toHaveAttribute('data-transfer','on');await page.waitForTimeout(400)}
 const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png')});result.chapters.push({name,seconds:(Date.now()-started)/1000});save()}
 const close=async()=>{const c=page.locator('.lw-dialog .lw-close');if(await c.isVisible())await c.click()}
 const approach=async id=>{await close();const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();await page.locator(`.lw-alternatives [data-target="${id}"]`).click();await expect(page.locator('main')).toHaveAttribute('data-arrived',id);await toggle.click();await close();await page.locator('canvas').focus()}
 const travel=async(id,to)=>{console.log('TRAVEL',id,to);await approach('ROUTE_'+id);await page.keyboard.press('e');await ready(to);expect(await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).count()).toBe(0);result.checks.push({id,to,result:'PASS'});await shot(to+'-entry')}
 const work=async(zone,ids)=>{for(const id of ids){console.log('ACTION',id);await approach(id);if(mobile)await page.locator('.lw-prompt').tap();else await page.keyboard.press('e');await expect(page.locator('.lw-dialog').getByRole('button',{name:'Đã thực hiện',exact:true})).toBeDisabled();await page.waitForTimeout(650);if(quality&&mobile){const contact=JSON.parse(await page.locator('canvas').getAttribute('data-room-contact'));expect(contact.avatarVisible).toBe(false);result.checks.push({id:id+'-portrait-clear-work-surface',result:'PASS',contact})}await shot(id+'-contact');if(quality){const story=page.locator('.lw-room-story').first();await expect(story).toHaveJSProperty('open',false);await story.locator('summary').click();await page.waitForTimeout(250);await expect(story).toHaveJSProperty('open',true);await story.locator('summary').click()}await page.waitForTimeout(quality?4500:1150);await shot(id+'-action');result.checks.push({id,zone,result:'PASS',input:mobile?'one touch after closing context':'one E after closing context',dialog:await page.locator('.lw-dialog').innerText()});await close()}await page.keyboard.press('v');await shot(zone+'-third-person');await page.keyboard.press('v')}
 if(normal){
  await ready('S0');await shot('S0-start')
  if(quality){await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByLabel('Cách khám phá').selectOption('FREE')}
  await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay',exact:true}).click()
  const p2=page.getByRole('group',{name:'Trục thời gian'})
  await p2.getByRole('button',{name:/^01\/1967/}).click();await p2.getByRole('button',{name:/^Bến Dược/}).click()
  await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click()
  if(quality){
   await ready('S2');await shot('S2-entry')
   await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh khu lao động',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
   await approach('A04');await page.keyboard.press('e');await page.getByRole('button',{name:'Thử phối hợp',exact:true}).click();await page.getByRole('button',{name:'Sẵn sàng · đến lượt tôi',exact:true}).click()
   for(let stroke=0;stroke<6;stroke++){
    for(let step=0;step<3;step++){const box=await page.locator('canvas').boundingBox(),point=await page.locator('[data-scene-target="STROKE_LEFT"]').evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy}));await page.mouse.click(box.x+point.x,box.y+point.y);expect(await page.locator('canvas').getAttribute('data-last-pick')).toBe('STROKE_LEFT');await page.waitForTimeout(450)}
    await shot('S2-stroke-'+(stroke+1))
   }
   await expect(page.getByText('Mẻ gạo đã chuyển trạng thái. Một bữa ăn là kết quả của nhiều bàn tay.',{exact:true})).toBeVisible();result.checks.push({id:'A04-six-strokes-real-3D-picks',result:'PASS'})
   await approach('ROUTE_LABOR_FOREST');await page.keyboard.press('e');await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
  }
  await ready('S1');await shot('S1-arrival')
  for(const id of ['Q1_TRAIL','Q1_LEAVES']){await approach(id);await page.keyboard.press('e');await page.keyboard.press('e');await close()}
  await approach('Q1_HATCH');await page.keyboard.press('e');await ready('L1-A');await shot('L1-A-arrival');result.checks.push({id:'S0-P2-S1-hatch',result:'PASS'})
  await travel('ENTRANCE_AIR','L1-B')
 }else await ready('L1-B')
 result.gpu=await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'})
 if(quality){expect(result.gpu).not.toMatch(/swiftshader|software/i);await page.getByRole('button',{name:'Menu',exact:true}).click();const soundOn=page.getByRole('button',{name:'Bật âm thanh không gian',exact:true});if(await soundOn.count())await soundOn.click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.__qaAudioContexts.filter(c=>c.state==='running').length)).toBe(1)}
 await travel('AIR_KITCHEN','L1-C');await work('L1-C',['A02_PREPARE','A02_SMOKE'])
 await travel('KITCHEN_MIDDLE','L2-A')
 await page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true}).click()
 result.l2Targets=await page.locator('.lw-alternatives [data-target]').evaluateAll(es=>es.map(e=>e.dataset.target));expect(result.l2Targets).toContain('ROUTE_MIDDLE_REST')
 await page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true}).click();save()
 if(quality){await approach('L2D_NICHE');await page.keyboard.press('e');await expect(page.getByRole('button',{name:'Đối chiếu mặt cắt bốn lớp',exact:true})).toBeVisible();await shot('L2D-room-model');await close();result.checks.push({id:'L2D-model-and-context-before-Xray',result:'PASS'})}
 await travel('MIDDLE_REST','L2-C');await work('L2-C',['A13_BELONGINGS','A13_REST']);await travel('REST_MIDDLE','L2-A')
 await travel('LAYER_DEEP','L3-A');await travel('DEEP_CARE','L3-B');await work('L3-B',['A15_CLOTH','A15_CARE'])
 await travel('CARE_WATER','L3-C');await work('L3-C',['A14_WATER','A14_SHARE']);await travel('WATER_CARE','L3-B');await travel('CARE_DEEP','L3-A');await travel('LAYER_BACK','L2-A');await travel('MIDDLE_KITCHEN','L1-C');await travel('KITCHEN_AIR','L1-B')
 if(normal){await travel('AIR_ENTRANCE','L1-A');await travel('ENTRANCE_SURFACE','S1');await approach('ROUTE_RETURN_S1');await page.keyboard.press('e');await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await ready('S0');await shot('S0-return')}
 if(quality){if(!normal){await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Tắt âm thanh không gian',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click()}result.audioStates=await page.evaluate(()=>window.__qaAudioContexts.map(c=>c.state));expect(result.audioStates.every(s=>s==='closed')).toBe(true);result.checks.push({id:'opt-in-audio-zone-disposal-and-mute',result:'PASS'})}
 if(process.env.LW_RECORD_AUDIO==='true'){
  result.audioCaptures=[];for(const [i,capture]of(await readRuntimeAudioProof(page)).entries()){const {base64,...meta}=capture,file=`runtime-audio-${String(i+1).padStart(2,'0')}.webm`;writeFileSync(path.join(out,file),Buffer.from(base64,'base64'));result.audioCaptures.push({...meta,file})}
  expect(result.audioCaptures.some(c=>c.peak>.001)).toBe(true)
 }
 expect(result.errors).toEqual([]);result.result='PASS'
} catch(error){result.result='FAIL';result.error=String(error);if(page){result.state=await page.locator('main').evaluate(e=>({...e.dataset})).catch(()=>null);await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{})}throw error
} finally {save();if(context)await context.close();if(video)await video.saveAs(path.join(out,'rooms-roundtrip.webm'));if(browser)await browser.close();server.kill()}
