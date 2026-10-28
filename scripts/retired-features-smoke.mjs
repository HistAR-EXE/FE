import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'
const origin='http://localhost:5173',checks=[]
for(let attempt=0;;attempt++){try{if((await fetch(origin+'/api/locations',{signal:AbortSignal.timeout(3000)})).ok)break}catch{}if(attempt>=90)throw Error('Local backend did not become ready');await new Promise(r=>setTimeout(r,1000))}
const browser=await chromium.launch({channel:'msedge',headless:true})
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(25000);page.setDefaultNavigationTimeout(90000)
 const login=await page.request.post(origin+'/api/auth/login',{data:{email:'teacher-standard@histar.local',password:'B2BTest@2026!'}});assert.equal(login.status(),200);const {data}=await login.json()
 await page.addInitScript(a=>{for(const[k,v]of Object.entries({timelens_token:a.accessToken||a.token,timelens_user_id:a.userId,timelens_display_name:a.displayName,timelens_email:a.email,timelens_email_verified:'1',sidenav_collapsed:'false',histar_consent_v1:JSON.stringify({analytics:false,camera:false,gps:false,decidedAt:new Date().toISOString()})}))localStorage.setItem(k,v)},data)
 await page.goto(origin+'/profile',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Hồ sơ của bạn.'}).waitFor()
 await page.getByRole('button',{name:'Mở tài khoản cá nhân',exact:true}).click();const menu=page.getByRole('navigation',{name:'Liên kết tài khoản'});await menu.waitFor()
 for(const path of ['/journey-wrapped','/groups','/squad'])assert.equal(await menu.locator(`a[href="${path}"]`).count(),0)
 for(const label of ['Tổng kết hành trình','Nhóm học tập','Biệt đội của tôi'])assert.equal(await menu.getByRole('link',{name:new RegExp(label)}).count(),0)
 for(const label of ['Hồ sơ cá nhân','Cài đặt','Ảnh & chia sẻ','Gói dịch vụ','Cổng giáo viên'])assert.equal(await menu.getByRole('link',{name:new RegExp(label)}).count(),1)
 await page.screenshot({path:'../docs/retired-account-menu.png',fullPage:false});await page.keyboard.press('Escape');checks.push('Account menu retains supported links and removes all three retired features')
 for(const path of ['/journey-wrapped','/groups','/squad','/groups/00000000-0000-0000-0000-000000000000/progress']){await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:/404/}).waitFor()};checks.push('All retired page URLs resolve to the existing 404 screen')
 for(const path of ['/api/profile/journey-summary','/api/groups/mine','/api/squads/me']){const r=await page.request.get(origin+path,{headers:{Authorization:`Bearer ${data.accessToken||data.token}`}});assert.equal(r.status(),404,path)};checks.push('Retired summary/group/squad APIs are absent from the rebuilt backend')
 await page.goto(origin+'/settings',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Thông tin tài khoản',exact:true}).waitFor();await page.getByRole('tab',{name:'Tổ chức & lớp học',exact:true}).click();await page.getByRole('link',{name:'Không gian giáo viên'}).waitFor();assert.equal(await page.getByRole('link',{name:'Nhóm học tập',exact:true}).count(),0)
 await page.goto(origin+'/teacher',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Mời học sinh bằng email'}).waitFor();assert.equal(await page.locator('a[href="/groups"]').count(),0);checks.push('Settings and teacher workspace remain available without retired group links')
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/profile',{waitUntil:'domcontentloaded'});await page.getByRole('heading',{name:'Hồ sơ của bạn.'}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));checks.push('Mobile profile remains usable without horizontal overflow')
 await context.close();await writeFile('../docs/retired-features-results.json',JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,checks},null,2))
}finally{await browser.close()}
