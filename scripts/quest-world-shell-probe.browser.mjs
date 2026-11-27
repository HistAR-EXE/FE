import {chromium,expect as baseExpect} from '@playwright/test'
import {spawnQaPreview} from './qa-preview.mjs'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
const expect=baseExpect.configure({timeout:60000}),[output,build]=process.argv.slice(2),out=path.resolve(output),base='http://127.0.0.1:5473',result={checks:[]};mkdirSync(out,{recursive:true})
const server=spawnQaPreview(5473,build);let browser,page
try{
 await expect.poll(async()=>{try{return(await fetch(base)).ok}catch{return false}},{timeout:90000}).toBe(true)
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',reducedMotion:'reduce'})
 await context.addInitScript(()=>{localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false}));for(const [k,v] of Object.entries({timelens_token:'shell-qa',timelens_user_id:'shell-qa',timelens_display_name:'Shell QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v);const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'?null:get.call(this,type,...args)}})
 await context.route('**/api/**',route=>route.request().url().includes('/profile/me')?route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:{id:'shell-qa',displayName:'Shell QA',email:'shell@example.test',role:'USER',tier:'FREE',emailVerified:true,activeVisitSites:[]}})}):route.fulfill({status:503,contentType:'application/json',body:'{}'}))
 // Exercise an actual image failure deterministically; a healthy CDN must not fail this test.
 await context.route('**/brand/icon-192.png',route=>route.abort('failed'));result.brandFailureInjected=true
 page=await context.newPage();await page.goto(base+'/quests');await expect(page.locator('.lw-product')).toBeVisible();await expect(page.locator('.lw-sync')).toBeVisible();await expect(page.locator('[data-testid="timelens-brand-fallback"]:visible')).toBeVisible();result.phase='PRODUCT_VISIBLE';writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2))
 result.brandFallback=await page.getByTestId('timelens-brand-fallback').count()
 result.control=await page.getByRole('button',{name:'Hành trình',exact:true}).evaluate(button=>{const b=button.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return {box:{x:b.x,y:b.y,width:b.width,height:b.height},unobscured:hit?.closest('button')===button,hit:hit?.outerHTML.slice(0,300)}})
 result.headerGap=await page.locator('.lw-root').evaluate(root=>root.querySelector('.lw-sync').getBoundingClientRect().top-Math.max(...[...root.querySelectorAll('.lw-hud-actions button')].map(b=>b.getBoundingClientRect().bottom)))
 await page.waitForFunction(()=>document.fonts.check('40px Lora')&&document.fonts.check('24px TimeLensNavSymbols'),null,{timeout:30000})
 await expect(page.locator('.lw-map')).toBeVisible();await expect(page.locator('.lw-canvas canvas')).toHaveCount(0);result.checks.push('desktop-webgl-unavailable-shows-real-2d-map')
 writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await page.screenshot({path:path.join(out,'desktop.png'),timeout:15000});expect(result.control.unobscured).toBe(true);result.checks.push('offline-banner-keeps-desktop-controls-reachable')
 expect(result.headerGap).toBeGreaterThanOrEqual(8);await page.setViewportSize({width:1440,height:900});await expect(page.locator('[data-testid="timelens-brand-fallback"]:visible')).toBeVisible();result.checks.push('brand-failure-has-visible-local-fallback');result.result='PASS'
}catch(error){result.result='FAIL';result.error=String(error);throw error}finally{writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser?.close();server.kill()}
