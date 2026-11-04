import {chromium} from '@playwright/test'
import {writeFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']})
try{
 const page=await browser.newPage({viewport:{width:1365,height:900}}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.goto('http://127.0.0.1:5194/login')
 await page.getByTestId('consent-decline').click()
 await page.locator('input[name="email"]').fill('g2-demo@timelens.local')
 // Publicly documented synthetic localhost-only demo credential; never used outside the isolated G2 DB.
 await page.locator('input[name="password"]').fill('TimeLens-G2-Local!2026')
 await page.getByRole('button',{name:/Đăng Nhập Ngay/}).click()
 await page.waitForFunction(()=>Boolean(localStorage.getItem('timelens_token')))
 await page.goto('http://127.0.0.1:5194/living-world?debug=1')
 await page.getByText('Bản thử tài khoản',{exact:false}).waitFor()
 const state=await page.evaluate(async()=>{
  const r=await fetch('/api/v2/worlds/cuchi-mach-song/state',{headers:{Authorization:'Bearer '+localStorage.getItem('timelens_token')}})
  const body=await r.json();return{httpStatus:r.status,revision:body.data?.revision,factCount:body.data?.facts?.length}
 })
 if(state.httpStatus!==200||errors.length)throw new Error(JSON.stringify({state,errors}))
 await page.screenshot({path:'../docs/superpowers/g2/2026-11-01-living-world/evidence/demo-ready.png',fullPage:true})
 writeFileSync('../docs/superpowers/g2/2026-11-01-living-world/evidence/demo-ready.json',JSON.stringify({scope:'Actual UI login on minified internal preview build; synthetic demo account only; no human study inference',url:'http://127.0.0.1:5194/living-world?debug=1',state,pageErrors:errors},null,2))
 console.log('PASS: demo UI login, local API proxy and authenticated world state on the built preview. No user-study gate inferred.')
}finally{await browser.close()}
