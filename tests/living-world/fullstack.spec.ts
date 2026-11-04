import {releaseA04} from './a04.helpers'
import {prepareA04} from './a04.helpers'
import {test,expect} from '@playwright/test'
async function ensureControls(page:import('@playwright/test').Page){const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click()}
import {createHmac,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
// R2 QA_DATA_OR_STATE: the fixed accounts (…9001/9003/9004) carry old S2/FREE checkpoints on the QA DB and must not be reset.
// Each test now creates its own synthetic profile on the local QA DB (container timelens-g2-review-20261102, not production).
function freshAccount(label:string){const id=randomUUID(),email=`${label}-${id.slice(0,8)}@test.invalid`
 execFileSync('docker',['exec','timelens-g2-review-20261102','psql','-U','g2audit','-d',process.env.LW_QA_DB??'g2_final','-v','ON_ERROR_STOP=1','-c',`insert into profiles(id,email,display_name,email_verified) values('${id}','${email}','Synthetic ${label}',true)`])
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:email,userId:id,role:'USER',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')
 return {id,email,token:`${h}.${p}.${createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(`${h}.${p}`).digest('base64url')}`}}
// Synthetic account on the disposable local G2 database only; never a deployment credential.
const endpoint=(process.env.LW_API_ORIGIN??'http://127.0.0.1:8089')+'/api/v2/worlds/cuchi-mach-song'

test('S2 manual choreography persists/replays/offline-resumes without granting narrative facts',async({page,request,context})=>{
 const {id,email,token:t}=freshAccount('s2-review')
 await page.addInitScript(({id,email,t})=>{for(const [k,v] of Object.entries({timelens_token:t,timelens_user_id:id,timelens_email:email,timelens_display_name:'Synthetic S2 QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{id,email,t})
 const state=async()=>{const r=await request.get(`${endpoint}/state`,{headers:{Authorization:`Bearer ${t}`}});expect(r.status()).toBe(200);return(await r.json()).data}
 await page.goto('/living-world?debug=1');await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click();await page.getByLabel('Cách khám phá').selectOption('FREE');await ensureControls(page);await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click();await prepareA04(page)
 for(let i=0;i<6;i++){for(const name of ['Nắm chày','Nâng chày','Hạ chày'])await page.getByRole('button',{name,exact:true}).click()}
 await expect.poll(async()=>(await state()).checkpoint.rice).toBe(6);expect((await state()).facts).toEqual([]);expect((await state()).foundations).toEqual([])
 await page.getByRole('button',{name:'Làm lại một mẻ · không thưởng thêm'}).click();await expect.poll(async()=>(await state()).checkpoint.rice).toBe(0);await page.getByRole('button',{name:'Sẵn sàng · đến lượt tôi'}).click()
 await context.setOffline(true);for(const name of ['Nắm chày','Nâng chày','Hạ chày'])await page.getByRole('button',{name,exact:true}).click();expect((await state()).checkpoint.rice).toBe(0)
 await context.setOffline(false);await expect.poll(async()=>(await state()).checkpoint.rice).toBe(1);await page.reload();await expect(page.getByRole('heading',{level:1})).toHaveText('Góc lao động · một bữa ăn bắt đầu ở đây');await page.getByLabel('Cách khám phá').selectOption('FREE');await ensureControls(page);await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click();await expect(page.getByText('Đã phối hợp 1/6',{exact:false})).toBeVisible();expect((await state()).facts).toEqual([])
})
test('authenticated inspection is server-confirmed, retained offline and restored after refresh',async({page,request,context})=>{
 const {id:user,token}=freshAccount('inspection')
 await page.addInitScript(({token,user})=>{localStorage.setItem('timelens_token',token);localStorage.setItem('timelens_user_id',user);localStorage.setItem('timelens_display_name','G2 internal tester');localStorage.setItem('timelens_email','g2-browser@test.invalid');localStorage.setItem('timelens_role','USER');localStorage.setItem('timelens_tier','FREE');localStorage.setItem('timelens_email_verified','1')},{token,user})
 const state=async()=>{const response=await request.get(`${endpoint}/state`,{headers:{Authorization:`Bearer ${token}`}});expect(response.status()).toBe(200);return (await response.json()).data}
 await page.goto('/living-world?debug=1');await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click()
 await expect.poll(async()=>(await state()).revision).toBeGreaterThan(0)
 await ensureControls(page);await page.getByRole('button',{name:'Dấu thông hơi trên mặt đất',exact:true}).last().click();await page.getByRole('button',{name:'Ghi điều vừa quan sát'}).click()
 await expect.poll(async()=>(await state()).facts.includes('AIR_OPENING_INSPECTED')).toBe(true)
 await context.setOffline(true)
 await page.getByRole('button',{name:'Đoạn nối trong lòng đất',exact:true}).last().click();await page.getByRole('button',{name:'Ghi điều vừa quan sát'}).click()
 await expect(page.getByText(/hành động chờ xác nhận/)).toBeVisible()
 expect((await state()).facts).not.toContain('AIR_PASSAGE_INSPECTED')
 await context.setOffline(false)
 await expect.poll(async()=>(await state()).facts.includes('AIR_PASSAGE_INSPECTED')).toBe(true)
 await page.reload();await page.getByRole('button',{name:/Atlas ký ức/}).click();await expect(page.getByText('Đoạn dẫn nối các không gian',{exact:true})).toBeVisible()
 await page.getByRole('button',{name:'Không gian',exact:true}).click()
 await ensureControls(page);await page.getByRole('button',{name:'Không gian bên trong',exact:true}).last().click();await page.getByRole('button',{name:'Ghi điều vừa quan sát'}).click()
 await expect.poll(async()=>(await state()).facts.includes('AIR_INTERIOR_INSPECTED')).toBe(true)
 for(const name of ['Mặt đất','Đoạn dẫn','Không gian trong'])await page.getByRole('button',{name,exact:true}).click()
 await page.getByRole('button',{name:'Thử đường nối',exact:true}).click();await expect(page.getByRole('button',{name:'Nối thông khí ↔ điều kiện sinh hoạt'})).toBeEnabled();await page.getByRole('button',{name:'Nối thông khí ↔ điều kiện sinh hoạt'}).click()
 await expect.poll(async()=>(await state()).facts.includes('AIR_MEANING_CONFIRMED')).toBe(true)
 for(const [zone,targets] of [
  ['Thành phố nhiều tầng · lớp trên',[['Quan sát lớp trên','STRUCT_LAYER_1'],['Quan sát điểm chuyển 1–2','STRUCT_LINK_12']]],
  ['Thành phố nhiều tầng · lớp giữa',[['Quan sát lớp giữa','STRUCT_LAYER_2'],['Quan sát điểm chuyển 2–3','STRUCT_LINK_23']]],
  ['Thành phố nhiều tầng · lớp dưới',[['Quan sát lớp dưới','STRUCT_LAYER_3']]],
 ] as [string,string[][]][]){
  await page.getByRole('button',{name:zone,exact:true}).click()
  for(const [label,code] of targets){await page.getByRole('button',{name:label,exact:true}).last().click();await page.getByRole('button',{name:'Ghi điều vừa quan sát'}).click();await expect.poll(async()=>(await state()).facts.includes(code)).toBe(true)}
 }
 let releaseResponse!:()=>void,proofReached!:()=>void
 const gate=new Promise<void>(resolve=>{releaseResponse=resolve}),reached=new Promise<void>(resolve=>{proofReached=resolve})
 await page.route('**/api/v2/worlds/cuchi-mach-song/actions',async route=>{
  if(route.request().postDataJSON()?.payload?.action==='CONFIRM_STRUCTURE_MEANING'){const response=await route.fetch();proofReached();await gate;await route.fulfill({response})}else await route.continue()
 })
 await page.getByRole('button',{name:'Đặt đường nối'}).click();await page.getByLabel('Lớp bắt đầu').selectOption('STRUCT_LAYER_2');await page.getByLabel('Lớp kết thúc').selectOption('STRUCT_LAYER_3');await page.getByRole('button',{name:'Đặt đường nối'}).click();await page.getByRole('button',{name:'Ghép thành hệ thống'}).click()
 await reached;await page.getByRole('button',{name:/Atlas ký ức/}).click();releaseResponse()
 await expect(page.getByRole('heading',{name:'Thông khí ↔ cấu trúc không gian'})).toBeVisible()
 expect((await state()).moment).toBe('AVAILABLE')
 await page.getByRole('button',{name:'Không gian',exact:true}).click()
 await expect(page.getByRole('button',{name:'Nhìn lại thông khí',exact:true})).toBeVisible()
 await expect.poll(async()=>(await state()).moment).toBe('PRESENTED')
 await page.reload();await expect(page.getByRole('button',{name:'Tiếp tục góc nhìn mới'})).toBeVisible();await expect(page.locator('.lw-moment')).toHaveCount(0)
 await page.getByRole('button',{name:'Tiếp tục góc nhìn mới'}).click()
 await page.getByRole('button',{name:'Nhìn lại thông khí',exact:true}).click();await page.getByRole('button',{name:'Lưu góc nhìn này'}).click()
 await expect.poll(async()=>(await state()).moment).toBe('VIEWED');expect((await state()).callbackAvailable).toBe(true)
 const profile=await request.get((process.env.LW_API_ORIGIN??'http://127.0.0.1:8089')+'/api/profile/me',{headers:{Authorization:`Bearer ${token}`}});expect(profile.status()).toBe(200)
 await page.screenshot({path:(process.env.LW_EVIDENCE_DIR??'../docs/superpowers/g2/2026-11-01-living-world/evidence/')+'account-atlas.png',fullPage:true})
 const denied=await request.post(`${endpoint}/actions`,{data:{actionId:crypto.randomUUID(),releaseVersion:1,expectedRevision:0,actionType:'START_EXPERIENCE',targetId:'',payload:{}}});expect([401,403]).toContain(denied.status())
})
test('logout and account switch clear owned activity, dialogue and facts',async({page,request})=>{
 const {id:user,token}=freshAccount('switch-a')
 // explicit precondition (was implicit fixture state): account A's checkpoint is L1-B
 for(const [i,[actionType,targetId]] of ([['START_EXPERIENCE',''],['SAVE_CHECKPOINT','L1-B']] as const).entries()){const r=await request.post(`${endpoint}/actions`,{headers:{Authorization:`Bearer ${token}`},data:{actionId:randomUUID(),releaseVersion:1,expectedRevision:i,actionType,targetId,payload:{}}});expect(r.status()).toBe(200)}
 await page.addInitScript(({token,user})=>{localStorage.setItem('timelens_token',token);localStorage.setItem('timelens_user_id',user);localStorage.setItem('timelens_display_name','G2 internal tester');localStorage.setItem('timelens_email','g2-browser@test.invalid');localStorage.setItem('timelens_role','USER');localStorage.setItem('timelens_tier','FREE');localStorage.setItem('timelens_email_verified','1')},{token,user})
 await page.goto('/living-world?debug=1');await page.getByTestId('consent-decline').click()
 if(await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).isVisible())await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click()
 await expect(page.getByRole('heading',{level:1})).toHaveText('Hơi thở của lòng đất')
 await page.getByLabel('Cách khám phá').selectOption('FREE');await ensureControls(page);await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click();await releaseA04(page,'LEFT')
 await expect(page.getByText('Đã phối hợp 1/6',{exact:false})).toBeVisible()
 await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('timelens_'))localStorage.removeItem(key);window.dispatchEvent(new CustomEvent('histar:session-cleared'))})
 await expect(page.getByText('Chế độ khách:',{exact:false})).toBeVisible();await expect(page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'})).toBeVisible({timeout:5000});await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click()
 await page.getByLabel('Cách khám phá').selectOption('FREE');await ensureControls(page);await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click();await expect(page.getByText('Đã phối hợp 0/6',{exact:false})).toBeVisible()
 const {id:nextUser,token:nextToken}=freshAccount('switch-b')
 await page.evaluate(({nextUser,nextToken})=>{localStorage.setItem('timelens_token',nextToken);localStorage.setItem('timelens_user_id',nextUser);localStorage.setItem('timelens_display_name','G2 account B');localStorage.setItem('timelens_email','g2-account-b@test.invalid');localStorage.setItem('timelens_role','USER');localStorage.setItem('timelens_tier','FREE');localStorage.setItem('timelens_email_verified','1');window.dispatchEvent(new CustomEvent('histar:session-refreshed'))},{nextUser,nextToken})
 await expect(page.getByText('Bản thử tài khoản',{exact:false})).toBeVisible();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click()
 await page.getByLabel('Cách khám phá').selectOption('FREE');await ensureControls(page);await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click();await expect(page.getByText('Đã phối hợp 0/6',{exact:false})).toBeVisible()
 const next=await request.get(`${endpoint}/state`,{headers:{Authorization:`Bearer ${nextToken}`}});expect((await next.json()).data.facts).toEqual([])
})

// R2 A3 (Codex backlog: "A→B with Q1 pending"): a Q1 observation queued offline by account A must never surface,
// sync or count for account B, and must still reach A's canonical record once A is back online. Synthetic QA accounts only.
test('Q1 evidence queued offline by account A stays with A across an A→B switch',async({page,request,context})=>{
 const a=freshAccount('q1-switch-a'),b=freshAccount('q1-switch-b')
 const state=async(token:string)=>{const r=await request.get(`${endpoint}/state`,{headers:{Authorization:`Bearer ${token}`}});expect(r.status()).toBe(200);return (await r.json()).data}
 for(const [i,[actionType,targetId]] of ([['START_EXPERIENCE',''],['SAVE_CHECKPOINT','S1']] as const).entries()){const r=await request.post(`${endpoint}/actions`,{headers:{Authorization:`Bearer ${a.token}`},data:{actionId:randomUUID(),releaseVersion:1,expectedRevision:i,actionType,targetId,payload:{}}});expect(r.status()).toBe(200)}
 const login=(acc:{id:string,email:string,token:string})=>page.evaluate(({id,email,token})=>{for(const [k,v] of Object.entries({timelens_token:token,timelens_user_id:id,timelens_email:email,timelens_display_name:'Synthetic Q1 QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v);window.dispatchEvent(new CustomEvent('histar:session-refreshed'))},acc)
 await page.addInitScript(({id,email,token})=>{if(sessionStorage.getItem('q1-switch-init'))return;sessionStorage.setItem('q1-switch-init','1');for(const [k,v] of Object.entries({timelens_token:token,timelens_user_id:id,timelens_email:email,timelens_display_name:'Synthetic Q1 QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},a)
 await page.goto('/living-world');await page.getByTestId('consent-decline').click()
 await expect(page.getByRole('heading',{level:1})).toHaveText(/Bìa rừng/,{timeout:60000})
 await context.setOffline(true)
 await ensureControls(page);await page.locator('.lw-alternatives [data-target="Q1_TRAIL"]').click()
 await page.locator('.lw-prompt[data-target="Q1_TRAIL"]').click({timeout:30000})
 await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click()
 await expect(page.getByText(/hành động chờ xác nhận/)).toBeVisible()
 // precondition: nothing reached the server while offline
 expect((await state(a.token)).facts).not.toContain('Q1_TRAIL_OBSERVED')
 // Keep world delivery unavailable while permitting B's real /profile/me authentication.
 await page.route('**/api/v2/worlds/**',route=>route.abort())
 await context.setOffline(false)
 await login(b)
 await expect(page.getByText('Bản thử tài khoản',{exact:false})).toBeVisible()
 await expect(page.getByText(/hành động chờ xác nhận/)).toHaveCount(0)
 await page.unroute('**/api/v2/worlds/**')
 await page.getByRole('button',{name:'Đồng bộ',exact:true}).first().click().catch(()=>{})
 await expect.poll(async()=>(await state(b.token)).facts,{timeout:10000}).toEqual([])
 const hud=await page.locator('.lw-game').innerText();expect(hud).not.toMatch(/Q1_|ENTRANCE_CONFIRMED/)
 await login(a)
 await expect.poll(async()=>(await state(a.token)).facts,{timeout:30000}).toContain('Q1_TRAIL_OBSERVED')
 expect((await state(b.token)).facts).toEqual([])
})
