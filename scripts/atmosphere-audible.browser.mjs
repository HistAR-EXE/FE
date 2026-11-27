import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
import {installRuntimeAudioProof,readRuntimeAudioProof} from './runtime-audio-proof.mjs'
const [directory,build]=process.argv.slice(2),out=path.resolve(directory),base='http://127.0.0.1:5448'
mkdirSync(out,{recursive:true});const result={scope:'Actual opted-in Web Audio output during replay; original ambience plus distant cue, not an isolated cue recording',buildIndexSha256:createHash('sha256').update(readFileSync(path.join(build,'index.html'))).digest('hex'),errors:[]}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5448','--strictPort'],{windowsHide:true,stdio:'ignore'})
let browser
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']});const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'}),page=await context.newPage();await installRuntimeAudioProof(page);page.on('pageerror',e=>result.errors.push(e.message))
 await page.addInitScript(()=>{sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'L1-C',position:[0,.5],heading:Math.PI,rice:0,last:null,facts:[],mode:'STORY',activities:[]}));sessionStorage.setItem('timelens-atmosphere-seen:v1:'+JSON.stringify(['guest','L1-C']),'seen');localStorage.setItem('timelens-atmosphere-enabled:v1','on');localStorage.setItem('timelens-world-volume','1')})
 await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready')
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh không gian',exact:true}).click();await page.getByRole('button',{name:'Xem lại nhịp cảnh',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click();await expect(page.locator('main')).toHaveAttribute('data-atmosphere','NOTICE');await expect(page.locator('main')).toHaveAttribute('data-atmosphere','ALERT',{timeout:12000});await page.waitForTimeout(1200)
 const audio=await readRuntimeAudioProof(page);expect(audio.length).toBeGreaterThan(0);expect(Math.max(...audio.map(c=>c.peak))).toBeGreaterThan(0);audio.forEach((c,i)=>{writeFileSync(path.join(out,'audio-'+i+'.webm'),Buffer.from(c.base64,'base64'));delete c.base64});result.audio=audio;expect(result.errors).toEqual([]);result.result='PASS'
}catch(error){result.result='FAIL';result.error=String(error);throw error}finally{writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser?.close();server.kill()}
