import {defineConfig} from '@playwright/test'
import continuity from './playwright.continuity.config'
export default defineConfig({...continuity,testMatch:['slice.spec.ts','ux.spec.ts'],
 reporter:[['list'],['json',{outputFile:'../docs/superpowers/m1/2026-11-02-continuity-proof/evidence/regression-results.json'}]],
 outputDir:'./test-results/continuity-regression',use:{...continuity.use,video:'off'},
})
