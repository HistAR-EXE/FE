import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
const [output,before,after]=process.argv.slice(2),out=path.resolve(output)
mkdirSync(out,{recursive:true});const evidence={scope:'Matched guest pose, first activity and viewport; camera differences are the intended change. Fixture captures, not natural-route evidence.',shots:[]}
const servers=[before,after].map((build,i)=>spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port',String(5417+i),'--strictPort'],{windowsHide:true,stdio:'ignore'}))
let browser
try{
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 for(const [version,build,port] of [['before',before,5417],['after',after,5418]]){
  const base=`http://127.0.0.1:${port}`;for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
  for(const [zone,target] of [['L1-C','A02_PREPARE'],['L2-C','A13_BELONGINGS'],['L3-B','A15_CLOTH'],['L3-C','A14_WATER']]){
   const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(20000)
   await page.addInitScript(zone=>sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone,position:[0,1],heading:Math.PI,rice:0,last:null,q1:[],facts:[],mode:'STORY'})),zone)
   await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000});await page.waitForTimeout(400);await page.screenshot({path:path.join(out,`${zone}-${version}-entry.png`)})
   await page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true}).click();await page.locator(`.lw-alternatives [data-target="${target}"]`).click();await expect(page.locator('main')).toHaveAttribute('data-arrived',target);await page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true}).click();await page.locator('.lw-dialog .lw-close').click();await page.locator('canvas').focus();await page.keyboard.press('e');await expect(page.getByRole('button',{name:'Đã thực hiện',exact:true})).toBeDisabled();await page.waitForTimeout(650);await page.screenshot({path:path.join(out,`${zone}-${version}-contact.png`)})
   evidence.shots.push({version,build,zone,target,pose:JSON.parse(await page.locator('canvas').getAttribute('data-avatar-pose'))});await context.close()
  }
 }
 evidence.result='PASS'
}finally{writeFileSync(path.join(out,'comparison.json'),JSON.stringify(evidence,null,2));await browser?.close();servers.forEach(s=>s.kill())}
