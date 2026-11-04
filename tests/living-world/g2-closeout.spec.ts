import {test,expect,type Page} from '@playwright/test'
import {chooseEra} from './p2.helpers'
// G2 closeout gaps from continuity-results.csv (WC-AT04 double trigger, WC-AT10 reverse order).
// Guest-mode UI journeys only; server idempotency/ledger checks stay in PostgresWorldIT + fullstack specs.
// R2 E2E: a target observation is asserted only after the Avatar has really arrived at THAT target (precondition, not a
// longer assertion timeout). Tools/strokes/routes/link points are not walk targets.
async function hit(page:Page,id:string){
 const modelSelection=/^(AIR_|STRUCT_LAYER_)/.test(id)&&await page.locator('.lw-scene-hud button[aria-pressed="true"]').count()>0
 await hitRaw(page,id)
 if(modelSelection)return // Model endpoints select a relation; the Avatar stays in place.
 if(/^(STROKE_|RICE_|ROUTE_|LINK_|NPC_)/.test(id))return
 await expect.poll(async()=>(await page.locator('main.lw-root').getAttribute('data-arrived'))===id||await page.locator(`.lw-dialog[data-target="${id}"]`).count()>0,{timeout:30000,message:'Avatar arrives at '+id}).toBe(true)
}
async function hitRaw(page:Page,id:string){
 // Shader warm-up creates labels before the first projected frame. Await the scene, not an invalid 2D walk fallback in model mode.
 await expect(page.locator('.lw-canvas canvas')).toHaveAttribute('data-readiness','ready')
 const label=page.locator(`[data-scene-target="${id}"]`);await expect(label).toHaveCount(1)
 const b=(await page.locator('.lw-canvas').boundingBox())!,sheet=await page.locator('.lw-compass').boundingBox()
 const p=await label.evaluate(el=>({x:Number((el as HTMLElement).dataset.cx),y:Number((el as HTMLElement).dataset.cy),hidden:(el as HTMLElement).hidden}))
 const covered=!!sheet&&b.x+p.x>=sheet.x&&b.x+p.x<=sheet.x+sheet.width&&b.y+p.y>=sheet.y-8
 if(!p.hidden&&!covered&&p.x>8&&p.y>90&&p.x<b.width-8&&p.y<b.height-8){await page.mouse.click(b.x+p.x,b.y+p.y);if(await page.locator('.lw-canvas canvas').getAttribute('data-last-pick')===id)return}
 // G3 third-person camera: an off-screen target is reached in-world (E when standing near it) or via the in-world exits / 2D equivalents.
 if(await page.locator(`.lw-prompt[data-target="${id}"]`).count()||await page.locator(`.lw-dialog[data-target="${id}"]`).count()){await page.locator('.lw-canvas canvas').focus();await page.keyboard.press('e');return} // R2 WC05: only E on THIS target (a dialog of another target used to swallow the action)
 if(id.startsWith('ROUTE_')){const d=page.locator('.lw-world-exits');if(!(await d.evaluate(el=>(el as HTMLDetailsElement).open)))await d.locator('summary').click();await d.locator(`[data-target="${id}"]`).click();return}
 const t=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await t.getAttribute('aria-expanded')==='false')await t.click()
 await page.locator(`.lw-alternatives [data-target="${id}"]`).first().click()
}
async function menu(page:Page){const m=page.getByRole('button',{name:'Menu',exact:true});if(await m.count()&&await m.getAttribute('aria-expanded')==='false')await m.click()}
async function open(page:Page){await page.goto('/living-world?continuity=1');if(await page.getByTestId('consent-decline').isVisible())await page.getByTestId('consent-decline').click();await expect(page.locator('.lw-zone-nav')).toHaveCount(0);await expect(page.locator('canvas')).toBeVisible()}
async function toMachine(page:Page){await page.getByRole('button',{name:'Gặp người giữ trạm',exact:true}).click();await page.getByRole('button',{name:'Tới cỗ máy',exact:true}).click();await expect(page.getByRole('dialog',{name:'Cỗ máy thời gian',exact:true})).toBeVisible()}
async function route(page:Page,id:string,title:string){await page.keyboard.press('Escape');await hit(page,'ROUTE_'+id);await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toContainText(title);await expect(page.locator('.lw-transfer')).toHaveCount(0)}
async function inspect(page:Page,id:string){await hit(page,id);await expect(page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true})).toBeVisible();await hit(page,id);await expect(page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true})).toHaveCount(0)}
// G3 QA P0 Q1 (PO): the concealed hatch is a physical in-world interaction — sweep the litter, lift the lid, crawl down —
// replacing the former observation dialog + route panel. Same intent: the hatch must be found before going down.
async function descendHatch(page:Page){
 const t=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await t.getAttribute('aria-expanded')==='false')await t.click()
 await page.locator('.lw-alternatives [data-target="Q1_HATCH"]').click()
 for(const label of ['Quan sát kỹ mặt đất','Nhấc nắp','Chui xuống']){const pr=page.locator('.lw-prompt[data-target="Q1_HATCH"]').filter({hasText:label});await expect(pr).toBeVisible({timeout:20000});await pr.click()}
}
const nav=(page:Page)=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')??'null'))

