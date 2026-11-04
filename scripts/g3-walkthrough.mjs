// G3 walkthrough (QA/QC closure): one continuous guest journey on the DEFAULT route (/living-world, no debug tabs,
// no ?continuity flag), in the order the PO set: S0 → time machine → S1/Q1 (clues, decoy, physical hatch: sweep → lift →
// crawl) → L1-A → L1-B/Q2 → Q3 through L1-D, L2-A (+ L2-D corner) and L3-A → callback → FAST_RETURN to the present.
// LW_WALK_GPU=real → headed Chrome with the machine's GPU (recommended for the PO video). Real pointer clicks on 3D objects; screenshots at each beat.
// Usage (from FE/): node scripts/g3-walkthrough.mjs <buildDir> <outDir> [port]
import {chromium} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync,renameSync} from 'node:fs'
const [,,buildDir='../.superpowers/living-world-g3',outDir='../docs/superpowers/m1/2026-11-02-g3-checkpoint/evidence',portArg='5320']=process.argv
const port=Number(portArg),base=`http://127.0.0.1:${port}`,sleep=ms=>new Promise(r=>setTimeout(r,ms))
mkdirSync(outDir,{recursive:true})
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--outDir',buildDir,'--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,HISTAR_LOCAL_API_TARGET:process.env.HISTAR_LOCAL_API_TARGET||'http://127.0.0.1:8089'},stdio:'ignore'})
const chapters=[],picks=[];let t0=0;const mark=(name)=>{chapters.push({name,atSeconds:Math.round((Date.now()-t0)/100)/10});console.log('beat',name)}
let browser,walkPage,walkContext
try{
 for(let i=0;i<120;i++){try{if((await fetch(base)).ok)break}catch{}await sleep(500)}
 browser=await chromium.launch(process.env.LW_WALK_GPU==='real'?{channel:'chrome',headless:false,args:['--ignore-gpu-blocklist']}:{headless:true,...(process.env.CHROME_EXE?{executablePath:process.env.CHROME_EXE}:{}),args:['--enable-unsafe-swiftshader']})
 const context=await browser.newContext({viewport:{width:1440,height:960},serviceWorkers:'block',recordVideo:{dir:outDir,size:{width:1440,height:960}}})
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 walkPage=page;walkContext=context
 const shot=async name=>{await page.screenshot({path:`${outDir}/${name}.png`})}
 const hit=async(id,turn=0)=>{const label=page.locator(`[data-scene-target="${id}"]`);await label.waitFor({state:'attached'})
  const b=await page.locator('.lw-canvas').boundingBox(),sheet=await page.locator('.lw-compass').boundingBox()
  const p=await label.evaluate(el=>({x:Number(el.dataset.cx),y:Number(el.dataset.cy),hidden:el.hidden}))
  const covered=!!sheet&&b.x+p.x>=sheet.x&&b.x+p.x<=sheet.x+sheet.width&&b.y+p.y>=sheet.y-8
  if((!p.hidden||process.env.LW_WALK_DIRECT==='true')&&!covered&&p.x>8&&p.y>90&&p.x<b.width-8&&p.y<b.height-8){await page.mouse.click(b.x+p.x,b.y+p.y);const picked=await page.locator('canvas').getAttribute('data-last-pick');picks.push({expected:id,actual:picked,turn});if(process.env.LW_WALK_DIRECT!=='true'||picked===id)return;if(process.env.LW_WALK_DIRECT==='true'){
   if(turn<12){const close=page.locator('.lw-dialog .lw-close');if(await close.count())await close.click();await page.locator('canvas').focus();await page.keyboard.down('w');await sleep(650);await page.keyboard.up('w');await sleep(400);return hit(id,turn+1)}
   throw new Error(`DIRECT_PICK_MISMATCH expected=${id} actual=${picked}`)
  }}
  if(process.env.LW_WALK_DIRECT==='true'){
   if(turn<12){await page.mouse.move(b.x+b.width*.8,b.y+b.height*.6);await page.mouse.down();await page.mouse.move(b.x+b.width*.8+90,b.y+b.height*.6,{steps:8});await page.mouse.up();await sleep(150);return hit(id,turn+1)}
   throw new Error(`DIRECT_PICK_NOT_VISIBLE_OR_HUD_COVERED target=${id}; 12 real look rotations; no accessibility fallback used`)
  }
  // G3 Phase 1-2 third-person camera: an off-screen target is reached in-world (E near it) or via the in-world exits / 2D equivalents.
  if(await page.locator(`.lw-prompt[data-target="${id}"]`).count()||await page.locator(`.lw-dialog[data-target="${id}"]`).count()){await page.locator('.lw-canvas canvas').focus();await page.keyboard.press('e');return}
  if(id.startsWith('ROUTE_')){const d=page.locator('.lw-world-exits');if(!(await d.evaluate(el=>el.open)))await d.locator('summary').click();await d.locator(`[data-target="${id}"]`).click();return}
  const t=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await t.getAttribute('aria-expanded')==='false')await t.click()
  await page.locator(`.lw-alternatives [data-target="${id}"]`).first().click()}
 // G3 immersive: hold a movement key so the recording shows the Avatar walking (camera-relative WASD).
 const walk=async(key,ms)=>{await page.locator('.lw-canvas canvas').focus();await page.keyboard.down(key);await sleep(ms);await page.keyboard.up(key);await sleep(600)}
 const heading=async text=>page.getByRole('heading',{level:1}).filter({hasText:text}).waitFor({timeout:30000})
 const route=async(id,title)=>{await page.keyboard.press('Escape');await hit('ROUTE_'+id);await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await heading(title);await page.locator('.lw-transfer').waitFor({state:'detached'});await sleep(1200)}
 const inspect=async id=>{await hit(id);const record=page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true});await record.waitFor();await sleep(500);await record.click();await record.waitFor({state:'detached'})}
 // ground clues: approach, then explicitly look (E) — the dialog opens only because the player chose to look
 const look=async id=>{await hit(id);const pr=page.locator(`.lw-prompt[data-target="${id}"]`);await pr.waitFor({timeout:60000});await sleep(400);await pr.click();await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click();await sleep(500)}
 const hatchStep=async(label,shotName,wait)=>{const pr=page.locator('.lw-prompt[data-target="Q1_HATCH"]').filter({hasText:label});await pr.waitFor({timeout:60000});await pr.click();await sleep(wait);await shot(shotName)}
 t0=Date.now()
 await page.goto(`${base}/living-world`);if(await page.getByTestId('consent-decline').isVisible().catch(()=>false))await page.getByTestId('consent-decline').click()
 await heading('Trạm thời gian');await sleep(2500);mark('S0 present-day station');await shot('01-s0-station');await walk('w',1800);await walk('a',900);mark('S0 walk');await shot('01b-s0-walk')
 if(await page.locator('.lw-zone-nav').count())throw new Error('debug tabs visible on default route')
 await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click();await page.getByRole('dialog',{name:'Kha · người giữ trạm'}).waitFor();await sleep(1500);mark('Kha');await shot('02-kha')
 await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click();await page.getByRole('dialog',{name:'Cỗ máy thời gian',exact:true}).waitFor();await sleep(1800);mark('Time machine');await shot('03-machine')
 // P2 · Bước lên máy: choose the era and the reference site on the console's time axis (no automatic departure)
 {const p2=page.getByRole('group',{name:'Trục thời gian'});await p2.waitFor();await sleep(1200);mark('P2 · time axis open (other eras locked)');await shot('03b-p2-era');await p2.getByRole('button',{name:/^01\/1967/}).click();await sleep(900);await shot('03c-p2-site');await p2.getByRole('button',{name:/^Bến Dược/}).click();await sleep(1500);mark('P2 · Kha confirms reconstruction limits');await shot('03d-p2-confirm')}
 await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await sleep(250);await shot('04-portal-transition')
 await heading('Bìa rừng');await page.locator('.lw-transfer').waitFor({state:'detached'});await sleep(2500);mark('P5 · arrive S1 forest edge');await shot('05a-s1-arrival')
 await walk('w',1200);await look('Q1_TRAIL');mark('Q1 clue · trail stops');await look('S1_DECOY_2');mark('Q1 decoy · fallen branch');await look('Q1_LEAVES');mark('Q1 clue · replaced leaves');await shot('05a-s1-clues')
 await hit('Q1_HATCH');await page.locator('.lw-prompt[data-target="Q1_HATCH"]').waitFor({timeout:60000});await sleep(800);await shot('05b-hatch-undiscovered')
 await hatchStep('Quan sát kỹ mặt đất','05c-hatch-sweeping',700);await page.locator('.lw-prompt[data-target="Q1_HATCH"]').filter({hasText:'Nhấc nắp'}).waitFor({timeout:60000});await sleep(500);mark('Q1 hatch revealed (litter swept)');await shot('05d-hatch-revealed')
 await hatchStep('Nhấc nắp','05e-hatch-opening',700);await page.locator('.lw-prompt[data-target="Q1_HATCH"]').filter({hasText:'Chui xuống'}).waitFor({timeout:60000});await sleep(500);mark('Q1 lid lifted, shaft open');await shot('05f-hatch-open')
 await hatchStep('Chui xuống','05g-hatch-descending',900);await heading('Lối vào');await page.locator('.lw-transfer').waitFor({state:'detached'});await sleep(1800);mark('L1-A · arrived below the hatch');await shot('06-l1a-arrival')
 await walk('s',1200);await walk('w',1400);mark('L1-A walk');await shot('06b-l1a-walk')
 await route('ENTRANCE_AIR','Hơi thở');mark('Q2 air scene · tunnel');await shot('10-q2-arrival');await walk('w',2200);await walk('d',1600);mark('Tunnel walk');await shot('10b-tunnel-walk');await page.getByRole('button',{name:'Lát cắt X-ray'}).click();await sleep(2500);mark('X-ray cutaway');await shot('10c-xray');await page.getByRole('button',{name:'Lát cắt X-ray'}).click();await sleep(2000)
 for(const id of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR'])await inspect(id)
 await page.getByRole('button',{name:'Nối đường khí trong mô hình',exact:true}).click()
 for(const id of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR'])await hit(id)
 await sleep(800);await shot('11-q2-air-path');await hit('LINK_AIR_LIFE');await page.getByRole('button',{name:'Atlas ký ức · 5',exact:true}).waitFor({timeout:15000});mark('Q2 done')
 await route('AIR_STRUCTURE','lớp trên');mark('Q3 upper');await shot('12-q3-upper');for(const id of ['STRUCT_LAYER_1','STRUCT_LINK_12'])await inspect(id)
 await route('LAYER_MIDDLE','lớp giữa');await shot('13-q3-middle');for(const id of ['STRUCT_LAYER_2','STRUCT_LINK_23'])await inspect(id)
 await hit('L2D_NICHE');await page.getByRole('dialog',{name:'Góc diễn giải L2-D'}).waitFor({timeout:60000});await sleep(800);await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click();await page.locator('.lw-xray-legend').waitFor({timeout:60000});await sleep(2500);mark('L2-D corner → four-layer cutaway');await shot('13b-l2d-xray');await page.getByRole('button',{name:'Lát cắt X-ray'}).click();await sleep(2000);await shot('13c-after-xray-camera')
 await route('LAYER_DEEP','lớp dưới');mark('L3-A opens in first-person view (all tunnels do)');await shot('14-q3-lower-first-person');await page.keyboard.press('v');await sleep(1500);mark('L3-A third-person on request (V)');await shot('14b-l3-third-person');await page.keyboard.press('v');await sleep(1200);await inspect('STRUCT_LAYER_3')
 await page.getByRole('button',{name:'Nối các tầng trong mô hình',exact:true}).click()
 for(const id of ['STRUCT_LAYER_1','STRUCT_LAYER_2','STRUCT_LAYER_2','STRUCT_LAYER_3'])await hit(id)
 await page.getByRole('button',{name:'Nhìn lại thông khí',exact:true}).waitFor({timeout:15000});await sleep(800);mark('Q3 connected');await shot('15-q3-connected')
 await page.getByRole('button',{name:'Nhìn lại thông khí',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
 await page.getByRole('heading',{name:'Nhìn lại: từ một lỗ mở đến cả hệ thống'}).waitFor();await sleep(1500);mark('Callback');await shot('16-callback')
 await page.getByRole('button',{name:'Lưu góc nhìn này',exact:true}).click()
 await route('RETURN_L1-B','Trạm thời gian');await sleep(1500);mark('FAST_RETURN to present (not an Epilogue)');await shot('17-return-present')
 const atlas=await page.getByRole('button',{name:/Atlas ký ức/}).textContent()
 const video=page.video();await context.close()
 const raw=await video.path(),final=`${outDir}/g3-walkthrough.webm`;renameSync(raw,final)
 writeFileSync(`${outDir}/g3-walkthrough.json`,JSON.stringify({route:'/living-world (default, no debug tabs)',account:'guest (no XP, no account evidence)',chapters,picks,atlas,pageErrors:errors,video:'g3-walkthrough.webm',note:'Automated target-aware QA; real drags/WASD and verified canvas picks; not blind human discoverability.'},null,1))
 console.log(JSON.stringify({chapters:chapters.length,atlas,errors}))
}catch(error){
 await walkPage?.screenshot({path:`${outDir}/FAILED.png`}).catch(()=>{})
 const video=walkPage?.video();await walkContext?.close().catch(()=>{});await video?.saveAs(`${outDir}/failed-journey.webm`).catch(()=>{})
 writeFileSync(`${outDir}/failure.json`,JSON.stringify({directOnly:process.env.LW_WALK_DIRECT==='true',chapters,picks,error:error.stack},null,2));throw error
}finally{await browser?.close();server.kill()}
