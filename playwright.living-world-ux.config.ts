import {defineConfig} from '@playwright/test'
const buildArgs=process.env.LW_TEST_BUILD==='true'?' preview --outDir ../.superpowers/living-world-g2-demo':''
export default defineConfig({
 testDir:'./tests/living-world',testMatch:'ux.spec.ts',workers:1,retries:0,timeout:90000,
 outputDir:'./test-results/living-world-ux',reporter:[['list']],
 use:{baseURL:'http://127.0.0.1:5204',viewport:{width:1365,height:900},screenshot:'only-on-failure',video:'on',launchOptions:{args:['--enable-unsafe-swiftshader']}},
 webServer:{command:`node node_modules/vite/bin/vite.js${buildArgs} --host 127.0.0.1 --port 5204 --strictPort`,env:{VITE_LIVING_WORLD_INTERNAL:'true',VITE_API_URL:''},url:'http://127.0.0.1:5204',reuseExistingServer:false,timeout:60000},
})
