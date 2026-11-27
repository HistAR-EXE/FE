import {trackWorldActions} from './world-action-trace.mjs'
import {chromium,expect as baseExpect} from '@playwright/test'
const expect=baseExpect.configure({timeout:60000})
import {createHmac,createHash} from 'node:crypto'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {spawn} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const feDir=fileURLToPath(new URL('..',import.meta.url))

const [output,build,user1File,user2File]=process.argv.slice(2)
const out=path.resolve(output),base='http://127.0.0.1:5419',api=(process.env.LW_CORE_BACKEND??'http://127.0.0.1:8096')+'/api/v2/worlds/cuchi-mach-song'
mkdirSync(out,{recursive:true})
const user1=JSON.parse(readFileSync(user1File,'utf8').replace(/^\uFEFF/,''))
const user2=user2File?JSON.parse(readFileSync(user2File,'utf8').replace(/^\uFEFF/,'')):null
const sign=user=>{
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')
 const p=Buffer.from(JSON.stringify({sub:user.email,userId:user.id,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')
 return `${h}.${p}.${createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(`${h}.${p}`).digest('base64url')}`
}
const token1=sign(user1),token2=user2?sign(user2):null
const buildIndexSha256=createHash('sha256').update(readFileSync(path.join(build,'index.html'))).digest('hex')
const result={
 milestone:'Natural M1 Walkthrough (15 zones, 6 quests, 8 activities + eligible bridges, no seeded facts or HTTP shortcuts)',
 buildIndexSha256,
 primaryUserId:user1.id,
 alternateOrderUserId:user2?.id??null,
 visitedZones:[],
 checks:[],
 errors:[],
}
const save=()=>writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2))
const server=spawn(process.execPath,[path.join(feDir,'node_modules/vite/bin/vite.js'),'preview','--outDir',path.resolve(build),'--host','127.0.0.1','--port','5419','--strictPort'],{cwd:feDir,windowsHide:true,stdio:'ignore',env:{...process.env,HISTAR_LOCAL_API_TARGET:process.env.LW_CORE_BACKEND??'http://127.0.0.1:8096'}})

let browser,context,page,video
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',...(process.env.LW_RECORD_VIDEO==='false'?{}:{recordVideo:{dir:out,size:{width:1440,height:900}}})})
 page=await context.newPage();video=page.video();page.setDefaultTimeout(30000);page.on('pageerror',e=>result.errors.push(e.message));trackWorldActions(page,result,save)

 const stateFor=async token=>{const r=await context.request.get(api+'/state',{headers:{Authorization:`Bearer ${token}`}});expect(r.status()).toBe(200);return(await r.json()).data}
 // Verify primary account starts completely clean (zero facts, zero foundations, zero activities, revision 0)
 const initial=await stateFor(token1)
 expect(initial.revision).toBe(0)
 expect(initial.facts).toEqual([])
 expect(initial.foundations).toEqual([])
 expect(initial.activities).toEqual([])

 await page.addInitScript(({user,token})=>{
  if(!sessionStorage.getItem('m1_natural_auth')){
   sessionStorage.setItem('m1_natural_auth','1')
   for(const[k,v]of Object.entries({timelens_user_id:user.id,timelens_email:user.email,timelens_token:token,timelens_display_name:'M1 Natural QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)
  }
 },{user:user1,token:token1})

 await page.goto(base+'/living-world',{waitUntil:'domcontentloaded',timeout:60000})
 const consent=page.getByTestId('consent-decline');if(await consent.count())await consent.click()
 const recordZone=z=>{if(!result.visitedZones.includes(z))result.visitedZones.push(z)}
 const ready=async z=>{
  await page.waitForFunction(z=>{
   const c=document.querySelector('canvas')
   if(!c||c.dataset.readiness!=='ready')return false
   if(z==='S2')return Boolean(c.dataset.s2Assets)
   const r2=JSON.parse(c.dataset.r2Zone??'{}')
   return r2.zone===z
  },z,{timeout:60000})
  await expect(page.locator('main')).not.toHaveAttribute('data-transfer','on')
  recordZone(z)
 }
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
 const travel=async(id,to,needsConfirm=false)=>{
  await approach('ROUTE_'+id)
  await page.keyboard.press('e')
  if(needsConfirm){
   const btn=page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true})
   if(await btn.isVisible({timeout:3000}).catch(()=>false))await btn.click()
  }
  await ready(to)
 }
 const openProof=async()=>{const d=page.locator('.lw-core-proof');if(!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();return d}

 // --- ZONE 1: S0 (Trạm thời gian) & ZONE 2: S5 standalone visit before departure ---
 await ready('S0')
 const gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER)})
 expect(gpu).not.toMatch(/swiftshader|llvmpipe/i)
 result.gpu=gpu

 // Prologue: Meet Kha
 await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='KHA')
 await shot('01-S0-prologue-kha')
 await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='MACHINE')

 // P2: Verify locked eras stay locked (A17 / locked eras rule) and select 01/1967 + Ben Duoc
 await expect(page.getByRole('button',{name:/1948/})).toBeDisabled()
 await expect(page.getByRole('button',{name:/1968/})).toBeDisabled()
 await expect(page.getByRole('button',{name:/1975/})).toBeDisabled()
 await page.getByRole('button',{name:/01\/1967 · Củ Chi/}).click()
 await page.getByRole('button',{name:/Bến Dược · site tham chiếu tái dựng/}).click()
 await shot('02-S0-p2-confirm')
 await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click()

 // --- ZONE 2: S1 (Bìa rừng · Q1 & A08) ---
 await ready('S1')
 // Inspect decoy (never grants fact)
 await approach('S1_DECOY_1');await page.keyboard.press('e')
 expect((await stateFor(token1)).facts).toEqual([])
 // Inspect Q1_TRAIL and Q1_LEAVES
 for(const clue of ['Q1_TRAIL','Q1_LEAVES']){
  await approach(clue)
  await page.keyboard.press('e')
  await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 }
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('Q1_TRAIL_OBSERVED')).toBe(true)
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('Q1_LEAVES_OBSERVED')).toBe(true)
 // Open Q1_HATCH -> sweeps, inspects Q1_HATCH, confirms ENTRANCE_CONFIRMED, and descends to L1-A
 await approach('Q1_HATCH')
 await page.keyboard.press('e')
 await shot('03-S1-q1-hatch')

 // --- ZONE 3: L1-A (Lối vào và tuyến chuyển tiếp) ---
 await ready('L1-A')
 await expect.poll(async()=>(await stateFor(token1)).foundations.includes('MS_FOUNDATION_ENTRANCE')).toBe(true)
 await shot('04-L1A-entrance-confirmed')
 result.checks.push({id:'Q1-natural-UI-confirms-MS_FOUNDATION_ENTRANCE',result:'PASS'})

 // Climb back to S1 and walk to S2 for A04 rice pounding
 await travel('ENTRANCE_SURFACE','S1')
 await travel('FOREST_LABOR','S2',true)

 // --- ZONE 4: S2 (Góc lao động · A04 PARTIAL) ---
 await approach('A04')
 await page.getByRole('button',{name:'Thử phối hợp',exact:true}).click()
 await page.getByRole('button',{name:'Sẵn sàng · đến lượt tôi',exact:true}).click()
 for(let i=0;i<6;i++){
  await page.getByRole('button',{name:'Nắm chày',exact:true}).click()
  await page.getByRole('button',{name:'Nâng chày',exact:true}).click()
  await page.getByRole('button',{name:'Hạ chày',exact:true}).click()
 }
 await expect.poll(async()=>(await stateFor(token1)).checkpoint.rice).toBe(6)
 await page.getByRole('button',{name:'Nhìn thành phẩm · so sánh',exact:true}).click()
 await page.getByRole('button',{name:'Nghe chuyện lương thực',exact:true}).click()
 await shot('05-S2-A04-rice-completed')
 result.checks.push({id:'A04-S2-six-strokes-and-story',result:'PASS'})

 // --- ZONE 5: L1-B (Trạm thông hơi · Q2) ---
 await page.getByRole('button',{name:'Đi tiếp · Hơi thở của lòng đất',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='ROUTE_LABOR_AIR')
 await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
 await ready('L1-B')
 for(const [target,fact] of [['AIR_SURFACE_OPENING','AIR_OPENING_INSPECTED'],['AIR_PASSAGE','AIR_PASSAGE_INSPECTED'],['AIR_INTERIOR','AIR_INTERIOR_INSPECTED']]){
  await approach(target)
  await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).facts.includes(fact)).toBe(true)
 }
 // Connect air path and confirm meaning via accessible workbench in L1-B
 const assistBtn=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true})
 if(await assistBtn.getAttribute('aria-expanded')==='false')await assistBtn.click()
 for(const label of ['Mặt đất','Đoạn dẫn','Không gian trong']){
  await page.locator('.lw-workbench').getByRole('button',{name:label,exact:true}).click()
 }
 await page.locator('.lw-workbench').getByRole('button',{name:'Thử đường nối',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('AIR_PATH_CORRECT')).toBe(true)
 await page.locator('.lw-workbench').getByRole('button',{name:'Nối thông khí ↔ điều kiện sinh hoạt',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).foundations.includes('MS_FOUNDATION_AIR')).toBe(true)
 if(await assistBtn.getAttribute('aria-expanded')==='true')await assistBtn.click()
 await shot('06-L1B-Q2-air-confirmed')
 result.checks.push({id:'Q2-natural-UI-confirms-MS_FOUNDATION_AIR',result:'PASS'})

 // --- ZONE 6: L1-D (Trạm quan sát cấu trúc đầu tiên · Q3 layer 1) ---
 await travel('AIR_STRUCTURE','L1-D',true)
 for(const target of ['STRUCT_LAYER_1','STRUCT_LINK_12']){
  await approach(target)
  await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).facts.includes(target)).toBe(true)
 }
 await shot('07-L1D-Q3-layer1')

 // Return to L1-B and enter L1-C via passage AIR_KITCHEN
 await travel('CALLBACK_L1-D','L1-B',true)
 await travel('AIR_KITCHEN','L1-C')

 // --- ZONE 7: L1-C (Bếp Hoàng Cầm · A22, A16, A02, Q4) ---
 await approach('NPC_COOK');await page.keyboard.press('e')
 await page.getByRole('button',{name:'Tiếng dụng cụ kể điều gì?',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).checkpoint.kitchenEcho).toBe(true)
 await close()
 for(const [target,fact] of [['A02_PREPARE','KITCHEN_HEARTH_INSPECTED'],['A02_SMOKE','KITCHEN_SMOKE_INSPECTED']]){
  await approach(target);await page.keyboard.press('e')
  await expect.poll(async()=>(await stateFor(token1)).activities.includes(target)).toBe(true)
  const d=await openProof()
  await d.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).facts.includes(fact)).toBe(true)
 }
 const dKitchen=await openProof()
 await dKitchen.getByRole('button',{name:'Lần theo các vật thể trong phòng',exact:true}).click()
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
 await shot('08-L1C-Q4-kitchen-confirmed')
 result.checks.push({id:'Q4-A02-A16-A22-natural-UI-confirms-MS_FOUNDATION_KITCHEN',result:'PASS'})

 // --- ZONE 8: L2-A (Nút giao tầng 2 · Q3 layer 2) ---
 await travel('KITCHEN_MIDDLE','L2-A')
 for(const target of ['STRUCT_LAYER_2','STRUCT_LINK_23']){
  await approach(target)
  await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).facts.includes(target)).toBe(true)
 }
 await shot('09-L2A-Q3-layer2')

 // --- ZONE 9: L2-C (Khu nghỉ ngơi · A13 PARTIAL) ---
 await travel('MIDDLE_REST','L2-C')
 for(const target of ['A13_BELONGINGS','A13_REST']){
  await approach(target);await page.keyboard.press('e')
  await expect.poll(async()=>(await stateFor(token1)).activities.includes(target)).toBe(true)
 }
 await shot('10-L2C-A13-rest-completed')
 result.checks.push({id:'A13-L2C-both-actions-durable',result:'PASS'})

 // --- ZONE 10: L2-D (Trạm ký ức cấu trúc · A24 model bridge) ---
 await travel('REST_MIDDLE','L2-A')
 await travel('MIDDLE_MODEL','L2-D')
 await approach('MODEL_COMPARE');await page.keyboard.press('e')
 const modelDialog=page.getByRole('dialog',{name:'Quan sát sa bàn',exact:true})
 await expect(modelDialog).toBeVisible()
 await modelDialog.getByRole('button',{name:'Tách các lớp',exact:true}).click()
 await modelDialog.getByRole('button',{name:'Lớp 2',exact:true}).click()
 await modelDialog.getByRole('button',{name:'Sơ đồ 2D',exact:true}).click()
 await shot('11-L2D-A24-model-viewer')
 await modelDialog.getByRole('button',{name:'Trở lại vị trí đang đứng',exact:true}).click()
 await expect(modelDialog).toHaveCount(0)
 result.checks.push({id:'A24-L2D-model-bridge-inspected-and-restored',result:'PASS'})

 // --- ZONE 11: L3-A (Tuyến sâu · Q3 layer 3 & STRUCTURE confirmation + Revelation callback) ---
 await travel('MODEL_MIDDLE','L2-A')
 await travel('LAYER_DEEP','L3-A')
 await approach('STRUCT_LAYER_3')
 await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).facts.includes('STRUCT_LAYER_3')).toBe(true)
 if(await assistBtn.getAttribute('aria-expanded')==='false')await assistBtn.click()
 await page.locator('.lw-workbench').getByRole('combobox',{name:'Lớp bắt đầu',exact:true}).selectOption('STRUCT_LAYER_1')
 await page.locator('.lw-workbench').getByRole('combobox',{name:'Lớp kết thúc',exact:true}).selectOption('STRUCT_LAYER_2')
 await page.locator('.lw-workbench').getByRole('button',{name:'Đặt đường nối',exact:true}).click()
 await page.locator('.lw-workbench').getByRole('combobox',{name:'Lớp bắt đầu',exact:true}).selectOption('STRUCT_LAYER_2')
 await page.locator('.lw-workbench').getByRole('combobox',{name:'Lớp kết thúc',exact:true}).selectOption('STRUCT_LAYER_3')
 await page.locator('.lw-workbench').getByRole('button',{name:'Đặt đường nối',exact:true}).click()
 await page.locator('.lw-workbench').getByRole('button',{name:'Ghép thành hệ thống',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).foundations.includes('MS_FOUNDATION_STRUCTURE')).toBe(true)
 if(await assistBtn.getAttribute('aria-expanded')==='true')await assistBtn.click()
 await shot('12-L3A-Q3-structure-confirmed')
 result.checks.push({id:'Q3-natural-UI-confirms-MS_FOUNDATION_STRUCTURE',result:'PASS'})

 // AIR + STRUCTURE callback moment in L1-B
 await expect(page.locator('.lw-moment[aria-label="Một góc nhìn mới"]')).toBeVisible()
 await expect.poll(async()=>(await stateFor(token1)).moment).toBe('PRESENTED')
 await page.locator('.lw-moment').getByRole('button',{name:'Nhìn lại thông khí',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='ROUTE_CALLBACK_L3-A')
 await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
 await ready('L1-B')
 await page.locator('.lw-reveal').getByRole('button',{name:'Lưu góc nhìn này',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).moment).toBe('VIEWED')
 await expect.poll(async()=>(await stateFor(token1)).resolution).toBe('WATCHED')
 result.checks.push({id:'AIR-STRUCTURE-revelation-presented-and-watched',result:'PASS'})

 // Navigate L1-B -> L1-C -> L2-A -> L3-A -> L3-B
 await travel('AIR_KITCHEN','L1-C')
 await travel('KITCHEN_MIDDLE','L2-A')
 await travel('LAYER_DEEP','L3-A')
 await travel('DEEP_CARE','L3-B')

 // --- ZONE 12: L3-B (Không gian chăm sóc · A15 & Q5 medical branch) ---
 for(const [target,fact] of [['A15_CLOTH','MEDICAL_PREPARATION_INSPECTED'],['A15_CARE','MEDICAL_SUPPORT_CONNECTED']]){
  await approach(target);await page.keyboard.press('e')
  await expect.poll(async()=>(await stateFor(token1)).activities.includes(target)).toBe(true)
  const d=await openProof()
  await d.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).facts.includes(fact)).toBe(true)
 }
 await shot('13-L3B-A15-medical-branch')

 // --- ZONE 13: L3-C (Hồ sơ nguồn nước · A14 & Q5 water branch + CARE confirmation) ---
 await travel('CARE_WATER','L3-C')
 for(const [target,fact] of [['A14_WATER','WATER_STORAGE_INSPECTED'],['A14_SHARE','WATER_USES_CONNECTED']]){
  await approach(target);await page.keyboard.press('e')
  await expect.poll(async()=>(await stateFor(token1)).activities.includes(target)).toBe(true)
  const d=await openProof()
  await d.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).facts.includes(fact)).toBe(true)
 }
 const dCareFinal=await openProof()
 await dCareFinal.getByRole('button',{name:'Kết nối nước và chăm sóc',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).foundations.includes('MS_FOUNDATION_CARE')).toBe(true)
 await expect(dCareFinal).toContainText('Bước ngoặt nhận thức: Hệ thống công trình nhiều lớp không chỉ là kỹ thuật đào hầm')
 await shot('14-L3C-Q5-care-confirmed')
 result.checks.push({id:'Q5-A14-A15-natural-UI-confirms-MS_FOUNDATION_CARE',result:'PASS'})

 // Revisit L1-C for KITCHEN + CARE callback
 await travel('WATER_CARE','L3-B')
 await travel('CARE_DEEP','L3-A')
 await travel('LAYER_BACK','L2-A')
 await travel('MIDDLE_KITCHEN','L1-C')
 await expect(page.locator('.lw-reveal')).toContainText('Nhìn lại gian bếp sau nơi chăm sóc')
 await page.locator('.lw-reveal').getByRole('button',{name:'Lưu góc nhìn mới về bếp',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).kitchenCareCallback).toBe('VIEWED')
 result.checks.push({id:'KITCHEN-CARE-callback-viewed-in-L1C',result:'PASS'})

 // Navigate L1-C -> L2-A -> L3-A -> L3-B -> L3-C -> L3-D
 await travel('KITCHEN_MIDDLE','L2-A')
 await travel('LAYER_DEEP','L3-A')
 await travel('DEEP_CARE','L3-B')
 await travel('CARE_WATER','L3-C')
 await travel('WATER_SYNTHESIS','L3-D')

 // --- ZONE 14: L3-D (Điểm nhìn toàn thế giới · Q6 synthesis) ---
 await approach('SYN_ENTRANCE')
 await close()
 for(const id of ['SYN_ENTRANCE','SYN_STRUCTURE','SYN_AIR','SYN_LIVING','SYN_SUPPORT','SYN_COMMUNITY']){
  const at=await page.locator(`[data-scene-target="${id}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy}))
  const rect=await page.locator('canvas').boundingBox()
  await page.mouse.click(rect.x+at.x,rect.y+at.y)
  await page.waitForTimeout(250)
 }
 await expect.poll(async()=>(await stateFor(token1)).synthesisComplete).toBe(true)
 await shot('15-L3D-Q6-synthesis-complete')
 result.checks.push({id:'Q6-L3D-natural-UI-confirms-MS_SYNTHESIS_COMPLETE',result:'PASS'})

 // --- ZONE 15: S5 (Đền tưởng niệm / Củ Chi hiện đại · Epilogue & A01) ---
 await page.locator('.lw-synthesis-payoff').getByRole('button',{name:'Khép hành trình · về hiện tại',exact:true}).click()
 await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='ROUTE_EPILOGUE_RETURN')
 await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
 await ready('S5')
 await expect.poll(async()=>(await stateFor(token1)).checkpoint.epilogue).toBe('RETURNED')
 await expect(page.locator('.lw-compass')).toContainText('Hành trình đã khép lại · ký ức và tri ân')
 await shot('16-S5-epilogue-arrived')

 // Inspect MEMORIAL_READ (verify dignified epilogue & historical context, no "Ghi điều vừa quan sát" button)
 await approach('MEMORIAL_READ')
 await expect(page.locator('.lw-dialog')).toContainText('Công trình Đền tưởng niệm liệt sĩ Bến Dược ngoài thực địa được khởi công năm 1993')
 await expect(page.locator('.lw-dialog')).toContainText('Epilogue: Bạn đã đi trọn Mạch Sống 1967 và trở về hiện tại.')
 await expect(page.locator('.lw-dialog').getByRole('button',{name:'Ghi điều vừa quan sát'})).toHaveCount(0)
 await shot('17-S5-memorial-read-dialog')
 await close()

 // A01 Flowers, Incense, and Quiet Reflection + Portrait visual check (390x844)
 for(const [choice,target,label] of [['FLOWERS','MEMORIAL_FLOWERS','Chọn hoa'],['INCENSE','MEMORIAL_INCENSE','Chọn hương']]){
  await approach(target);await page.keyboard.press('e')
  await page.getByRole('button',{name:label,exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).checkpoint.memorial).toEqual({choice,phase:'SELECTED'})
  await page.waitForTimeout(600)
  const pt=await page.locator(`[data-scene-target="${target}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy}))
  const rect=await page.locator('canvas').boundingBox()
  await page.mouse.click(rect.x+pt.x,rect.y+pt.y)
  await expect.poll(async()=>(await stateFor(token1)).checkpoint.memorial).toEqual({choice,phase:'OFFERED'})
  await shot(`18-S5-${choice}-offered-1440`)
  if(choice==='INCENSE'){
   await page.setViewportSize({width:390,height:844})
   await page.waitForTimeout(500)
   await shot('19-S5-INCENSE-offered-390x844')
   await page.setViewportSize({width:1440,height:900})
   await page.waitForTimeout(400)
  }
  await page.getByRole('button',{name:'Ở lại yên lặng',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).checkpoint.memorial).toEqual({choice,phase:'REFLECTING'})
  await page.getByRole('button',{name:'Rời ngay',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token1)).checkpoint.memorial).toEqual({choice,phase:'LEFT'})
 }
 await approach('MEMORIAL_QUIET');await page.keyboard.press('e')
 await page.getByRole('button',{name:'Dành một khoảng yên lặng',exact:true}).click()
 await expect.poll(async()=>(await stateFor(token1)).checkpoint.memorial).toEqual({choice:'QUIET',phase:'REFLECTING'})

 // Reload at S5 and verify epilogue + memorial resume
 await page.reload({waitUntil:'domcontentloaded',timeout:60000})
 await ready('S5')
 await expect(page.locator('.lw-compass')).toContainText('Hành trình đã khép lại · ký ức và tri ân')
 await approach('MEMORIAL_QUIET');await page.keyboard.press('e')
 await expect(page.getByText('Hãy dành khoảng thời gian bạn muốn.',{exact:false})).toBeVisible()
 await page.getByRole('button',{name:'Rời ngay',exact:true}).click()
 result.checks.push({id:'S5-A01-Epilogue-flowers-incense-quiet-and-reload-resume',result:'PASS'})

 // Check Memory Atlas shows all 26 facts and all connections
 await page.getByRole('button',{name:/Atlas ký ức · 26/}).click()
 await expect(page.locator('.lw-overlay')).toContainText('Thông khí ↔ cấu trúc không gian')
 await expect(page.locator('.lw-overlay')).toContainText('Bếp Hoàng Cầm ↔ Nước và chăm sóc')
 await expect(page.locator('.lw-overlay')).toContainText('Cấu trúc nhiều tầng ↔ Giữ sự sống')
 await expect(page.locator('.lw-overlay')).toContainText('Năm nền tảng đã hội tụ')
 await shot('20-Atlas-full-26-facts')
 await page.getByRole('button',{name:'Không gian',exact:true}).click()

 // Return from S5 to S0 and back to S5 to verify roundtrip preserves epilogue: RETURNED
 await travel('MEMORIAL_STATION','S0',true)
 await travel('STATION_MEMORIAL','S5',true)
 const finalPrimary=await stateFor(token1)
 expect(finalPrimary.checkpoint.epilogue).toBe('RETURNED')
 expect(finalPrimary.foundations.length).toBe(5)
 expect(finalPrimary.facts.length).toBe(26)
 expect(finalPrimary.activities.length).toBe(8)
 expect(result.visitedZones.sort()).toEqual(['S0','S1','S2','S5','L1-A','L1-B','L1-C','L1-D','L2-A','L2-C','L2-D','L3-A','L3-B','L3-C','L3-D'].sort())
 result.primaryFinalState=finalPrimary
 result.checks.push({id:'M1-all-15-zones-6-quests-8-activities-visited-naturally',result:'PASS'})

 // Optional M2 continuation uses the SAME naturally completed primary account; no seeded checkpoints/facts.
 if(process.env.LW_M2_EXTENSION==='true'){
  result.m1VisitedZones=[...result.visitedZones]
  const m2Targets=[]
  const doStep=async id=>{await approach(id);await page.keyboard.press('e');await expect.poll(async()=>(await stateFor(token1)).activities.includes(id)).toBe(true);m2Targets.push(id)}
  await travel('MEMORIAL_STATION','S0',true);await approach('MACHINE');await page.keyboard.press('e')
  await page.getByRole('button',{name:/01\/1967 · Củ Chi/}).click();await page.getByRole('button',{name:/Bến Dược · site tham chiếu tái dựng/}).click();await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await ready('S1')
  await travel('FOREST_LABOR','S2',true)
  for(const id of ['A03_BATTER','A03_SPREAD','A12_SOLE'])await doStep(id)
  const activitiesBeforeOffline=(await stateFor(token1)).activities
  await page.route('**/api/v2/worlds/cuchi-mach-song/actions',route=>route.abort('failed'))
  await approach('A12_STRAP');await page.keyboard.press('e');await page.waitForTimeout(300);expect((await stateFor(token1)).activities).toEqual(activitiesBeforeOffline)
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await ready('S2');expect((await stateFor(token1)).activities.includes('A12_STRAP')).toBe(false)
  await page.unroute('**/api/v2/worlds/cuchi-mach-song/actions');await page.evaluate(()=>dispatchEvent(new Event('online')));await expect.poll(async()=>(await stateFor(token1)).activities.includes('A12_STRAP')).toBe(true);m2Targets.push('A12_STRAP')
  result.checks.push({id:'M2-action-outage-reload-retains-pending-and-reconnects-with-server-ack',result:'PASS'})
  await travel('LABOR_FIELD','S3',true);for(const id of ['A05_STRIPS','A05_WEAVE','A06_DIG','A06_BASKET','A10_LISTEN','A10_CHANT'])await doStep(id)
  await shot('21-S3-natural-night-payoffs')
  await travel('FIELD_COMMUNITY','S4',true);for(const id of ['A07_WATCH','A07_CHORUS','A09_LISTEN','A09_FAREWELL','A11_BROWSE','A11_CONNECT'])await doStep(id)
  await approach('A23_CAMPAIGN');await page.keyboard.press('e');const cedar=page.locator('[data-activity="A23"]')
  await expect(cedar.getByRole('button',{name:/Đánh dấu đã đọc trọn/})).toBeDisabled()
  for(const name of [/1\. /,/2\. /,/3\. /,/4\. /])await cedar.getByRole('button',{name}).click()
  expect((await stateFor(token1)).activities.includes('A23_CAMPAIGN')).toBe(false)
  await cedar.getByRole('button',{name:/Đánh dấu đã đọc trọn/}).click();await expect.poll(async()=>(await stateFor(token1)).activities.includes('A23_CAMPAIGN')).toBe(true);m2Targets.push('A23_CAMPAIGN')
  await travel('COMMUNITY_LABOR','S2',true);await travel('LABOR_KITCHEN','L1-C',true);await travel('KITCHEN_MIDDLE','L2-A');await travel('MIDDLE_REST','L2-C');await travel('REST_MEETING','L2-B')
  for(const id of ['L2B_RECORDS','L2B_LETTER'])await doStep(id)
  const standaloneLetter=page.locator('.lw-dialog [data-activity="A21"]')
  await standaloneLetter.getByRole('checkbox').check();await standaloneLetter.getByRole('textbox',{name:'Lời nhắn suy ngẫm của bạn',exact:true}).fill('PRIVATE_STANDALONE_QA');await standaloneLetter.getByRole('button',{name:'Lưu lá thư gửi tương lai (A21)',exact:true}).click()
  await page.getByRole('button',{name:/Atlas ký ức/}).click();await page.getByRole('button',{name:'Xóa toàn bộ dữ liệu sáng tạo cá nhân (A18–A21) trên thiết bị này',exact:true}).click();await page.getByRole('button',{name:'Không gian',exact:true}).click();await expect(standaloneLetter.getByRole('textbox',{name:'Lời nhắn suy ngẫm của bạn',exact:true})).not.toHaveValue('PRIVATE_STANDALONE_QA')
  result.checks.push({id:'M2-delete-clears-private-letter-in-underlying-dialog-as-well-as-Atlas',result:'PASS'})
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await ready('L2-B');await expect.poll(async()=>(await stateFor(token1)).checkpoint.zone).toBe('L2-B')
  const m2State=await stateFor(token1);expect(m2State.activities.length).toBe(27);expect(m2State.facts).toEqual(finalPrimary.facts);expect(m2State.foundations).toEqual(finalPrimary.foundations)
  const fresh=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),freshPage=await fresh.newPage()
  await freshPage.addInitScript(({user,token})=>{for(const[k,v]of Object.entries({timelens_user_id:user.id,timelens_email:user.email,timelens_token:token,timelens_display_name:'M2 Fresh QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{user:user1,token:token1})
  await freshPage.goto(base+'/living-world',{waitUntil:'domcontentloaded',timeout:60000});const freshConsent=freshPage.getByTestId('consent-decline');if(await freshConsent.count())await freshConsent.click();await freshPage.waitForFunction(()=>JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').zone==='L2-B')
  await freshPage.getByRole('button',{name:/Atlas ký ức/}).click();await expect(freshPage.locator('[data-activity-item="A23"]')).toHaveAttribute('data-completed','true');await expect(freshPage.locator('[data-activity-item="A17"]')).toHaveAttribute('data-activity-status','LOCKED');await expect(freshPage.locator('[data-chain="C06"]')).toHaveAttribute('data-unlocked','false');await freshPage.screenshot({path:path.join(out,'22-M2-fresh-browser-server-resume.png')});await fresh.close()
  result.m2Continuation={visitedZones:[...result.visitedZones],activitiesPerformed:m2Targets,serverState:m2State,scope:'18 zones visited via UI from clean primary account; private media tested separately; A17 source gate and full A24 media remain open'}
  result.checks.push({id:'M2-natural-18-zone-continuation-new-activities-durable-in-clean-browser-no-extra-facts',result:'PASS'})
 }

 // --- PART 2: ALTERNATE DISCOVERY ORDER (Q3 STRUCTURE before Q2 AIR, Q5 CARE before Q4 KITCHEN) ---
 if(user2&&token2){
  expect((await stateFor(token2)).facts).toEqual([])
  await page.evaluate(({user,token})=>{
   for(const[k,v]of Object.entries({timelens_user_id:user.id,timelens_email:user.email,timelens_token:token,timelens_display_name:'M1 Alt Order QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)
  },{user:user2,token:token2})
  await page.reload({waitUntil:'domcontentloaded',timeout:60000})
  await ready('S0')
  // Skip intro straight to machine -> 01/1967 -> Ben Duoc -> S1
  await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay',exact:true}).click()
  await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-arrived')==='MACHINE')
  await page.getByRole('button',{name:/01\/1967 · Củ Chi/}).click()
  await page.getByRole('button',{name:/Bến Dược · site tham chiếu tái dựng/}).click()
  await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click()
  await ready('S1')
  await approach('Q1_TRAIL');await page.keyboard.press('e')
  await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
  await approach('Q1_HATCH');await page.keyboard.press('e')
  await ready('L1-A')
  await expect.poll(async()=>(await stateFor(token2)).foundations.includes('MS_FOUNDATION_ENTRANCE')).toBe(true)

  // Go L1-A -> L1-D first (skip Q2 in L1-B!)
  await travel('ENTRANCE_STRUCTURE','L1-D',true)
  for(const t of ['STRUCT_LAYER_1','STRUCT_LINK_12']){
   await approach(t);await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
   await expect.poll(async()=>(await stateFor(token2)).facts.includes(t)).toBe(true)
  }
  // Pass through L1-B and L1-C without doing Q2 or Q4 -> down to L2-A
  await travel('CALLBACK_L1-D','L1-B',true)
  await travel('AIR_KITCHEN','L1-C')
  await travel('KITCHEN_MIDDLE','L2-A')
  for(const t of ['STRUCT_LAYER_2','STRUCT_LINK_23']){
   await approach(t);await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
   await expect.poll(async()=>(await stateFor(token2)).facts.includes(t)).toBe(true)
  }
  await travel('LAYER_DEEP','L3-A')
  await approach('STRUCT_LAYER_3');await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token2)).facts.includes('STRUCT_LAYER_3')).toBe(true)
  if(await assistBtn.getAttribute('aria-expanded')==='false')await assistBtn.click()
  await page.locator('.lw-workbench').getByRole('combobox',{name:'Lớp bắt đầu',exact:true}).selectOption('STRUCT_LAYER_1')
  await page.locator('.lw-workbench').getByRole('combobox',{name:'Lớp kết thúc',exact:true}).selectOption('STRUCT_LAYER_2')
  await page.locator('.lw-workbench').getByRole('button',{name:'Đặt đường nối',exact:true}).click()
  await page.locator('.lw-workbench').getByRole('combobox',{name:'Lớp bắt đầu',exact:true}).selectOption('STRUCT_LAYER_2')
  await page.locator('.lw-workbench').getByRole('combobox',{name:'Lớp kết thúc',exact:true}).selectOption('STRUCT_LAYER_3')
  await page.locator('.lw-workbench').getByRole('button',{name:'Đặt đường nối',exact:true}).click()
  await page.locator('.lw-workbench').getByRole('button',{name:'Ghép thành hệ thống',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token2)).foundations.includes('MS_FOUNDATION_STRUCTURE')).toBe(true)
  if(await assistBtn.getAttribute('aria-expanded')==='true')await assistBtn.click()
  expect((await stateFor(token2)).callbackAvailable).toBe(false)

  // Complete Q5 (CARE) before Q4 (KITCHEN): L3-A -> L3-B -> L3-C
  await travel('DEEP_CARE','L3-B')
  for(const [t,f] of [['A15_CLOTH','MEDICAL_PREPARATION_INSPECTED'],['A15_CARE','MEDICAL_SUPPORT_CONNECTED']]){
   await approach(t);await page.keyboard.press('e')
   await(await openProof()).getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
   await expect.poll(async()=>(await stateFor(token2)).facts.includes(f)).toBe(true)
  }
  await travel('CARE_WATER','L3-C')
  for(const [t,f] of [['A14_WATER','WATER_STORAGE_INSPECTED'],['A14_SHARE','WATER_USES_CONNECTED']]){
   await approach(t);await page.keyboard.press('e')
   await(await openProof()).getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
   await expect.poll(async()=>(await stateFor(token2)).facts.includes(f)).toBe(true)
  }
  await(await openProof()).getByRole('button',{name:'Kết nối nước và chăm sóc',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token2)).foundations.includes('MS_FOUNDATION_CARE')).toBe(true)
  expect((await stateFor(token2)).kitchenCareCallback).toBe('LOCKED')

  // Return to L1-C and complete Q4 (KITCHEN after CARE): callback immediately unlocks without replaying Q5
  await travel('WATER_CARE','L3-B')
  await travel('CARE_DEEP','L3-A')
  await travel('LAYER_BACK','L2-A')
  await travel('MIDDLE_KITCHEN','L1-C')
  for(const [t,f] of [['A02_PREPARE','KITCHEN_HEARTH_INSPECTED'],['A02_SMOKE','KITCHEN_SMOKE_INSPECTED']]){
   await approach(t);await page.keyboard.press('e')
   await(await openProof()).getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
   await expect.poll(async()=>(await stateFor(token2)).facts.includes(f)).toBe(true)
  }
  await(await openProof()).getByRole('button',{name:'Lần theo các vật thể trong phòng',exact:true}).click()
  await expect(page.locator('[data-kitchen-inspection]')).toHaveAttribute('data-kitchen-inspection','true')
  await page.waitForTimeout(250)
  for(const node of ['HEARTH','CHANNEL','DIFFUSION','COMMUNITY']){
   const id='Q4_'+node
   const at=await page.locator(`[data-scene-target="${id}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy}))
   const rect=await page.locator('canvas').boundingBox()
   await page.mouse.click(rect.x+at.x,rect.y+at.y)
   await page.waitForTimeout(250)
  }
  await expect.poll(async()=>(await stateFor(token2)).foundations.includes('MS_FOUNDATION_KITCHEN')).toBe(true)
  await expect.poll(async()=>(await stateFor(token2)).kitchenCareCallback).toBe('AVAILABLE')
  await page.locator('.lw-reveal').getByRole('button',{name:'Lưu góc nhìn mới về bếp',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token2)).kitchenCareCallback).toBe('VIEWED')

  // Return to L1-B and complete Q2 (AIR after STRUCTURE): AIR+STRUCTURE callback unlocks without replaying Q3
  await travel('KITCHEN_AIR','L1-B')
  for(const [t,f] of [['AIR_SURFACE_OPENING','AIR_OPENING_INSPECTED'],['AIR_PASSAGE','AIR_PASSAGE_INSPECTED'],['AIR_INTERIOR','AIR_INTERIOR_INSPECTED']]){
   await approach(t);await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
   await expect.poll(async()=>(await stateFor(token2)).facts.includes(f)).toBe(true)
  }
  if(await assistBtn.getAttribute('aria-expanded')==='false')await assistBtn.click()
  for(const label of ['Mặt đất','Đoạn dẫn','Không gian trong']){
   await page.locator('.lw-workbench').getByRole('button',{name:label,exact:true}).click()
  }
  await page.locator('.lw-workbench').getByRole('button',{name:'Thử đường nối',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token2)).facts.includes('AIR_PATH_CORRECT')).toBe(true)
  await page.locator('.lw-workbench').getByRole('button',{name:'Nối thông khí ↔ điều kiện sinh hoạt',exact:true}).click()
  await expect.poll(async()=>(await stateFor(token2)).foundations.includes('MS_FOUNDATION_AIR')).toBe(true)
  if(await assistBtn.getAttribute('aria-expanded')==='true')await assistBtn.click()
  await expect.poll(async()=>(await stateFor(token2)).callbackAvailable).toBe(true)
  result.alternateOrderFinalState=await stateFor(token2)
  result.checks.push({id:'M1-alternate-order-Q3-before-Q2-and-Q5-before-Q4-unlocks-both-callbacks',result:'PASS'})
 }

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
 if(video)await video.saveAs(path.join(out,'m1-natural-journey.webm')).catch(()=>{})
 await browser?.close()
 server.kill()
}
