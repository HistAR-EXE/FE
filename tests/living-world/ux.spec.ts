import {prepareA04} from './a04.helpers'
import {test,expect,type Page} from '@playwright/test'
import {planPath,zones,type Zone,type Point} from '../../src/features/living-world/worldModel'
// A walk-view target behind several bends cannot be inspected from spawn by orbiting alone.
// Drive the real WASD input along the authored grid; read-only pose telemetry never moves the Avatar.
async function walkForDirectPick(page:Page,id:string){
 const canvas=page.locator('canvas'),read=()=>canvas.evaluate(c=>JSON.parse(c.dataset.avatarPose!))
 const pose=await read(),zone=pose.zone as Zone,target=zones[zone].targets.find(t=>t.id===id)
 if(!target)return
 for(let leg=0;leg<10;leg++){
  const here=await read();if(Math.hypot(here.position[0]-target.at[0],here.position[1]-target.at[1])<1.5)return
  const path=planPath(here.position,target.approach,zone);expect(path.length).toBeGreaterThan(0)
  let goal=path[0];const axis=(a:Point,b:Point)=>Math.abs(a[0]-b[0])>Math.abs(a[1]-b[1])?'x':'z',direction=axis(here.position,path[0])
  for(let i=1;i<path.length&&axis(path[i-1],path[i])===direction;i++)goal=path[i]
  const yaw=Math.atan2(goal[0]-here.position[0],goal[1]-here.position[1]),delta=Math.atan2(Math.sin(yaw-here.lookYaw),Math.cos(yaw-here.lookYaw)),box=(await canvas.boundingBox())!
  const drag=-delta*box.height/(2*Math.PI*.7)
  if(Math.abs(drag)>7){await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5+drag,box.y+box.height*.5,{steps:12});await page.mouse.up();await page.waitForTimeout(200)}
  const distance=Math.hypot(goal[0]-here.position[0],goal[1]-here.position[1]);await canvas.focus();await page.keyboard.down('w');await page.waitForTimeout(Math.max(60,(distance-.6)/2.8*1000));await page.keyboard.up('w')
  await expect.poll(async()=>(await read()).moving).toBe(false)
  console.log('DIRECT_WASD_LEG',id,JSON.stringify(await read()))
 }
 throw Error('Direct route did not reach '+id)
}
export async function sceneHit(page:Page,id:string,approach=0){
 await expect(page.locator('.lw-canvas canvas')).toHaveAttribute('data-readiness','ready')
 if(id==='STRUCT_LAYER_3'&&approach===0&&!await page.locator('.lw-scene-hud button[aria-pressed="true"]').count())await walkForDirectPick(page,id)
 const label=page.locator(`[data-scene-target="${id}"]`)
 await expect(label).toHaveCount(1)
 const box=(await page.locator('.lw-canvas').boundingBox())!
 if(approach===0){await page.locator('canvas').focus();await page.keyboard.press('c');await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))}
 // Enterable tunnels no longer expose every target in the initial cutaway frame. Look using real drags first.
 for(let turn=0;turn<12;turn++){
  const p=await label.evaluate(el=>({x:Number((el as HTMLElement).dataset.cx),y:Number((el as HTMLElement).dataset.cy)}))
  if(p.x>8&&p.x<box.width-8&&p.y>90&&p.y<box.height-8&&await label.isVisible())break
  await page.mouse.move(box.x+box.width*.8,box.y+box.height*.55);await page.mouse.down()
  await page.mouse.move(box.x+box.width*.8+(!Number.isFinite(p.x)||p.x<8||p.x>box.width-8||!await label.isVisible()?160:0),box.y+box.height*.55+(await label.isVisible()?(p.y<90?-90:p.y>box.height-8?90:0):0),{steps:8});await page.mouse.up();await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
 }
 await expect(label).toBeVisible()
 const point=await label.evaluate(el=>({x:Number((el as HTMLElement).dataset.cx),y:Number((el as HTMLElement).dataset.cy)}))
 await page.mouse.click(box.x+point.x,box.y+point.y)
 if(await page.locator('.lw-canvas canvas').getAttribute('data-last-pick')!==id&&approach<4){
  const close=page.locator('.lw-dialog .lw-close');if(await close.count())await close.click()
  await page.locator('.lw-canvas canvas').focus();await page.keyboard.down('w');await page.waitForTimeout(650);await page.keyboard.up('w');await page.waitForTimeout(400)
  return sceneHit(page,id,approach+1)
 }
 await expect(page.locator('.lw-canvas canvas')).toHaveAttribute('data-last-pick',id)
}
async function enter(page:Page){await page.goto('/living-world?debug=1');await page.getByTestId('consent-decline').click();await page.getByRole('button',{name:'Bỏ qua dẫn nhập · khám phá ngay'}).click();await page.locator('canvas').waitFor()}
async function inspect3d(page:Page,id:string,name:string){await sceneHit(page,id);await expect(page.getByRole('dialog',{name})).toBeVisible();await page.getByRole('button',{name:'Ghi điều vừa quan sát',exact:true}).click();await expect(page.getByRole('dialog',{name})).toHaveCount(0)}
test('Vietnamese heading uses a consistent font; enabled toolbar/hover retain contrast',async({page})=>{
 await enter(page);await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp trên',exact:true}).click()
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const doc=await cdp.send('DOM.getDocument');const node=await cdp.send('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'h1'});const fonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId});expect(fonts.fonts.length).toBe(1)
 const ratio=async(selector:string)=>page.locator(selector).first().evaluate(el=>{const c=getComputedStyle(el),lum=(v:string)=>{const rgb=v.match(/[\d.]+/g)!.slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};const a=lum(c.color),b=lum(c.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)})
 expect(await ratio('.lw-stage-tools button')).toBeGreaterThanOrEqual(4.5)
 await page.locator('.lw-primary').first().hover();expect(await ratio('.lw-primary')).toBeGreaterThanOrEqual(4.5)
})
test('actual 3D objects support Q2/Q3 connections and return callback without external task buttons',async({page})=>{
 await enter(page)
 for(const [id,name] of [['AIR_SURFACE_OPENING','Dấu thông hơi trên mặt đất'],['AIR_PASSAGE','Đoạn nối trong lòng đất'],['AIR_INTERIOR','Không gian bên trong']])await inspect3d(page,id,name)
 await page.getByRole('button',{name:'Nối đường khí trong mô hình',exact:true}).click()
 for(const id of ['AIR_SURFACE_OPENING','AIR_PASSAGE','AIR_INTERIOR'])await sceneHit(page,id)
 await sceneHit(page,'LINK_AIR_LIFE')
 await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp trên',exact:true}).click()
 for(const [zone,id,name] of [['L1-D','STRUCT_LAYER_1','Quan sát lớp trên'],['L1-D','STRUCT_LINK_12','Quan sát điểm chuyển 1–2'],['L2-A','STRUCT_LAYER_2','Quan sát lớp giữa'],['L2-A','STRUCT_LINK_23','Quan sát điểm chuyển 2–3'],['L3-A','STRUCT_LAYER_3','Quan sát lớp dưới']]){
  if(zone==='L2-A')await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp giữa',exact:true}).click()
  if(zone==='L3-A')await page.getByRole('button',{name:'Thành phố nhiều tầng · lớp dưới',exact:true}).click()
  await inspect3d(page,id,name)
 }
 await page.getByRole('button',{name:'Nối các tầng trong mô hình',exact:true}).click()
 for(const id of ['STRUCT_LAYER_1','STRUCT_LAYER_2','STRUCT_LAYER_2','STRUCT_LAYER_3'])await sceneHit(page,id)
 await page.getByRole('button',{name:'Nhìn lại thông khí',exact:true}).click()
 await expect(page.getByRole('heading',{name:'Nhìn lại: từ một lỗ mở đến cả hệ thống'})).toBeVisible()
})
test('NPC/tool 3D clicks approach Avatar and process A04; dialogue never overlaps canvas',async({page})=>{
 await enter(page);await page.getByLabel('Cách khám phá').selectOption('FREE');await sceneHit(page,'A04')
 await expect(page.getByRole('dialog',{name:'Thử phối hợp giã gạo'})).toBeVisible()
 const [canvas,dialog]=await Promise.all([page.locator('.lw-canvas').boundingBox(),page.locator('.lw-dialog').boundingBox()]);expect(dialog!.x).toBeGreaterThanOrEqual(canvas!.x+canvas!.width)
 await prepareA04(page)
 for(let round=0;round<6;round++)for(let step=0;step<3;step++)await sceneHit(page,'STROKE_LEFT')
 await page.locator('.lw-dialog details summary').click()
 await expect(page.getByText('Mẻ gạo đã chuyển trạng thái.',{exact:false})).toBeVisible()
 expect(await page.getByRole('button',{name:'Giã bên trái',exact:true}).isDisabled()).toBe(true)
 expect(await page.getByRole('button',{name:'Giã bên trái',exact:true}).evaluate(el=>getComputedStyle(el).opacity)).toBe('1')
 const avatar=page.locator('[data-scene-actor="AVATAR"]');expect(Number(await avatar.getAttribute('data-screen-height'))).toBeGreaterThan(60)
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
 await sceneHit(page,'A04');await expect(page.getByRole('dialog',{name:'Thử phối hợp giã gạo'})).toBeVisible()
})
test('orbit drag is not an inspection and early meaning selection cannot grant a discovery',async({page})=>{
 await enter(page)
 await sceneHit(page,'LINK_AIR_LIFE');await expect(page.locator('.lw-feedback')).toContainText('Hãy nối lỗ mở')
 const el=page.locator('[data-scene-target="AIR_SURFACE_OPENING"]');const point=await el.evaluate(e=>({x:Number((e as HTMLElement).dataset.cx),y:Number((e as HTMLElement).dataset.cy)}));const box=(await page.locator('.lw-canvas').boundingBox())!
 await page.mouse.move(box.x+point.x,box.y+point.y);await page.mouse.down();await page.mouse.move(box.x+point.x+45,box.y+point.y+20,{steps:5});await page.mouse.up()
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name:'Atlas ký ức · 0',exact:true})).toBeVisible()
})
test('equivalent keyboard controls remain reachable without moving the desktop document',async({page})=>{
 await enter(page);expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);const before=await page.evaluate(()=>scrollY)
 await page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true}).click()
 await page.getByRole('button',{name:'Dấu thông hơi trên mặt đất',exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible()
 expect(await page.evaluate(()=>scrollY)).toBe(before)
 await page.keyboard.press('Escape');await page.locator('canvas').focus();await expect(page.locator('canvas')).toBeFocused()
 expect(await page.locator('canvas').evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none')
 await page.keyboard.press('Tab');const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,visible:!!document.activeElement?.getBoundingClientRect().height}));expect(focus.tag).toBe('BUTTON');expect(focus.visible).toBe(true)
})
test('mobile 2D has no horizontal overflow or scene-covering dialogue',async({page})=>{
 await page.setViewportSize({width:390,height:844});await enter(page);await page.getByRole('button',{name:'Dùng sơ đồ 2D',exact:true}).click()
 await page.getByRole('button',{name:'Dấu thông hơi trên mặt đất',exact:true}).last().click();await expect(page.getByRole('dialog')).toBeVisible()
 const canvas=await page.locator('.lw-stage').boundingBox(),dialog=await page.locator('.lw-dialog').boundingBox();expect(dialog!.y).toBeGreaterThanOrEqual(canvas!.y+canvas!.height)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('toast layout fixture keeps Close clear of the station action',async({page})=>{
 await enter(page)
 // Populate the real notification region only to test layout, not toast delivery/dismissal.
 const region=page.locator('[role="status"][aria-atomic="false"]')
 await region.evaluate(el=>{el.innerHTML='<div style="background:#fff;padding:12px;display:flex;justify-content:space-between">Thông báo thử bố cục<button aria-label="Close toast">Close</button></div>'})
 await page.screenshot({path:(process.env.LW_EVIDENCE_DIR??'../docs/superpowers/m1/2026-11-02-world-environment/evidence/ux-followup/')+'toast-layout.png'})
 const header=(await page.locator('.lw-header').boundingBox())!,toast=(await region.boundingBox())!
 expect(toast.y).toBeGreaterThanOrEqual(header.y+header.height+8)
 await page.getByRole('button',{name:'Về trạm',exact:true}).click()
 await expect(page.getByRole('heading',{level:1})).toHaveText('Trạm thời gian')
})

test('scene labels avoid each other and model anchor centers through camera changes',async({page})=>{
 await enter(page);await page.getByLabel('Cách khám phá').selectOption('FREE')
 await sceneHit(page,'A04');await expect(page.getByRole('dialog')).toBeVisible()
 const overlaps=()=>page.locator('.lw-canvas').evaluate(host=>{
  const origin=host.getBoundingClientRect(),els=[...host.querySelectorAll<HTMLElement>('.lw-scene-label')].filter(e=>!e.hidden&&getComputedStyle(e).visibility!=='hidden')
  const rects=els.map(e=>e.getBoundingClientRect()),hits:string[]=[]
  for(let i=0;i<els.length;i++)for(let j=i+1;j<els.length;j++){const a=rects[i],b=rects[j];if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)hits.push(`${els[i].textContent}/${els[j].textContent}`)}
  for(let i=0;i<els.length;i++)for(const target of host.querySelectorAll<HTMLElement>('[data-scene-target]')){const x=origin.x+Number(target.dataset.cx),y=origin.y+Number(target.dataset.cy),r=rects[i];if(x>r.left&&x<r.right&&y>r.top&&y<r.bottom)hits.push(`anchor covered by ${els[i].textContent}`)}
  return hits
 })
 await page.screenshot({path:(process.env.LW_EVIDENCE_DIR??'../docs/superpowers/m1/2026-11-02-world-environment/evidence/ux-followup/')+'labels.png'})
 expect(await overlaps()).toEqual([])
 for(let i=0;i<3;i++){const b=(await page.locator('.lw-canvas').boundingBox())!;await page.mouse.move(b.x+b.width*.4,b.y+b.height*.7);await page.mouse.down();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.6,{steps:12});await page.mouse.up();await expect.poll(overlaps).toEqual([])}
})
