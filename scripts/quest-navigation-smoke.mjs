import { chromium } from 'playwright'
import assert from 'node:assert/strict'
const browser=await chromium.launch({channel:'msedge',headless:true})
try{
 const page=await browser.newPage()
 await page.addInitScript(()=>{localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false}));Object.entries({timelens_token:'test',timelens_user_id:'test',timelens_display_name:'Test',timelens_email_verified:'1'}).forEach(([k,v])=>localStorage.setItem(k,v))})
 await page.route('**://*/api/**',route=>route.request().url().includes('/profile/me')?route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{id:'test',displayName:'Test',email:'test@example.test',role:'USER',tier:'FREE',emailVerified:true,activeVisitSites:[]}})}):route.fulfill({status:503,contentType:'application/json',body:'{"message":"Test offline"}'}))
 const quest='33333333-3333-3333-3333-333333333333'
 const paths=['/quests',`/quests/${quest}`,`/quests/${quest}/play/a1000001-0000-4000-8000-000000000015`]
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:1000})
  for(const path of paths){
   await page.goto((process.env.PUBLIC_PAGES_URL || 'http://localhost:5173')+path,{waitUntil:'domcontentloaded'})
   const nav=page.getByRole('navigation',{name:'Điều hướng nhiệm vụ'})
   await nav.waitFor()
   assert.equal(await page.locator('header').count(),0)
   assert.ok(await nav.getByRole('link').getAttribute('href'))
   if(path.includes('/play/'))assert.equal(await nav.getByRole('link').getAttribute('href'),`/quests/${quest}`)
   assert.ok(await page.locator('a[href="/quests"]').count()>0,'sidebar quest link remains')
  }
 }
 console.log('PASS: list/detail/minigame have no topnav, contextual back links visible even on API failure, sidebar links preserved at mobile/desktop widths')
}finally{await browser.close()}
