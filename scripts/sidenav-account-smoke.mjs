import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});
 const response=await page.request.post('http://localhost:5173/api/auth/login',{data:{email:'premium@histar.vn',password:'Demo@2026'}});
 assert.equal(response.status(),200);
 const {data}=await response.json();
 await page.addInitScript(data=>{
  for(const [key,value] of Object.entries({timelens_token:data.accessToken||data.token,timelens_user_id:data.userId,timelens_display_name:data.displayName,timelens_email_verified:'1',sidenav_collapsed:'false',histar_consent_v1:JSON.stringify({analytics:false,camera:false,gps:false})})) localStorage.setItem(key,value);
 },data);
 await page.goto('http://localhost:5173/diorama/cu-chi',{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:/Tái hiện lịch sử/}).waitFor();
 const sidebar=page.locator('aside:visible');
 await sidebar.getByRole('button',{name:'Mở tài khoản cá nhân'}).waitFor({timeout:5000});
 assert.equal(await sidebar.getByText('Bắt đầu hành trình',{exact:true}).count(),0);
 const logo=sidebar.getByAltText('TimeLens Logo');
 assert.equal(await logo.evaluate(img=>img.closest('a')?.getAttribute('href')??null),'/','sidebar brand links to public homepage');
 assert.equal(await logo.evaluate(img=>getComputedStyle(img).objectFit),'contain');
 assert.equal(await logo.evaluate(img=>getComputedStyle(img).borderRadius),'0px');
 const slogan=sidebar.getByText('Relive History, Reshape Heritage',{exact:true});
 assert.equal(await slogan.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
 assert.notEqual(await slogan.evaluate(el=>getComputedStyle(el).textOverflow),'ellipsis');
 assert.equal(await slogan.evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap');
 for(const height of [520,600,720,900]) {
  await page.setViewportSize({width:1280,height});
  await page.waitForFunction(height=>Math.abs(document.querySelector('aside').getBoundingClientRect().height-height)<1,height);
  const metrics=await sidebar.locator('.custom-scrollbar').evaluate(el=>({scroll:el.scrollHeight,available:el.clientHeight}));
  console.log('NAV_HEIGHT',height,metrics);
  assert.ok(metrics.scroll<=metrics.available,`Sidebar should fit at height ${height}`);
  assert.equal(await slogan.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
 }
 await page.setViewportSize({width:1280,height:800});
 await page.waitForFunction(()=>Math.abs(document.querySelector('aside').getBoundingClientRect().height-800)<1);
 await page.screenshot({path:'test-results/sidenav-compact-spacing.png',fullPage:false});

 const selected=sidebar.getByRole('link',{name:/Tái hiện lịch sử/});
 assert.equal(await selected.evaluate(el=>getComputedStyle(el).borderLeftWidth),'3px');
 assert.equal(await selected.evaluate(el=>getComputedStyle(el).borderRightWidth),'0px');
 const account=page.getByRole('button',{name:'Mở tài khoản cá nhân'});
 const menu=page.getByRole('navigation',{name:'Liên kết tài khoản'});
 await account.click(); await menu.waitFor();
 for(const height of [520,600,720,900]) {
  await page.keyboard.press('Escape');await page.setViewportSize({width:1280,height});await account.click();await menu.waitFor();
  const panel=page.locator('[id='+JSON.stringify(await account.getAttribute('aria-controls'))+']');
  const metrics=await panel.evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom}));
  assert.ok(metrics.scroll<=metrics.height,`account panel should need no scroll at ${height}`);
  assert.ok(metrics.top>=8&&metrics.bottom<=height,`account panel fits viewport ${height}`);
 }
 await page.keyboard.press('Escape');await page.setViewportSize({width:1280,height:800});await account.click();await menu.waitFor();
 for(const [label,path] of [['Hồ sơ cá nhân','/profile'],['Cài đặt','/settings'],['Ảnh & chia sẻ','/photo-frame'],['Gói dịch vụ','/pricing']]) assert.equal(await menu.getByRole('link',{name:new RegExp(label)}).getAttribute('href'),path);
 for(const label of ['Tổng kết hành trình','Nhóm học tập','Biệt đội của tôi']) assert.equal(await menu.getByRole('link',{name:label,exact:true}).count(),0);
 assert.equal(await menu.getByRole('link',{name:'Cổng quản trị',exact:true}).count(),0);
 await page.keyboard.press('Escape'); assert.equal(await menu.count(),0); assert.equal(await account.evaluate(el=>el===document.activeElement),true);
 await account.click(); await page.getByRole('heading',{name:/Tái hiện lịch sử/}).click(); assert.equal(await menu.count(),0);
 await account.click(); await menu.getByRole('link',{name:/Hồ sơ cá nhân/}).click(); await page.waitForURL('**/profile');
 await page.getByRole('heading',{name:'Hồ sơ của bạn.'}).waitFor();
 await account.click(); await menu.getByRole('link',{name:/Cài đặt/}).click(); await page.waitForURL('**/settings');
 await page.getByRole('heading',{name:'Cài đặt.'}).waitFor();
 assert.equal(await menu.count(),0);
 await account.click(); await page.screenshot({path:'test-results/sidenav-account-expanded.png',fullPage:false});
 await page.keyboard.press('Escape'); await sidebar.getByTitle('Thu gọn thanh bên',{exact:true}).click();
 await account.click(); await menu.waitFor();
 let box=await menu.boundingBox(); assert.ok(box.x>=80 && box.x+box.width<=1280);
 await page.screenshot({path:'test-results/sidenav-account-collapsed.png',fullPage:false});
 await page.setViewportSize({width:900,height:700});
 await account.click(); await menu.waitFor();
 box=await menu.boundingBox(); assert.ok(box.x>=80 && box.x+box.width<=900);
 await page.screenshot({path:'test-results/sidenav-account-tablet.png',fullPage:false});
 await page.setViewportSize({width:1280,height:520});
 await sidebar.getByTitle('Mở rộng thanh bên',{exact:true}).click();
 await account.click(); await menu.waitFor();
 box=await page.locator('[id='+JSON.stringify(await account.getAttribute('aria-controls'))+']').boundingBox(); assert.ok(box.y>=64 && box.y+box.height<=520);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'test-results/sidenav-account-short.png',fullPage:false});
 await page.keyboard.press('Escape');
 await sidebar.getByRole('link',{name:'TimeLens - Về trang chủ',exact:true}).click();
 await page.waitForURL(url=>url.pathname==='/');
 await page.goBack();await page.waitForURL('**/settings');
 await account.click();await menu.waitFor();
 await sidebar.getByRole('button',{name:/Đăng xuất/}).click();
 console.log('AFTER_LOGOUT',page.url(),await page.evaluate(()=>({hasToken:!!localStorage.getItem('timelens_token')})));
 await page.waitForURL(url=>url.pathname==='/login',{waitUntil:'domcontentloaded'});
 assert.equal(await page.evaluate(()=>localStorage.getItem('timelens_token')),null);
 console.log('PASS: homepage logo, no-scroll menu520–900, logout, profile/settings navigation, all personal links, close/focus, left highlight, full logo/slogan, expanded/collapsed/tablet/short layouts');
} finally {await browser.close()}
