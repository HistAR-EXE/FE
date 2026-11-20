import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'

const [directory,build]=process.argv.slice(2)
const output=path.resolve(directory)
mkdirSync(output,{recursive:true})
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5445','--strictPort'],{windowsHide:true,stdio:'ignore'})
const result={runs:[],errors:[],status:'RUNNING'}
let browser
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5445')).ok)break}catch{}await new Promise(resolve=>setTimeout(resolve,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},hasTouch:width===390,serviceWorkers:'block',recordVideo:{dir:path.join(output,String(width))}})
  const page=await context.newPage()
  page.on('pageerror',error=>result.errors.push(error.message))
  await page.addInitScript(()=>{if(!sessionStorage.getItem('timelens-proof-nav:guest'))sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'S5',position:[0,2],heading:Math.PI,rice:0,last:null,facts:[],mode:'FREE'}))})
  await page.goto('http://127.0.0.1:5445/living-world')
  const consent=page.getByTestId('consent-decline');if(await consent.count())await consent.click()
  await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000})
  const gpu=await page.locator('canvas').evaluate(canvas=>{const gl=canvas.getContext('webgl2'),extension=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(extension?extension.UNMASKED_RENDERER_WEBGL:gl.RENDERER)})
  expect(gpu).not.toMatch(/swiftshader|llvmpipe/i)
  await expect(page.getByRole('heading',{name:'Củ Chi hôm nay · ký ức và tri ân',exact:true})).toBeVisible()
  await page.screenshot({path:path.join(output,`${width}-entry.png`)})
  const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true})
  for(const target of ['MEMORIAL_READ','MEMORIAL_QUIET']){
   await toggle.click();await page.locator(`[data-target="${target}"]`).click()
   await expect(page.locator('main')).toHaveAttribute('data-arrived',target,{timeout:20000})
   await toggle.click();await page.locator('canvas').focus();await page.keyboard.press('e')
   await page.screenshot({path:path.join(output,`${width}-${target}.png`)})
  }
  await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000})
  await expect(page.getByRole('heading',{name:'Củ Chi hôm nay · ký ức và tri ân',exact:true})).toBeVisible()
  await toggle.click();await page.locator('.lw-alternatives [data-target="ROUTE_MEMORIAL_STATION"]').click()
  await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Trạm thời gian',exact:true})).toBeVisible({timeout:60000})
  await page.locator('.lw-alternatives [data-target="ROUTE_STATION_MEMORIAL"]').click()
  await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Củ Chi hôm nay · ký ức và tri ân',exact:true})).toBeVisible({timeout:60000})
  result.runs.push({width,gpu,resume:true})
  await context.close()
 }
 expect(result.errors).toEqual([]);result.status='PASS'
}catch(error){result.status='FAIL';result.failure=String(error);throw error}
finally{writeFileSync(path.join(output,'results.json'),JSON.stringify(result,null,2));await browser?.close();server.kill()}
