import {spawnQaPreview} from './qa-preview.mjs'
import {chromium,expect} from '@playwright/test'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'

const [output,build]=process.argv.slice(2)
const out=path.resolve(output??'../docs/costume-lamp-upgrade-2026-11-26/visual-qa')
const candidate=path.resolve(build??'../docs/costume-lamp-upgrade-2026-11-26/candidate')
const base='http://127.0.0.1:5467'
mkdirSync(out,{recursive:true})

const result={
 scope:'Visual & functional GPU QA for Vietnamese traditional oil lamps, villager/revolutionary costumes, S4 enlistment desk + altar, L3-B medic/stretcher, S1 liaison, and Baseline source links (guest navigation fixture)',
 buildIndexSha256:createHash('sha256').update(readFileSync(path.join(candidate,'index.html'))).digest('hex'),
 checks:[],
 errors:[],
 shots:[],
}
const save=()=>writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2))
const check=id=>{result.checks.push(id);save();console.log('PASS:',id)}

const server=spawnQaPreview(5467,candidate)
let browser,page

async function openZone(context,zone,position,heading=Math.PI){
 const p=await context.newPage()
 p.setDefaultTimeout(60000)
 p.on('pageerror',e=>result.errors.push(`${zone}: ${e.message}`))
 await p.addInitScript(({zone,position,heading})=>{
  sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({
   version:1,zone,position,heading,rice:0,last:null,q1:[],facts:['MS_SYNTHESIS_COMPLETE'],mode:'STORY',activities:[],modelCompared:true,callbackSeen:true
  }))
 },{zone,position,heading})
 await p.goto(base+'/living-world')
 const decline=p.getByTestId('consent-decline')
 if(await decline.isVisible({timeout:4000}).catch(()=>false))await decline.click()
 await p.waitForFunction(()=>document.querySelector('.lw-canvas canvas')?.dataset.readiness==='ready',null,{timeout:90000})
 await p.waitForTimeout(900)
 return p
}

