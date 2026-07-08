import { test, expect } from '@playwright/test'
import { loginAsAdmin, setB2cPremiumPrice, getAdminBillingSettings } from '../helpers/monetization'
import { registerFreshUser } from '../helpers/api'
import { seedSession } from '../helpers/session'

test.describe('E2E · SePay checkout real (non-mock)', () => {
  test('SEPAY-E2E-01: B2C checkout shows dynamic QR amount from BE', async ({ page, request }) => {
    const user = await registerFreshUser(request)
    await seedSession(page, user, { mode: 'online' })
    await page.goto('/checkout/b2c?next=/settings')

    await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()

    const errorToast = page.getByText(/SePay chưa|chưa được cấu hình/i)
    if (await errorToast.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, 'SePay chưa được enable trên backend')
    }

    await expect(page.getByText(/Mã thanh toán:/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/49\.000|49000/i).first()).toBeVisible()

    const qrImg = page.locator('img[alt*="SePay QR"]')
    await expect(qrImg).toBeVisible()
    const src = await qrImg.getAttribute('src')
    expect(src).toMatch(/amount=49000|amount=49/)
  })

  test('SEPAY-E2E-02: admin price change reflects on B2C checkout QR', async ({ page, request }) => {
    const admin = await loginAsAdmin(request)
    const before = await getAdminBillingSettings(request, admin.token)
    const dynamicPrice = before.b2cPremiumPriceVnd === 59_000 ? 58_000 : 59_000

    try {
      await setB2cPremiumPrice(request, admin.token, dynamicPrice)
      const user = await registerFreshUser(request)
      await seedSession(page, user, { mode: 'online' })
      await page.goto('/checkout/b2c')

      await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()

      if (await page.getByText(/SePay chưa|chưa được cấu hình/i).isVisible({ timeout: 3_000 }).catch(() => false)) {
        test.skip(true, 'SePay chưa được enable trên backend')
      }

      const formatted = dynamicPrice.toLocaleString('vi-VN')
      await expect(page.getByText(new RegExp(formatted.replace(/\./g, '\\.'))).first()).toBeVisible({
        timeout: 20_000,
      })
      const qrImg = page.locator('img[alt*="SePay QR"]')
      const src = await qrImg.getAttribute('src')
      expect(src).toContain(`amount=${dynamicPrice}`)
    } finally {
      await setB2cPremiumPrice(request, admin.token, before.b2cPremiumPriceVnd)
    }
  })

  test('SEPAY-E2E-03: B2B STANDARD checkout shows 15M QR', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await seedSession(page, teacher, { mode: 'online' })
    await page.goto('/checkout/b2b?plan=STANDARD')

    await page.getByPlaceholder('THPT Nguyễn Du').fill(`THPT Real SePay ${Date.now()}`)
    await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()

    if (await page.getByText(/SePay chưa|chưa được cấu hình/i).isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, 'SePay chưa được enable trên backend')
    }

    await expect(page.locator('p').filter({ hasText: /^Số tiền:/ })).toContainText('15.000.000', {
      timeout: 20_000,
    })
    const src = await page.locator('img[alt*="SePay QR"]').getAttribute('src')
    expect(src).toMatch(/amount=15000000/)
  })

  test('SEPAY-E2E-04: B2B PREMIUM checkout shows 25M QR', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await seedSession(page, teacher, { mode: 'online' })
    await page.goto('/checkout/b2b?plan=PREMIUM')

    await page.getByPlaceholder('THPT Nguyễn Du').fill(`THPT Premium SePay ${Date.now()}`)
    await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()

    if (await page.getByText(/SePay chưa|chưa được cấu hình/i).isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, 'SePay chưa được enable trên backend')
    }

    await expect(page.locator('p').filter({ hasText: /^Số tiền:/ })).toContainText('25.000.000', {
      timeout: 20_000,
    })
    const src = await page.locator('img[alt*="SePay QR"]').getAttribute('src')
    expect(src).toMatch(/amount=25000000/)
  })

  test('SEPAY-E2E-05: B2B MICRO checkout shows 8M QR', async ({ page, request }) => {
    const teacher = await registerFreshUser(request)
    await seedSession(page, teacher, { mode: 'online' })
    await page.goto('/checkout/b2b?plan=MICRO')

    await page.getByPlaceholder('THPT Nguyễn Du').fill(`THPT Micro SePay ${Date.now()}`)
    await page.getByRole('button', { name: /Tạo thanh toán SePay/i }).click()

    if (await page.getByText(/SePay chưa|chưa được cấu hình/i).isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(true, 'SePay chưa được enable trên backend')
    }

    await expect(page.locator('p').filter({ hasText: /^Số tiền:/ })).toContainText('8.000.000', {
      timeout: 20_000,
    })
    const src = await page.locator('img[alt*="SePay QR"]').getAttribute('src')
    expect(src).toMatch(/amount=8000000/)
  })
})
