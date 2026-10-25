import { expect, test as setup } from '@playwright/test'

setup('live backend is healthy before full-stack gates run', async ({ request }) => {
  const response = await request.get('/api/health')
  expect(response.ok(), await response.text()).toBe(true)
  await expect(response.json()).resolves.toMatchObject({ success: true })
})
