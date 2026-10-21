import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage();
 await page.addInitScript(()=>localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false})));
 await page.goto('http://localhost:5173/login',{waitUntil:'domcontentloaded'});
 await page.locator('input[type=email]').fill('premium@histar.vn');
 await page.locator('input[type=password]').fill('Demo@2026');
 const loginResponse=page.waitForResponse(r=>r.url().endsWith('/api/auth/login')&&r.request().method()==='POST');
 await page.locator('button[type=submit]').click();
 assert.equal((await loginResponse).status(),200);
 await page.waitForURL(url=>!url.pathname.startsWith('/login'));
 await page.goto('http://localhost:5173/diorama/cu-chi',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Tái hiện lịch sử',exact:true}).waitFor();
 await page.getByRole('button',{name:/02 \/.*Phim 3D Củ Chi/}).click();
 await page.getByRole('button',{name:'▶ Xem phim',exact:true}).click();
 await page.waitForFunction(()=>{const v=document.querySelector('video');return v?.videoWidth===1920&&v.currentTime>1});
 console.log('PASS: real demo UI login, protected history page and Full HD playback');
 const google=await page.request.post('http://localhost:5173/api/auth/google',{data:{idToken:'invalid-verification-probe'}});
 console.log('Google invalid-token probe:',google.status(),await google.text());
 assert.equal(google.status(),422);
 await page.screenshot({path:'test-results/auth-recovery-fullhd.png',fullPage:true});
} finally {await browser.close()}
