import {defineConfig} from '@playwright/test'
import config from './playwright.billing.config'
export default defineConfig({...config,testMatch:'consent.spec.ts',outputDir:'test-results/consent'})
