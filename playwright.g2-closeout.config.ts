import {defineConfig} from '@playwright/test'
// G2 closeout: guest-mode continuity gaps + existing guest regression specs against a built preview.
// LW_BUILD_DIR selects the build (default: the frozen demo build); CHROME_EXE is only for sandboxes without Playwright's own browser.
const port=Number(process.env.LW_TEST_PORT||5195),outDir=process.env.LW_BUILD_DIR||'../.superpowers/living-world-g2-demo'
export default defineConfig({
 testDir:'./tests/living-world',testMatch:['g2-closeout.spec.ts','slice.spec.ts','ux.spec.ts'],workers:1,retries:0,timeout:180000,
 reporter:[['list'],['json',{outputFile:process.env.LW_REPORT||'test-results/g2-closeout/results.json'}]],
 outputDir:'./test-results/g2-closeout',
 use:{baseURL:`http://127.0.0.1:${port}`,viewport:{width:1440,height:960},serviceWorkers:'block',video:'off',screenshot:'only-on-failure',trace:'retain-on-failure',launchOptions:{args:['--enable-unsafe-swiftshader'],...(process.env.CHROME_EXE?{executablePath:process.env.CHROME_EXE}:{})}},
 webServer:{command:`node node_modules/vite/bin/vite.js preview --outDir ${outDir} --host 127.0.0.1 --port ${port} --strictPort`,env:{HISTAR_LOCAL_API_TARGET:process.env.HISTAR_LOCAL_API_TARGET||'http://127.0.0.1:8089'},url:`http://127.0.0.1:${port}`,reuseExistingServer:false,timeout:60000},
})
