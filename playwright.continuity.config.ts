import {defineConfig} from '@playwright/test'
export default defineConfig({
 testDir:'./tests/living-world',testMatch:'continuity.spec.ts',workers:1,retries:0,timeout:180000,
 reporter:[['list'],['json',{outputFile:'../docs/superpowers/m1/2026-11-02-continuity-proof/evidence/browser-results.json'}]],
 outputDir:'./test-results/continuity',
 use:{serviceWorkers:'block',baseURL:'http://127.0.0.1:5194',viewport:{width:1440,height:960},video:'on',screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{args:['--enable-unsafe-swiftshader']}},
})
