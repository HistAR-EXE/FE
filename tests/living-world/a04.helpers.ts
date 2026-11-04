import type {Page} from '@playwright/test'
export async function prepareA04(page:Page){
 await page.getByRole('button',{name:'Thử phối hợp',exact:true}).click()
 await page.getByRole('button',{name:'Sẵn sàng · đến lượt tôi',exact:true}).click()
}
export async function releaseA04(page:Page,side:'LEFT'|'RIGHT'){
 if(!await page.getByRole('button',{name:'Nắm chày',exact:true}).count())await prepareA04(page)
 await page.getByRole('button',{name:'Nắm chày',exact:true}).click()
 await page.getByRole('button',{name:'Nâng chày',exact:true}).click()
 const details=page.locator('.lw-dialog details');if(await details.getAttribute('open')===null)await details.locator('summary').click()
 await page.getByRole('button',{name:side==='LEFT'?'Giã bên trái':'Giã bên phải',exact:true}).click()
}
