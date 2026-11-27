/** Trace only QA action metadata; never log auth headers or private creations. */
export function trackWorldActions(page,result,save){
 const records=[];result.actionTrace=records;const requests=new Map()
 page.on('request',request=>{if(request.method()!=='POST'||!request.url().includes('/api/v2/worlds/cuchi-mach-song/actions'))return;let body;try{body=request.postDataJSON()}catch{return};const row={action:body.actionType,target:body.targetId,actionId:body.actionId,expectedRevision:body.expectedRevision,startedAt:new Date().toISOString(),startedMs:Date.now()};records.push(row);requests.set(request,row)})
 page.on('response',async response=>{const row=requests.get(response.request());if(!row)return;row.status=response.status();row.responseAt=new Date().toISOString();row.durationMs=Date.now()-row.startedMs;try{const body=await response.json();row.serverRevision=body.data?.revision;row.message=body.message??body.error?.message??body.code}catch{}save()})
 page.on('requestfailed',request=>{const row=requests.get(request);if(!row)return;row.failed=request.failure()?.errorText;row.durationMs=Date.now()-row.startedMs;save()})
}
