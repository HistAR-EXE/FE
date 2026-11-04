import {test,expect} from '@playwright/test'
import {createHmac,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'

test('representative doors preserve canonical Q1 and offline checkpoint without movement XP',async({page,request,context},info)=>{
 const id=randomUUID(),email=`underground-${id.slice(0,8)}@test.invalid`
 if(process.env.LW_QA_DB!=='g3_completion_integration')throw Error('Disposable local QA database required')
 execFileSync('docker',['exec','timelens-g2-review-20261102','psql','-U','g2audit','-d',process.env.LW_QA_DB,'-v','ON_ERROR_STOP=1','-c',`insert into profiles(id,email,display_name,email_verified) values('${id}','${email}','Synthetic underground QA',true)`])
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:email,userId:id,role:'USER',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),token=`${h}.${p}.${createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(`${h}.${p}`).digest('base64url')}`
 const ledger=()=>execFileSync('docker',['exec','timelens-g2-review-20261102','psql','-U','g2audit','-d',process.env.LW_QA_DB!,'-At','-c',`select count(*) from xp_ledger where user_id='${id}'`],{encoding:'utf8'}).trim()
 const endpoint='http://127.0.0.1:8094/api/v2/worlds/cuchi-mach-song',headers={Authorization:`Bearer ${token}`}
 const state=async()=>{const r=await request.get(endpoint+'/state',{headers});expect(r.status()).toBe(200);return(await r.json()).data}
 for(const [i,[actionType,targetId]] of [['START_EXPERIENCE',''],['SAVE_CHECKPOINT','S1']].entries()){const r=await request.post(endpoint+'/actions',{headers,data:{actionId:randomUUID(),releaseVersion:1,expectedRevision:i,actionType,targetId,payload:{}}});expect(r.status()).toBe(200)}
 await page.addInitScript(({id,email,token})=>{for(const [k,v] of Object.entries({timelens_token:token,timelens_user_id:id,timelens_email:email,timelens_display_name:'Synthetic underground QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{id,email,token})
 await page.goto('/living-world');await page.getByTestId('consent-decline').click()
 const ready=async(z:string)=>{await page.waitForFunction(z=>document.querySelector('canvas')?.dataset.readiness==='ready'&&JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').zone===z,z,{timeout:60000});await page.waitForFunction(()=>document.querySelector('main')?.getAttribute('data-transfer')!=='on')}
 const approach=async(target:string)=>{const a=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await a.getAttribute('aria-expanded')==='false')await a.click();await page.locator(`.lw-alternatives [data-target="${target}"]`).click();await page.waitForFunction(id=>document.querySelector('main')?.getAttribute('data-arrived')===id,target);await a.click();await page.locator('canvas').focus()}
 await ready('S1');await approach('Q1_TRAIL');await page.keyboard.press('e');await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click();await expect.poll(async()=>(await state()).facts).toContain('Q1_TRAIL_OBSERVED')
 await approach('Q1_HATCH');await page.keyboard.press('e');await ready('L1-A');await expect.poll(async()=>(await state()).facts).toContain('ENTRANCE_CONFIRMED');const confirmed=await state(),ledgerBefore=ledger()
 await approach('ROUTE_ENTRANCE_AIR');await page.keyboard.press('e');await ready('L1-B');await expect.poll(async()=>(await state()).checkpoint.zone).toBe('L1-B');const before=await state()
 await context.setOffline(true);await approach('ROUTE_AIR_ENTRANCE');await page.keyboard.press('e');await ready('L1-A');expect((await state()).checkpoint.zone).toBe('L1-B')
 await context.setOffline(false);await expect.poll(async()=>(await state()).checkpoint.zone,{timeout:15000}).toBe('L1-A');const after=await state();expect(after.facts).toEqual(before.facts);expect(after.foundations).toEqual(before.foundations)
 const ledgerAfter=ledger();expect(ledgerAfter).toBe(ledgerBefore)
 await info.attach('canonical-states',{body:JSON.stringify({id,confirmed,before,after,ledgerBefore,ledgerAfter},null,2),contentType:'application/json'});await page.screenshot({path:info.outputPath('offline-return.png')})
})
