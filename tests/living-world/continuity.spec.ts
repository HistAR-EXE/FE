import {test,expect,type Page,type TestInfo} from '@playwright/test'
import {createHmac,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {writeFileSync} from 'node:fs'
import {prepareA04} from './a04.helpers'
import {chooseEra} from './p2.helpers'
// LW_EVIDENCE_DIR lets later gate runs keep the original proof evidence untouched.
const evidence=process.env.LW_EVIDENCE_DIR??'../docs/superpowers/m1/2026-11-02-continuity-proof/evidence/'
// R2 E2E: a target observation is asserted only after the Avatar has really arrived at THAT target (precondition, not a
// longer assertion timeout). Tools/strokes/routes/link points are not walk targets.
async function hit(page:Page,id:string){
 const modelSelection=/^(AIR_|STRUCT_LAYER_)/.test(id)&&await page.locator('.lw-scene-hud button[aria-pressed="true"]').count()>0
 await hitRaw(page,id)
 if(modelSelection)return // Model endpoints select a relation; the Avatar stays in place.
 if(/^(STROKE_|RICE_|ROUTE_|LINK_|NPC_)/.test(id))return
 await expect.poll(async()=>(await page.locator('main.lw-root').getAttribute('data-arrived'))===id||await page.locator(`.lw-dialog[data-target="${id}"]`).count()>0,{timeout:30000,message:'Avatar arrives at '+id}).toBe(true)
}
async function hitRaw(page:Page,id:string){
 // Shader warm-up creates labels before the first projected frame. Await the scene, not an invalid 2D walk fallback in model mode.
 await expect(page.locator('.lw-canvas canvas')).toHaveAttribute('data-readiness','ready')
 const label=page.locator(`[data-scene-target="${id}"]`);await expect(label).toHaveCount(1)
 const b=(await page.locator('.lw-canvas').boundingBox())!,sheet=await page.locator('.lw-compass').boundingBox()
 const p=await label.evaluate(el=>({x:Number((el as HTMLElement).dataset.cx),y:Number((el as HTMLElement).dataset.cy),hidden:(el as HTMLElement).hidden}))
 const covered=!!sheet&&b.x+p.x>=sheet.x&&b.x+p.x<=sheet.x+sheet.width&&b.y+p.y>=sheet.y-8
 if(!p.hidden&&!covered&&p.x>8&&p.y>90&&p.x<b.width-8&&p.y<b.height-8){await page.mouse.click(b.x+p.x,b.y+p.y);if(await page.locator('.lw-canvas canvas').getAttribute('data-last-pick')===id)return}
 // G3 third-person camera: an off-screen target is reached in-world (E when standing near it) or via the in-world exits / 2D equivalents.
 if(await page.locator(`.lw-prompt[data-target="${id}"]`).count()||await page.locator(`.lw-dialog[data-target="${id}"]`).count()){await page.locator('.lw-canvas canvas').focus();await page.keyboard.press('e');return} // R2 WC05: only E on THIS target (a dialog of another target used to swallow the action)
 if(id.startsWith('ROUTE_')){const d=page.locator('.lw-world-exits');if(!(await d.evaluate(el=>(el as HTMLDetailsElement).open)))await d.locator('summary').click();await d.locator(`[data-target="${id}"]`).click();return}
 const t=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await t.getAttribute('aria-expanded')==='false')await t.click()
 await page.locator(`.lw-alternatives [data-target="${id}"]`).first().click()
}
async function menu(page:Page){const m=page.getByRole('button',{name:'Menu',exact:true});if(await m.count()&&await m.getAttribute('aria-expanded')==='false')await m.click()}
async function open(page:Page){await page.goto('/living-world?continuity=1');if(await page.getByTestId('consent-decline').isVisible())await page.getByTestId('consent-decline').click();await expect(page.locator('.lw-zone-nav')).toHaveCount(0);await expect(page.locator('canvas')).toBeVisible()}
async function station(page:Page){
 // S0 has a measured cold shader initialization task >5 s. Begin the 3D journey after readiness;
 // preserve the original 5 s dialogue assertions (loading smoothness remains a separate OPEN gate).
 await expect(page.locator('canvas')).toHaveAttribute('data-readiness','ready',{timeout:30000})
 await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Kha · người giữ trạm'})).toBeVisible()
 await expect(page.locator('main.lw-root')).toHaveAttribute('data-arrived','KHA')
 await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Cỗ máy thời gian',exact:true})).toBeVisible()
}
async function depart(page:Page){await station(page);await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click()
 // G3 immersive / Prologue P5 (FINAL Baseline): the Story journey lands in S1/Q1; S2 is reached in-world from S1.
 await expect(page.getByRole('heading',{level:1})).toContainText('Bìa rừng');await expect(page.locator('.lw-transfer')).toHaveCount(0)
 await route(page,'FOREST_LABOR','Góc lao động');
 // Baseline game-first UI: labels are hidden by default. Preserve the visibility check after explicit opt-in.
 await expect(page.locator('[data-scene-target="A04"]')).toBeHidden();await menu(page);await page.getByRole('button',{name:'Hiện nhãn gợi ý trong cảnh',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click();await expect(page.locator('[data-scene-target="A04"]')).toBeVisible()}
async function route(page:Page,id:string,title:string){await page.keyboard.press('Escape');await hit(page,'ROUTE_'+id);await expect(page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true})).toBeVisible();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toContainText(title);await expect(page.locator('.lw-transfer')).toHaveCount(0);await expect(page.locator('.lw-zone-nav')).toHaveCount(0)}
async function inspect(page:Page,id:string){await hit(page,id);await expect(page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true})).toBeVisible();await hit(page,id);await expect(page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true})).toHaveCount(0)}

