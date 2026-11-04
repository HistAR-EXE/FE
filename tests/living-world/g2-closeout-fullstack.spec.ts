import {test,expect,type Page} from '@playwright/test'
import {createHmac,randomUUID} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {chooseEra} from './p2.helpers'
// G2 closeout WC-AT06: authenticated A→B account swap while a portal import is still loading.
// Synthetic accounts on the local QA PostgreSQL container only (never production); no facts seeded.
const container=process.env.LW_QA_CONTAINER??'timelens-g2-review-20261102',api=(process.env.LW_API_ORIGIN??'http://127.0.0.1:8089')+'/api/v2/worlds/cuchi-mach-song'
const psql=(sql:string)=>execFileSync('docker',['exec',container,'psql','-U','g2audit','-d',process.env.LW_QA_DB??'g2_final','-v','ON_ERROR_STOP=1','-At','-c',sql],{encoding:'utf8'}).trim()
function account(tag:string){
 const id=randomUUID(),email=`${tag}-${id}@test.invalid`;psql(`insert into profiles(id,email,display_name,email_verified) values('${id}','${email}','Synthetic ${tag} QA',true)`)
 const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:email,userId:id,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')
 return {id,email,tag,token:h+'.'+p+'.'+createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(h+'.'+p).digest('base64url')}
}
type Account=ReturnType<typeof account>
const store=(page:Page,a:Account,event:string|null)=>page.evaluate(({a,event})=>{for(const[k,v]of Object.entries({timelens_token:a.token,timelens_user_id:a.id,timelens_email:a.email,timelens_display_name:'Synthetic '+a.tag+' QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v);if(event)window.dispatchEvent(new CustomEvent(event))},{a,event})
async function state(request:import('@playwright/test').APIRequestContext,a:Account){const r=await request.get(api+'/state',{headers:{Authorization:'Bearer '+a.token}});expect(r.status()).toBe(200);return (await r.json()).data}

test('G2C-F01 / WC-AT06: account A→B swap during delayed portal import never commits A’s transfer into B',async({page,request})=>{
 const a=account('swap-a'),b=account('swap-b')
 await page.addInitScript(a=>{if(!sessionStorage.getItem('lw-swap-init')){sessionStorage.setItem('lw-swap-init','1');for(const[k,v]of Object.entries({timelens_token:a.token,timelens_user_id:a.id,timelens_email:a.email,timelens_display_name:'Synthetic swap-a QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)}},a)
 await page.route('**/assets/s2Environment-*.js',async r=>{await new Promise(res=>setTimeout(res,4500));await r.continue()})
 await page.goto('/living-world?continuity=1');if(await page.getByTestId('consent-decline').isVisible())await page.getByTestId('consent-decline').click()
 await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian')
 await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click();await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click()
 await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await expect(page.locator('.lw-transfer')).toBeVisible()
 await store(page,b,'histar:session-refreshed')
 await expect(page.getByText('Bản thử tài khoản',{exact:false})).toBeVisible({timeout:15000})
 await page.waitForTimeout(6000)
 await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian');await expect(page.locator('.lw-transfer')).toHaveCount(0)
 const sa=await state(request,a),sb=await state(request,b)
 // The delayed portal's destination is S1 since the Prologue P5 correction (was S2).
 expect(sb.checkpoint?.zone??'S0').not.toBe('S1');expect(sa.checkpoint?.zone??'S0').not.toBe('S1')
 expect(sa.facts).toEqual([]);expect(sb.facts).toEqual([])
 const ledger=psql(`select (select count(*) from xp_ledger where user_id in ('${a.id}','${b.id}')),(select count(*) from quest_reward_ledger where user_id in ('${a.id}','${b.id}')),(select coalesce(sum(total_points),0) from profiles where id in ('${a.id}','${b.id}'))`);expect(ledger).toBe('0|0|0')
 // B can now travel normally under its own ownership.
 await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click();await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click();await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click()
 await expect(page.getByRole('heading',{level:1})).toContainText('Bìa rừng',{timeout:20000})
 await expect.poll(async()=>(await state(request,b)).checkpoint?.zone,{timeout:20000}).toBe('S1');expect((await state(request,a)).checkpoint?.zone??'S0').not.toBe('S1')
})
