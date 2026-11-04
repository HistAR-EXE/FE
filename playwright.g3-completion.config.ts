import {defineConfig} from '@playwright/test'
const output=process.env.LW_EVIDENCE_DIR??'../docs/superpowers/m1/g3-g4-completion/evidence/wp03/'
const guest=process.env.LW_SUITE==='guest'
export default defineConfig({
 testDir:'./tests/living-world',
 testMatch:guest?['g2-closeout.spec.ts','slice.spec.ts','ux.spec.ts']:['continuity.spec.ts','fullstack.spec.ts','g2-closeout-fullstack.spec.ts'],
 workers:1,retries:0,timeout:180000,
 reporter:[['list'],['json',{outputFile:output+(guest?'guest':'fullstack')+'-results.json'}]],
 outputDir:output+(guest?'guest':'fullstack')+'-artifacts',
 use:{baseURL:'http://127.0.0.1:5398',viewport:{width:1440,height:960},serviceWorkers:'block',video:'on',screenshot:'only-on-failure',trace:'on',channel:'chrome',headless:false,launchOptions:{args:['--ignore-gpu-blocklist']}},
 webServer:{command:`node node_modules/vite/bin/vite.js preview --outDir ${process.env.LW_BUILD_DIR??'../.superpowers/living-world-g3-completion-r2'} --host 127.0.0.1 --port 5398 --strictPort`,env:{HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8094'},url:'http://127.0.0.1:5398',reuseExistingServer:false,timeout:60000},
})
