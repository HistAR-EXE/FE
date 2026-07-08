import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SepayWebhookPayload } from './sepay'

const contractsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/contracts')

export function loadContract<T>(name: string): T {
  const file = path.join(contractsDir, name)
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T
}

export function sepayWebhookFixture(overrides: Partial<SepayWebhookPayload> = {}): SepayWebhookPayload {
  const base = loadContract<SepayWebhookPayload>('sepay-webhook.json')
  return { ...base, ...overrides }
}

export const CONTRACT_FIXTURES = {
  sepayWebhook: 'sepay-webhook.json',
  geminiError429: 'gemini-error-429.json',
  googleInvalidToken: 'google-invalid-token.json',
  googleTestIdToken: 'google-test-id-token.json',
} as const

export const CONTRACT_LAST_VERIFIED = '2026-07-08'
