// G2 closeout ENV-B02 diagnostic: measures the real CDN reads behind the two AR byte tests.
// Read-only GETs; no assertion is relaxed. Usage: node scripts/ar-cdn-probe.mjs [origin] [outFile]
import fs from 'node:fs'
import {createHash} from 'node:crypto'
const origin=process.argv[2]||'https://media.timelens.asia',out=process.argv[3]
const catalog=JSON.parse(fs.readFileSync(new URL('../src/features/ar/ar-catalog.json',import.meta.url),'utf8'))
const paths=[...new Set(['/assets/cu-chi-targets.mind',...catalog.flatMap(i=>[i.model,i.target,i.targetOriginal])])]
const rows=[];const started=Date.now()
for(const path of paths){
 const t=performance.now();let row={path}
 try{const r=await fetch(new URL(path,origin),{signal:AbortSignal.timeout(120000)});const firstByteMs=Math.round(performance.now()-t);const buf=Buffer.from(await r.arrayBuffer());const ms=Math.round(performance.now()-t)
  row={...row,status:r.status,bytes:buf.length,firstByteMs,totalMs:ms,kbps:Math.round(buf.length*8/Math.max(1,ms)),sha256:createHash('sha256').update(buf).digest('hex'),wouldExceedTestTimeout30s:ms>30000}
  const item=catalog.find(i=>i.targetOriginal===path);if(item)row.matchesCatalogSha=row.sha256===item.targetOriginalSha256
 }catch(e){row={...row,error:String(e?.name||e),totalMs:Math.round(performance.now()-t)}}
 rows.push(row);console.log(JSON.stringify(row))
}
const summary={origin,date:new Date().toISOString(),files:rows.length,totalBytes:rows.reduce((a,r)=>a+(r.bytes||0),0),totalMs:Date.now()-started,slowest:[...rows].sort((a,b)=>(b.totalMs||0)-(a.totalMs||0)).slice(0,3),over30s:rows.filter(r=>r.wouldExceedTestTimeout30s||r.error).map(r=>r.path),hashMismatches:rows.filter(r=>r.matchesCatalogSha===false).map(r=>r.path)}
console.log(JSON.stringify(summary))
if(out)fs.writeFileSync(out,JSON.stringify({summary,rows},null,1))
