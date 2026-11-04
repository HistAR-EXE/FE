import {defineConfig} from '@playwright/test'
import base from './playwright.g2-closeout.config'
export default defineConfig({...base,testMatch:['g3-correction.spec.ts'],use:{...base.use,video:'on',launchOptions:{channel:'chrome'}}})
