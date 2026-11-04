import {readFileSync,readdirSync,statSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import path from 'node:path'
const build=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),src=path.resolve('src/features/living-world/r2/assets')
mkdirSync(out,{recursive:true})
const read=name=>readFileSync('src/features/living-world/r2/'+name,'utf8')
const list=(s,key)=>{const m=s.match(new RegExp(`const ${key}=\\[([^\\]]+)\\]`));if(!m)throw Error(key);return [...m[1].matchAll(/'([^']+)'/g)].map(m=>m[1])}
const chars=list(read('r2Actors.ts'),'R2_CHAR_FILES'),station=read('r2Station.ts'),village=read('r2Village.ts'),tunnel=read('r2Tunnel.ts')
const files=(materials,models)=>new Set([...materials.flatMap(m=>['Diffuse','nor_gl','arm'].map(s=>`tex/${m}_${s}.webp`)),...models.map(m=>`models/${m}.glb`),...chars.map(m=>`chars/${m}.glb`)])
const groups={S0:files(list(station,'MATERIALS'),['metal_tool_chest','industrial_wall_lamp']),S1:files(list(village,'FOREST_MATERIALS'),['tree_stump_01']),S2:files(list(village,'MATERIALS'),list(village,'MODELS')),tunnels:files(list(tunnel,'MATERIALS'),['vintage_oil_lamp','wooden_bowl_01','ceramic_pot','wicker_basket_02','wooden_bucket_01'])}
const emitted=readdirSync(path.join(build,'assets')),all=new Set(Object.values(groups).flatMap(g=>[...g])),rows=[]
for(const file of [...all].sort()){
 const source=readFileSync(path.join(src,file)),stem=path.basename(file,path.extname(file)),ext=path.extname(file)
 const output=emitted.find(n=>n.startsWith(stem+'-')&&n.endsWith(ext));if(!output)throw Error('3D asset absent or hidden inline: '+file)
 const body=readFileSync(path.join(build,'assets',output));if(!source.equals(body))throw Error('Source/emitted bytes differ: '+file)
 rows.push({file,emitted:output,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex'),groups:Object.keys(groups).filter(k=>groups[k].has(file))})
}
const bytes=set=>rows.filter(r=>set.has(r.file)).reduce((n,r)=>n+r.bytes,0)
const g2=new Set([...groups.S0,...groups.S2,...groups.tunnels]),shared=new Set(rows.filter(r=>r.groups.length>1).map(r=>r.file))
const result={build,scope:'Dependency inventory, encoded source/emitted GLB+WebP bodies; not a fresh network benchmark or GPU working-set measurement',g2Definition:'Q2/Q3 + optional A04, S0 station, existing tunnel scenes. G1 slice-contract slice_quests Q2/Q3, optional_activity A04.',g2Unique3DBytes:bytes(g2),g2CapBytes:10000000,g2Budget:bytes(g2)>10000000?'OPEN / EXCEEDS G2 CAP':'WITHIN INVENTORY CAP; network/device gate separate',representativeWorldUnique3DBytes:bytes(all),shared3DBytes:bytes(shared),zones:Object.fromEntries(Object.entries(groups).map(([zone,set])=>[zone,{dependencyBytes:bytes(set),exclusiveBytes:bytes(new Set([...set].filter(f=>!shared.has(f)))),files:set.size}])),livingRoomPolicy:'L1-C/L2-C/L3-B/L3-C currently reuse tunnel asset pack. Generated geometry/cloth/audio have no external file bytes; CPU/GPU cost must be measured separately. No new M1 cap is invented.',emittedAllFiles:readdirSync(path.join(build,'assets')).length,rows}
writeFileSync(path.join(out,'asset-accounting.json'),JSON.stringify(result,null,2))
writeFileSync(path.join(out,'asset-accounting.csv'),'File,Emitted,EncodedBodyBytes,SHA256,Groups\n'+rows.map(r=>[r.file,r.emitted,r.bytes,r.sha256,r.groups.join('|')].join(',')).join('\n'))
console.log(JSON.stringify({...result,rows:undefined}))
