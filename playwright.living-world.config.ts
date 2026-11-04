import {defineConfig} from '@playwright/test'
const buildArgs=process.env.LW_TEST_BUILD==='true'?' preview --outDir ../.superpowers/living-world-g2-demo':''
const port=Number(process.env.LW_TEST_PORT||5194)
export default defineConfig({
 testDir:'./tests/living-world',testMatch:'slice.spec.ts',workers:1,retries:0,timeout:90000,reporter:[['list']],
 outputDir:'./test-results/living-world',
 use:{baseURL:`http://127.0.0.1:${port}`,viewport:{width:1365,height:900},screenshot:'only-on-failure',video:'retain-on-failure',launchOptions:{args:['--enable-unsafe-swiftshader']}},
 webServer:{command:`node node_modules/vite/bin/vite.js${buildArgs} --host 127.0.0.1 --port ${port} --strictPort`,env:{VITE_LIVING_WORLD_INTERNAL:'true'},url:`http://127.0.0.1:${port}`,reuseExistingServer:false,timeout:60000},
})