try{
 let served=false
 for(let i=0;i<300;i++){
  try{
   const res=await fetch(base)
   if(res.ok&&createHash('sha256').update(Buffer.from(await res.arrayBuffer())).digest('hex')===result.buildIndexSha256){served=true;break}
  }catch{}
  await new Promise(r=>setTimeout(r,200))
 }
 if(!served)throw new Error('Preview server did not serve the pinned candidate build')

 browser=await chromium.launch({channel:'chrome',headless:true,args:['--ignore-gpu-blocklist']})
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'})

 // 1. S1: Chiến sĩ giao liên mặc bà ba đen + nón tai bèo + khăn rằn + áo choàng vải dù + bi-đông (và trò chuyện A22 không lộ Q1)
 page=await openZone(context,'S1',[-1.5,1.5],-Math.PI/2)
 result.gpu=await page.locator('.lw-canvas canvas').evaluate(c=>{const g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER)})
 expect(result.gpu).not.toMatch(/swiftshader|llvmpipe/i)
 const assistS1=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await assistS1.click()
 await page.locator('.lw-alternatives [data-target="NPC_LIAISON"]').click()
 await expect(page.locator('main')).toHaveAttribute('data-arrived','NPC_LIAISON')
 await page.waitForTimeout(700)
 await page.screenshot({path:path.join(out,'01-S1-liaison-costume.png')});result.shots.push('01-S1-liaison-costume.png')
 await expect(page.locator('.lw-dialog')).toContainText('CHIẾN SĨ GIAO LIÊN')
 await page.locator('.lw-dialog .lw-close').click();await assistS1.click()
 await page.close();check('S1-liaison-costume-and-dialogue')

 // 2. S4: Gian nhà vách phên tre "ĐIỂM ĐĂNG KÝ TÒNG QUÂN", Bàn thờ Tổ quốc treo cờ Mặt trận, bàn trà tre & nghệ sĩ văn công
 page=await openZone(context,'S4',[1.5,.8],.45)
 const assistS4=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await assistS4.click()
 await page.locator('.lw-alternatives [data-target="A09_LISTEN"]').click()
 await expect(page.locator('main')).toHaveAttribute('data-arrived','A09_LISTEN')
 await page.waitForTimeout(900)
 await page.locator('.lw-dialog .lw-close').click();await assistS4.click();await page.waitForTimeout(500)
 await page.screenshot({path:path.join(out,'02-S4-enlistment-desk-altar.png')});result.shots.push('02-S4-enlistment-desk-altar.png')
 // Cũng chụp góc rộng S4 để thấy sân khấu đèn dầu + đội văn công + điểm đăng ký
 await page.getByRole('button',{name:'Menu',exact:true}).click()
 await page.getByRole('button',{name:'Về vị trí an toàn',exact:true}).click()
 await page.getByRole('button',{name:'Đóng menu',exact:true}).click()
 await page.waitForTimeout(800)
 await page.screenshot({path:path.join(out,'03-S4-community-overview.png')});result.shots.push('03-S4-community-overview.png')
 await page.close();check('S4-enlistment-desk-altar-and-stage-lamps')

 // 3. S2: Xóm nghề (thợ dép quân phục + áo choàng vải dù bên chồng vỏ lốp cũ, người dân bà ba khăn rằn & nón lá)
 page=await openZone(context,'S2',[0,2],Math.PI)
 await page.waitForTimeout(700)
 await page.screenshot({path:path.join(out,'04-S2-village-costumes-overview.png')});result.shots.push('04-S2-village-costumes-overview.png')
 const assistS2=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});await assistS2.click()
 await page.locator('.lw-alternatives [data-target="A12_SOLE"]').click()
 await expect(page.locator('main')).toHaveAttribute('data-arrived','A12_SOLE')
 await page.locator('.lw-dialog .lw-close').click();await assistS2.click();await page.waitForTimeout(700)
 await page.screenshot({path:path.join(out,'05-S2-cobbler-tires-costume.png')});result.shots.push('05-S2-cobbler-tires-costume.png')
 await page.close();check('S2-villager-baba-and-cobbler-tires')

 // 4. L3-B: Quân y đội nón tai bèo chăm sóc bên giường chiếu cói, người nằm nghỉ bà ba nâu quấn khăn rằn, võng cáng đòn tre & đèn dầu truyền thống
 page=await openZone(context,'L3-B',[0,0],Math.PI)
 await page.waitForTimeout(900)
 await page.screenshot({path:path.join(out,'06-L3B-medic-bed-oil-lamp.png')});result.shots.push('06-L3B-medic-bed-oil-lamp.png')
 await page.close();check('L3B-medic-costume-stretcher-and-oil-lamp')

 // 5. L2-B: Phòng họp tầng 2 với đèn dầu truyền thống trên bàn gỗ, cán bộ nón tai bèo + áo choàng vải dù + khăn rằn
 page=await openZone(context,'L2-B',[0,0],Math.PI)
 await page.waitForTimeout(900)
 await page.screenshot({path:path.join(out,'07-L2B-meeting-oil-lamps-and-cape.png')});result.shots.push('07-L2B-meeting-oil-lamps-and-cape.png')
 await page.close();check('L2B-meeting-lamps-and-organizer-cape')

 // 6. L1-B: Hành lang địa đạo tầng 1 với đèn dầu truyền thống Việt Nam bóng thủy tinh cao & bảng Tư liệu Baseline (SOURCES)
 page=await openZone(context,'L1-B',[0,3.2],Math.PI)
 await page.waitForTimeout(900)
 await page.screenshot({path:path.join(out,'08-L1B-tunnel-vietnamese-oil-lamps.png')});result.shots.push('08-L1B-tunnel-vietnamese-oil-lamps.png')
 await page.getByRole('button',{name:'Tư liệu & giả định',exact:true}).click()
 await page.waitForTimeout(400)
 const sourcesDialog=page.getByRole('dialog',{name:'Tư liệu & giả định'})
 await expect(sourcesDialog).toContainText('Tentative List #7038')
 await expect(sourcesDialog).toContainText('Cục Di sản văn hóa')
 await expect(sourcesDialog.locator('a[href*="dsvh.gov.vn"]')).toHaveCount(1)
 await expect(sourcesDialog.locator('a[href*="whc.unesco.org"]')).toHaveCount(1)
 await expect(sourcesDialog).toContainText('WCAG 2.2')
 await page.screenshot({path:path.join(out,'09-sources-baseline-references.png')});result.shots.push('09-sources-baseline-references.png')
 await page.close();check('L1B-tunnel-lamps-and-sources-references')

 expect(result.errors).toEqual([])
 result.result='PASS'
 await context.close()
}catch(error){
 result.result='FAIL'
 result.error=String(error)
 if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{})
 throw error
}finally{
 save()
 await browser?.close()
 server.kill()
}
