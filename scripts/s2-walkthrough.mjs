import {chromium,expect as baseExpect} from '@playwright/test'
import {writeFileSync,mkdirSync} from 'node:fs'
const expect=baseExpect.configure({timeout:20000}),dir='../docs/superpowers/m1/2026-11-02-s2-production/evidence'
mkdirSync(dir,{recursive:true})
const browser=await chromium.launch({headless:true,slowMo:100,args:['--enable-unsafe-swiftshader']})
const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir,size:{width:1440,height:960}}}),page=await context.newPage(),video=page.video(),chapters=[],errors=[]
await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//,r=>r.abort())
page.on('pageerror',e=>errors.push(e.message));const start=performance.now()
const shot=async(name,text)=>{chapters.push({seconds:Math.round((performance.now()-start)/100)/10,text});await page.screenshot({path:`${dir}/${name}.png`});await page.waitForTimeout(1000)}
const hit=async id=>{const e=page.locator(`[data-scene-target="${id}"]`);await expect(e).toBeVisible();const p=await e.evaluate(e=>({x:+e.dataset.cx,y:+e.dataset.cy})),b=await page.locator('.lw-canvas').boundingBox();await page.mouse.click(b.x+p.x,b.y+p.y);await page.waitForTimeout(250)}
try{
 await page.goto('http://127.0.0.1:5194/living-world?debug=1');await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click();await page.getByLabel('Cách khám phá').selectOption('FREE');await page.locator('canvas[data-s2-render]').waitFor();await shot('01-environment','S2: góc lao động, sân đất, mái làm việc và lớp cây phía sau')
 // Real keyboard movement uses the existing shared navigation, never set-state injection.
 await page.getByRole('heading',{level:1}).click();for(let i=0;i<5;i++){await page.keyboard.press('d');await page.waitForTimeout(200)}await shot('02-exploration','Avatar tự đi trong sân, hai NPC tiếp tục công việc')
 await hit('A04');await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Chỉ quan sát',exact:true}).click();await shot('03-observe','Quan sát tự nguyện, không cộng số nhịp')
 await page.getByRole('button',{name:'Thử phối hợp',exact:true}).click();await page.getByRole('button',{name:'Bật âm thanh khu lao động'}).click();await shot('04-demo','NPC làm mẫu; âm tổng hợp được bật chủ động, có mô tả chữ')
 await page.getByRole('button',{name:'Sẵn sàng · đến lượt tôi'}).click()
 await hit('STROKE_LEFT');await shot('05-held','Người chơi nắm dụng cụ');await hit('STROKE_LEFT');await shot('06-raised','Nâng chày: tay và dụng cụ đổi tư thế, chưa cộng tiến độ');await hit('STROKE_LEFT')
 await expect(page.getByText('Đã phối hợp 1/6',{exact:false})).toBeVisible()
 await page.keyboard.press('Escape');await shot('07-pause','Rời lúc đang làm không tự hoàn thành; NPC quay lại công việc')
 await hit('A04');await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'Thử phối hợp',exact:true}).click();await page.getByRole('button',{name:'Sẵn sàng · đến lượt tôi'}).click()
 for(let i=1;i<6;i++)for(let action=0;action<3;action++)await hit('STROKE_LEFT')
 await expect(page.getByText('Mẻ gạo đã chuyển trạng thái.',{exact:false})).toBeVisible();await shot('08-response','Sáu nhịp chủ động: NPC đáp lại và nguyên liệu đổi trạng thái')
 await hit('RICE_AFTER');await expect(page.getByText('Quan sát hai mẹt bên phải:',{exact:false})).toBeVisible();await shot('09-compare','Nhìn nguyên liệu trước/sau')
 await page.getByRole('button',{name:'Nghe chuyện lương thực',exact:true}).click();await shot('10-story','Lời kể gợi liên hệ giữa hạt gạo, nước, bếp và cộng đồng')
 const render=JSON.parse(await page.locator('canvas').getAttribute('data-s2-render')),assets=JSON.parse(await page.locator('canvas').getAttribute('data-s2-assets'))
 await page.getByRole('button',{name:'Dùng sơ đồ 2D',exact:true}).click();await shot('11-fallback','2D có cùng hoạt động, câu chuyện và checkpoint')
 await page.getByRole('button',{name:'Làm lại một mẻ · không thưởng thêm',exact:true}).click();await page.getByRole('button',{name:'Sẵn sàng · đến lượt tôi'}).click();for(const name of ['Nắm chày','Nâng chày','Hạ chày'])await page.getByRole('button',{name,exact:true}).click();await expect(page.getByText('Đã phối hợp 1/6',{exact:false})).toBeVisible();await shot('12-2d-action','Replay và một nhịp thủ công qua điều khiển2D tương đương')
 await page.getByRole('button',{name:'Đi phải',exact:true}).click();await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Đi tiếp · Hơi thở của lòng đất',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Hơi thở của lòng đất');await shot('13-transition','Rời góc lao động sang Q2 bằng chuyển cảnh chủ đề')
 expect(errors).toEqual([])
 writeFileSync(`${dir}/walkthrough.json`,JSON.stringify({scope:'Actual automated guest QA, not human study; no progress seeded; six manually triggered3D grip/lift/release rounds plus replay/one2D round and thematic exit',chapters,render,assets,pageErrors:errors,network:await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize})))},null,2))
 console.log('PASS actual S2 exploration/observe/demo/manual18-actions/pause-resume/compare/story/2D QA walkthrough. No acceptance or human data implied.')
}catch(e){await page.screenshot({path:`${dir}/walkthrough-failure.png`,timeout:10000}).catch(()=>{});throw e}finally{await context.close();await video.saveAs(`${dir}/walkthrough.webm`);await browser.close()}
