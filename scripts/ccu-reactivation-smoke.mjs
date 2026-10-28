import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
const base='http://127.0.0.1:18080'
for(let attempt=0;;attempt++){try{if((await fetch(base+'/api/locations',{signal:AbortSignal.timeout(3000)})).ok)break}catch{}if(attempt>=120)throw Error('Local backend did not become ready');await new Promise(resolve=>setTimeout(resolve,1000))}
const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'teacher-standard@histar.local',password:'B2BTest@2026!'}),signal:AbortSignal.timeout(15000)})
assert.equal(login.status,200)
const {data}=await login.json();assert.match(data.userId,/^[0-9a-f-]{36}$/i)
execFileSync('docker',['exec','histar-postgres','psql','-U','timelens','-d','timelens','-v','ON_ERROR_STOP=1','-c',`UPDATE org_active_sessions SET last_seen_at=NOW()-INTERVAL '5 minutes' WHERE user_id='${data.userId}'`],{stdio:'pipe'})
const statuses=await Promise.all(Array.from({length:6},async()=>{const r=await fetch(base+'/api/profile/me',{headers:{Authorization:`Bearer ${data.accessToken||data.token}`},signal:AbortSignal.timeout(20000)});return r.status}))
assert.deepEqual(statuses,[200,200,200,200,200,200])
console.log(JSON.stringify({passed:true,scope:'Local PostgreSQL expired organization session reactivation with six concurrent authenticated profile requests',statuses}))