test('G2C-01 / WC-AT04: double-triggered portal and route commit exactly one transfer',async({page})=>{
 const transfers:number[]=[];await page.exposeFunction('__lwTransfer',(n:number)=>transfers.push(n))
 await page.addInitScript(()=>{new MutationObserver(()=>{(window as unknown as {__lwTransfer:(n:number)=>void}).__lwTransfer(document.querySelectorAll('.lw-transfer').length)}).observe(document,{childList:true,subtree:true})})
 await open(page);await toMachine(page)
 // Two activations inside one task: the second must be ignored by the synchronous transfer guard.
 await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click()})
 // Prologue P5: the Story journey lands in S1 (was S2 before the G3 immersive correction); S1 → L1-A → L1-B is the in-world route.
 await expect(page.getByRole('heading',{level:1})).toContainText('Bìa rừng');await expect(page.locator('.lw-transfer')).toHaveCount(0)
 expect(Math.max(...transfers)).toBeLessThanOrEqual(1)
 await page.keyboard.press('Escape')
 // the hatch: sweep and lift normally, then double-trigger the crawl-down action (the descent must commit one transfer)
 const t=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await t.getAttribute('aria-expanded')==='false')await t.click()
 await page.locator('.lw-alternatives [data-target="Q1_HATCH"]').click()
 for(const label of ['Quan sát kỹ mặt đất','Nhấc nắp']){const pr=page.locator('.lw-prompt[data-target="Q1_HATCH"]').filter({hasText:label});await expect(pr).toBeVisible({timeout:20000});await pr.click()}
 const go=page.locator('.lw-prompt[data-target="Q1_HATCH"]').filter({hasText:'Chui xuống'});await expect(go).toBeVisible({timeout:20000})
 await go.evaluate(el=>{(el as HTMLButtonElement).click();(el as HTMLButtonElement).click()})
 await expect(page.getByRole('heading',{level:1})).toHaveText('Lối vào và tuyến chuyển tiếp');await expect(page.locator('.lw-transfer')).toHaveCount(0)
 expect(Math.max(...transfers)).toBeLessThanOrEqual(1)
 // Exactly one hop: checkpoint is the destination, not a second route from it.
 await expect.poll(async()=>(await nav(page))?.zone).toBe('L1-A')
 await expect(page.getByRole('button',{name:'Atlas ký ức · 0',exact:true})).toBeVisible()
})

