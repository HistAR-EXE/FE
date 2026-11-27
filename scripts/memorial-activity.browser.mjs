import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {installRuntimeAudioProof,readRuntimeAudioProof} from './runtime-audio-proof.mjs'

const [directory,build]=process.argv.slice(2)
const output=path.resolve(directory),base='http://127.0.0.1:5446'
mkdirSync(output,{recursive:true})
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5446','--strictPort'],{windowsHide:true,stdio:'ignore'})
const result={scope:'Guest activity presentation and GPU; canonical account covered separately',runs:[],errors:[]}
let browser
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(resolve=>setTimeout(resolve,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 for(const width of [1440,390]){
  const dir=path.join(output,String(width));mkdirSync(dir,{recursive:true})
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},hasTouch:width===390,serviceWorkers:'block',recordVideo:{dir}})
  const page=await context.newPage();page.setDefaultTimeout(20000)
  await installRuntimeAudioProof(page)
  page.on('pageerror',error=>result.errors.push(error.message))
  await page.addInitScript(()=>{if(!sessionStorage.getItem('timelens-proof-nav:guest'))sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'S5',position:[0,2],heading:Math.PI,rice:0,last:null,facts:[],mode:'FREE'}))})
  const load=async()=>{
   await page.goto(base+'/living-world')
   const consent=page.getByTestId('consent-decline');if(await consent.count())await consent.click()
   await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000})
  }
  const approach=async target=>{
   const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true})
   await toggle.click();await page.locator(`.lw-alternatives [data-target="${target}"]`).click()
   await expect(page.locator('main')).toHaveAttribute('data-arrived',target)
   await toggle.click();await page.locator('canvas').focus();await page.keyboard.press('e')
  }
  const checkpoint=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')))
  const pick=async target=>{
   await page.waitForTimeout(700)
   const point=await page.locator(`[data-scene-target="${target}"]`).evaluate(element=>({x:+element.dataset.cx,y:+element.dataset.cy}))
   const rect=await page.locator('canvas').boundingBox()
   await page.mouse.click(rect.x+point.x,rect.y+point.y)
  }
  await load()
  const gpu=await page.locator('canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2'),extension=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(extension?extension.UNMASKED_RENDERER_WEBGL:gl.RENDERER)})
  expect(gpu).not.toMatch(/swiftshader|llvmpipe/i)
  await page.getByRole('button',{name:'Menu',exact:true}).click()
  await page.getByRole('button',{name:'Bật âm thanh không gian',exact:true}).click()
  await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
  for(const [choice,target,label] of [['FLOWERS','MEMORIAL_FLOWERS','Chọn hoa'],['INCENSE','MEMORIAL_INCENSE','Chọn hương']]){
   await approach(target)
   await page.getByRole('button',{name:label,exact:true}).click()
   await pick(target)
   await expect.poll(async()=>(await checkpoint()).memorial).toEqual({choice,phase:'OFFERED'})
   await page.screenshot({path:path.join(dir,choice+'-offering.png')})
   await page.getByRole('button',{name:'Ở lại yên lặng',exact:true}).click()
   await expect.poll(async()=>(await checkpoint()).memorial).toEqual({choice,phase:'REFLECTING'})
   await page.getByRole('button',{name:'Rời ngay',exact:true}).click()
   await expect.poll(async()=>(await checkpoint()).memorial).toEqual({choice,phase:'LEFT'})
  }
  await approach('MEMORIAL_QUIET')
  await page.getByRole('button',{name:'Dành một khoảng yên lặng',exact:true}).click()
  const audio=await readRuntimeAudioProof(page)
  audio.forEach((clip,index)=>{writeFileSync(path.join(dir,`runtime-audio-${index}.webm`),Buffer.from(clip.base64,'base64'));delete clip.base64})
  expect(audio.some(clip=>clip.peak>0)).toBe(true)
  await load()
  await expect.poll(async()=>(await checkpoint()).memorial).toEqual({choice:'QUIET',phase:'REFLECTING'})
  expect((await checkpoint()).facts).toEqual([])
  await page.screenshot({path:path.join(dir,'resumed.png')})
  result.runs.push({width,gpu,audio,checkpoint:await checkpoint()})
  await context.close()
 }
 expect(result.errors).toEqual([]);result.status='PASS'
}catch(error){result.status='FAIL';result.failure=String(error);throw error}
finally{writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));await browser?.close();server.kill()}
