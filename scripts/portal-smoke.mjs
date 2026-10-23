import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:5189';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189', '--strictPort'], { stdio: 'ignore' });
let browser; let debugPage;
try {
  for (let i=0;i<80;i++) { try { if ((await fetch(origin)).ok) break } catch {} await new Promise(r=>setTimeout(r,300)); }
  browser = await chromium.launch({ channel:'msedge', headless:true });
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  debugPage=page;
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});page.on('requestfailed',r=>console.log('REQUESTFAILED',r.url(),r.failure()));
  await page.addInitScript(()=>{
    localStorage.setItem('portal-narration','false');localStorage.setItem('portal-music','false');localStorage.setItem('portal-volume','0');
    localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false}));
    for(const [key,value] of Object.entries({timelens_token:'portal-test',timelens_user_id:'portal-test',timelens_display_name:'Portal Tester',timelens_email_verified:'1'}))localStorage.setItem(key,value);
    const state={texts:[],current:null,cancel:0,pause:0,resume:0};
    window.__portalSpeech=state;
    const speech=new EventTarget();
    Object.assign(speech,{
      getVoices:()=>[{lang:'vi-VN',name:'Test Vietnamese',localService:true}],
      cancel:()=>{state.cancel++},pause:()=>{state.pause++},resume:()=>{state.resume++},
      speak:u=>{state.texts.push(u.text);state.current=u;queueMicrotask(()=>u.onstart?.());}
    });
    Object.defineProperty(window,'speechSynthesis',{value:speech,configurable:true});
    Object.defineProperty(window,'SpeechSynthesisUtterance',{value:class {constructor(text){this.text=text}},configurable:true});
    const NativeAudio=window.Audio;
    window.Audio=function(...args){const a=new NativeAudio(...args);window.__portalMusic=a;return a;};
  });
  await page.route('**://*/api/**',r=>r.fulfill({json:{success:true,data:new URL(r.request().url()).pathname==='/api/profile/me'?{id:'portal-test',displayName:'Portal Tester',email:'portal@example.test',emailVerified:true,role:'USER',tier:'PREMIUM',activeVisitSites:[]}:[]}}));
  await page.goto(`${origin}/time-portal/dia-dao-cu-chi`,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Cổng Thời Gian',exact:true}).waitFor();
  await page.waitForFunction(()=>window.__portalSpeech.texts.length>0);
  assert.match(await page.evaluate(()=>window.__portalSpeech.texts[0]),/Chào mừng.*Cổng Thời Gian.*Chương 1/);
  await page.waitForFunction(()=>window.__portalMusic.readyState>=2);
  const start=page.getByRole('button',{name:'Bắt đầu trải nghiệm âm thanh',exact:true});
  if(await start.count())await start.click();
  else await page.getByRole('heading',{name:'Cổng Thời Gian',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:/Tắt nhạc nền|Tắt lời đọc|Tạm dừng trải nghiệm|Đọc lại/}).count(),0);
  assert.equal(await page.getByRole('slider',{name:'Âm lượng nhạc nền'}).count(),0);
  assert.equal(await page.getByRole('navigation',{name:'Các chương'}).getByRole('button',{name:/1948/}).getAttribute('aria-current'),'step');
  await page.waitForFunction(()=>window.__portalMusic.currentTime>0&&!window.__portalMusic.paused);
  await page.waitForFunction(()=>window.__portalMusic.volume<.09);
  console.log('REAL MUSIC',await page.evaluate(()=>({time:window.__portalMusic.currentTime,duration:window.__portalMusic.duration,volume:window.__portalMusic.volume})));
  const spoken=await page.evaluate(()=>window.__portalSpeech.texts.length);
  await page.getByRole('button',{name:'Xem ảnh lớn',exact:false}).last().click();
  await page.waitForFunction(()=>window.__portalMusic.paused&&window.__portalSpeech.pause>0);
  await page.getByRole('button',{name:'Đóng',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.__portalSpeech.texts.length),spoken,'resume should not replay narration');
  // Timer finishes while speech still speaking; story must wait for end.
  await page.locator('[role=tab][aria-selected=true] span span').evaluate(el=>el.dispatchEvent(new Event('animationend',{bubbles:true})));
  assert.equal(await page.getByRole('tab',{name:'Khoảnh khắc 1',exact:true}).getAttribute('aria-selected'),'true');
  await page.locator('.tp-panel.tp-scroll').first().hover();
  await page.evaluate(()=>window.__portalSpeech.current.onend());
  await page.waitForTimeout(200);
  assert.equal(await page.getByRole('tab',{name:'Khoảnh khắc 1',exact:true}).getAttribute('aria-selected'),'true','hover holds deferred advance');
  await page.getByRole('heading',{name:'Cổng Thời Gian',exact:true}).hover();
  await page.waitForFunction(()=>window.__portalSpeech.texts.length>=2);
  assert.equal(await page.getByRole('tab',{name:'Khoảnh khắc 2',exact:true}).getAttribute('aria-selected'),'true');
  assert.ok(!(await page.evaluate(()=>window.__portalSpeech.texts.at(-1))).includes('Chào mừng'));
  await page.evaluate(()=>window.__portalSpeech.current.onend());
  await page.waitForFunction(()=>window.__portalMusic.volume>.2);
  await page.getByRole('tab',{name:'Khoảnh khắc 1',exact:true}).click();
  await page.waitForTimeout(1000);
  await page.screenshot({path:'test-results/portal-desktop.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(600);
  await page.screenshot({path:'test-results/portal-mobile.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const rail=await page.getByRole('navigation',{name:'Các chương'}).boundingBox();
  assert.ok(rail.y+rail.height<=844-64+1,'mobile chapter rail clears fixed navigation');
  await page.setViewportSize({width:1440,height:900});
  await page.getByRole('button',{name:'1948',exact:false}).filter({hasText:'1948'}).first().click();
  await page.waitForTimeout(1700);
  await page.getByRole('tab',{name:'Câu đố',exact:true}).click();
  await page.getByRole('heading',{name:'Những đoạn địa đạo đầu tiên ở Củ Chi xuất hiện ở đâu?'}).waitFor();
  await page.getByRole('button',{name:'Xem 3D',exact:true}).first().click();
  await page.waitForFunction(()=>!window.__portalMusic.paused&&window.__portalMusic.currentTime>0);
  assert.equal(await page.getByRole('heading',{name:'Cổng Thời Gian',exact:true}).count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS: auto Vietnamese narration, real MP3 playback+duck, pause/resume, narration-gated timeline, mobile layout, quiz+3D music continuity (speech simulated)');
} catch(error) { console.log('DEBUG',debugPage?.url(),await debugPage?.locator('body').innerText()); await debugPage?.screenshot({path:'test-results/portal-error.png',fullPage:true});throw error; } finally {await browser?.close();server.kill();}
