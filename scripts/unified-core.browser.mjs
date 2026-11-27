import {chromium,expect as baseExpect} from '@playwright/test'
const expect=baseExpect.configure({timeout:30000})
import {createHmac,randomUUID} from 'node:crypto'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {spawn} from 'node:child_process'
import path from 'node:path'
const [output,build,userFile]=process.argv.slice(2),out=path.resolve(output),base='http://127.0.0.1:5419',api=(process.env.LW_CORE_BACKEND??'http://127.0.0.1:8096')+'/api/v2/worlds/cuchi-mach-song'
mkdirSync(out,{recursive:true});const user=JSON.parse(readFileSync(userFile,'utf8').replace(/^\uFEFF/,''))
const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:user.email,userId:user.id,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),token=`${h}.${p}.${createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(`${h}.${p}`).digest('base64url')}`
const result={build,userId:user.id,scope:'Isolated real QA account + packaged JAR/PostgreSQL. Initial L1-C checkpoint only, no fact fixture. Q4/Q5/activity/callback/Q6 UI; Q1–Q3 structured HTTP prerequisite exercise explicitly disclosed. Not natural full journey or release acceptance.',checks:[],errors:[]},save=()=>writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2))
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5419','--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,HISTAR_LOCAL_API_TARGET:process.env.LW_CORE_BACKEND??'http://127.0.0.1:8096'}})
let browser,context,page,video
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']});context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',recordVideo:{dir:out,size:{width:1440,height:900}}});page=await context.newPage();video=page.video();page.setDefaultTimeout(20000);page.on('pageerror',e=>result.errors.push(e.message))
 const state=async()=>{const r=await context.request.get(api+'/state',{headers:{Authorization:`Bearer ${token}`}});expect(r.status()).toBe(200);return(await r.json()).data}
 const send=async(actionType,targetId,payload={})=>{const s=await state(),r=await context.request.post(api+'/actions',{headers:{Authorization:`Bearer ${token}`},data:{actionId:randomUUID(),releaseVersion:1,expectedRevision:s.revision,actionType,targetId,payload}});expect(r.status()).toBe(200);return(await r.json()).data}
 expect((await state()).facts).toEqual([]);await send('START_EXPERIENCE','');await send('SAVE_CHECKPOINT','L1-C')
 await page.addInitScript(({user,token})=>{for(const[k,v]of Object.entries({timelens_user_id:user.id,timelens_email:user.email,timelens_token:token,timelens_display_name:'Unified QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{user,token})
 await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click()
 const ready=async z=>{await page.waitForFunction(z=>document.querySelector('canvas')?.dataset.readiness==='ready'&&JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').zone===z,z,{timeout:60000});await expect(page.locator('main')).not.toHaveAttribute('data-transfer','on')}
 const shot=async n=>{await page.screenshot({path:path.join(out,n+'.png')});save()}
 const close=async()=>{const c=page.locator('.lw-dialog .lw-close');if(await c.isVisible())await c.click()}
 const approach=async id=>{await close();const a=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await a.getAttribute('aria-expanded')==='false')await a.click();await page.locator(`.lw-alternatives [data-target="${id}"]`).click();await page.waitForFunction(id=>document.querySelector('main')?.getAttribute('data-arrived')===id,id);await a.click();await page.locator('canvas').focus()}
 const travel=async(id,to)=>{console.log('TRAVEL',id);await approach('ROUTE_'+id);await page.keyboard.press('e');await ready(to);result.checks.push({id,result:'PASS'});save()}
 const proof=async()=>{const d=page.locator('.lw-core-proof');if(!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();return d}
 const observe=async(id,fact)=>{console.log('OBSERVE',id);await approach(id);await page.keyboard.press('e');await expect.poll(async()=>(await state()).activities.includes(id)).toBe(true);const d=await proof();if(!(await state()).facts.includes(fact))await d.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click();await expect.poll(async()=>(await state()).facts.includes(fact)).toBe(true);result.checks.push({id,fact,result:'PASS'});await shot(id)}
 await ready('L1-C')
 await approach('NPC_COOK');await page.keyboard.press('e');
 result.checks.push({id:'echo-capability',value:(await state()).echoPersistence});await shot('A16-before');
 await page.getByRole('button',{name:'Tiếng dụng cụ kể điều gì?',exact:true}).click();
 await shot('A16-clicked');
 await expect.poll(async()=>(await state()).checkpoint.kitchenEcho).toBe(true);expect((await state()).facts).toEqual([]);
 await page.reload();await ready('L1-C');await approach('NPC_COOK');await page.keyboard.press('e');
 await expect(page.getByRole('button',{name:'Nghe lại · tiếng dụng cụ',exact:true})).toBeVisible();
 result.checks.push({id:'A16-account-ack-resume-no-evidence',result:'PASS'});await shot('A16-resumed');await close();
 if(process.env.LW_CORE_PENDING_TEST==='true'){
  const pattern='**/api/v2/worlds/cuchi-mach-song/actions';await context.route(pattern,route=>route.abort('failed'))
  await approach('A02_PREPARE');await page.keyboard.press('e');await(await proof()).getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click();await expect(page.locator('.lw-core-proof')).toContainText('đang chờ máy chủ xác nhận');expect((await state()).facts).toEqual([]);result.checks.push({id:'network-failure-is-pending-not-canonical',result:'PASS'});await shot('pending-before-ack')
  await page.reload();await ready('L1-C');await approach('A02_PREPARE');await proof();await expect(page.locator('.lw-core-proof')).toContainText('đang chờ máy chủ xác nhận');result.checks.push({id:'pending-intents-survive-reload',result:'PASS'})
  await context.unroute(pattern);await page.evaluate(()=>window.dispatchEvent(new Event('online')));await expect.poll(async()=>(await state()).facts.includes('KITCHEN_HEARTH_INSPECTED')).toBe(true);result.checks.push({id:'pending-core-sync-after-reconnect',result:'PASS'})
 }
 await observe('A02_PREPARE','KITCHEN_HEARTH_INSPECTED');expect((await state()).foundations).toEqual([]);await observe('A02_SMOKE','KITCHEN_SMOKE_INSPECTED');const kitchen=await proof()
 await kitchen.getByRole('button',{name:'Lần theo các vật thể trong phòng',exact:true}).click();await expect(page.locator('main')).toHaveAttribute('data-arrived','Q4_HEARTH');
 // React arrival precedes the next rendered camera frame and its projected pick coordinates.
 await expect(page.locator('[data-kitchen-inspection]')).toHaveAttribute('data-kitchen-inspection','true');
 await expect(page.locator('canvas')).toHaveAttribute('data-model-camera-inside','true');
 const pickKitchen=async node=>{const id='Q4_'+node,at=await page.locator(`[data-scene-target="${id}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy})),rect=await page.locator('canvas').boundingBox();await page.mouse.click(rect.x+at.x,rect.y+at.y);await page.waitForTimeout(250);expect(await page.locator('canvas').getAttribute('data-last-pick')).toBe(id)};
 for(const node of ['HEARTH','CHANNEL','DIFFUSION'])await pickKitchen(node);
 await expect.poll(async()=>(await state()).facts.includes('KITCHEN_SMOKE_PATH_CORRECT')).toBe(true);await pickKitchen('COMMUNITY');await expect.poll(async()=>(await state()).foundations.includes('MS_FOUNDATION_KITCHEN')).toBe(true);result.checks.push({id:'Q4-spatial-canonical',result:'PASS'});await shot('Q4-confirmed');
 await travel('KITCHEN_MIDDLE','L2-A');await travel('MIDDLE_REST','L2-C');await approach('A13_BELONGINGS');await page.keyboard.press('e');await expect.poll(async()=>(await state()).activities.includes('A13_BELONGINGS')).toBe(true);await page.reload();await ready('L2-C');await approach('A13_BELONGINGS');await expect(page.getByRole('button',{name:'Đã thực hiện',exact:true})).toBeDisabled();result.checks.push({id:'activity-resume-after-reload',result:'PASS'})
 await travel('REST_MIDDLE','L2-A');await travel('LAYER_DEEP','L3-A');await travel('DEEP_CARE','L3-B');await observe('A15_CLOTH','MEDICAL_PREPARATION_INSPECTED');await observe('A15_CARE','MEDICAL_SUPPORT_CONNECTED');expect((await state()).foundations).not.toContain('MS_FOUNDATION_CARE');await travel('CARE_WATER','L3-C');await observe('A14_WATER','WATER_STORAGE_INSPECTED');await observe('A14_SHARE','WATER_USES_CONNECTED');await(await proof()).getByRole('button',{name:'Kết nối nước và chăm sóc',exact:true}).click();await expect.poll(async()=>(await state()).foundations.includes('MS_FOUNDATION_CARE')).toBe(true);result.checks.push({id:'Q5-two-branches-canonical',result:'PASS'});await shot('Q5-confirmed')
 await travel('WATER_CARE','L3-B');await travel('CARE_DEEP','L3-A');await travel('LAYER_BACK','L2-A');await travel('MIDDLE_KITCHEN','L1-C');await approach('A02_SMOKE');await(await proof()).getByRole('button',{name:'Lưu góc nhìn mới về bếp',exact:true}).click();await expect.poll(async()=>(await state()).kitchenCareCallback).toBe('VIEWED');result.checks.push({id:'kitchen-care-revisit-callback',result:'PASS'});await shot('callback')
 // Prerequisites here exercise the real structured endpoint; they are not presented as a Q1–Q3 visual playthrough.
 await close();for(const targetId of ['Q1_TRAIL','Q1_HATCH'])await send('STRUCTURED_INTERACTION',targetId,{quest:'Q1',action:'INSPECT_TARGET'});await send('STRUCTURED_INTERACTION','Q1_HATCH',{quest:'Q1',action:'CONFIRM_ENTRANCE',relation:'CONCEALED_ENTRANCE'})
 for(const targetId of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR'])await send('STRUCTURED_INTERACTION',targetId,{quest:'Q2',action:'INSPECT_TARGET'});await send('STRUCTURED_INTERACTION','',{quest:'Q2',action:'SELECT_AIR_PATH',path:'AIR_PATH_OPENING_PASSAGE_INTERIOR'});await send('STRUCTURED_INTERACTION','',{quest:'Q2',action:'CONFIRM_AIR_MEANING',relation:'AIR_SUPPORTS_LIVING_CONDITIONS'})
 for(const targetId of ['STRUCT_LAYER_1','STRUCT_LAYER_2','STRUCT_LAYER_3','STRUCT_LINK_12','STRUCT_LINK_23'])await send('STRUCTURED_INTERACTION',targetId,{quest:'Q3',action:'INSPECT_TARGET'});await send('STRUCTURED_INTERACTION','',{quest:'Q3',action:'CONFIRM_STRUCTURE_MEANING',relation:'LAYER_SYSTEM_CONNECTED',pairs:[['STRUCT_LAYER_1','STRUCT_LAYER_2'],['STRUCT_LAYER_2','STRUCT_LAYER_3']]})
 await page.reload();await ready('L1-C');await travel('KITCHEN_MIDDLE','L2-A');await travel('LAYER_DEEP','L3-A');await travel('DEEP_CARE','L3-B');await travel('CARE_WATER','L3-C');await travel('WATER_SYNTHESIS','L3-D');await approach('SYN_ENTRANCE');await close()
 for(const id of ['SYN_ENTRANCE','SYN_STRUCTURE','SYN_AIR','SYN_LIVING','SYN_SUPPORT','SYN_COMMUNITY']){const at=await page.locator(`[data-scene-target="${id}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy})),rect=await page.locator('canvas').boundingBox();await page.mouse.click(rect.x+at.x,rect.y+at.y);await page.waitForTimeout(250)}
 await expect.poll(async()=>(await state()).synthesisComplete).toBe(true);result.checks.push({id:'Q6-spatial-canonical-UI',result:'PASS'});await shot('Q6-confirmed')
 await page.getByRole('button',{name:'Bỏ qua / tiếp tục khám phá',exact:true}).click();
 await approach('ROUTE_EPILOGUE_RETURN');await page.keyboard.press('e');await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await ready('S5');
 await expect.poll(async()=>(await state()).checkpoint.epilogue).toBe('RETURNED');
 await approach('MEMORIAL_QUIET');await page.keyboard.press('e');await page.getByRole('button',{name:'Dành một khoảng yên lặng',exact:true}).click();
 await expect.poll(async()=>(await state()).checkpoint.memorial).toEqual({choice:'QUIET',phase:'REFLECTING'});
 await page.reload();await ready('S5');await approach('MEMORIAL_QUIET');await page.keyboard.press('e');await expect(page.getByText('Hãy dành khoảng thời gian bạn muốn.',{exact:false})).toBeVisible();
 result.checks.push({id:'Epilogue-A01-account-ack-resume',result:'PASS'});await shot('S5-confirmed');
 result.finalState=await state();expect(result.finalState.foundations.length).toBe(5);expect(result.errors).toEqual([]);result.result='PASS'
}catch(error){result.result='FAIL';result.error=String(error);if(page)result.failurePose=await page.locator('canvas').getAttribute('data-avatar-pose').catch(()=>null);if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error}finally{save();if(context)await context.close();if(video)await video.saveAs(path.join(out,'canonical-core.webm'));await browser?.close();server.kill()}
