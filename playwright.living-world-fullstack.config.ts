import {defineConfig} from '@playwright/test'
const buildArgs=process.env.LW_TEST_BUILD==='true'?' preview --outDir ../.superpowers/living-world-g2-demo':''
import base from './playwright.living-world.config'
export default defineConfig({...base,testMatch:'fullstack.spec.ts',webServer:{command:`node node_modules/vite/bin/vite.js${buildArgs} --host 127.0.0.1 --port 5194 --strictPort`,env:{VITE_LIVING_WORLD_INTERNAL:'true',VITE_API_URL:'',HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8089'},url:'http://127.0.0.1:5194',reuseExistingServer:false,timeout:60000}})
