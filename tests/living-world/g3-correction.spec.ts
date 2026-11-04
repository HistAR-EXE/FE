import {test,expect} from '@playwright/test'
import {chooseEra} from './p2.helpers'
// G3 QA P0 Q1 (PO): the concealed hatch is a physical in-world interaction — sweep the litter, lift the lid, crawl down —
// replacing the former observation dialog + route panel. Same intent: the hatch must be found before going down.
async function descendHatch(page:import('@playwright/test').Page){
 const t=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await t.getAttribute('aria-expanded')==='false')await t.click()
 await page.locator('.lw-alternatives [data-target="Q1_HATCH"]').click()
 for(const label of ['Quan sát kỹ mặt đất','Nhấc nắp','Chui xuống']){const pr=page.locator('.lw-prompt[data-target="Q1_HATCH"]').filter({hasText:label});await expect(pr).toBeVisible({timeout:20000});await pr.click()}
}
test('preview survives delayed assets without acknowledging full scene readiness',async({page})=>{
 await page.route('**/assets/*.glb',async route=>{await new Promise(r=>setTimeout(r,7000));await route.continue()})
 await page.goto('/living-world')
 await expect(page.locator('.lw-canvas canvas')).toBeVisible({timeout:3000})
 await expect(page.locator('.lw-canvas canvas')).toHaveAttribute('data-readiness','preview')
 await expect(page.getByRole('button',{name:'Menu',exact:true})).toBeEnabled()
 await expect(page.locator('.lw-canvas canvas')).toHaveAttribute('data-readiness','ready',{timeout:20000})
})
test('S1 hatch → L1-A → air, upward return and guest checkpoint preserve no canonical Q1 claims',async({page},info)=>{
 await page.goto('/living-world')
 if(await page.getByTestId('consent-decline').isVisible())await page.getByTestId('consent-decline').click()
 await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click()
 await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click()
 await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click()
 await expect(page.getByRole('heading',{level:1})).toContainText('Bìa rừng')
 await expect(page.locator('.lw-transfer')).toHaveCount(0)
 // the hatch is not labelled before discovery (no spoiler in the 2D equivalent list)
 await page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true}).click()
 await expect(page.locator('.lw-alternatives [data-target="Q1_HATCH"]')).toHaveText(/^Điểm quan sát mặt đất \d$/)
 await expect(page.locator('.lw-alternatives [data-target="ROUTE_FOREST_ENTRANCE"]')).toHaveCount(0)
 const route=async(id:string,title:string)=>{
  const exits=page.locator('.lw-world-exits')
  if(await exits.getAttribute('open')===null)await exits.locator('summary').click()
  await exits.locator(`[data-target="ROUTE_${id}"]`).click()
  await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
  await expect(page.getByRole('heading',{level:1})).toContainText(title)
  await expect(page.locator('.lw-transfer')).toHaveCount(0)
 }
 await descendHatch(page)
 await expect(page.getByRole('heading',{level:1})).toContainText('Lối vào');await expect(page.locator('.lw-transfer')).toHaveCount(0)
 await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')??'{}').zone)).toBe('L1-A')
 await page.screenshot({path:info.outputPath('l1-a.png')})
 await page.reload();await expect(page.getByRole('heading',{level:1})).toContainText('Lối vào')
 await route('ENTRANCE_AIR','Hơi thở')
 await route('AIR_ENTRANCE','Lối vào')
 await route('ENTRANCE_SURFACE','Bìa rừng')
 // back on the surface: beside the hatch, which is closed and re-covered (no open hole left behind)
 await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')??'{}').position)).toEqual([2,-1.5])
 const t2=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await t2.getAttribute('aria-expanded')==='false')await t2.click()
 await expect(page.locator('.lw-alternatives [data-target="Q1_HATCH"]')).toHaveText(/Gạt lớp lá/,{timeout:20000})
 await expect(page.locator('.lw-world-exits [data-target="ROUTE_FOREST_ENTRANCE"]')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'Atlas ký ức · 0',exact:true})).toBeVisible()
 // R2 HUD-Q1-PARTIAL: the guest/local status is stated in natural language; no internal state names or ids on screen.
 await expect(page.locator('.lw-small').filter({hasText:'chỉ lưu trên máy này'})).toBeVisible()
 const hud=await page.locator('.lw-game').innerText();expect(hud).not.toMatch(/PARTIAL|Q1_|S1_DECOY|ENTRANCE_CONFIRMED|foundation/i)
 // ...and still nothing canonical locally: no facts / foundation recorded for the guest
 expect((await page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')??'{}'))).facts??[]).toEqual([])
 const gpu=await page.locator('canvas').evaluate(c=>{const gl=c.getContext('webgl2')!,e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'})
 await info.attach('gpu',{body:String(gpu),contentType:'text/plain'})
})
