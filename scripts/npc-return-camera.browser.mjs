import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
const [directory,build]=process.argv.slice(2),out=path.resolve(directory),base='http://127.0.0.1:5449'
mkdirSync(out,{recursive:true});const result={scope:'NPC remains visible after closing conversation',checks:[],errors:[]}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5449','--strictPort'],{windowsHide:true,stdio:'ignore'})
let browser,page
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},serviceWorkers:'block'});page=await context.newPage();page.on('pageerror',e=>result.errors.push(e.message))
  await page.addInitScript(()=>sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'L1-C',position:[.5,-1.5],heading:Math.PI,rice:0,last:null,facts:[],mode:'STORY',activities:[]})))
  await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready')
  const assist=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await assist.click();await page.locator('.lw-alternatives [data-target="NPC_COOK"]').click();await expect(page.locator('main')).toHaveAttribute('data-arrived','NPC_COOK');await assist.click();await page.locator('canvas').focus();await page.keyboard.press('e');await page.locator('.lw-dialog .lw-close').click();await page.waitForTimeout(1800)
  const point=await page.locator('[data-scene-target="NPC_COOK"]').evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy}));result.checks.push({width,point});await page.screenshot({path:path.join(out,width+'.png')});expect(point.x).toBeGreaterThan(20);expect(point.x).toBeLessThan(width-20);expect(point.y).toBeGreaterThan(100);expect(point.y).toBeLessThan((width===1440?900:844)*.85);await context.close()
 }
 expect(result.errors).toEqual([]);result.result='PASS'
}catch(error){result.result='FAIL';result.error=String(error);throw error}finally{writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser?.close();server.kill()}
