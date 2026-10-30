import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const origin = 'http://127.0.0.1:5192';
const locationId = '11111111-1111-1111-1111-111111111111';
const characterId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
// Valid short PCM WAV: exercise the real HTMLAudioElement/autoplay path, not a mocked play().
const sampleRate = 24000;
const fixtureAudio = Buffer.alloc(44 + sampleRate * 2 * 2);
fixtureAudio.write('RIFF',0); fixtureAudio.writeUInt32LE(fixtureAudio.length-8,4); fixtureAudio.write('WAVEfmt ',8);
fixtureAudio.writeUInt32LE(16,16); fixtureAudio.writeUInt16LE(1,20); fixtureAudio.writeUInt16LE(1,22);
fixtureAudio.writeUInt32LE(24000,24); fixtureAudio.writeUInt32LE(48000,28); fixtureAudio.writeUInt16LE(2,32);
fixtureAudio.writeUInt16LE(16,34); fixtureAudio.write('data',36); fixtureAudio.writeUInt32LE(fixtureAudio.length-44,40);
for(let i=0;i<sampleRate*2;i++) {
  const time=i/sampleRate;
  const talking=(time>=.25 && time<.65) || (time>=.95 && time<1.35) || time>=1.65;
  fixtureAudio.writeInt16LE(talking ? Math.round(Math.sin(i*2*Math.PI*220/sampleRate)*10000) : 0,44+i*2);
}
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5192', '--strictPort'], { stdio: 'ignore', windowsHide: true });
let browser, page;
const pageErrors=[];
try {
  for (let attempt=0; attempt<80; attempt++) {
    try { if ((await fetch(origin)).ok) break; } catch { /* waiting for Vite */ }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  browser = await chromium.launch({ channel:'msedge', headless:true });
  page = await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror', e=>pageErrors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE_ERROR',m.text().slice(0,400))});
  page.on('requestfailed',r=>console.log('REQUEST_FAILED',new URL(r.url()).pathname,r.failure()?.errorText));
  const reply = 'Xin chào bạn, mình là Chrono. Cùng khám phá TimeLens nhé!';
  let chats=0, tts=0;
  let holdNextReply=false, releaseReply;
  let profileTier='PREMIUM';
  await page.addInitScript(() => {
    const token = 'e30.' + btoa(JSON.stringify({sub:'voice-test',exp:Math.floor(Date.now()/1000)+3600})) + '.fixture';
    for(const [key,value] of Object.entries({timelens_token:token,timelens_user_id:'voice-test',timelens_display_name:'Người kiểm thử',timelens_email_verified:'1',timelens_role:'USER',timelens_tier:'FREE'})) localStorage.setItem(key,value);
    localStorage.setItem('histar_consent_v1',JSON.stringify({analytics:false,camera:false,gps:false}));
    localStorage.setItem('histar_locale','zh-CN');
    sessionStorage.setItem('premiumBannerDismissed','1');
    const state = {langs:[],plays:0,starts:0,cancels:0}; window.__callTest=state;
    class Recognition {
      start() {
        this.stopped=false;
        state.langs.push(this.lang);
        const transcript=window.__nextQuestion ?? (state.starts===0 ? 'TimeLens có những gì?' : null);
        delete window.__nextQuestion;
        state.starts++;
        if(transcript) setTimeout(()=>{
          if(this.stopped)return;
          this.onresult?.({results:[Object.assign([{transcript}],{isFinal:true})]});
          this.onend?.();
        },80);
      }
      stop() { this.stopped=true; this.onend?.(); }
    }
    Object.defineProperty(window,'SpeechRecognition',{value:Recognition, configurable:true});
    const speech=new EventTarget();
    Object.assign(speech,{getVoices:()=>[{lang:'en-US'},{lang:'zh-CN'}],speak:()=>{throw Error('Native voice must not be selected')},cancel:()=>state.cancels++,resume(){}});
    Object.defineProperty(window,'speechSynthesis',{value:speech,configurable:true});
    const NativeAudio=window.Audio;
    window.Audio=function(...args) {
      const audio=new NativeAudio(...args);
      audio.addEventListener('playing',()=>{ if(audio.src.startsWith('blob:')){state.plays++;state.audio=audio;} });
      return audio;
    };
  });
  await page.route('**/api/**',async route=>{
    const url=new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    let data=[];
    if(url.pathname==='/api/me' || url.pathname==='/api/profile/me') data={id:'voice-test',displayName:'Người kiểm thử',email:'voice@example.test',emailVerified:true,role:'USER',tier:profileTier,activeVisitSites:[],totalPoints:0,level:1};
    else if(url.pathname.includes('/characters')) data=[{id:characterId,locationId,name:'Chrono',era:'Hiện nay',portraitUrl:''}];
    else if(url.pathname==='/api/chat/context') data={conversationId:null,personaKey:'chrono',history:[],knowledgeContext:'',sources:''};
    else if(url.pathname==='/api/chat/messages') {
      chats++;
      if(holdNextReply) { holdNextReply=false; await new Promise(resolve=>{releaseReply=resolve}); }
      data={reply,conversationId:'voice-conversation',sources:[]};
    }
    else if(url.pathname==='/api/chat/voice/tts') { tts++; assert.ok(route.request().headers().authorization); assert.ok(route.request().postDataJSON().text.length<=720); return route.fulfill({status:200,contentType:'audio/wav',body:fixtureAudio}); }
    else if(url.pathname.startsWith('/api/locations')) data=url.pathname==='/api/locations'?[{id:locationId,name:'Địa đạo Củ Chi'}]:{id:locationId,name:'Địa đạo Củ Chi'};
    else if(url.pathname.includes('pricing')) data={chatFreeDailyLimit:10,b2cPremiumPriceVnd:49000};
    else if(url.pathname.includes('/features')) data={};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
  });
  await page.route('**/ai/ready',r=>r.fulfill({contentType:'application/json',body:'{"status":"UP"}'}));
  await page.route('**/ai/health',r=>r.fulfill({contentType:'application/json',body:'{"status":"UP"}'}));
  await page.goto(`${origin}/chat?locationId=${locationId}&persona=chrono`,{waitUntil:'networkidle'});
  await page.screenshot({path:'test-results/chat-call-initial.png',fullPage:true});
  const callButton=page.getByRole('button',{name:'Gọi Video cùng Chrono'});
  await callButton.waitFor({timeout:15000});
  await callButton.click();
  await page.getByRole('dialog',{name:'Cuộc gọi với Chrono'}).waitFor();
  assert.equal(await page.locator('.chrono-call-controls button').count(),5,'all controls have stable positions from call start');
  await page.waitForFunction(()=>window.__callTest.plays>0);
  assert.equal(chats,1,'first turn answers without reloading or calling chat twice');
  assert.ok(tts>0);
  assert.equal(await page.locator('.chrono-call-photo,.chrono-call-answer,.chrono-call-question').count(),0,'call shows only Chrono, no reply/question text or illustrations');
  await page.waitForFunction(()=>document.querySelector('.chrono-call-avatar')?.naturalWidth>0);
  // Match mouth movement to the real media clock, not a timer/playing flag.
  await page.waitForFunction(()=>{
    const t=window.__callTest.audio.currentTime;
    return t>.3 && t<.6 && Number(document.querySelector('[data-mouth-open]')?.dataset.mouthOpen)>.1;
  });
  await page.screenshot({path:'test-results/chat-call-mouth-open.png'});
  await page.waitForFunction(()=>{
    const t=window.__callTest.audio.currentTime;
    return t>.72 && t<.9 && Number(document.querySelector('[data-mouth-open]')?.dataset.mouthOpen)===0;
  });
  await page.waitForFunction(()=>{
    const t=window.__callTest.audio.currentTime;
    return t>1 && t<1.3 && Number(document.querySelector('[data-mouth-open]')?.dataset.mouthOpen)>.1;
  });
  await page.getByRole('button',{name:'Nghe lại',exact:true}).waitFor();
  assert.equal(await page.locator('.chrono-call-controls button').count(),5);
  assert.match(await page.locator('.chrono-call-duration').innerText(),/00:0[2-9]/,'duration advances during the actual call');
  await page.waitForFunction(()=>Number(document.querySelector('[data-mouth-open]')?.dataset.mouthOpen)===0);
  assert.deepEqual(await page.evaluate(()=>window.__callTest.langs),['vi-VN']);
  await mkdir('test-results',{recursive:true});
  for(const [name,size] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}],['small-mobile',{width:320,height:568}],['landscape',{width:844,height:390}]]) {
    await page.setViewportSize(size);
    await page.waitForTimeout(150);
    const avatar=await page.locator('.chrono-talking-avatar').boundingBox();
    const dock=await page.locator('.chrono-call-dock').boundingBox();
    assert.ok(avatar && dock && (avatar.y+avatar.height<=dock.y+1 || avatar.x+avatar.width<=dock.x+1),`${name}: Chrono never overlaps controls`);
    assert.ok(avatar.height>120,`${name}: visible avatar`);
    assert.ok(Math.abs(avatar.width-avatar.height)<2,`${name}: face and mouth keep square alignment`);
    const controls=await page.locator('.chrono-call-controls').boundingBox();
    assert.ok(controls.x>=0 && controls.x+controls.width<=size.width,`${name}: all controls fit on screen`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.getByRole('button',{name:'Kết thúc cuộc gọi'}).evaluate(button=>{
      const box=button.getBoundingClientRect();
      return document.elementFromPoint(box.x+box.width/2,box.y+box.height/2)?.closest('button')===button;
    }),true,`${name}: bottom navigation cannot cover hangup controls`);
    await page.screenshot({path:`test-results/chat-call-${name}.png`,fullPage:true});
  }
  await page.getByRole('button',{name:'Nghe lại',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('[data-mouth-open]')?.dataset.mouthOpen)>.1);
  await page.getByRole('button',{name:'Hỏi tiếp',exact:true}).click();
  await page.waitForFunction(()=>Number(document.querySelector('[data-mouth-open]')?.dataset.mouthOpen)===0);
  assert.equal(await page.evaluate(()=>window.__callTest.audio.paused),true,'asking next stops audio and closes mouth');
  await page.getByRole('button',{name:'Tắt mic',exact:true}).waitFor({state:'visible'});
  await page.getByRole('button',{name:'Tắt mic',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Bật mic',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('status').filter({hasText:'Mic đang tắt'}).waitFor();
  // A canceled pending question must not play a late response or end the call.
  holdNextReply=true;
  await page.evaluate(()=>{window.__nextQuestion='Câu hỏi cũ cần hủy'});
  await page.getByRole('button',{name:'Hủy câu hỏi và hỏi lại'}).click();
  await page.getByRole('status').filter({hasText:'Chrono đang suy nghĩ'}).waitFor();
  const previousTts=tts;
  await page.getByRole('button',{name:'Hủy câu hỏi và hỏi lại'}).click();
  await page.getByRole('status').filter({hasText:'Mình đang lắng nghe bạn'}).waitFor();
  releaseReply();
  await page.waitForTimeout(400);
  assert.equal(tts,previousTts,'late reply from a canceled question must never reach TTS');
  assert.equal(await page.getByRole('dialog',{name:'Cuộc gọi với Chrono'}).count(),1);
  const previousChats=chats;
  await page.getByRole('button',{name:'Hủy câu hỏi và hỏi lại'}).click();
  await page.waitForTimeout(300);
  assert.equal(chats,previousChats,'canceling an active recording must not submit its transcript');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog',{name:/Cuộc gọi/}).count(),0);
  profileTier='FREE';
  const before={chats,tts};
  await page.goto(`${origin}/chat?locationId=${locationId}&persona=chrono`,{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Gọi Video cùng Chrono — cần Premium'}).click();
  await page.getByRole('heading',{name:'Gọi video cùng Chrono · Premium',exact:true}).waitFor();
  assert.equal(await page.getByRole('dialog',{name:/Cuộc gọi/}).count(),0);
  assert.equal(await page.evaluate(()=>window.__callTest.langs.length),0,'Free cannot open microphone');
  assert.deepEqual({chats,tts},before,'Free cannot call chat/TTS by pressing the call button');
  await page.goto(`${origin}/chat?locationId=${locationId}&persona=chrono&call=1`,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Gọi video cùng Chrono · Premium',exact:true}).waitFor();
  assert.equal(await page.getByRole('dialog',{name:/Cuộc gọi/}).count(),0);
  assert.deepEqual({chats,tts},before,'Free cannot bypass Premium through call=1');
  assert.deepEqual(pageErrors,[]);
  console.log(JSON.stringify({passed:true,chats,tts,mouthSync:['speech','silence','ended','replay','interrupted'],controls:['stable-positions','duration','mute','escape'],premiumGate:['button','deep-link','no-microphone'],viewports:['desktop','mobile','small-mobile','landscape']}));
} catch(error) {
  console.log('BROWSER_ERRORS',pageErrors);
  if(page) console.log('BROWSER_STATE',page.url(),(await page.content()).slice(0,1800));
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
