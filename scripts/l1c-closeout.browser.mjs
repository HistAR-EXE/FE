import {chromium,expect as baseExpect} from '@playwright/test'
import {createHash,createHmac,randomUUID} from 'node:crypto'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {spawn} from 'node:child_process'
import path from 'node:path'
const expect=baseExpect.configure({timeout:30000})

const [directory,build,userFile]=process.argv.slice(2),out=path.resolve(directory),base='http://127.0.0.1:5419'
const api='http://127.0.0.1:8096/api/v2/worlds/cuchi-mach-song',user=JSON.parse(readFileSync(userFile,'utf8'))
mkdirSync(out,{recursive:true})
const header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),payload=Buffer.from(JSON.stringify({sub:user.email,userId:user.id,role:'USER',exp:Math.floor(Date.now()/1000)+7200})).toString('base64url')
const token=`${header}.${payload}.${createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(`${header}.${payload}`).digest('base64url')}`
const result={scope:'L1-C web technical milestone; isolated account. Initial checkpoint set by HTTP; Q4 earned through UI. Ten-minute hardware GPU soak; no historical/rights/PO sign-off.',buildIndexSha256:createHash('sha256').update(readFileSync(path.join(build,'index.html'))).digest('hex'),checks:[],windows:[],errors:[]}
const save=()=>writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2))
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5419','--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8096'}})
let browser,page
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(30000)
 page.on('pageerror',e=>result.errors.push(e.message))
 result.actionResponses=[]
 page.on('response',async response=>{if(response.url().endsWith('/api/v2/worlds/cuchi-mach-song/actions')){result.actionResponses.push({at:new Date().toISOString(),status:response.status(),intent:response.request().postDataJSON(),body:await response.json().catch(()=>null)})}})
 result.warnings=[]
 page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')result.warnings.push({type:m.type(),text:m.text(),at:new Date().toISOString()})})
 await page.addInitScript(()=>{window.__webgl={created:0,lost:0};const original=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();HTMLCanvasElement.prototype.getContext=function(type,...args){const context=original.call(this,type,...args);if(context&&/webgl/.test(type)&&!seen.has(this)){seen.add(this);window.__webgl.created++;this.addEventListener('webglcontextlost',()=>window.__webgl.lost++)}return context}})
 const headers={Authorization:`Bearer ${token}`}
 const state=async()=>{const r=await context.request.get(api+'/state',{headers});expect(r.status()).toBe(200);return(await r.json()).data}
 const send=async(actionType,targetId,payload={})=>{const s=await state(),r=await context.request.post(api+'/actions',{headers,data:{actionId:randomUUID(),releaseVersion:1,expectedRevision:s.revision,actionType,targetId,payload}});expect(r.status()).toBe(200);return(await r.json()).data}
 const check=id=>{result.checks.push(id);save();console.log(id)}
 expect((await state()).facts).toEqual([]);await send('START_EXPERIENCE','');await send('SAVE_CHECKPOINT','L1-C')
 await page.addInitScript(({user,token})=>{for(const[k,v]of Object.entries({timelens_user_id:user.id,timelens_email:user.email,timelens_token:token,timelens_display_name:'L1-C QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{user,token})
 const entryStart=Date.now();await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click()
 const ready=async z=>{await page.waitForFunction(z=>document.querySelector('canvas')?.dataset.readiness==='ready'&&JSON.parse(document.querySelector('canvas').dataset.r2Zone??'{}').zone===z,z,{timeout:180000});await expect(page.locator('main')).not.toHaveAttribute('data-transfer','on',{timeout:30000})}
 const close=async()=>{const b=page.locator('.lw-dialog .lw-close');if(await b.isVisible())await b.click()}
 const approach=async id=>{await close();const b=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await b.getAttribute('aria-expanded')==='false')await b.click();await page.locator(`.lw-alternatives [data-target="${id}"]`).click();await expect(page.locator('main')).toHaveAttribute('data-arrived',id,{timeout:30000});await b.click();await page.locator('canvas').focus()}
 const proof=async()=>{const d=page.locator('.lw-core-proof');if(!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();return d}
 await ready('L1-C');result.entryReadyMs=Date.now()-entryStart;check('entry')
 await approach('NPC_COOK');await page.keyboard.press('e')
 for(const title of ['Tôi có thể giúp việc gì?','Về đường khói của bếp','Bữa ăn liên quan tới những ai?']){await page.getByRole('button',{name:title,exact:true}).click();await expect(page.getByRole('region',{name:'Lời người nấu bếp'})).toBeVisible()}
 await page.getByRole('button',{name:'Tiếng dụng cụ kể điều gì?',exact:true}).click();await expect.poll(async()=>(await state()).checkpoint.kitchenEcho).toBe(true);expect((await state()).facts).toEqual([]);check('all-conversation-topics-and-A16-no-evidence')
 for(const [id,fact]of [['A02_PREPARE','KITCHEN_HEARTH_INSPECTED'],['A02_SMOKE','KITCHEN_SMOKE_INSPECTED']]){await approach(id);await page.keyboard.press('e');await(await proof()).getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click();await expect.poll(async()=>(await state()).facts.includes(fact)).toBe(true)}
 await(await proof()).getByRole('button',{name:'Lần theo các vật thể trong phòng',exact:true}).click();await expect(page.locator('[data-kitchen-inspection]')).toHaveAttribute('data-kitchen-inspection','true')
 for(const name of ['HEARTH','CHANNEL','DIFFUSION','COMMUNITY']){const id='Q4_'+name,at=await page.locator(`[data-scene-target="${id}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy})),rect=await page.locator('canvas').boundingBox();await page.mouse.click(rect.x+at.x,rect.y+at.y);await expect(page.locator('canvas')).toHaveAttribute('data-last-pick',id);if(name==='DIFFUSION')await expect.poll(async()=>(await state()).facts.includes('KITCHEN_SMOKE_PATH_CORRECT')).toBe(true)}
 await expect.poll(async()=>(await state()).foundations).toEqual(['MS_FOUNDATION_KITCHEN']);await approach('A02_SMOKE');await page.keyboard.press('e');await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas').dataset.kitchenCamera??'{}').fov===55);await close();result.lensResetAfterQ4=true;check('prepare-smoke-spatial-Q4-confirmed')
 for(const [route,zone]of [['KITCHEN_MIDDLE','L2-A'],['MIDDLE_KITCHEN','L1-C']]){await approach('ROUTE_'+route);await page.keyboard.press('e');await ready(zone)}
 await page.reload();await ready('L1-C');expect((await state()).foundations).toEqual(['MS_FOUNDATION_KITCHEN']);check('exit-return-reload-preserves-Q4')
 await approach('NPC_COOK');await page.keyboard.press('e');await expect(page.getByRole('button',{name:'Nghe lại · tiếng dụng cụ',exact:true})).toBeVisible();await close();check('A16-persists-after-return')
 const gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL)});expect(gpu).not.toMatch(/swiftshader|llvmpipe/i);result.gpu=gpu
 // Keep measuring for ten real minutes. No video encoder competes with the renderer.
 for(let minute=0;minute<10;minute++){
  await approach(minute%2?'A02_SMOKE':'A02_PREPARE');await page.keyboard.press('e');await close()
  const window=await page.evaluate(async()=>{const deltas=[];let last=performance.now(),start=last;await new Promise(resolve=>{const frame=now=>{deltas.push(now-last);last=now;if(now-start<60000)requestAnimationFrame(frame);else resolve()};requestAnimationFrame(frame)});deltas.sort((a,b)=>a-b);return{elapsedMs:last-start,frames:deltas.length,p10Fps:1000/deltas[Math.floor(deltas.length*.9)],averageFps:1000/(deltas.reduce((a,b)=>a+b,0)/deltas.length),heap:performance.memory?.usedJSHeapSize,character:JSON.parse(document.querySelector('canvas').dataset.characterQc??'{}')}})
  const diagnostics=await page.locator('canvas').evaluate(c=>({webgl:window.__webgl,visibility:document.visibilityState,render:c.dataset.zoneRender,canvasSize:[c.width,c.height],camera:JSON.parse(c.dataset.kitchenCamera??'{}'),at:new Date().toISOString()}))
  result.windows.push({minute:minute+1,...window,...diagnostics});save();console.log('SOAK',minute+1,window.p10Fps)
 }
 result.finalState=await state();result.soakP10Fps=Math.min(...result.windows.map(w=>w.p10Fps));expect(result.soakP10Fps).toBeGreaterThanOrEqual(30);expect(result.errors).toEqual([]);await page.screenshot({path:path.join(out,'completed.png')});result.result='PASS'
}catch(error){
 result.result='FAIL';result.error=String(error)
 result.pendingQueue=await page?.evaluate(()=>new Promise(resolve=>{
  const request=indexedDB.open('timelens-world-business-actions')
  request.onerror=()=>resolve({error:'open failed'})
  request.onsuccess=()=>{
   const db=request.result
   if(!db.objectStoreNames.contains('actions')){db.close();resolve([]);return}
   const rows=db.transaction('actions').objectStore('actions').getAll()
   rows.onsuccess=()=>{db.close();resolve(rows.result)}
   rows.onerror=()=>{db.close();resolve({error:'read failed'})}
  }
 })).catch(()=>null)
 await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error
}finally{save();await browser?.close();server.kill()}
