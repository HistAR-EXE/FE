import { expect } from '@playwright/test'

type ApiLike = { ok(): boolean; status(): number; json(): Promise<unknown>; text(): Promise<string> }

/** Assert HTTP status without requiring 2xx unwrap. */
export async function expectStatus(res: ApiLike, status: number) {
  expect(res.status(), `expected HTTP ${status}`).toBe(status)
}

/** Assert API error response (non-2xx) with optional message substring. */
export async function expectApiError(res: ApiLike, status: number, messageIncludes?: string) {
  expect(res.status(), `expected HTTP ${status}`).toBe(status)
  if (messageIncludes) {
    const bodyText = await res.text()
    expect(bodyText.toLowerCase()).toContain(messageIncludes.toLowerCase())
  }
}

/** Parse `{ success, data, message }` without asserting ok. */
export async function parseBody<T = unknown>(res: ApiLike): Promise<{ success?: boolean; data?: T; message?: string }> {
  const text = await res.text()
  try {
    return JSON.parse(text) as { success?: boolean; data?: T; message?: string }
  } catch {
    return { message: text }
  }
}
