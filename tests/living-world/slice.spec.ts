import {releaseA04} from './a04.helpers'
import {test,expect,type Page} from '@playwright/test'
import {chooseEra} from './p2.helpers'
async function ensureControls(page:import('@playwright/test').Page){const toggle=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click()}
async function enter(page:Page){await page.goto('/living-world?debug=1');await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click()}
async function inspect(page:Page,label:string){await ensureControls(page);await page.getByRole('button',{name:label,exact:true}).last().click();await page.getByRole('button',{name:'Ghi điều vừa quan sát'}).click()}
async function air(page:Page){
 for(const name of ['Dấu thông hơi trên mặt đất','Đoạn nối trong lòng đất','Không gian bên trong'])await inspect(page,name)
 for(const name of ['Mặt đất','Đoạn dẫn','Không gian trong'])await page.getByRole('button',{name,exact:true}).click()
 await page.getByRole('button',{name:'Thử đường nối',exact:true}).click();await page.getByRole('button',{name:'Nối thông khí ↔ điều kiện sinh hoạt'}).click()
}
async function structure(page:Page){
 await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp trên',exact:true}).click();for(const name of ['Quan sát lớp trên','Quan sát điểm chuyển 1–2'])await inspect(page,name)
 await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp giữa',exact:true}).click();for(const name of ['Quan sát lớp giữa','Quan sát điểm chuyển 2–3'])await inspect(page,name)
 await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp dưới',exact:true}).click();await inspect(page,'Quan sát lớp dưới')
 await page.getByRole('button',{name:'Đặt đường nối'}).click();await page.getByLabel('Lớp bắt đầu',{exact:true}).selectOption('STRUCT_LAYER_2');await page.getByLabel('Lớp kết thúc',{exact:true}).selectOption('STRUCT_LAYER_3');await page.getByRole('button',{name:'Đặt đường nối'}).click();await page.getByRole('button',{name:'Ghép thành hệ thống'}).click()
}
test('guest plays Q2 then Q3 and revisits actual callback; no Q1 prerequisite',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await enter(page);await air(page);await structure(page)
 await page.getByRole('button',{name:'Nhìn lại thông khí',exact:true}).click();await expect(page.getByRole('heading',{name:'Nhìn lại: từ một lỗ mở đến cả hệ thống'})).toBeVisible()
 await page.getByRole('button',{name:'Lưu góc nhìn này'}).click();await page.screenshot({path:(process.env.LW_EVIDENCE_DIR??'../docs/superpowers/g2/2026-11-01-living-world/evidence/')+'narrative-callback.png',fullPage:true})
 expect(errors).toEqual([]);await expect(page.getByText('Chế độ khách:',{exact:false})).toBeVisible()
})
test('three modes differ; active A04 supports leave and return, not automatic completion',async({page})=>{
 await enter(page);await page.getByLabel('Cách khám phá').selectOption('FREE');await ensureControls(page);await expect(page.getByRole('heading',{level:1})).toHaveText('Góc lao động · một bữa ăn bắt đầu ở đây')
 await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click();await expect(page.getByText('Đã phối hợp 0/6',{exact:false})).toBeVisible()
 await releaseA04(page,'LEFT');await releaseA04(page,'LEFT');await expect(page.getByText('Đã phối hợp 1/6',{exact:false})).toBeVisible()
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp trên',exact:true}).click();await page.getByLabel('Cách khám phá').selectOption('FREE');await ensureControls(page);await page.getByRole('button',{name:'Thử phối hợp giã gạo',exact:true}).last().click()
 await expect(page.getByText('Đã phối hợp 1/6',{exact:false})).toBeVisible()
 for(const side of ['RIGHT','LEFT','RIGHT','LEFT','RIGHT'] as const)await releaseA04(page,side)
 await expect(page.getByText('Mẻ gạo đã chuyển trạng thái.',{exact:false})).toBeVisible();await page.screenshot({path:(process.env.LW_EVIDENCE_DIR??'../docs/superpowers/g2/2026-11-01-living-world/evidence/')+'a04-active.png',fullPage:true})
 await page.getByRole('button',{name:'Đóng',exact:true}).click();await page.getByLabel('Cách khám phá').selectOption('MEMORY');await expect(page.getByRole('heading',{name:'Điều gì có căn cứ, điều gì được diễn giải?'})).toBeVisible()
 await page.getByLabel('Cách khám phá').selectOption('STORY');await expect(page.getByRole('heading',{level:1})).toHaveText('Hơi thở của lòng đất')
})
test('2D fallback retains meaningful interactions on mobile',async({page})=>{
 await page.setViewportSize({width:390,height:844});await enter(page);await page.getByRole('button',{name:'Dùng sơ đồ 2D'}).click();await expect(page.getByText('Sơ đồ 2D · cùng điểm quan sát và hành động')).toBeVisible();await inspect(page,'Dấu thông hơi trên mặt đất')
 await page.getByRole('button',{name:/Atlas ký ức/}).click();await expect(page.getByText('Một lỗ mở nối với bên ngoài')).toBeVisible()
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(overflow).toBe(false)
})
test('optional Kha and machine prologue is playable and keyboard movement resets safely',async({page})=>{
 await page.goto('/living-world?debug=1');await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Gặp người giữ trạm'}).click();await page.getByRole('button',{name:'Tới cỗ máy'}).click();await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng'}).click()
 await page.getByRole('button',{name:'Bỏ qua chuyển cảnh'}).click();await expect(page.getByRole('heading',{level:1})).toHaveText('Góc lao động · một bữa ăn bắt đầu ở đây')
 await page.getByRole('button',{name:'Dùng sơ đồ 2D'}).click();const avatar=page.locator('.lw-map-avatar');const before=(await avatar.boundingBox())!
 await page.getByRole('heading',{level:1}).click();await page.keyboard.press('w');await expect.poll(async()=>(await avatar.boundingBox())!.y).toBeLessThan(before.y)
 await page.getByRole('button',{name:'Về vị trí an toàn'}).click();await expect.poll(async()=>(await avatar.boundingBox())!.y).toBeCloseTo(before.y,0)
})
test('Compass continues the explicitly selected Q3 before Q2',async({page})=>{
 await enter(page);await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp trên',exact:true}).click()
 await expect(page.locator('.lw-compass h2')).toHaveText('Những lớp hầm liên hệ thế nào?')
 await page.locator('.lw-compass').getByRole('button',{name:'Tiếp tục hành trình',exact:true}).click()
 await expect(page.getByRole('dialog',{name:'Quan sát lớp trên'})).toBeVisible()
 await expect(page.getByRole('heading',{level:1})).toHaveText('Thành phố nhiều tầng · lớp trên')
})
