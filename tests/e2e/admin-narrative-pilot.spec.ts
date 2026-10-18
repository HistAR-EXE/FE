import { expect, test } from '@playwright/test'
import { DISPOSABLE_ADMIN, expectAdminPage, mockAdminApi, seedAdminSession } from '../helpers/admin-fixtures'

test('disposable narrative pilot supports draft, review, readiness, and audit entry points', async ({ page }) => {
  await seedAdminSession(page)
  await mockAdminApi(page)
  await page.goto('/admin/narrative-pilots')
  await expectAdminPage(page, 'Pilot cốt truyện')
  await page.getByRole('button', { name: 'Cốt truyện E2E dùng một lần' }).click()
  await expect(page.getByRole('tab', { name: 'Độ sẵn sàng' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Sơ đồ' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Nguồn & trích dẫn' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Phần thưởng & kết thúc' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Lịch sử' })).toBeVisible()

  await page.getByRole('button', { name: 'Tạo bản nháp' }).click()
  await expect(page.getByText('Phiên bản đã phát hành — · Bản nháp v1')).toBeVisible()
  await page.getByRole('tab', { name: 'Độ sẵn sàng' }).click()
  await page.getByLabel('Ghi chú review (tối thiểu 10 ký tự)').fill('Đã kiểm tra nguồn E2E')
  await page.getByRole('button', { name: 'Duyệt tiếng Việt' }).click()
  await expect(page.getByText('Đã duyệt draft tiếng Việt.', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nhật ký Audit' })).toHaveAttribute('href', '/admin/audit')
  expect(DISPOSABLE_ADMIN.questId).toBe('histar-e2e-narrative')
})
