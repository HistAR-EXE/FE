import { expect, test } from '@playwright/test'
import { DISPOSABLE_ADMIN, expectAdminPage, mockAdminApi, seedAdminSession } from '../helpers/admin-fixtures'

test('disposable content follows soft-delete, trash, restore, and audit lifecycle', async ({ page }) => {
  await seedAdminSession(page)
  await mockAdminApi(page)
  await page.goto('/admin/content')
  await expectAdminPage(page, 'Quản lý Nội dung khám phá')
  await expect(page.getByText('Nội dung E2E dùng một lần')).toBeVisible()
  await page.getByRole('button', { name: 'Xóa' }).click()
  await expect(page.getByRole('heading', { name: /Xóa mềm:/ })).toBeVisible()
  await page.getByRole('button', { name: 'Xác nhận xóa mềm' }).click()

  await page.goto('/admin/trash')
  await expectAdminPage(page, 'Thùng rác hệ thống & Khôi phục dữ liệu')
  await expect(page.getByText('Nội dung E2E dùng một lần')).toBeVisible()
  await page.getByRole('button', { name: 'Khôi phục' }).click()
  await page.getByRole('button', { name: 'Xác nhận khôi phục' }).click()
  await expect(page.getByText('Thùng rác trống')).toBeVisible()

  await page.goto(`/admin/audit?entityId=${DISPOSABLE_ADMIN.contentId}`)
  await expectAdminPage(page, 'Nhật ký kiểm toán & Giám sát tuân thủ')
  await expect(page.getByText(DISPOSABLE_ADMIN.contentId)).toBeVisible()
})
