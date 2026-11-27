import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
const [output,build]=process.argv.slice(2),out=path.resolve(output),base='http://127.0.0.1:5421'
mkdirSync(out,{recursive:true});const result={scope:'Guest L1-C camera regression, no canonical or historical acceptance',checks:[],errors:[]}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5421','--strictPort'],{windowsHide:true,stdio:'ignore'})
let browser
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const context=await browser.newContext({viewport,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(20000)
  page.on('pageerror',e=>result.errors.push(e.message))
  await page.addInitScript(()=>sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'L1-C',position:[0,.5],heading:Math.PI,rice:0,last:null,q1:[],facts:[],mode:'STORY',activities:[]})))
  await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready')
  for(const target of ['A02_PREPARE','A02_SMOKE']){
  const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await toggle.click();await page.locator(`.lw-alternatives [data-target="${target}"]`).click();await expect(page.locator('main')).toHaveAttribute('data-arrived',target);await toggle.click();await page.locator('canvas').focus();await page.keyboard.press('e')
  const check=async phase=>{
   const point=await page.locator(`[data-scene-target="${target}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy}))
   const camera=await page.locator('canvas').evaluate(c=>JSON.parse(c.dataset.kitchenCamera??'null'))
   result.checks.push({viewport,target,phase,point,camera});await page.screenshot({path:path.join(out,`${viewport.width}-${target}-${phase}.png`)})
   if(phase!=='contact'){if(target==='A02_SMOKE'){expect(camera.position[0]).toBeLessThan(-.9);expect(camera.position[2]).toBeGreaterThan(-1.5)}else{expect(camera.position[0]).toBeLessThan(-2);expect(camera.position[2]).toBeGreaterThan(-.4)}expect(camera.fov).toBe(viewport.width<500?70:55)}
   expect(point.x,'selected smoke model remains horizontally in view').toBeGreaterThan(viewport.width*.08);expect(point.x).toBeLessThan(viewport.width*.92)
   expect(point.y,'selected smoke model remains vertically in view').toBeGreaterThan(viewport.height*.12);expect(point.y).toBeLessThan(viewport.height*.85)
  }
  await page.waitForTimeout(800);await check('contact');await page.waitForTimeout(6500);await check('settled');await page.locator('.lw-dialog .lw-close').click();await page.waitForTimeout(1200);await check('closed')
  }
  await context.close()
 }
 expect(result.errors).toEqual([]);result.result='PASS'
}catch(e){result.result='FAIL';result.error=String(e);throw e}finally{writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser?.close();server.kill()}
