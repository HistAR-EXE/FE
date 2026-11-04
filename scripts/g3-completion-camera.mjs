import {chromium} from '@playwright/test'
import {spawn} from 'node:child_process'
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'

const out=path.resolve(process.argv[2]??'../docs/superpowers/m1/g3-g4-completion/evidence/camera-before')
mkdirSync(out,{recursive:true})
const port=Number(process.env.LW_CAMERA_PORT??5396),base=`http://127.0.0.1:${port}`
const build=process.env.LW_CAMERA_BUILD
const extended=process.env.LW_CAMERA_EXTENDED==='true',mobile=process.env.LW_CAMERA_MOBILE==='true'
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(build?['preview','--outDir',build]:[]),'--host','127.0.0.1','--port',String(port),'--strictPort'],{windowsHide:true,stdio:'ignore',env:{...process.env,VITE_LIVING_WORLD_INTERNAL:'true',HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8094'}})
const results={scope:'ISOLATED CAMERA DIAGNOSIS; not Natural Journey or visual acceptance',build:build??'dev source',mobileEmulation:mobile,cases:[]}
let browser
try {
 for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break}catch{}await new Promise(r=>setTimeout(r,500))}
 browser=await chromium.launch({channel:'chrome',headless:false,args:['--ignore-gpu-blocklist']})
 for(const [zone,position,heading] of [['L1-A',[0,2],Math.PI],['L1-B',[0,2],Math.PI],['L1-D',[0,1],-Math.PI/2],['L2-A',[0,2],Math.PI],['L3-A',[-1,2],-Math.PI/2]]){
  if(process.env.LW_CAMERA_ZONES&&!process.env.LW_CAMERA_ZONES.split(',').includes(zone))continue
  const viewport=mobile?{width:390,height:844}:{width:1920,height:1080}
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:'block',recordVideo:{dir:out,size:viewport}})
  const page=await context.newPage(),video=page.video(),item={zone,isolated:true,states:[]}
  page.setDefaultTimeout(20000)
  try {
   await page.addInitScript(({zone,position,heading})=>{if(sessionStorage.getItem('completion-camera-fixture'))return;sessionStorage.setItem('completion-camera-fixture','1');sessionStorage.setItem('timelens-proof-nav:guest',JSON.stringify({version:1,zone,position,heading,rice:0,last:null,q1:[],facts:[],mode:'STORY'}))},{zone,position,heading})
   await page.goto(base+'/living-world');await page.getByTestId('consent-decline').click()
   await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready',null,{timeout:60000})
   item.gpu=await page.locator('canvas').evaluate(c=>{const g=c.getContext('webgl2'),e=g?.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unavailable'})
   if(/swiftshader|llvmpipe|software|unavailable/i.test(item.gpu))throw Error('Hardware GPU not established: '+item.gpu)
   for(const view of ['FP','TP']){
    if(view==='TP'){await page.locator('canvas').focus();await page.keyboard.press('v')}
    await page.waitForTimeout(1100)
    await page.screenshot({path:path.join(out,`${zone}-${view}.png`)})
    item.states.push({view,canvas:await page.locator('canvas').evaluate(c=>({...c.dataset})),navigation:await page.evaluate(()=>sessionStorage.getItem('timelens-proof-nav:guest'))})
   }
   // Capture both views at the same pose before movement, then demonstrate movement in each view.
   for(const view of ['TP','FP']){
    if(view==='FP')await page.keyboard.press('v')
    for(const key of ['w','s','a','d']){await page.locator('canvas').focus();await page.keyboard.down(key);await page.waitForTimeout(450);await page.keyboard.up(key)}
   }
   if(extended){
    const state=()=>page.evaluate(()=>({nav:JSON.parse(sessionStorage.getItem('timelens-proof-nav:guest')??'null'),camera:JSON.parse(document.querySelector('canvas')?.dataset.cameraView??'null'),canvas:{...document.querySelector('canvas')?.dataset}}))
    const capture=async label=>{await page.waitForTimeout(1100);item.states.push({label,...await state()});await page.screenshot({path:path.join(out,`${zone}-${label}.png`)})}
    item.checks=[]
    const rect=await page.locator('canvas').boundingBox(),x=rect.x+rect.width*.7,y=rect.y+rect.height*.55
    if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-90,y:y+20}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()}
    else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-250,y+80,{steps:15});await page.mouse.up()}
    await capture('rotated-wall')
    const xray=page.getByRole('button',{name:'Lát cắt X-ray',exact:true})
    if(await xray.count()){
     const before=await state();await xray.click();await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').view==='xray');await capture('xray')
     await xray.click();await page.waitForFunction(()=>JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').view==='walk');await capture('xray-exit')
     const after=await state();item.checks.push({name:'xray-position',pass:JSON.stringify(before.nav.position)===JSON.stringify(after.nav.position)},{name:'xray-look-yaw',pass:Math.abs(Math.atan2(Math.sin(before.camera.lookYaw-after.camera.lookYaw),Math.cos(before.camera.lookYaw-after.camera.lookYaw)))<.1,before:before.camera,after:after.camera})
    }
    const beforeReload=await state();await page.reload();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.readiness==='ready');await capture('reload')
    const afterReload=await state();item.checks.push({name:'reload-position',pass:JSON.stringify(beforeReload.nav.position)===JSON.stringify(afterReload.nav.position)})
    // Walk a full corridor approach through the shipped controls, rather than changing fixture coordinates.
    const controls=page.getByRole('button',{name:'Điều khiển bàn phím / 2D',exact:true});if(await controls.getAttribute('aria-expanded')==='false')await controls.click()
    const target=({'L1-A':'ROUTE_ENTRANCE_AIR','L1-B':'AIR_SURFACE_OPENING','L1-D':'STRUCT_LINK_12','L2-A':'STRUCT_LINK_23','L3-A':'STRUCT_LAYER_3'})[zone]
    const approach=page.locator(`.lw-alternatives [data-target="${target}"]`)
    if(await approach.count()){await approach.click();await page.waitForFunction(id=>document.querySelector('main.lw-root')?.getAttribute('data-arrived')===id,target,{timeout:30000});await capture('corner-approach')}
    item.checks.push({name:'crouch',pass:null,note:'Underground auto-crouch rig active by source; no independent crouch toggle exists. Contact QC remains open.'})
    if(process.env.LW_CAMERA_RETURN==='true'){
     const routes=({'L1-A':[['ENTRANCE_AIR','L1-B'],['AIR_ENTRANCE','L1-A']],'L1-B':[['AIR_ENTRANCE','L1-A'],['ENTRANCE_AIR','L1-B']],'L1-D':[['LAYER_MIDDLE','L2-A'],['LAYER_UP','L1-D']],'L2-A':[['LAYER_DEEP','L3-A'],['LAYER_BACK','L2-A']],'L3-A':[['LAYER_BACK','L2-A'],['LAYER_DEEP','L3-A']]})[zone]
     for(const [id,to] of routes){
      await page.keyboard.press('Escape');const close=page.locator('.lw-dialog .lw-close');if(await close.count())await close.click()
      const exits=page.locator('.lw-world-exits');if(!(await exits.evaluate(e=>e.open)))await exits.locator('summary').click()
      await exits.locator(`[data-target="ROUTE_${id}"]`).click();await page.getByRole('button',{name:'Tiếp tục qua điểm chuyển',exact:true}).click()
      await page.waitForFunction(to=>{try{return JSON.parse(document.querySelector('canvas')?.dataset.r2Zone??'{}').zone===to&&!document.querySelector('.lw-transfer')}catch{return false}},to)
     }
     await capture('return');item.checks.push({name:'return-zone',pass:(await state()).nav.zone===zone})
    }
   }
  }catch(error){item.error=error.stack;await page.screenshot({path:path.join(out,zone+'-FAILED.png')}).catch(()=>{})}
  finally{await context.close();await video?.saveAs(path.join(out,zone+'.webm'));results.cases.push(item);writeFileSync(path.join(out,'camera-diagnosis.json'),JSON.stringify(results,null,2))}
 }
}finally{await browser?.close();server.kill();writeFileSync(path.join(out,'camera-diagnosis.json'),JSON.stringify(results,null,2))}
console.log(JSON.stringify(results.cases.map(({zone,error,gpu})=>({zone,error,gpu}))))
if(results.cases.some(c=>c.error))process.exitCode=1
