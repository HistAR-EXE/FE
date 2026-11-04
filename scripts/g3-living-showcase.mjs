import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
const out=path.resolve(process.argv[2]),build=process.argv[3],port=5401,base=`http://127.0.0.1:${port}`
const normal=process.env.LW_SHOWCASE_NORMAL==='true'
mkdirSync(out,{recursive:true})
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port',String(port),'--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8094'}})
let browser,context,page,video
const result={build,scope:'Representative review; isolated S2 start fixture, then real UI approach/entry/exit; 3D tool picks separately asserted; not blind user study or Q4/Q5 acceptance',chapters:[],picks:[],errors:[],checks:[]},began=Date.now()
if(normal)result.scope='Normal fresh guest S0→machine→S2→four representative rooms→S0→S1→S0; no fixture/debug tabs/teleport. Assisted UI approach remains explicit; each work-object 3D pick is asserted. Not blind discovery or Q4/Q5 canonical acceptance.'
const save=()=>writeFileSync(path.join(out,'showcase.json'),JSON.stringify(result,null,2))
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,300))}
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--ignore-gpu-blocklist']})
 context=await browser.newContext({viewport:{width:1440,height:960},serviceWorkers:'block',recordVideo:{dir:out,size:{width:1440,height:960}}})
 page=await context.newPage();result.videoOffsetSeconds=(Date.now()-began)/1000;video=page.video();page.setDefaultTimeout(20000);page.on('pageerror',e=>result.errors.push(e.message))
 if(!normal)await page.addInitScript(()=>{if(sessionStorage.getItem('showcase-fixture'))return;sessionStorage.setItem('showcase-fixture','1');sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'S2',position:[0,2],heading:Math.PI,rice:0,last:null,q1:[],facts:[],mode:'FREE'}))})
 await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click()
 const ready=async zone=>{await page.waitForFunction(z=>document.querySelector('canvas')?.dataset.readiness==='ready'&&JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').zone===z,zone,{timeout:60000});await page.waitForTimeout(800)}
 const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png')});result.chapters.push({name,seconds:(Date.now()-began)/1000,canvas:await page.locator('canvas').evaluate(c=>({...c.dataset}))});save()}
 const close=async()=>{const c=page.locator('.lw-dialog .lw-close');if(await c.count())await c.click();const a=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await a.getAttribute('aria-expanded')==='true')await a.click()}
 const approach=async id=>{await close();const a=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await a.getAttribute('aria-expanded')==='false')await a.click();await page.locator(`.lw-alternatives [data-target="${id}"]`).click();await page.waitForFunction(id=>document.querySelector('main')?.getAttribute('data-arrived')===id,id);await a.click();await page.waitForTimeout(600)}
 const hit=async id=>{const el=page.locator(`[data-scene-target="${id}"]`);const point=await el.evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy}));const box=await page.locator('canvas').boundingBox();await page.mouse.click(box.x+point.x,box.y+point.y);const actual=await page.locator('canvas').getAttribute('data-last-pick');result.picks.push({expected:id,actual});save();expect(actual).toBe(id)}
 const travel=async(id,to)=>{await close();const d=page.locator('.lw-world-exits');if(!await d.evaluate(e=>e.open))await d.locator('summary').click();await d.locator(`[data-target="ROUTE_${id}"]`).click();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await ready(to);result.checks.push({case:id,result:'PASS',navigation:await page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')))})}
 if(normal){
  await ready('S0');await shot('S0-normal-start');await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByLabel('Cách khám phá').selectOption('FREE');await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click();await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click()
  const p2=page.getByRole('group',{name:'Trục thời gian'});await p2.getByRole('button',{name:/^01\/1967/}).click();await p2.getByRole('button',{name:/^Bến Dược/}).click();await expect(p2.getByText(/không đại diện cho mọi nơi hay mọi sự kiện/)).toBeVisible();await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await ready('S2')
 }
 await ready('S2');result.gpu=await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return g.getParameter(e.UNMASKED_RENDERER_WEBGL)});if(/swiftshader|software/i.test(result.gpu))throw Error('Hardware GPU required')
 await shot('S2-overview');await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh khu lao động',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
 await approach('A04');await shot('S2-avatar');await page.getByRole('button',{name:'Thử phối hợp',exact:true}).click();await page.getByRole('button',{name:'Sẵn sàng · đến lượt tôi',exact:true}).click()
 for(let stroke=0;stroke<6;stroke++){for(let step=0;step<3;step++){await hit('STROKE_LEFT');await page.waitForTimeout(350);if(stroke===0)await shot('S2-choreography-step-'+step)}if(stroke===0||stroke===5)await shot(`S2-stroke-${stroke+1}`)}
 await expect(page.getByText('Mẻ gạo đã chuyển trạng thái. Một bữa ăn là kết quả của nhiều bàn tay.',{exact:true})).toBeVisible();result.checks.push({case:'A04-six-real-3D-strokes',result:'PASS'});await shot('S2-interaction')
 await travel('LABOR_KITCHEN','L1-C')
 for(const [zone,ids,next,to] of [
  ['L1-C',['A02_PREPARE','A02_SMOKE'],'KITCHEN_REST','L2-C'],
  ['L2-C',['A13_BELONGINGS','A13_REST'],'REST_CARE','L3-B'],
  ['L3-B',['A15_CLOTH','A15_CARE'],'CARE_WATER','L3-C'],
  ['L3-C',['A14_WATER','A14_SHARE'],'RETURN_L3-C','S0'],
 ]){
  await close();await shot(zone+'-entry');await page.locator('canvas').focus();await page.keyboard.down('w');await page.waitForTimeout(700);await page.keyboard.up('w');await page.waitForTimeout(700);await shot(zone+'-overview')
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh không gian',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
  for(const id of ids){
   await approach(id);await shot(id+'-avatar');await hit(id);await page.waitForTimeout(1600);await shot(id+'-interaction');result.checks.push({case:id,result:'PASS'});await close()
   if(id===ids[0]){await page.locator('canvas').focus();await page.keyboard.down('w');await page.waitForTimeout(600);await page.keyboard.up('w');await expect(page.locator('main.lw-root')).toHaveAttribute('data-walking','0');await expect.poll(async()=>JSON.parse(await page.locator('canvas').getAttribute('data-avatar-pose')).moving).toBe(false);const nav=JSON.parse(await page.locator('canvas').getAttribute('data-avatar-pose'));result.checks.push({case:zone+'-prop-collision',result:'OBSERVED',navigation:nav});expect(nav.position[0]).toBeGreaterThanOrEqual(-2.75);expect(nav.position[0]).toBeLessThanOrEqual(2.75);expect(nav.position[1]).toBeGreaterThanOrEqual(-2);expect(nav.position[0]<-1.5&&nav.position[1]<.5).toBe(false);expect(nav.position[0]>1.5&&nav.position[1]<-.5).toBe(false);result.checks.at(-1).result='PASS';await shot(zone+'-wall-contact')}
  }
  await page.locator('canvas').focus();await page.keyboard.press('v');await page.waitForTimeout(500);await shot(zone+'-alternate-camera');await page.keyboard.press('v')
  await travel(next,to)
 }
 await shot('S0-return')
 if(normal){
  await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByLabel('Cách khám phá').selectOption('STORY');await approach('MACHINE');await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await ready('S1');await close();await shot('S1-natural-arrival')
  const box=await page.locator('canvas').boundingBox();await page.mouse.move(box.width*.7,box.height*.5);await page.mouse.down();await page.mouse.move(box.width*.7+120,box.height*.5,{steps:12});await page.mouse.up();await shot('S1-forest-depth');await travel('RETURN_S1','S0');await shot('S0-final-return')
 }
 expect(result.errors).toEqual([]);result.result='PASS';save()
}catch(error){result.result='FAIL';result.error=String(error);save();if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error}
finally{if(context)await context.close();if(video)await video.saveAs(path.join(out,'living-showcase.webm'));if(browser)await browser.close();server.kill();save()}
