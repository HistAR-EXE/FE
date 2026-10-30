import assert from 'node:assert/strict'
import {chromium} from 'playwright'
const base='http://localhost:5173'
const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'teacher-standard@histar.local',password:'B2BTest@2026!'})})
assert.equal(r.status,200)
const a=(await r.json()).data
const browser=await chromium.launch({channel:'msedge',headless:true})
try{
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'})
await context.addInitScript(a=>{for(const[k,v]of Object.entries({timelens_token:a.accessToken,timelens_user_id:a.userId,timelens_display_name:a.displayName,timelens_role:a.role,timelens_tier:a.tier,timelens_email_verified:'1','timelens:product-tour-complete':'true',histar_consent_v1:JSON.stringify({analytics:false,camera:false,gps:false})}))if(v)localStorage.setItem(k,String(v))},a)
const p=await context.newPage();await p.goto(base+'/settings',{waitUntil:'domcontentloaded'});await p.locator('.st-summary .pf-identity h2').waitFor({timeout:30000})
const colors=await p.locator('.st-summary .pf-identity h2').evaluate(e=>({color:getComputedStyle(e).color,shadow:getComputedStyle(e).textShadow}))
assert.equal(colors.color,'rgb(16, 35, 63)');assert.equal(colors.shadow,'none')
await p.screenshot({path:'../docs/settings-refresh-desktop.png',fullPage:true})
await p.setViewportSize({width:390,height:844});console.log(await p.evaluate(()=>[...document.querySelectorAll('.st-main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>[e.className,e.getBoundingClientRect().width])));assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
await p.screenshot({path:'../docs/settings-refresh-mobile.png',fullPage:true})
assert.equal(await p.getByRole('tab').count(),5)
console.log('PASS: dark identity text, no text shadow;5 settings tabs;mobile390px no page overflow;desktop/mobile screenshots')
}finally{await browser.close()}