async function journey(page:Page,testInfo:TestInfo,state?:()=>Promise<{facts:string[];moment:string}>){
 await open(page);await depart(page);await page.screenshot({path:evidence+'s2-arrival.png'})
 await hit(page,'A04');await prepareA04(page)
 for(let i=0;i<6;i++)for(let action=0;action<3;action++)await hit(page,'STROKE_LEFT')
 await expect(page.locator('.lw-feedback')).toContainText('Mẻ gạo đã chuyển trạng thái')
 await route(page,'LABOR_AIR','Hơi thở')
 for(const id of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR'])await inspect(page,id)
 await page.getByRole('button',{name:'Nối đường khí trong mô hình',exact:true}).click()
 for(const id of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR'])await hit(page,id)
 if(state)await expect.poll(async()=>(await state()).facts.includes('AIR_PATH_CORRECT')).toBe(true);await hit(page,'LINK_AIR_LIFE');await expect(page.getByRole('button',{name:'Atlas ký ức · 5',exact:true})).toBeVisible({timeout:15000})
 await route(page,'AIR_STRUCTURE','lớp trên');for(const id of ['STRUCT_LAYER_1','STRUCT_LINK_12'])await inspect(page,id)
 await route(page,'LAYER_MIDDLE','lớp giữa');for(const id of ['STRUCT_LAYER_2','STRUCT_LINK_23'])await inspect(page,id)
 await route(page,'LAYER_DEEP','lớp dưới');await inspect(page,'STRUCT_LAYER_3')
 await page.getByRole('button',{name:'Nối các tầng trong mô hình',exact:true}).click()
 for(const id of ['STRUCT_LAYER_1','STRUCT_LAYER_2','STRUCT_LAYER_2','STRUCT_LAYER_3'])await hit(page,id)
 await expect(page.getByRole('button',{name:'Nhìn lại thông khí',exact:true})).toBeVisible({timeout:15000})
 await page.getByRole('button',{name:'Nhìn lại thông khí',exact:true}).click()
 await expect(page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true})).toBeVisible();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Nhìn lại: từ một lỗ mở đến cả hệ thống'})).toBeVisible();await page.getByRole('button',{name:'Lưu góc nhìn này',exact:true}).click();if(state)await expect.poll(async()=>(await state()).moment).toBe('VIEWED');await page.screenshot({path:evidence+'callback.png'})
 await route(page,'RETURN_L1-B','Trạm thời gian');await page.screenshot({path:evidence+'returned-present.png'})
 await expect(page.getByRole('button',{name:'Atlas ký ức · 11',exact:true})).toBeVisible()
 await page.reload();await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian');await expect(page.getByRole('button',{name:'Atlas ký ức · 11',exact:true})).toBeVisible()
 await testInfo.attach('continuous-walkthrough',{path:(await page.video()!.path()),contentType:'video/webm'})
}
test('WC01/02/03/10: uninterrupted Avatar route, A04, Q2/Q3 and substantive callback, no debug tabs',async({page},info)=>journey(page,info))

