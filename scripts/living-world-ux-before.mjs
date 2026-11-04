import {chromium} from '@playwright/test'
import fs from 'node:fs'
const dir='../docs/superpowers/g2/2026-11-01-living-world/ux-review-2026-11-02/evidence/before'
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']})
const context=await browser.newContext({viewport:{width:1365,height:900},recordVideo:{dir,size:{width:1365,height:900}}})
const page=await context.newPage();const cdp=await context.newCDPSession(page)
try{
 await page.goto('http://127.0.0.1:5194/living-world?debug=1');await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click();await page.locator('canvas').waitFor();await page.screenshot({path:dir+'/q2.png',fullPage:true})
 await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc=await cdp.send('DOM.getDocument');const heading=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'.lw-root h1'});const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:heading.nodeId})
 const metrics=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s)?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}:null};const styles=s=>{const el=document.querySelector(s);if(!el)return null;const c=getComputedStyle(el);return{font:c.fontFamily,size:c.fontSize,spacing:c.letterSpacing,color:c.color,background:c.backgroundColor,opacity:c.opacity}};return{heading:document.querySelector('h1').textContent,nfc:document.querySelector('h1').textContent===document.querySelector('h1').textContent.normalize('NFC'),h1:styles('h1'),toolbar:styles('.lw-stage-tools button'),primary:styles('.lw-primary'),scene:rect('.lw-canvas'),workbench:rect('.lw-workbench'),scrollHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight}})
 fs.writeFileSync(dir+'/diagnostics.json',JSON.stringify({metrics,fonts},null,2))
 await page.getByLabel('Cách khám phá').selectOption('FREE');await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click();await page.getByRole('button',{name:'Giã bên trái'}).click();await page.screenshot({path:dir+'/a04.png',fullPage:true})
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp trên',exact:true}).click();await page.screenshot({path:dir+'/q3.png',fullPage:true})
 await page.waitForTimeout(1000)
}finally{await context.close();await browser.close()}
