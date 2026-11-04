import {chromium,expect as baseExpect} from '@playwright/test'
import {createHmac} from 'node:crypto'
import {writeFileSync,mkdirSync} from 'node:fs'
const dir='../docs/superpowers/g2/2026-11-01-living-world/ux-review-2026-11-02/evidence/after'
mkdirSync(dir,{recursive:true})
const user=process.env.LW_VIDEO_USER,email=process.env.LW_VIDEO_EMAIL
const expect=baseExpect.configure({timeout:20000})
if(!user||!email)throw new Error('A fresh synthetic localhost QA account is required; do not reuse real research participants.')
const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),p=Buffer.from(JSON.stringify({sub:email,userId:user,role:'USER',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')
const token=`${h}.${p}.${createHmac('sha256','local-g2-browser-test-key-not-production-20261101').update(`${h}.${p}`).digest('base64url')}`
const browser=await chromium.launch({headless:true,slowMo:90,args:['--enable-unsafe-swiftshader']})
const context=await browser.newContext({viewport:{width:1365,height:900},recordVideo:{dir,size:{width:1365,height:900}}}),page=await context.newPage(),video=page.video(),chapters=[],errors=[]
// Exercise the local Vietnamese font fallback without depending on Google Fonts availability.
await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,route=>route.abort())
const started=performance.now();page.on('pageerror',e=>errors.push(e.message))
const chapter=async(label,file)=>{chapters.push({label,seconds:Math.round((performance.now()-started)/100)/10});if(file)await page.screenshot({path:`${dir}/${file}.png`});await page.waitForTimeout(650)}
const state=async()=>{const r=await context.request.get('http://127.0.0.1:5194/api/v2/worlds/cuchi-mach-song/state',{headers:{Authorization:`Bearer ${token}`}});if(r.status()!==200)throw new Error('World API '+r.status());return(await r.json()).data}
const hit=async id=>{const el=page.locator(`[data-scene-target="${id}"]`);await expect(el).toBeVisible();const at=await el.evaluate(e=>({x:Number(e.dataset.cx),y:Number(e.dataset.cy)})),box=await page.locator('.lw-canvas').boundingBox();await page.mouse.click(box.x+at.x,box.y+at.y);await page.waitForTimeout(200)}
const inspect=async(id,label,code)=>{console.log('Inspect',id);await hit(id);await expect(page.getByRole('dialog',{name:label})).toBeVisible();await page.waitForTimeout(450);await hit(id);await expect.poll(async()=>(await state()).facts.includes(code)).toBe(true)}
try{
 await page.addInitScript(({user,email,token})=>{for(const [key,value] of Object.entries({timelens_user_id:user,timelens_email:email,timelens_token:token,timelens_display_name:'QA gameplay recording',timelens_role:'USER',timelens_tier:'FREE',timelens_email_verified:'1'}))localStorage.setItem(key,value)},{user,email,token})
 await page.goto('http://127.0.0.1:5194/living-world?debug=1');await page.getByTestId('consent-decline').click();await page.getByText('Bản thử tài khoản',{exact:false}).waitFor();expect((await state()).facts).toEqual([])
 await chapter('Avatar tiếp cận và nói chuyện với NPC Kha','s0-before-approach');await hit('KHA');await expect(page.getByRole('dialog',{name:'Kha · người giữ trạm'})).toBeVisible();await chapter('Hội thoại nằm bên cạnh scene','kha')
 await hit('MACHINE');await expect(page.getByRole('dialog',{name:'Cỗ máy thời gian'})).toBeVisible();await hit('MACHINE');await expect(page.getByRole('heading',{level:1})).toHaveText('Góc lao động · một bữa ăn bắt đầu ở đây')
 await page.getByLabel('Cách khám phá').selectOption('STORY');await chapter('Q2: quan sát chính các đối tượng thông khí','q2')
 const cdp=await context.newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const document=await cdp.send('DOM.getDocument'),heading=await cdp.send('DOM.querySelector',{nodeId:document.root.nodeId,selector:'h1'}),fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:heading.nodeId})
 const diagnostics=await page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};const style=s=>{const c=getComputedStyle(document.querySelector(s));return{font:c.fontFamily,size:c.fontSize,color:c.color,background:c.backgroundColor}};return{heading:document.querySelector('h1').textContent,nfc:document.querySelector('h1').textContent===document.querySelector('h1').textContent.normalize('NFC'),scene:rect('.lw-canvas'),sidebar:rect('.lw-compass'),toolbar:style('.lw-stage-tools button'),h1:style('h1'),viewportHeight:innerHeight,documentHeight:document.documentElement.scrollHeight}})
 writeFileSync(`${dir}/diagnostics.json`,JSON.stringify({diagnostics,fonts},null,2))
 await inspect('AIR_SURFACE_OPENING','Dấu thông hơi trên mặt đất','AIR_OPENING_INSPECTED');await inspect('AIR_PASSAGE','Đoạn nối trong lòng đất','AIR_PASSAGE_INSPECTED');await inspect('AIR_INTERIOR','Không gian bên trong','AIR_INTERIOR_INSPECTED')
 await page.getByRole('button',{name:'Nối đường khí trong mô hình',exact:true}).click();for(const id of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR']){await hit(id);await page.waitForTimeout(350)}
 await expect.poll(async()=>(await state()).facts.includes('AIR_PATH_CORRECT')).toBe(true);await hit('LINK_AIR_LIFE');await expect.poll(async()=>(await state()).facts.includes('AIR_MEANING_CONFIRMED')).toBe(true);await chapter('Q2: nối luồng trên mô hình và liên hệ đời sống','q2-connected')
 await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp trên',exact:true}).click();await chapter('Q3: quan sát lớp và điểm chuyển','q3')
 await inspect('STRUCT_LAYER_1','Quan sát lớp trên','STRUCT_LAYER_1');await inspect('STRUCT_LINK_12','Quan sát điểm chuyển 1–2','STRUCT_LINK_12')
 await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp giữa',exact:true}).click();await inspect('STRUCT_LAYER_2','Quan sát lớp giữa','STRUCT_LAYER_2');await inspect('STRUCT_LINK_23','Quan sát điểm chuyển 2–3','STRUCT_LINK_23')
 await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp dưới',exact:true}).click();await inspect('STRUCT_LAYER_3','Quan sát lớp dưới','STRUCT_LAYER_3')
 await page.getByRole('button',{name:'Nối các tầng trong mô hình',exact:true}).click();for(const id of ['STRUCT_LAYER_1','STRUCT_LAYER_2','STRUCT_LAYER_2','STRUCT_LAYER_3']){await hit(id);await page.waitForTimeout(350)}
 await expect.poll(async()=>(await state()).facts.includes('STRUCT_MEANING_CONFIRMED')).toBe(true);await chapter('Hai phát hiện hội tụ','revelation');await page.getByRole('button',{name:'Nhìn lại thông khí',exact:true}).click();await expect(page.getByRole('heading',{name:'Nhìn lại: từ một lỗ mở đến cả hệ thống'})).toBeVisible();await chapter('Quay lại Q2: callback có diễn giải mới','callback');await page.getByRole('button',{name:'Lưu góc nhìn này'}).click();await expect.poll(async()=>(await state()).moment).toBe('VIEWED')
 await page.getByLabel('Cách khám phá').selectOption('FREE');await chapter('Free Exploration: NPC có công việc trước khi gặp','a04-routine');await hit('NPC_A04');await expect(page.getByRole('dialog',{name:'Thử phối hợp giã gạo'})).toBeVisible()
 for(const side of ['LEFT','RIGHT','LEFT','RIGHT','LEFT','RIGHT']){await hit('STROKE_'+side);await page.waitForTimeout(650)}await expect(page.getByText('Mẻ gạo đã chuyển trạng thái.',{exact:false})).toBeVisible();await chapter('A04: Avatar thao tác, NPC đáp nhịp, nguyên liệu đổi trạng thái','a04-active')
 await page.keyboard.press('Escape');await page.getByLabel('Cách khám phá').selectOption('MEMORY');await expect(page.getByRole('heading',{name:'Điều gì có căn cứ, điều gì được diễn giải?'})).toBeVisible();await chapter('Heritage & Memory: tư liệu và giới hạn phục dựng','memory-mode')
 await page.getByLabel('Cách khám phá').selectOption('STORY');await page.getByRole('button',{name:'Dùng sơ đồ 2D',exact:true}).click();await chapter('Story Journey và điều khiển 2D tương đương','fallback-2d')
 await page.getByRole('button',{name:'Dấu thông hơi trên mặt đất',exact:true}).last().click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Ghi điều vừa quan sát'}).click()
 const final=await state();expect(final.facts.length).toBe(11);expect(final.foundations.length).toBe(2);expect(final.callbackAvailable).toBe(true);expect(errors).toEqual([])
 writeFileSync(`${dir}/recording.json`,JSON.stringify({scope:'Actual automated QA playthrough against the real local backend/PostgreSQL, with a fresh synthetic account; NOT a human study',user,startedWithZeroFacts:true,chapters,finalState:final,pageErrors:errors},null,2))
 console.log('PASS actual recorded 3D narrative/activity/modes/2D playthrough; server confirmed11 leaves,2 foundations, VIEWED callback.')
}catch(error){await page.screenshot({path:`${dir}/recording-failure.png`,timeout:10000}).catch(()=>{});console.error('Failure state',JSON.stringify(await state()));throw error}finally{await context.close();await video.saveAs(`${dir}/walkthrough.webm`);await browser.close()}
