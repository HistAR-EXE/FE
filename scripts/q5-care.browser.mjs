import {spawnQaPreview} from './qa-preview.mjs'
import {trackWorldActions} from './world-action-trace.mjs'
import {chromium,expect as baseExpect} from '@playwright/test'
const expect=baseExpect.configure({timeout:60000})
import {createHmac,createHash,randomUUID} from 'node:crypto'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const feDir=fileURLToPath(new URL('..',import.meta.url))

const [output,build,user1File,user2File]=process.argv.slice(2)
const out=path.resolve(output),base='http://127.0.0.1:5451',api=(process.env.LW_CORE_BACKEND??'http://127.0.0.1:8096')+'/api/v2/worlds/cuchi-mach-song'
mkdirSync(out,{recursive:true})
const user1=JSON.parse(readFileSync(user1File,'utf8').replace(/^\uFEFF/,''))
const user2=JSON.parse(readFileSync(user2File,'utf8').replace(/^\uFEFF/,''))
const sign=user=>{
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')
 const p=Buffer.from(JSON.stringify({sub:user.email,userId:user.id,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')
 return `${h}.${p}.${createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(`${h}.${p}`).digest('base64url')}`
}
const token1=sign(user1),token2=sign(user2)
const buildIndexSha256=createHash('sha256').update(readFileSync(path.join(build,'index.html'))).digest('hex')
const result={
 milestone:'Q5 WATER + MEDICAL -> CARE & KITCHEN+CARE callback verification',
 buildIndexSha256,
 user1Id:user1.id,
 user2Id:user2.id,
 checks:[],
 errors:[],
}
const save=()=>writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2))
const server=spawnQaPreview(5451,build)
let browser,context,page
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 if(createHash('sha256').update(Buffer.from(await(await fetch(base)).arrayBuffer())).digest('hex')!==result.buildIndexSha256)throw new Error('Preview does not match the pinned build');
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'})
 page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>result.errors.push(e.message));trackWorldActions(page,result,save)

 const stateFor=async token=>{const r=await context.request.get(api+'/state',{headers:{Authorization:`Bearer ${token}`}});expect(r.status()).toBe(200);return(await r.json()).data}
 const sendFor=async(token,actionType,targetId,payload={})=>{const s=await stateFor(token),r=await context.request.post(api+'/actions',{headers:{Authorization:`Bearer ${token}`},data:{actionId:randomUUID(),releaseVersion:1,expectedRevision:s.revision,actionType,targetId,payload}});expect(r.status()).toBe(200);return(await r.json()).data}

 // Start user1 at L3-C to test WATER -> MEDICAL order, out-of-order rejection, offline pending, reload, reconnect, callback, and account switch
 const init1=await stateFor(token1)
 expect(init1.facts).toEqual([])
 if(!init1.started)await sendFor(token1,'START_EXPERIENCE','')
 await sendFor(token1,'SAVE_CHECKPOINT','L3-C')

 // Server-side out-of-order rejection check before UI actions
 {
  const s=await stateFor(token1)
  const badWater=await context.request.post(api+'/actions',{headers:{Authorization:`Bearer ${token1}`},data:{actionId:randomUUID(),releaseVersion:1,expectedRevision:s.revision,actionType:'STRUCTURED_INTERACTION',targetId:'A14_SHARE',payload:{quest:'Q5',action:'INSPECT_TARGET'}}})
  expect(badWater.status()).toBe(422)
  const badCare=await context.request.post(api+'/actions',{headers:{Authorization:`Bearer ${token1}`},data:{actionId:randomUUID(),releaseVersion:1,expectedRevision:s.revision,actionType:'STRUCTURED_INTERACTION',targetId:'',payload:{quest:'Q5',action:'CONFIRM_CARE_MEANING',relation:'WATER_AND_MEDICAL_SUPPORT_COMMUNITY'}}})
  expect(badCare.status()).toBe(422)
  result.checks.push({id:'server-rejects-out-of-order-q5-steps',result:'PASS'})
 }

 await page.addInitScript(({user,token})=>{
  if(!sessionStorage.getItem('q5_seeded')){
   sessionStorage.setItem('q5_seeded','1')
   for(const[k,v]of Object.entries({timelens_user_id:user.id,timelens_email:user.email,timelens_token:token,timelens_display_name:'Q5 QA 1',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)
  }
 },{user:user1,token:token1})

 await page.goto(base+'/living-world')
 const consent=page.getByTestId('consent-decline');if(await consent.count())await consent.click()
 const ready=async z=>{await page.waitForFunction(z=>document.querySelector('canvas')?.dataset.readiness==='ready'&&JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').zone===z,z,{timeout:60000});await expect(page.locator('main')).not.toHaveAttribute('data-transfer','on')}
 const shot=async n=>{await page.screenshot({path:path.join(out,n+'.png')});save()}
 const close=async()=>{const c=page.locator('.lw-dialog .lw-close');if(await c.isVisible())await c.click()}
 const approach=async id=>{
  await close()
  const a=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true})
  if(await a.getAttribute('aria-expanded')==='false')await a.click()
  await page.locator(`.lw-alternatives [data-target="${id}"]`).click()
  await page.waitForFunction(id=>document.querySelector('main')?.getAttribute('data-arrived')===id,id)
  if(await a.getAttribute('aria-expanded')==='true')await a.click()
  await page.locator('canvas').focus()
 }
 const openProof=async()=>{const d=page.locator('.lw-core-proof');if(!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();return d}
 const travel=async(id,to)=>{await approach('ROUTE_'+id);await page.keyboard.press('e');await ready(to)}

 await ready('L3-C')
 const gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER)})
 expect(gpu).not.toMatch(/swiftshader|llvmpipe/i)
 result.gpu=gpu

 // 1. Out-of-order UI check in L3-C: approach A14_SHARE before A14_WATER
 await approach('A14_SHARE')
 await expect(page.getByRole('button',{name:'Rót vào hai bình bếp và chăm sóc',exact:true})).toBeDisabled()
 await expect(page.locator('.lw-dialog')).toContainText('Hãy chuẩn bị vật dụng ở điểm trước.')
 const dShareBefore=await openProof()
 await expect(dShareBefore).toContainText('Cần ghi nhận bước chuẩn bị ở điểm trước')
 await expect(dShareBefore.getByRole('button',{name:'Kết nối nước và chăm sóc',exact:true})).toBeDisabled()
 await shot('01-l3c-out-of-order-blocked')
 // Use the new guided navigation button to go to A14_WATER
 await dShareBefore.getByRole('button',{name:'Tới điểm chuẩn bị trước',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='A14_WATER')
 result.checks.push({id:'l3c-out-of-order-blocked-and-redirects-to-prerequisite',result:'PASS'})

 // 2. Complete A14_WATER and inspect
 await page.keyboard.press('e')
 await expect.poll(async()=>(await stateFor(token1)).activities.includes('A14_WATER')).toBe(true)
 const dWater=await openProof()
 await dWater.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('WATER_STORAGE_INSPECTED')).toBe(true)
 await expect(dWater).toContainText('Đã ghi nhận nguồn nước dự trữ.')
 await expect(dWater).toContainText('Nguồn nước (L3-C) 1/2 · Chăm sóc (L3-B) 0/2')
 await shot('02-l3c-water-step1-confirmed')
 // Guided next step inside L3-C
 await dWater.getByRole('button',{name:'Tiếp tục · Chia nước cho hai nhu cầu',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='A14_SHARE')

 // 3. Complete A14_SHARE and inspect; verify single-branch boundary
 await page.keyboard.press('e')
 await expect.poll(async()=>(await stateFor(token1)).activities.includes('A14_SHARE')).toBe(true)
 const dShare=await openProof()
 await dShare.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('WATER_USES_CONNECTED')).toBe(true)
 await expect(dShare).toContainText('Nguồn nước (L3-C) 2/2 · Chăm sóc (L3-B) 0/2')
 await expect(dShare.getByRole('button',{name:'Kết nối nước và chăm sóc',exact:true})).toBeDisabled()
 await expect(dShare).toContainText('Nhánh nguồn nước tại L3-C đã đủ quan sát.')
 expect((await stateFor(token1)).foundations).toEqual([])
 await shot('03-l3c-water-branch-done-medical-missing')
 result.checks.push({id:'water-branch-alone-never-unlocks-care-and-guides-to-l3b',result:'PASS'})

 // 4. Navigate to L3-B via passage WATER_CARE
 await travel('WATER_CARE','L3-B')
 // Out-of-order UI check in L3-B: A15_CARE before A15_CLOTH
 await approach('A15_CARE')
 await expect(page.getByRole('button',{name:'Đưa khay, nhường lối',exact:true})).toBeDisabled()
 const dCareBefore=await openProof()
 await expect(dCareBefore).toContainText('Cần ghi nhận bước chuẩn bị ở điểm trước')
 await dCareBefore.getByRole('button',{name:'Tới điểm chuẩn bị trước',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='A15_CLOTH')
 result.checks.push({id:'l3b-out-of-order-blocked-and-redirects-to-prerequisite',result:'PASS'})

 // 5. Complete A15_CLOTH and inspect, then repeat-action idempotency check
 await page.keyboard.press('e')
 await expect.poll(async()=>(await stateFor(token1)).activities.includes('A15_CLOTH')).toBe(true)
 await expect(page.getByRole('button',{name:'Đã thực hiện',exact:true})).toBeDisabled()
 const dCloth=await openProof()
 await dCloth.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('MEDICAL_PREPARATION_INSPECTED')).toBe(true)
 await expect(dCloth.getByRole('button',{name:'Đã ghi quan sát',exact:true})).toBeDisabled()
 await dCloth.getByRole('button',{name:'Tiếp tục · Đưa khay tới người chăm sóc',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='A15_CARE')

 // 6. Complete A15_CARE and inspect
 await page.keyboard.press('e')
 await expect.poll(async()=>(await stateFor(token1)).activities.includes('A15_CARE')).toBe(true)
 const dCare=await openProof()
 await dCare.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('MEDICAL_SUPPORT_CONNECTED')).toBe(true)
 await expect(dCare).toContainText('Nguồn nước (L3-C) 2/2 · Chăm sóc (L3-B) 2/2')
 await expect(dCare.getByRole('button',{name:'Kết nối nước và chăm sóc',exact:true})).toBeEnabled()

 // 7. Offline / network loss during CONFIRM_CARE_MEANING -> pending -> reload -> reconnect sync
 const actionPattern='**/api/v2/worlds/cuchi-mach-song/actions'
 await context.route(actionPattern,route=>route.abort('failed'))
 await dCare.getByRole('button',{name:'Kết nối nước và chăm sóc',exact:true}).click()
 await expect(dCare).toContainText('Tương tác đang chờ máy chủ xác nhận')
 await expect(dCare).toContainText('Kết nối nước và chăm sóc đang chờ máy chủ xác nhận')
 expect((await stateFor(token1)).foundations).not.toContain('MS_FOUNDATION_CARE')
 await shot('04-l3b-care-pending-offline')
 // Reload while still offline: pending state survives reload without promoting to confirmed foundation
 await page.reload()
 await ready('L3-B')
 await approach('A15_CARE')
 const dCareAfterReload=await openProof()
 await expect(dCareAfterReload).toContainText('Kết nối nước và chăm sóc đang chờ máy chủ xác nhận')
 expect((await stateFor(token1)).foundations).not.toContain('MS_FOUNDATION_CARE')
 result.checks.push({id:'q5-offline-pending-survives-reload-without-client-foundation-grant',result:'PASS'})

 // Reconnect and verify server confirmation + Turning Point 2 narrative
 await context.unroute(actionPattern)
 await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 await expect.poll(async()=>(await stateFor(token1)).foundations.includes('MS_FOUNDATION_CARE')).toBe(true)
 await expect(dCareAfterReload).toContainText('Đã xác nhận nền tảng CARE')
 await expect(dCareAfterReload).toContainText('Nước dự trữ và sự chăm sóc bổ sung cho nhau để giữ sự sống dưới lòng đất.')
 await shot('05-l3b-care-confirmed-after-reconnect')
 result.checks.push({id:'q5-reconnect-sync-confirms-care-foundation',result:'PASS'})

 // 8. Portrait viewport check (390x844 Chrome emulation) on L3-B and L3-C
 await page.setViewportSize({width:390,height:844})
 await page.waitForTimeout(400)
 await shot('06-l3b-portrait-390x844')
 await page.setViewportSize({width:1440,height:900})
 await page.waitForTimeout(400)

 // 9. Travel back to L1-C (L3-B -> L3-A -> L2-A -> L1-C), complete Q4 and verify KITCHEN + CARE callback
 await travel('CARE_DEEP','L3-A')
 await travel('LAYER_BACK','L2-A')
 await travel('MIDDLE_KITCHEN','L1-C')
 await approach('A02_PREPARE');await page.keyboard.press('e')
 await(await openProof()).getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('KITCHEN_HEARTH_INSPECTED')).toBe(true)
 await approach('A02_SMOKE');await page.keyboard.press('e')
 const dSmoke=await openProof()
 await dSmoke.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('KITCHEN_SMOKE_INSPECTED')).toBe(true)
 await dSmoke.getByRole('button',{name:'Lần theo các vật thể trong phòng',exact:true}).click()
 await expect(page.locator('[data-kitchen-inspection]')).toHaveAttribute('data-kitchen-inspection','true')
 await page.waitForTimeout(250)
 for(const node of ['HEARTH','CHANNEL','DIFFUSION','COMMUNITY']){
  const id='Q4_'+node
  const at=await page.locator(`[data-scene-target="${id}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy}))
  const rect=await page.locator('canvas').boundingBox()
  await page.mouse.click(rect.x+at.x,rect.y+at.y)
  await page.waitForTimeout(250)
 }
 await expect.poll(async()=>(await stateFor(token1)).foundations.includes('MS_FOUNDATION_KITCHEN')).toBe(true)
 await expect.poll(async()=>(await stateFor(token1)).kitchenCareCallback).toBe('AVAILABLE')

 // Verify NPC Cook COMMUNITY dialogue reflects CARE + KITCHEN knowledge
 await approach('NPC_COOK');await page.keyboard.press('e')
 await page.getByRole('button',{name:'Bữa ăn liên quan tới những ai?',exact:true}).click()
 await expect(page.locator('.lw-conversation-reply')).toContainText('Bạn đã thấy cả việc nấu ăn và chăm sóc.')
 await shot('07-l1c-cook-callback-dialogue')
 await close()

 // Verify Atlas shows Bếp Hoàng Cầm ↔ Nước và chăm sóc
 await page.getByRole('button',{name:/Atlas ký ức/}).click()
 await expect(page.locator('.lw-overlay')).toContainText('Bếp Hoàng Cầm ↔ Nước và chăm sóc')
 await shot('08-atlas-kitchen-care-connection')
 await page.getByRole('button',{name:'Không gian',exact:true}).click()

 // Confirm KITCHEN_CARE_REFLECTED via the in-room reveal card or CoreProofPanel
 await expect(page.locator('.lw-reveal')).toContainText('Nhìn lại gian bếp sau nơi chăm sóc')
 await page.locator('.lw-reveal').getByRole('button',{name:'Lưu góc nhìn mới về bếp',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).kitchenCareCallback).toBe('VIEWED')
 await shot('09-l1c-callback-viewed')
 result.checks.push({id:'kitchen-care-callback-available-and-viewed-after-care-first',result:'PASS'})

 // 10. Account switch check: switch to user2 in same browser and verify complete isolation
 await page.evaluate(({user,token})=>{
  for(const[k,v]of Object.entries({timelens_user_id:user.id,timelens_email:user.email,timelens_token:token,timelens_display_name:'Q5 QA 2',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)
 },{user:user2,token:token2})
 await page.reload()
 await ready('S0')
 const state2=await stateFor(token2)
 expect(state2.facts).toEqual([])
 expect(state2.foundations).toEqual([])
 expect(state2.activities).toEqual([])
 await expect(page.getByRole('button',{name:'Atlas ký ức · 0',exact:true})).toBeVisible()
 await shot('10-account-switch-isolated-user2')
 result.checks.push({id:'account-switch-isolates-q5-progress-and-cache',result:'PASS'})

 result.user1FinalState=await stateFor(token1)
 result.user2FinalState=state2
 expect(result.errors).toEqual([])
 result.result='PASS'
}catch(error){
 result.result='FAIL'
 result.error=String(error)
 if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{})
 throw error
}finally{
 save()
 await context?.close()
 await browser?.close()
 server.kill()
}
