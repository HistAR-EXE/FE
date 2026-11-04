import {defineConfig} from '@playwright/test'
// G2 closeout full-stack run. Expects the frontend preview on 5194 (proxy → backend 8089) and the local QA
// PostgreSQL container already running; writes all outputs under LW_EVIDENCE_DIR, never over earlier proof evidence.
const evidence=process.env.LW_EVIDENCE_DIR??'../docs/superpowers/g2/2026-11-02-g2-closeout/evidence/'
export default defineConfig({
 testDir:'./tests/living-world',testMatch:['continuity.spec.ts','fullstack.spec.ts','g2-closeout-fullstack.spec.ts'],workers:1,retries:0,timeout:180000,
 reporter:[['list'],['json',{outputFile:evidence+'fullstack-results.json'}]],
 outputDir:'./test-results/g2-closeout-fullstack',
 use:{serviceWorkers:'block',baseURL:process.env.LW_BASE_URL??'http://127.0.0.1:5194',viewport:{width:1440,height:960},video:'on',screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{args:['--enable-unsafe-swiftshader']}},
})