test('WC03/05: real PostgreSQL facts, offline action reconnect, checkpoint and no movement rewards',async({page,request,context},info)=>{
 const id=randomUUID(),email='continuity-'+id+'@test.invalid'
 execFileSync('docker',['exec','timelens-g2-review-20261102','psql','-U','g2audit','-d',process.env.LW_QA_DB??'g2_final','-v','ON_ERROR_STOP=1','-c',`insert into profiles(id,email,display_name,email_verified) values('${id}','${email}','Synthetic continuity QA',true)`])
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:email,userId:id,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),token=h+'.'+p+'.'+createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(h+'.'+p).digest('base64url')
 await page.addInitScript(({id,email,token})=>{for(const[k,v]of Object.entries({timelens_token:token,timelens_user_id:id,timelens_email:email,timelens_display_name:'Synthetic continuity QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{id,email,token})
 const state=async()=>{const r=await request.get((process.env.LW_API_ORIGIN??'http://127.0.0.1:8089')+'/api/v2/worlds/cuchi-mach-song/state',{headers:{Authorization:'Bearer '+token}});expect(r.status()).toBe(200);return(await r.json()).data}
 expect((await state()).facts).toEqual([])
 await journey(page,info,state)
 const complete=await state();expect(complete.facts).toHaveLength(11);expect(complete.foundations).toHaveLength(2);expect(complete.checkpoint.zone).toBe('S0');expect(complete.checkpoint.rice).toBe(6);expect(complete.moment).toBe('VIEWED')
 await context.setOffline(true);await menu(page);await page.getByLabel('Cách khám phá').selectOption('FREE');await expect(page.getByText(/hành động chờ xác nhận/)).toBeVisible();expect((await state()).mode).toBe('STORY');await context.setOffline(false);await expect.poll(async()=>(await state()).mode).toBe('FREE');await page.reload();await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian');expect((await state()).facts).toEqual(complete.facts)
 const ledger=execFileSync('docker',['exec','timelens-g2-review-20261102','psql','-U','g2audit','-d',process.env.LW_QA_DB??'g2_final','-At','-c',`select (select count(*) from xp_ledger where user_id='${id}'),(select count(*) from quest_reward_ledger where user_id='${id}'),total_points from profiles where id='${id}'`],{encoding:'utf8'}).trim();expect(ledger).toBe('0|0|0');writeFileSync(evidence+'postgres-continuity.json',JSON.stringify({syntheticAccount:id,beforeFacts:[],after:await state(),ledger,notice:'Synthetic automation, not a human participant; no facts seeded'},null,2))
})

test('WC04: cancel delayed lazy load retains origin; failure has explicit 2D return path',async({page})=>{
 // R2 WC04: the island tree GLBs no longer exist (replaced by procedural trees), so the old pattern matched 0 requests.
 // Delay+abort an asset S1 really loads, and prove the handler fired before asserting the recovery path.
 let aborted=0;await page.route('**/assets/tree_stump_01-*.glb',async r=>{await new Promise(resolve=>setTimeout(resolve,1500));aborted++;await r.abort()})
 await open(page);await station(page);await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await expect(page.locator('.lw-transfer')).toBeVisible();await page.getByRole('button',{name:'Hủy · giữ nơi đang đứng',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian');await page.waitForTimeout(4000);await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian')
 await hit(page,'MACHINE');await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await expect.poll(()=>aborted,{message:'the S1 asset request was intercepted'}).toBeGreaterThan(0);await expect(page.getByRole('heading',{name:'Chưa mở được không gian'})).toBeVisible();await page.getByRole('button',{name:'Tiếp tục bằng sơ đồ2D',exact:true}).click();await expect(page.locator('.lw-transfer')).toHaveCount(0);await expect(page.locator('.lw-map')).toBeVisible();await expect(page.getByRole('heading',{level:1})).toContainText('Bìa rừng') // P5 destination
})

test('WC07/10: mode changes preserve position; 2D contextual entry/exit uses no debug tabs',async({page})=>{
 await open(page);await depart(page);await menu(page);await page.getByLabel('Cách khám phá').selectOption('MEMORY');await expect(page.getByRole('heading',{name:'Điều gì có căn cứ, điều gì được diễn giải?'})).toBeVisible();await page.getByRole('button',{name:'Không gian',exact:true}).click();await menu(page);await page.getByLabel('Cách khám phá').selectOption('FREE');await expect(page.getByRole('heading',{level:1})).toContainText('Góc lao động');await menu(page);await page.getByRole('button',{name:'Dùng sơ đồ 2D',exact:true}).click()
 if(await page.locator('.lw-world-exits').getAttribute('open')===null)await page.locator('.lw-world-exits summary').click();await page.getByRole('button',{name:'Tới điểm · Từ đời sống tới thông khí',exact:true}).focus();await page.keyboard.press('Enter');await expect(page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true})).toBeVisible();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Hơi thở của lòng đất');await expect(page.locator('.lw-transfer')).toHaveCount(0)
 if(await page.locator('.lw-world-exits').getAttribute('open')===null)await page.locator('.lw-world-exits summary').click();await page.getByRole('button',{name:'Tới điểm · Trở về hiện tại',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian');await expect(page.locator('.lw-zone-nav')).toHaveCount(0)
})

test('WC06: logout during delayed portal cannot commit the old scene into guest session',async({page,request})=>{
 const id=randomUUID(),email='boundary-'+id+'@test.invalid'
 execFileSync('docker',['exec','timelens-g2-review-20261102','psql','-U','g2audit','-d',process.env.LW_QA_DB??'g2_final','-v','ON_ERROR_STOP=1','-c',`insert into profiles(id,email,display_name,email_verified) values('${id}','${email}','Synthetic boundary QA',true)`])
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:email,userId:id,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),token=h+'.'+p+'.'+createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(h+'.'+p).digest('base64url')
 await page.addInitScript(({id,email,token})=>{for(const[k,v]of Object.entries({timelens_token:token,timelens_user_id:id,timelens_email:email,timelens_display_name:'Synthetic boundary QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{id,email,token})
 await page.route('**/assets/s2Environment-*.js',async r=>{await new Promise(resolve=>setTimeout(resolve,4000));await r.continue()})
 await open(page);await station(page);await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await expect(page.locator('.lw-transfer')).toBeVisible()
 await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('timelens_'))localStorage.removeItem(k);window.dispatchEvent(new CustomEvent('histar:session-cleared'))})
 await expect(page.getByText('Chế độ khách:',{exact:false})).toBeVisible();await page.waitForTimeout(4500);await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian');await expect(page.getByRole('button',{name:'Atlas ký ức · 0',exact:true})).toBeVisible();await expect(page.locator('.lw-transfer')).toHaveCount(0)
 const r=await request.get((process.env.LW_API_ORIGIN??'http://127.0.0.1:8089')+'/api/v2/worlds/cuchi-mach-song/state',{headers:{Authorization:'Bearer '+token}});expect(r.status()).toBe(200);expect((await r.json()).data.checkpoint.zone).not.toBe('S2')
})

test('WC08: five real 3D round trips, frame/asset measurements on desktop only',async({page})=>{
 const started=Date.now();await open(page);const usable=Date.now()-started;await depart(page)
 const assets=await page.locator('canvas').evaluate(el=>({buffers:JSON.parse(el.dataset.s2Assets??'null'),render:JSON.parse(el.dataset.s2Render??'null')}))
 const frames=await page.evaluate(async()=>{const times:number[]=[];let last=performance.now();const begin=last;return new Promise<number[]>(resolve=>{function tick(now:number){times.push(now-last);last=now;if(now-begin<10000)requestAnimationFrame(tick);else resolve(times)}requestAnimationFrame(tick)})})
 const trips=[];for(let i=0;i<5;i++){const at=Date.now();await route(page,i?'RETURN_S1':'RETURN_S2','Trạm thời gian');await hit(page,'MACHINE');await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toContainText('Bìa rừng');await expect(page.locator('.lw-transfer')).toHaveCount(0);trips.push(Date.now()-at)}
 const gpu=await page.locator('canvas').evaluate(el=>{const gl=el.getContext('webgl2')!,ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'})
 const sorted=frames.slice(1).sort((a,b)=>a-b),stats={firstUsableMs:usable,frameCount:sorted.length,p50FrameMs:sorted[Math.floor(sorted.length*.5)],p90FrameMs:sorted[Math.floor(sorted.length*.9)],p10Fps:1000/sorted[Math.floor(sorted.length*.9)],roundTripsMs:trips,gpu,assets,scope:'10s desktop/headless SwiftShader + five 3D route cycles. Not Android, thermal or10-minute device measurement.'}
 writeFileSync(evidence+'desktop-performance.json',JSON.stringify(stats,null,2));expect(trips).toHaveLength(5);expect(assets.buffers.geometryAndInstanceBufferBytes).toBeLessThan(10*1024*1024)
})

test('WC05: cached authenticated offline reload preserves verified facts and queued dependency order',async({browser,request})=>{
 const context=await browser.newContext({serviceWorkers:'allow',viewport:{width:1440,height:960}}),page=await context.newPage(),id=randomUUID(),email='offline-'+id+'@test.invalid'
 execFileSync('docker',['exec','timelens-g2-review-20261102','psql','-U','g2audit','-d',process.env.LW_QA_DB??'g2_final','-v','ON_ERROR_STOP=1','-c',`insert into profiles(id,email,display_name,email_verified) values('${id}','${email}','Synthetic offline QA',true)`])
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:email,userId:id,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),token=h+'.'+p+'.'+createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(h+'.'+p).digest('base64url')
 await page.addInitScript(({id,email,token})=>{for(const[k,v]of Object.entries({timelens_token:token,timelens_user_id:id,timelens_email:email,timelens_display_name:'Synthetic offline QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{id,email,token})
 const state=async()=>{const r=await request.get((process.env.LW_API_ORIGIN??'http://127.0.0.1:8089')+'/api/v2/worlds/cuchi-mach-song/state',{headers:{Authorization:'Bearer '+token}});expect(r.status()).toBe(200);return(await r.json()).data}
 try{
  await open(page);await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));await depart(page);await route(page,'LABOR_AIR','Hơi thở');await inspect(page,'AIR_SURFACE_OPENING');await expect.poll(async()=>(await state()).facts.includes('AIR_OPENING_INSPECTED')).toBe(true);await menu(page);await page.getByLabel('Cách khám phá').selectOption('FREE');await expect.poll(async()=>(await state()).mode).toBe('FREE')
  await page.reload();await expect(page.getByRole('heading',{level:1})).toHaveText('Hơi thở của lòng đất');await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true)
  // The heading is restored before streamed assets finish; establish the warm scene before disconnecting.
  await expect(page.locator('.lw-canvas canvas[data-readiness="ready"]')).toBeVisible()
  await context.setOffline(true);await inspect(page,'AIR_PASSAGE');await expect(page.getByText(/hành động chờ xác nhận/)).toBeVisible();await page.reload();await expect(page.getByRole('heading',{level:1})).toHaveText('Hơi thở của lòng đất',{timeout:20000});await expect(page.getByRole('button',{name:'Atlas ký ức · 1',exact:true})).toBeVisible();await expect(page.getByText(/Đang dùng lần xác nhận gần nhất/)).toBeVisible();await menu(page);await expect(page.getByLabel('Cách khám phá')).toHaveValue('FREE');expect((await state()).facts).not.toContain('AIR_PASSAGE_INSPECTED')
  await context.setOffline(false);await expect.poll(async()=>(await state()).facts.includes('AIR_PASSAGE_INSPECTED'),{timeout:20000}).toBe(true);await page.reload();await expect(page.getByRole('button',{name:'Atlas ký ức · 2',exact:true})).toBeVisible();writeFileSync(evidence+'offline-reload.json',JSON.stringify({syntheticAccount:id,state:await state(),serviceWorker:true,scope:'Warm-cache offline reload and reconnect; not fresh install offline'},null,2))
 }finally{await context.setOffline(false);await context.close()}
})
