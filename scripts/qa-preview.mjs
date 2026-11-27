import {spawn} from 'node:child_process'
import {openSync,closeSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

/** Optional lightweight transport for the same static build/API during Windows QA. */
export function spawnQaPreview(port,build){
 const fe=fileURLToPath(new URL('..',import.meta.url)),out=path.resolve(build)
 const native=process.env.LW_QA_STATIC_PREVIEW==='true'
 const executable=native?(process.env.LW_QA_PYTHON||'python'):process.execPath
 const args=native?[fileURLToPath(new URL('./qa_static_preview.py',import.meta.url)),out,String(port),'8096']:['node_modules/vite/bin/vite.js','preview','--outDir',out,'--host','127.0.0.1','--port',String(port),'--strictPort']
 if(!native&&process.env.LW_QA_SAME_ORIGIN_API==='true')args.push('--config',fileURLToPath(new URL('./qa-vite-same-origin.config.mjs',import.meta.url)))
 const fd=process.env.LW_QA_SERVER_LOG?openSync(process.env.LW_QA_SERVER_LOG,'a'):null
 const child=spawn(executable,args,{cwd:fe,windowsHide:true,stdio:fd===null?'ignore':['ignore',fd,fd],env:{...process.env,HISTAR_LOCAL_API_TARGET:'http://127.0.0.1:8096'}})
 if(fd!==null)child.once('exit',()=>closeSync(fd))
 return child
}
