import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const browser = await chromium.launch({channel:'msedge',headless:true})
try {
  const page = await browser.newPage()
  await page.goto('http://localhost:5173/tests/fixtures/heritage-studio-harness.html')
  const result = await page.evaluate(async () => {
    const { exportOriginalPhoto } = await import('/src/features/photo-flow/originalPhoto.ts')
    const canvas = document.createElement('canvas'); canvas.width=300; canvas.height=100
    const ctx = canvas.getContext('2d'); ctx.fillStyle='#ff0000';ctx.fillRect(0,0,100,100);ctx.fillStyle='#204060';ctx.fillRect(100,0,100,100);ctx.fillStyle='#00ff00';ctx.fillRect(200,0,100,100)
    const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png'))
    const file = new File([blob],'source.png',{type:'image/png'})
    const inspect = async output => {const image=await createImageBitmap(output);const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const x=c.getContext('2d');x.drawImage(image,0,0);image.close();return {width:c.width,height:c.height,center:[...x.getImageData(c.width/2,c.height/2,1,1).data],left:[...x.getImageData(10,c.height/2,1,1).data],top:[...x.getImageData(c.width/2,10,1,1).data]}}
    const square=await inspect(await exportOriginalPhoto(file,'square',{boost:0,tunnelGrade:false}))
    const story=await inspect(await exportOriginalPhoto(file,'story',{boost:0,tunnelGrade:false}))
    const brighter=await inspect(await exportOriginalPhoto(file,'square',{boost:1,tunnelGrade:false}))
    const frame=document.createElement('canvas');frame.width=100;frame.height=100;const f=frame.getContext('2d');f.fillStyle='#ffff00';f.fillRect(0,0,100,5)
    const framed=await inspect(await exportOriginalPhoto(file,'square',{boost:0,tunnelGrade:false},frame.toDataURL()))
    let rejects=false;try{await exportOriginalPhoto(file,'square',{boost:0,tunnelGrade:false},'data:image/png;base64,broken')}catch{rejects=true}
    return {square,story,brighter,framed,rejects}
  })
  assert.deepEqual([result.square.width,result.square.height],[1080,1080])
  assert.deepEqual([result.story.width,result.story.height],[1080,1920])
  assert.deepEqual(result.square.center,[32,64,96,255]);assert.deepEqual(result.square.left,[32,64,96,255]);assert.deepEqual(result.story.left,[32,64,96,255])
  assert.ok(result.brighter.center[0]>result.square.center[0]);assert.deepEqual(result.framed.top,[255,255,0,255]);assert.ok(result.rejects)
  console.log(JSON.stringify({passed:true,checks:['square/story full-resolution center crop','grade applied to exported pixels','frame overlay present in saved pixels','broken frame rejects export instead of uploading raw source']},null,2))
} finally {await browser.close()}
