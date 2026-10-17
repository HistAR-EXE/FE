import { expect, test } from '@playwright/test'
import { DISPOSABLE_ADMIN, expectAdminPage, mockAdminApi, seedAdminSession } from '../helpers/admin-fixtures'

test.beforeEach(async ({ page }) => {
  await seedAdminSession(page)
  await mockAdminApi(page)
})

test('admin landing exposes approved navigation and dashboard permissions', async ({ page }) => {
  await page.goto('/admin')
  await expectAdminPage(page, 'Bàn điều hành')
  const navigation = page.getByRole('navigation', { name: 'Điều hướng quản trị' })
  await expect(navigation.getByRole('link', { name: 'Nội dung' })).toHaveAttribute('href', '/admin/content')
  await expect(navigation.getByRole('link', { name: 'Pilot cốt truyện' })).toHaveAttribute('href', '/admin/narrative-pilots')
  await expect(navigation.getByRole('link', { name: 'Thùng rác' })).toHaveAttribute('href', '/admin/trash')
  await expect(navigation.getByRole('link', { name: 'Thanh toán & CRM' })).toHaveAttribute('href', '/admin/billing')
  await expect(navigation.getByRole('link', { name: 'Nhật ký kiểm toán' })).toHaveAttribute('href', '/admin/audit')
})

test('non-admin session cannot enter the admin console', async ({ page }) => {
  await seedAdminSession(page, 'USER')
  await mockAdminApi(page, 'USER')
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/home$/)
})

test('billing route keeps payment channel filter and CSV export wired', async ({ page }) => {
  await page.goto('/admin/billing')
  await expectAdminPage(page, 'Thanh toán & CRM')
  await expect(page.getByRole('combobox', { name: 'Kênh giao dịch' })).toBeVisible()
  const exportResponse = page.waitForResponse((response) => response.url().includes('/api/admin/billing/payments/export.csv'))
  await page.getByRole('button', { name: 'Xuất đối soát CSV' }).click()
  await expect((await exportResponse).status()).toBe(200)
  await page.getByRole('combobox', { name: 'Kênh giao dịch' }).selectOption('B2C')
  await expect(page).toHaveURL(/channel=B2C/)
  await expect(page.getByText('HISTAR-E2E-PAYMENT')).toBeVisible()
  expect(DISPOSABLE_ADMIN.paymentId).toBe('histar-e2e-payment')
})
