import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5190';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5190','--strictPort'],{stdio:'ignore'});
let browser, page;
try {
 for(let i=0;i<80;i++){try{if((await fetch(origin)).ok)break}catch{}await new Promise(r=>setTimeout(r,250));}
 browser=await chromium.launch({channel:'msedge',headless:true});
 page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
 const NativeAudio=window.Audio;window.Audio=function(...args){const a=new NativeAudio(...args);window.__portalMusic=a;return a;};
 localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false}));
 for(const [k,v]of Object.entries({timelens_token:'compare-test',timelens_user_id:'compare-test',timelens_display_name:'TimeLens Demo',timelens_email_verified:'1'}))localStorage.setItem(k,v);
 });
 await page.route('**://*/api/**',r=>r.fulfill({json:{success:true,data:new URL(r.request().url()).pathname==='/api/profile/me'?{id:'compare-test',displayName:'TimeLens Demo',email:'demo@example.test',emailVerified:true,role:'USER',tier:'PREMIUM',activeVisitSites:[]}:[]}}));
 await page.goto(`${origin}/time-portal/dia-dao-cu-chi?view=xua-nay&spot=mieng-ham`,{waitUntil:'networkidle'});
 await page.getByRole('heading',{name:'Miệng hầm',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>!!window.__portalMusic),true,'Xưa & Nay must keep portal background music');
 const unlock=page.getByRole('button',{name:'Bắt đầu trải nghiệm âm thanh',exact:true});
 if(await unlock.count())await unlock.click();else await page.getByRole('heading',{name:'Miệng hầm',exact:true}).click();
 await page.waitForFunction(()=>window.__portalMusic.currentTime>.5&&!window.__portalMusic.paused);
 const musicTime=await page.evaluate(()=>{window.__firstMusic=window.__portalMusic;return window.__portalMusic.currentTime});
 const slider=page.getByRole('slider',{name:'Kéo để so sánh xưa và nay'});
 await slider.focus(); await page.keyboard.press('Home');assert.equal(await slider.getAttribute('aria-valuenow'),'0');
 await page.keyboard.press('End');assert.equal(await slider.getAttribute('aria-valuenow'),'100');
 await page.keyboard.press('ArrowLeft');assert.equal(await slider.getAttribute('aria-valuenow'),'95');
 await page.getByRole('button',{name:'Chia đôi ảnh',exact:true}).click();assert.equal(await slider.getAttribute('aria-valuenow'),'50');
 const frame=await page.locator('.touch-none').boundingBox();
 await page.mouse.move(frame.x+frame.width*.5,frame.y+frame.height*.5);await page.mouse.down();await page.mouse.move(frame.x+frame.width*.25,frame.y+frame.height*.5,{steps:8});await page.mouse.up();
 assert.ok(Math.abs(Number(await slider.getAttribute('aria-valuenow'))-25)<2);
 const spots=page.getByRole('navigation',{name:'Các điểm Xưa & Nay'});
 await spots.getByRole('button',{name:'Bếp Hoàng Cầm',exact:true}).click();
 await page.getByRole('heading',{name:'Bếp Hoàng Cầm',exact:true}).waitFor();assert.equal(await slider.getAttribute('aria-valuenow'),'50');
 assert.equal(await spots.getByRole('button',{name:'Bếp Hoàng Cầm',exact:true}).getAttribute('aria-current'),'true');
 await page.getByRole('button',{name:'Điểm sau',exact:true}).click();await page.getByRole('heading',{name:'Phòng họp dưới lòng đất',exact:true}).waitFor();
 await page.getByRole('button',{name:'Điểm trước',exact:true}).click();await page.getByRole('heading',{name:'Bếp Hoàng Cầm',exact:true}).waitFor();
 await spots.getByRole('button',{name:'Miệng hầm',exact:true}).click();await page.waitForTimeout(300);
 await page.screenshot({path:'test-results/xua-nay-desktop.png',fullPage:true});
 for(const [width,height]of [[1440,600],[768,1024],[390,844]]) {
 await page.setViewportSize({width,height});await page.waitForTimeout(400);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`no overflow ${width}`);
 const bounds=await page.locator('.touch-none').boundingBox();assert.ok(bounds.width>200&&bounds.height>100,`usable frame ${width}`);
 if(width===390){await page.screenshot({path:'test-results/xua-nay-mobile.png',fullPage:true});await spots.getByRole('button',{name:'Ánh sáng trong hầm',exact:true}).click();await page.getByRole('heading',{name:'Ánh sáng trong hầm',exact:true}).waitFor();}
 }
 await page.setViewportSize({width:1440,height:900});
 await page.waitForTimeout(400);
 await page.getByRole('button',{name:'Quay lại Dòng thời gian',exact:true}).click();
 await page.getByRole('heading',{name:'Cổng Thời Gian',exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>window.__firstMusic===window.__portalMusic),true,'reuse same audio element across modes');
 assert.ok(await page.evaluate(()=>window.__portalMusic.currentTime)>=musicTime,'same soundtrack retains position across modes');
 await page.getByRole('button',{name:/Xưa.*Nay tại di tích/}).click();
 await page.getByRole('slider',{name:'Kéo để so sánh xưa và nay'}).waitFor();
 await page.waitForFunction(()=>!window.__portalMusic.paused);
 console.log('MUSIC CONTINUITY',await page.evaluate(()=>({time:window.__portalMusic.currentTime,volume:window.__portalMusic.volume})));
 await page.getByRole('link',{name:/Khám phá/,exact:false}).first().click();
 await page.waitForFunction(()=>window.__portalMusic.paused);
 console.log('Leaving portal stops soundtrack');
 await page.goto(`${origin}/time-portal/22222222-2222-2222-2222-222222222222`,{waitUntil:'networkidle'});
 assert.equal(await page.evaluate(()=>!!window.__portalMusic),false,'unsupported location must not start soundtrack');
 assert.deepEqual(errors,[]);
 console.log('PASS Xưa & Nay: pointer+keyboard compare, snap/reset, spot selection, next/previous, responsive390/768/1440 and shortheight, return timeline');
}catch(e){console.log('DEBUG',page?.url(),await page?.locator('body').innerText());await page?.screenshot({path:'test-results/xua-nay-error.png',fullPage:true});throw e}
finally{await browser?.close();server.kill()}
