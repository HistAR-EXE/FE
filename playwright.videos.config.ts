import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
 testDir:'./tests/ui', testMatch:'explore-videos.spec.ts', workers:1, retries:0,
 outputDir:'./test-results/explore-video-ui', reporter:[['list']],
 timeout:90000, expect:{timeout:30000},
 use:{...devices['Desktop Chrome'],channel:'msedge',reducedMotion:'reduce',baseURL:'http://127.0.0.1:5190',screenshot:'only-on-failure'},
 webServer:{command:'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5190 --strictPort',url:'http://127.0.0.1:5190',reuseExistingServer:true,timeout:120000},
})

