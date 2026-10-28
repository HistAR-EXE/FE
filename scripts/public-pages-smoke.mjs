import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
const base=process.env.PUBLIC_PAGES_URL||'http://127.0.0.1:5191'
const quote={b2cPremiumPriceVnd:67000,b2cJourneyPassPriceVnd:35000,chatFreeDailyLimit:7,orgPlans:[{planType:'MICRO',label:'Micro',priceVnd:8100000,maxCcu:17,maxVerifiedAccounts:123,maxAiQueriesPerMonth:5100},{planType:'STANDARD',label:'Standard',priceVnd:16100000,maxCcu:43,maxVerifiedAccounts:456,maxAiQueriesPerMonth:31000},{planType:'PREMIUM',label:'Premium',priceVnd:26100000,maxCcu:87,maxVerifiedAccounts:1234,maxAiQueriesPerMonth:null}]}
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--disable-gpu','--renderer-process-limit=2']})
await mkdir('test-results/public-pages',{recursive:true})
let payments=0
async function makePage({auth=false,org=false,failed=false}={}) {
 const page=await browser.newPage({viewport:{width:1440,height:1000}})
 page.setDefaultNavigationTimeout(90000);page.setDefaultTimeout(45000)
 const errors=[];page.on('pageerror',error=>errors.push(error.message))
 await page.addInitScript(({auth,org})=>{
  localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false}))
  if(auth) Object.entries({timelens_token:'public-ui-test',timelens_user_id:'ui-test',timelens_display_name:'Kiểm thử giao diện',timelens_email_verified:'1',timelens_tier:'FREE',...(org?{timelens_org_id:'existing-org'}:{})}).forEach(([key,value])=>localStorage.setItem(key,value))
 },{auth,org})
 const state={failed,partial:false,trial:'fail',trials:0}
 await page.route('**://*/api/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname
  if(path.includes('/payment')&&request.method()==='POST'){payments++;return route.abort()}
  if(path.endsWith('/billing/public-pricing'))console.log('MOCK PRICE',state.failed);
  if(path.endsWith('/billing/public-pricing'))return route.fulfill({status:state.failed?503:200,contentType:'application/json',body:JSON.stringify(state.failed?{message:'Unavailable'}:{success:true,data:state.partial?{...quote,b2cJourneyPassPriceVnd:null}:quote})})
  if(path.endsWith('/profile/me'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:{id:'ui-test',displayName:'Kiểm thử giao diện',email:'ui@example.test',role:org?'TEACHER':'USER',tier:'FREE',orgId:org?'existing-org':null,orgSubscription:org?'STANDARD':'NONE',emailVerified:true,avatarUrl:null,activeVisitSites:[]}})})
  if(path.endsWith('/billing/org/trial')&&request.method()==='POST'){
   state.trials++;await new Promise(resolve=>setTimeout(resolve,600))
   return route.fulfill({status:state.trial==='fail'?409:200,contentType:'application/json',body:JSON.stringify(state.trial==='fail'?{message:'Trial unavailable'}:{success:true,data:{organizationId:'new-org',orgName:'Lớp học kiểm thử',planType:'STANDARD',isActive:true}})})
  }
  return route.fulfill({status:200,contentType:'application/json',body:'{"data":{}}'})
 })
 return {page,errors,state}
}
try {
 if (!process.argv.includes('--flows-only')) {
 const {page,errors,state}=await makePage()
 await page.goto(base+'/about',{waitUntil:'domcontentloaded'})
 await page.locator('h1').waitFor();await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,3000))]))
 console.log('About loaded')
 assert.equal(await page.locator('header a[href="/about"]').getAttribute('aria-current'),'page')
 assert.equal(await page.locator('header nav').getByRole('link',{name:'Trang chủ',exact:true}).getAttribute('href'),'/')
 assert.equal(await page.locator('footer').count(),1)
 assert.ok(await page.locator('footer').getAttribute('class').then(value=>value.includes('from-[#0275FB]')),'Original footer retained')
 assert.equal(await page.locator('.about-team-grid article').count(),6)
 const capability=page.locator('.about-capability-selector button')
 for(let index=0;index<await capability.count();index++) {await capability.nth(index).click();assert.equal(await capability.nth(index).getAttribute('aria-pressed'),'true');await page.locator('#about-capability-panel img').evaluate(img=>img.decode())}
 for(const width of [390,768,1280,1920]){
  await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`About fits ${width}`)
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/public-pages/about-${width}.png`})
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('#team').scrollIntoViewIfNeeded();await page.waitForTimeout(700);await page.locator('#team').screenshot({path:'test-results/public-pages/about-team.png'})
 console.log('About responsive/selector/footer passed')
 await page.goto(base+'/pricing?site=cu-chi&next='+encodeURIComponent('/time-portal/dia-dao-cu-chi?era=1968'),{waitUntil:'domcontentloaded'})
 await page.getByText('67.000đ',{exact:true}).waitFor().catch(async error=>{await page.screenshot({path:'test-results/public-pages/pricing-error.png'});console.log((await page.locator('main').innerText()).slice(0,3500));throw error})
 assert.equal(state.trials,0,'No trial mutation on page load')
 assert.equal(await page.locator('header a[href="/pricing"]').getAttribute('aria-current'),'page')
 const pass=new URL(await page.getByTestId('pricing-journey-pass').getAttribute('href'),base)
 assert.equal(pass.searchParams.get('site'),'cu-chi');assert.equal(pass.searchParams.get('plan'),'journey_pass');assert.equal(pass.searchParams.get('next'),'/time-portal/dia-dao-cu-chi?era=1968')
 assert.ok(await page.locator('.pricing-plan-free').innerText().then(text=>text.includes('7 câu hỏi')),'Quota from API')
 assert.equal(await page.locator('.pricing-org-card').count(),3)
 assert.ok(await page.locator('.pricing-org-card').first().innerText().then(text=>text.includes('8.100.000đ')&&text.includes('123')&&text.includes('17')),'Organization values from API')
 const standard=new URL(await page.getByRole('link',{name:'Xem gói Standard',exact:false}).getAttribute('href'),base)
 assert.equal(standard.searchParams.get('plan'),'STANDARD');assert.equal(standard.searchParams.has('licenses'),false)
 await page.locator('.pricing-comparison summary').click();assert.equal(await page.locator('.pricing-comparison').getAttribute('open'),'')
 for(const width of [390,768,1280,1920]){
  await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Pricing fits ${width}`)
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/public-pages/pricing-${width}.png`})
 }
 await page.setViewportSize({width:1440,height:1000});await page.locator('#b2c-pricing').scrollIntoViewIfNeeded();await page.waitForTimeout(700);await page.locator('#b2c-pricing').screenshot({path:'test-results/public-pages/pricing-plans.png'})
 await page.locator('#b2b').scrollIntoViewIfNeeded();await page.waitForTimeout(700);await page.locator('#b2b').screenshot({path:'test-results/public-pages/pricing-organizations.png'})
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.getByRole('button',{name:'Mở điều hướng',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Mở điều hướng',exact:true}).getAttribute('aria-expanded'),'false')
 assert.equal(await page.getByRole('button',{name:'Dùng thử lớp học 14 ngày',exact:true}).count(),0)
 assert.equal(await page.getByRole('heading',{name:'Khởi đầu bằng một lớp học dùng thử.',exact:true}).count(),0)
 assert.deepEqual(errors,[]);await page.close()
 }
 const failed=await makePage({failed:true})
 await failed.page.goto(base+'/pricing',{waitUntil:'domcontentloaded'});await failed.page.getByRole('button',{name:'Tải lại bảng giá',exact:true}).waitFor()
 assert.equal(await failed.page.getByTestId('pricing-premium').count(),0,'Paid CTA unavailable without verified quote')
 assert.equal(await failed.page.getByText('49.000đ',{exact:true}).count(),0,'No hardcoded stale fallback price')
 failed.state.failed=false;await failed.page.getByRole('button',{name:'Tải lại bảng giá',exact:true}).click({noWaitAfter:true});await failed.page.getByText('67.000đ',{exact:true}).waitFor();await failed.page.close()
 const partial=await makePage();partial.state.partial=true
 await partial.page.goto(base+'/pricing',{waitUntil:'domcontentloaded'});await partial.page.getByRole('button',{name:'Cập nhật giá Journey Pass',exact:true}).waitFor()
 assert.equal(await partial.page.getByTestId('pricing-journey-pass').count(),0,'Missing Journey price disables checkout')
 partial.state.partial=false;await partial.page.getByRole('button',{name:'Cập nhật giá Journey Pass',exact:true}).click({noWaitAfter:true});await partial.page.getByText('35.000đ',{exact:true}).waitFor();await partial.page.close()
 const reduced=await makePage();await reduced.page.emulateMedia({reducedMotion:'reduce'});await reduced.page.goto(base+'/about',{waitUntil:'domcontentloaded'});await reduced.page.locator('h1').waitFor();assert.equal(await reduced.page.locator('.pub-observed').count(),0);await reduced.page.close()
 assert.equal(payments,0,'Tests never create real payments')
 console.log(JSON.stringify({passed:true,widths:process.argv.includes('--flows-only')?[]:[390,768,1280,1920],flowsOnly:process.argv.includes('--flows-only'),footer:'original',pricing:'mock API verified',payments}))
}finally{await browser.close()}
