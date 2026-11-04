import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve,dirname,sep} from 'node:path'
import {createHash} from 'node:crypto'
const root=resolve('public/audio/time-portal/narration-v1'),manifest=JSON.parse(readFileSync('media-r2-manifest.json','utf8'))
const selected=manifest.files.filter(f=>/^audio\/time-portal\/narration-v1\/[a-zA-Z0-9-]+\.mp3$/.test(f.key))
if(!selected.length)throw new Error('No approved narration fixture entries')
const rows=[]
for(const file of selected){
 const target=resolve('public',file.key);if(!target.startsWith(root+sep))throw new Error('Invalid fixture path')
 let bytes,status
 if(existsSync(target)){bytes=readFileSync(target);status='EXISTING_HASH_CHECKED'}
 else{const r=await fetch('https://media.timelens.asia/'+file.key,{signal:AbortSignal.timeout(30000)});if(r.status!==200)throw new Error(`${file.key}: ${r.status}`);bytes=Buffer.from(await r.arrayBuffer());status='RESTORED_FROM_EXISTING_PROJECT_CDN'}
 const hash=createHash('sha256').update(bytes).digest('hex')
 if(hash!==file.sha256||bytes.length!==file.size)throw new Error('Fixture manifest mismatch: '+file.key)
 if(!existsSync(target)){mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes,{flag:'wx'})}
 rows.push({path:file.key,bytes:bytes.length,sha256:hash,status})
}
writeFileSync('../docs/superpowers/g2/2026-11-01-living-world/evidence/narration-fixtures.json',JSON.stringify({scope:'Existing legacy fixtures restored byte-for-byte; no test or production narration changes',rows},null,2))
console.log(`${rows.length} exact narration fixtures available`)