test('G2C-02 / WC-AT10: reverse order Q3 before Q2 via in-world routes, callback still substantive',async({page})=>{
 await open(page);await toMachine(page);await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click();await expect(page.getByRole('heading',{level:1})).toContainText('Bìa rừng')
 // Pass through the air zone without doing Q2, then complete Q3 first (S1 → L1-A → L1-B in-world route after the P5 correction).
 await expect(page.locator('.lw-transfer')).toHaveCount(0);await descendHatch(page);await expect(page.getByRole('heading',{level:1})).toContainText('Lối vào');await expect(page.locator('.lw-transfer')).toHaveCount(0);await route(page,'ENTRANCE_AIR','Hơi thở');await route(page,'AIR_STRUCTURE','lớp trên')
 for(const id of ['STRUCT_LAYER_1','STRUCT_LINK_12'])await inspect(page,id)
 await route(page,'LAYER_MIDDLE','lớp giữa');for(const id of ['STRUCT_LAYER_2','STRUCT_LINK_23'])await inspect(page,id)
 await route(page,'LAYER_DEEP','lớp dưới');await inspect(page,'STRUCT_LAYER_3')
 await page.getByRole('button',{name:'Nối các tầng trong mô hình',exact:true}).click()
 for(const id of ['STRUCT_LAYER_1','STRUCT_LAYER_2','STRUCT_LAYER_2','STRUCT_LAYER_3'])await hit(page,id)
 await expect(page.getByRole('button',{name:'Atlas ký ức · 6',exact:true})).toBeVisible({timeout:15000})
 // One foundation only: no callback may be offered yet.
 await expect(page.getByRole('button',{name:'Nhìn lại thông khí',exact:true})).toHaveCount(0)
 await route(page,'CALLBACK_L3-A','Hơi thở')
 for(const id of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR'])await inspect(page,id)
 await page.getByRole('button',{name:'Nối đường khí trong mô hình',exact:true}).click()
 for(const id of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR'])await hit(page,id)
 await hit(page,'LINK_AIR_LIFE')
 await expect(page.getByRole('button',{name:'Atlas ký ức · 11',exact:true})).toBeVisible({timeout:15000})
 // Both foundations: the callback appears as an interpretation layer, not merely a link toast.
 const callback=page.getByRole('heading',{name:'Nhìn lại: từ một lỗ mở đến cả hệ thống'}),offer=page.getByRole('button',{name:'Nhìn lại thông khí',exact:true})
 await expect(callback.or(offer).first()).toBeVisible({timeout:15000})
 if(await offer.isVisible()){await offer.click();const go=page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true});if(await go.isVisible().catch(()=>false))await go.click()}
 await expect(callback).toBeVisible();await page.getByRole('button',{name:'Lưu góc nhìn này',exact:true}).click()
 await route(page,'RETURN_L1-B','Trạm thời gian');await expect(page.getByRole('button',{name:'Atlas ký ức · 11',exact:true})).toBeVisible()
})

test('G2C-03 / WC-AT07: mobile viewport reaches S2 and returns using in-world/2D controls only',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await open(page);await toMachine(page);await chooseEra(page);await page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true}).click()
 await expect(page.getByRole('heading',{level:1})).toContainText('Bìa rừng');await expect(page.locator('.lw-zone-nav')).toHaveCount(0)
 // P5 lands in S1; reach S2 with the in-world exits only (no debug tabs), then keep the original S2 assertions.
 if(await page.locator('.lw-world-exits').getAttribute('open')===null)await page.locator('.lw-world-exits summary').click()
 await page.getByRole('button',{name:'Tới điểm · Theo lối mòn về xóm',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
 await expect(page.getByRole('heading',{level:1})).toContainText('Góc lao động');await expect(page.locator('.lw-zone-nav')).toHaveCount(0)
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);expect(overflow).toBeLessThanOrEqual(1)
 if(await page.getByRole('button',{name:'Dùng sơ đồ 2D',exact:true}).isVisible())await page.getByRole('button',{name:'Dùng sơ đồ 2D',exact:true}).click()
 if(await page.locator('.lw-world-exits').getAttribute('open')===null)await page.locator('.lw-world-exits summary').click()
 await page.getByRole('button',{name:'Tới điểm · Trở về hiện tại',exact:true}).click();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
 await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian')
})
