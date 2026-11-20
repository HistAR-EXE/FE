import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
const [output,build]=process.argv.slice(2),out=path.resolve(output),base='http://127.0.0.1:5414'
mkdirSync(out,{recursive:true})
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5414','--strictPort'],{windowsHide:true,stdio:'ignore'})
const result={build,scope:'Isolated guest L2-A fixture, no facts; accessibility controls only, not quest acceptance',checks:[],errors:[]}
let browser
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});page.setDefaultTimeout(20000);page.on('pageerror',e=>result.errors.push(e.message))
 await page.addInitScript(()=>sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone:'L2-A',position:[0,2],heading:Math.PI,rice:0,last:null,q1:[],facts:[],mode:'STORY'})))
 await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click()
 const ready=()=>page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000})
 await ready();const pose=await page.locator('canvas').getAttribute('data-avatar-pose')
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Dùng sơ đồ 2D',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click();await expect(page.locator('.lw-map')).toBeVisible();await page.screenshot({path:path.join(out,'mobile-2D.png')})
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Thử lại 3D',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click();await ready()
 if(pose)expect(JSON.parse(await page.locator('canvas').getAttribute('data-avatar-pose')).position).toEqual(JSON.parse(pose).position)
 result.checks.push({id:'2D-fallback-and-3D-return-keep-position',result:'PASS'})
 await page.getByRole('button',{name:'Lát cắt X-ray',exact:true}).click();await page.getByRole('button',{name:'Lát cắt X-ray',exact:true}).click();await ready();result.checks.push({id:'Xray-return-to-room',result:'PASS'})
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.keyboard.press('Escape');await expect(page.locator('#lw-menu')).toHaveCount(0);result.checks.push({id:'Escape-closes-menu',result:'PASS'})
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(result.errors).toEqual([]);result.result='PASS'
}catch(error){result.result='FAIL';result.error=String(error);throw error}finally{writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await browser?.close();server.kill()}
