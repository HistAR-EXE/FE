// tests/global.setup.ts
import { expect, test as setup } from '@playwright/test'
import { BE_URL } from './helpers/constants'

/**
 * Gate chạy trước mọi tầng: xác nhận BE Spring Boot đang sống ở :8080.
 * Nếu BE down, dừng sớm với thông báo rõ ràng thay vì để hàng loạt test fail mơ hồ.
 */
setup('backend health gate', async ({ request }) => {
    let reachable = false
    try {
        const res = await request.post(`${BE_URL}/api/auth/login`, {
            data: { email: '__healthcheck__@histar.vn', password: 'x' },
            failOnStatusCode: false,
            timeout: 8_000,
        })
        // BE sống nếu trả về bất kỳ HTTP nào (401/400 nghĩa là app đã lên, chỉ sai credential)
        reachable = res.status() > 0
    } catch {
        // FIX: Bỏ gán lại reachable = false ở đây để tránh lỗi no-useless-assignment của ESLint
    }

    expect(
        reachable,
        `Backend không phản hồi tại ${BE_URL}. Hãy chạy: cd BE && mvn spring-boot:run trước khi test.`,
    ).toBeTruthy()
})