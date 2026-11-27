import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createHash,createHmac} from 'node:crypto'
import path from 'node:path'
import {installRuntimeAudioProof,readRuntimeAudioProof} from './runtime-audio-proof.mjs'
const [directory,build,userFile]=process.argv.slice(2),out=path.resolve(directory),base='http://127.0.0.1:5451'
mkdirSync(out,{recursive:true})
const result={scope:'A08 staged presentation, hardware desktop GPU, real timers and runtime audio; guest fixture, no historical or canonical acceptance',buildIndexSha256:createHash('sha256').update(readFileSync(path.join(build,'index.html'))).digest('hex'),checks:[],errors:[]}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5451','--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8096'}})
let browser,page
const save=()=>writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2))
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference',serviceWorkers:'block'});page=await context.newPage();page.setDefaultTimeout(20000)
 await installRuntimeAudioProof(page);page.on('pageerror',e=>result.errors.push(e.message))
 await page.addInitScript(()=>{if(!sessionStorage.getItem('timelens-proof-nav:guest'))sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'L1-C',position:[.5,-1.5],heading:Math.PI,rice:0,last:null,facts:[],mode:'STORY',activities:[]}));localStorage.setItem('timelens-world-volume','0')})
 const check=name=>{result.checks.push(name);save();console.log(name)}
 await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready')
 const main=page.locator('main');await expect(main).toHaveAttribute('data-atmosphere','CALM',{timeout:1500})
 result.gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL)});expect(result.gpu).not.toMatch(/swiftshader|llvmpipe/i)
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh không gian',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
 await expect(main).toHaveAttribute('data-atmosphere','NOTICE',{timeout:40000});await expect(page.getByRole('region',{name:'Nhịp không gian'})).toBeVisible();await page.screenshot({path:path.join(out,'notice.png')});check('notice-before-cue')
 const assist=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await assist.click();await page.locator('.lw-alternatives [data-target="NPC_COOK"]').click();await expect(main).toHaveAttribute('data-arrived','NPC_COOK');await assist.click();await page.locator('canvas').focus();await page.keyboard.press('e');await expect(main).toHaveAttribute('data-atmosphere','CALM');await page.waitForTimeout(7000);await expect(main).toHaveAttribute('data-atmosphere','CALM');await page.locator('.lw-dialog .lw-close').click();await expect(main).toHaveAttribute('data-atmosphere','NOTICE');check('dialogue-pauses-warning-without-catchup')
 await expect(main).toHaveAttribute('data-atmosphere','ALERT',{timeout:12000})
 await expect.poll(async()=>page.locator('canvas').evaluate(c=>JSON.parse(c.dataset.characterQc??'{}').actors?.filter(a=>a.ambientReaction==='LISTENING').length??0)).toBe(2)
 await page.screenshot({path:path.join(out,'listening.png')});check('cook-and-helper-listening')
 await expect(main).toHaveAttribute('data-atmosphere','RECOVERY',{timeout:12000});await expect.poll(async()=>page.locator('canvas').evaluate(c=>JSON.parse(c.dataset.characterQc??'{}').actors?.filter(a=>a.ambientReaction==='ROUTINE').length??0)).toBe(2)
 await expect(main).toHaveAttribute('data-atmosphere','SETTLED',{timeout:12000});check('recovery-and-routine-resumed')
 const audio=await readRuntimeAudioProof(page);expect(audio.length).toBeGreaterThan(0);expect(Math.max(...audio.map(c=>c.peak))).toBe(0)
 audio.forEach((c,i)=>{writeFileSync(path.join(out,'muted-runtime-'+i+'.webm'),Buffer.from(c.base64,'base64'));delete c.base64});result.audio=audio;check('actual-audio-output-zero-at-zero-volume')
 expect(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')).facts)).toEqual([])
 await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready');await expect(main).toHaveAttribute('data-atmosphere','SETTLED');expect(await page.evaluate(()=>window.__qaAudioCaptures.length)).toBe(0);check('reload-does-not-autoreplay')
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Xem lại nhịp cảnh',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click();await expect(main).toHaveAttribute('data-atmosphere','NOTICE');await page.getByRole('button',{name:'Bỏ qua nhịp cảnh',exact:true}).click();await expect(main).toHaveAttribute('data-atmosphere','SETTLED');check('explicit-replay-and-skip')
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('checkbox',{name:'Nhịp cảnh tái dựng',exact:true}).uncheck();await page.reload();await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Nhịp cảnh tái dựng',exact:true})).not.toBeChecked();await expect(page.getByRole('button',{name:'Xem lại nhịp cảnh',exact:true})).toBeDisabled();check('intensity-preference-survives-reload')
 await page.getByRole('checkbox',{name:'Nhịp cảnh tái dựng',exact:true}).check();await page.evaluate(()=>{const key='timelens-proof-nav:guest',nav=JSON.parse(sessionStorage.getItem(key));nav.zone='S5';nav.position=[0,2];nav.heading=Math.PI;sessionStorage.setItem(key,JSON.stringify(nav))});await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready');await expect(main).toHaveAttribute('data-atmosphere','CALM');await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Nhịp cảnh tái dựng',exact:true})).toBeChecked();await expect(page.getByRole('button',{name:'Xem lại nhịp cảnh',exact:true})).toBeDisabled();check('present-day-memorial-excluded')
 if(userFile){
  const user=JSON.parse(readFileSync(userFile,'utf8')),header=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),payload=Buffer.from(JSON.stringify({sub:user.email,userId:user.id,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),token=`${header}.${payload}.${createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(`${header}.${payload}`).digest('base64url')}`
  const state=async()=>{const r=await context.request.get('http://127.0.0.1:8096/api/v2/worlds/cuchi-mach-song/state',{headers:{Authorization:`Bearer ${token}`}});expect(r.status()).toBe(200);return(await r.json()).data}
  const before=await state()
  await page.evaluate(({user,token})=>{for(const[k,v]of Object.entries({timelens_user_id:user.id,timelens_email:user.email,timelens_token:token,timelens_display_name:'A08 QA',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(k,v)},{user,token})
  await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready');await expect(page.locator('.lw-hud-place')).toContainText('Bản thử tài khoản');await expect(main).toHaveAttribute('data-atmosphere','CALM');const resumed=await state();expect(resumed.facts).toEqual(before.facts);await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Xem lại nhịp cảnh',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click();await expect(main).toHaveAttribute('data-atmosphere','NOTICE');await page.getByRole('button',{name:'Bỏ qua nhịp cảnh',exact:true}).click()
  const after=await state();expect(after.revision).toBe(resumed.revision);expect(after.facts).toEqual(resumed.facts);result.canonicalRevision=after.revision
  await page.evaluate(()=>{for(const key of ['timelens_user_id','timelens_email','timelens_token','timelens_display_name','timelens_role','timelens_tier','timelens_email_verified'])localStorage.removeItem(key);const key='timelens-proof-nav:guest',nav=JSON.parse(sessionStorage.getItem(key));nav.zone='L1-C';nav.position=[.5,-1.5];sessionStorage.setItem(key,JSON.stringify(nav))});await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready');await expect(main).toHaveAttribute('data-atmosphere','SETTLED');check('reload-owner-isolation-and-no-canonical-write')
 }
 expect(result.errors).toEqual([]);result.result='PASS'
}catch(error){result.result='FAIL';result.error=String(error);await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw error}finally{save();await browser?.close();server.kill()}
