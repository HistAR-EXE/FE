import {expect,type Page} from '@playwright/test'
/** P2 · Bước lên máy (FINAL Baseline 8.2): on the console's time axis choose 01/1967, then the Bến Dược reference site;
 *  Kha's limits statement appears and only then the departure control. Remembered choice → already at the confirm step. */
export async function chooseEra(page:Page){
 const go=page.getByRole('button',{name:'Bước vào bối cảnh tái dựng',exact:true})
 const p2=page.getByRole('group',{name:'Trục thời gian'});await expect(p2).toBeVisible()
 const current=p2.locator('li[aria-current="step"]');await expect(current).toHaveCount(1)
 const stage=await current.innerText()
 if(stage==='Mốc thời gian'){
  await expect(p2.getByRole('button',{name:/^1948/})).toBeDisabled()
  await expect(go).toHaveCount(0) // no departure before an era and a site are chosen
  await p2.getByRole('button',{name:/^01\/1967/}).click()
 }
 if(stage!=='Xác nhận'){
  await expect(go).toHaveCount(0)
  await expect(p2.locator('.lw-p2-picked')).toContainText('01/1967')
  await p2.getByRole('button',{name:/^Bến Dược/}).click()
 }
 await expect(current).toHaveText('Xác nhận')
 await expect(p2.locator('.lw-p2-picked')).toContainText('01/1967')
 await expect(p2.locator('.lw-p2-picked')).toContainText('Bến Dược')
 await expect(p2.getByText(/không đại diện cho mọi nơi hay mọi sự kiện/)).toBeVisible()
 await expect(go).toBeVisible()
}
