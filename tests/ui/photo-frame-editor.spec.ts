import {test,expect,type Page} from '@playwright/test'
import path from 'node:path'
import sharp from 'sharp'
const fixture=path.resolve(import.meta.dirname,'../fixtures/portrait-single-face.jpg')
async function setup(page:Page){
 await page.addInitScript(()=>{for(const [key,value] of Object.entries({timelens_token:'frame-test',timelens_user_id:'photo-test',timelens_display_name:'Photo User',timelens_role:'USER',timelens_tier:'PREMIUM',timelens_email_verified:'1',timelens_mode:'online',histar_consent_v1:JSON.stringify({analytics:false,camera:false,gps:false})}))localStorage.setItem(key,value)})
 await page.route(url=>url.pathname.startsWith('/api/'),route=>route.fulfill({json:{success:true,data:new URL(route.request().url()).pathname==='/api/profile/me'?{id:'photo-test',displayName:'Photo User',role:'USER',tier:'PREMIUM',emailVerified:true,activeVisitSites:[]}:[]}}))
 await page.goto('/photo-frame?mode=original')
 await page.locator('input[type=file]').last().setInputFiles(fixture)
 await expect(page.getByRole('img',{name:'Ảnh kỷ niệm đang chỉnh'})).toBeVisible()
}
async function preview(page:Page){return page.getByRole('img',{name:'Ảnh kỷ niệm đang chỉnh'}).getAttribute('src')}
test('three local frames render actual exported pixels and position controls update preview',async({page})=>{
 await setup(page)
 for(const name of ['Độc lập tự do','Gan dạ tiến bước','Gian khổ mà anh dũng']){
  const before=await preview(page)
  await page.getByRole('button',{name,exact:true}).click()
  await expect(page.getByRole('button',{name,exact:true})).toHaveAttribute('aria-pressed','true')
  await expect.poll(()=>preview(page)).not.toBe(before)
  const pixels=await page.getByRole('img',{name:'Ảnh kỷ niệm đang chỉnh'}).evaluate(async img=>{const image=img as HTMLImageElement;await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const x=c.getContext('2d')!;x.drawImage(image,0,0);return {width:c.width,height:c.height,corner:[...x.getImageData(5,5,1,1).data]}})
  expect([pixels.width,pixels.height]).toEqual([1080,1080]);expect(pixels.corner[3]).toBe(255)
 }
 const before=await preview(page);await page.getByRole('slider',{name:'Phóng to',exact:true}).fill('1.5');await expect.poll(()=>preview(page)).not.toBe(before)
 const image=page.getByRole('img',{name:'Ảnh kỷ niệm đang chỉnh'});await image.scrollIntoViewIfNeeded();const box=(await image.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+15,box.y+box.height/2);await page.waitForTimeout(300);await page.mouse.move(box.x+box.width/2+40,box.y+box.height/2);await page.mouse.up();expect(Number(await page.getByRole('slider',{name:'Vị trí ngang',exact:true}).inputValue())).toBeGreaterThan(0.1)
 await expect(page.getByRole('img',{name:'Ảnh kỷ niệm đang chỉnh'})).toBeVisible();await expect(page.getByRole('button',{name:'Xem lại ảnh',exact:true})).toBeEnabled();await page.getByRole('group',{name:'Chọn khung ảnh',exact:true}).scrollIntoViewIfNeeded()
 await page.screenshot({path:'test-results/photo-editor/desktop-editor.png',fullPage:true})
})
test('local frame saves a composed image without sending artwork ID as a database UUID',async({page})=>{
 await setup(page);await page.getByRole('button',{name:'Độc lập tự do',exact:true}).click()
 await expect(page.getByRole('button',{name:'Xem lại ảnh',exact:true})).toBeEnabled()
 let upload:Buffer|undefined
 await page.route('**/api/user-creations',async route=>{const body=route.request().postDataBuffer()!;expect(body.toString('latin1')).not.toContain('cuchi-frame-');expect(body.toString('latin1')).not.toContain('name="frameId"');upload=body;await route.fulfill({json:{success:true,data:{id:'created-photo',outputUrl:'/private/test.png',variant:'square',createdAt:new Date().toISOString(),shared:false}}})})
 await page.getByRole('button',{name:'Xem lại ảnh',exact:true}).click();await page.getByRole('button',{name:'Lưu ảnh & tiếp tục',exact:true}).click();await expect.poll(()=>!!upload).toBe(true)
 const bytes=upload!;const png=bytes.indexOf(Buffer.from([137,80,78,71,13,10,26,10]));const jpg=bytes.indexOf(Buffer.from([255,216,255]));const start=png>=0?png:jpg;expect(start).toBeGreaterThan(0);const metadata=await sharp(bytes.subarray(start)).metadata();expect([metadata.width,metadata.height]).toEqual([1080,1080])
})
test('frame selection and adjustment fit narrow mobile screens',async({page})=>{
 for(const width of [390,320]){await page.setViewportSize({width,height:844});await setup(page);await page.getByRole('button',{name:'Gan dạ tiến bước',exact:true}).click();await expect(page.getByRole('slider',{name:'Vị trí ngang',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/photo-editor/mobile-${width}.png`,fullPage:true})}
})
