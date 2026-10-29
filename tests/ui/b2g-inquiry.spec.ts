import { expect, test } from '@playwright/test'

test('guest can send a free-text pilot-site consultation request', async ({ page }) => {
  let payload: Record<string, unknown> | null = null
  await page.route('**/api/billing/b2b2c-inquiry', async (route) => {
    payload = route.request().postDataJSON() as Record<string, unknown>
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { id: '11111111-1111-1111-1111-111111111111', status: 'NEW', createdAt: new Date().toISOString() } }),
    })
  })

  await page.goto('/checkout/b2b2c')
  await expect(page.getByRole('heading', { name: /Gửi Nhu Cầu Tư Vấn Số Hóa Di Sản/i })).toBeVisible()
  await expect(page.getByTestId('b2b2c-interest-site')).toHaveJSProperty('tagName', 'INPUT')
  await page.getByLabel(/Tên đơn vị \/ cơ quan/i).fill('Ban quản lý di tích Hà Nội')
  await page.getByTestId('b2b2c-interest-site').fill('Khu di tích Nhà tù Hỏa Lò')
  await page.getByLabel(/Họ Tên Người Liên Hệ/i).fill('Nguyễn Thị Lan')
  await page.getByLabel(/Địa Chỉ Email/i).fill('lan@example.vn')
  await page.getByLabel(/Tư liệu số hiện có/i).fill('Ảnh tư liệu, bản đồ')
  await page.getByRole('button', { name: /Gửi Yêu Cầu Khảo Sát/i }).click()

  await expect(page.getByRole('heading', { name: /Gửi Yêu Cầu Thành Công/i })).toBeVisible()
  await expect(page.getByText('11111111-1111-1111-1111-111111111111')).toBeVisible()
  expect(payload).toMatchObject({
    organizationName: 'Ban quản lý di tích Hà Nội',
    siteName: 'Khu di tích Nhà tù Hỏa Lò',
    availableMaterials: 'Ảnh tư liệu, bản đồ',
    packageType: 'UNDECIDED',
  })
})
