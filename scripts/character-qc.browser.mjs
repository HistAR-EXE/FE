import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {installRuntimeAudioProof,readRuntimeAudioProof} from './runtime-audio-proof.mjs'
const [output,before,after]=process.argv.slice(2),out=path.resolve(output)
mkdirSync(out,{recursive:true})
const result={scope:'L1-C visual QC candidate; matched navigation fixtures; no product acceptance',runs:[],errors:[]}
const servers=[before,after].map((build,i)=>spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port',String(5431+i),'--strictPort'],{windowsHide:true,stdio:'ignore'}))
let browser
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 for(const [version,port] of [['before',5431],['after',5432]]){
  const base=`http://127.0.0.1:${port}`;for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const dir=path.join(out,`${version}-${viewport.width}`);mkdirSync(dir,{recursive:true})
   const context=await browser.newContext({viewport,hasTouch:viewport.width<500,serviceWorkers:'block',recordVideo:{dir,size:viewport}}),page=await context.newPage();page.setDefaultTimeout(30000)
   await installRuntimeAudioProof(page);page.on('pageerror',e=>result.errors.push(e.message))
   await page.addInitScript(()=>sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'L1-C',position:[0,1],heading:Math.PI,rice:0,last:null,q1:[],facts:[],mode:'STORY'})))
   await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000})
   const contactFrames=[]
   const gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)})
   expect(gpu).not.toMatch(/swiftshader|llvmpipe/i)
   await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh không gian',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
   await page.evaluate(()=>{
    const stream=document.querySelector('canvas').captureStream(30)
    for(const audio of window.__qaAudioStreams)for(const track of audio.getAudioTracks())stream.addTrack(track)
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus'}),chunks=[]
    window.__qcStop=()=>new Promise(resolve=>{recorder.onstop=async()=>{const bytes=new Uint8Array(await new Blob(chunks).arrayBuffer());let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve(btoa(str))};recorder.stop()})
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start(500)
   })
   await page.waitForTimeout(800);await page.screenshot({path:path.join(dir,'entry.png')})
   const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true})
   for(const target of ['A02_PREPARE','A02_SMOKE']){
    await toggle.click();await page.locator(`.lw-alternatives [data-target="${target}"]`).click();await expect(page.locator('main')).toHaveAttribute('data-arrived',target);await toggle.click()
    if(await page.locator('.lw-dialog .lw-close').count())await page.locator('.lw-dialog .lw-close').click()
    await page.locator('canvas').focus();await page.keyboard.press('e');await page.waitForTimeout(800);contactFrames.push({target,at:await page.evaluate(()=>performance.now()),telemetry:await page.locator('canvas').getAttribute('data-character-qc')});await page.screenshot({path:path.join(dir,target+'-contact.png')});await page.waitForTimeout(5000);await page.screenshot({path:path.join(dir,target+'-settled.png')})
   }
   writeFileSync(path.join(dir,'scene-with-runtime-audio.webm'),Buffer.from(await page.evaluate(()=>window.__qcStop()),'base64'))
   const captures=await readRuntimeAudioProof(page);captures.forEach((c,i)=>{writeFileSync(path.join(dir,`runtime-audio-${i}.webm`),Buffer.from(c.base64,'base64'));delete c.base64});expect(captures.some(c=>c.peak>0)).toBe(true)
   result.runs.push({version,viewport,gpu,contactFrames,audio:captures,pose:await page.locator('canvas').getAttribute('data-avatar-pose'),characterQc:await page.locator('canvas').getAttribute('data-character-qc')})
   await context.close()
  }
 }
 expect(result.errors).toEqual([]);result.result='CAPTURED_REQUIRES_VISUAL_REVIEW'
}catch(e){result.result='FAIL';result.error=String(e);throw e}finally{writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser?.close();servers.forEach(s=>s.kill())}
