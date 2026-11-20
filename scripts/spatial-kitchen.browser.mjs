import {chromium,expect} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'
import {installRuntimeAudioProof,readRuntimeAudioProof} from './runtime-audio-proof.mjs'
const [output,build]=process.argv.slice(2),out=path.resolve(output),base='http://127.0.0.1:5451'
mkdirSync(out,{recursive:true});const result={scope:'Desktop GPU Q4 guest fixture; canonical verification separate',checks:[],errors:[]}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',build,'--host','127.0.0.1','--port','5451','--strictPort'],{windowsHide:true,stdio:'ignore'})
let browser,context,page
try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,200))}
 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']});context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block',recordVideo:{dir:out,size:{width:1440,height:900}}});page=await context.newPage();page.setDefaultTimeout(30000)
 await installRuntimeAudioProof(page);page.on('pageerror',e=>result.errors.push(e.message))
 await page.addInitScript(()=>{const key='timelens-proof-nav:guest';if(!sessionStorage.getItem(key))sessionStorage.setItem(key,JSON.stringify({version:1,zone:'L1-C',position:[0,-1.5],heading:Math.PI,rice:0,last:null,mode:'STORY',facts:[],q1:[],activities:[]}))})
 const load=async()=>{await page.goto(base+'/living-world');const c=page.getByTestId('consent-decline');if(await c.count())await c.click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready')}
 const approach=async()=>{const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await toggle.click();await page.locator('.lw-alternatives [data-target="Q4_HEARTH"]').click();await expect(page.locator('main')).toHaveAttribute('data-arrived','Q4_HEARTH');await toggle.click();await expect(page.locator('canvas')).toHaveAttribute('data-model-camera-inside','true')}
 const pick=async node=>{const id='Q4_'+node,at=await page.locator(`[data-scene-target="${id}"]`).evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy})),rect=await page.locator('canvas').boundingBox();await page.mouse.click(rect.x+at.x,rect.y+at.y);await page.waitForTimeout(250);await page.screenshot({path:path.join(out,'last-pick.png')});expect(await page.locator('canvas').getAttribute('data-last-pick')).toBe(id);result.checks.push({pick:id,at})}
 await load();await approach();await pick('HEARTH');await expect(page.getByText(/Hãy quan sát và ghi nhận cả/)).toBeVisible()
 await page.evaluate(()=>{const k='timelens-proof-nav:guest',n=JSON.parse(sessionStorage.getItem(k));n.facts=['KITCHEN_HEARTH_INSPECTED','KITCHEN_SMOKE_INSPECTED'];sessionStorage.setItem(k,JSON.stringify(n))});await load();await approach()
 await pick('DIFFUSION');await expect(page.getByText(/Đường nối chưa đi từ nguồn nhiệt/)).toBeVisible();await pick('HEARTH')
 await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready');await approach();await pick('CHANNEL')
 await page.getByRole('button',{name:'Menu',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh không gian',exact:true}).click();await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
 await pick('DIFFUSION');await expect(page.getByText(/Đã nối đường khói/)).toBeVisible();await page.screenshot({path:path.join(out,'path-connected.png')})
 await pick('COMMUNITY');await expect(page.getByText(/Những công việc quanh bếp cùng hướng tới/)).toBeVisible();await page.screenshot({path:path.join(out,'community-payoff.png')})
 const facts=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')).facts);expect(facts).toContain('KITCHEN_MEANING_CONFIRMED');expect(facts).not.toContain('CARE_MEANING_CONFIRMED')
 result.gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL)});expect(result.gpu).not.toMatch(/swiftshader|llvmpipe/i)
 await page.getByRole('button',{name:'Menu',exact:true}).click();const volume=page.getByRole('slider',{name:'Âm lượng không gian'});await volume.focus();await volume.press('Home');await expect(volume).toHaveValue('0');await page.waitForTimeout(500);
 await page.evaluate(()=>{for(const c of window.__qaAudioCaptures)c.peak=0});await page.waitForTimeout(500);const mutedPeak=await page.evaluate(()=>Math.max(...window.__qaAudioCaptures.map(c=>c.peak)));expect(mutedPeak).toBeLessThan(.00001);result.checks.push({volumeZeroPeak:mutedPeak});
 await volume.press('End');await page.waitForTimeout(500);expect(await page.evaluate(()=>Math.max(...window.__qaAudioCaptures.map(c=>c.peak)))).toBeGreaterThan(0);
 await volume.press('Home');for(let i=0;i<10;i++)await volume.press('ArrowRight');await expect(volume).toHaveValue('50');
 const audio=await readRuntimeAudioProof(page);audio.forEach((c,i)=>{writeFileSync(path.join(out,`runtime-audio-${i}.webm`),Buffer.from(c.base64,'base64'));delete c.base64});result.audio=audio;
 await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready');await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.getByRole('slider',{name:'Âm lượng không gian'})).toHaveValue('50');await expect(page.getByRole('button',{name:'Bật âm thanh không gian',exact:true})).toBeVisible();result.checks.push({volumePreferenceResume:'PASS',autoplayAfterReload:false});
 expect(result.errors).toEqual([]);result.result='PASS'
}catch(e){result.result='FAIL';result.error=String(e);await page?.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});throw e}finally{writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));await context?.close();await browser?.close();server.kill()}
