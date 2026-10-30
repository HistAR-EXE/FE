const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const js = ts.transpileModule(fs.readFileSync('src/features/chat/speechEnvelope.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports_ = {};
vm.runInNewContext(js,{exports:exports_});
const {readWavEnvelope,mouthOpennessAt} = exports_;
function wav({stereo=false,float=false}={}) {
 const rate=24000,channels=stereo?2:1,bits=float?32:16,align=channels*bits/8;
 const buffer=new ArrayBuffer(44+rate*align),view=new DataView(buffer);
 const text=(at,s)=>[...s].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
 text(0,'RIFF');view.setUint32(4,buffer.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');
 view.setUint32(16,16,true);view.setUint16(20,float?3:1,true);view.setUint16(22,channels,true);
 view.setUint32(24,rate,true);view.setUint32(28,rate*align,true);view.setUint16(32,align,true);view.setUint16(34,bits,true);
 text(36,'data');view.setUint32(40,rate*align,true);
 for(let i=0;i<rate;i++)for(let c=0;c<channels;c++) {
   const amplitude=i>=rate*.25 && i<rate*.5 ? .1 : i>=rate*.75 ? .5 : 0;
   const value=Math.sin(i*2*Math.PI*220/rate)*amplitude*(c===1?-1:1);
   if(float)view.setFloat32(44+i*align+c*4,value,true);
   else view.setInt16(44+i*align+c*2,Math.round(value*32767),true);
 }
 return buffer;
}
for(const format of [{},{stereo:true},{float:true}])test(`mouth follows quiet/loud speech and closes in silence ${JSON.stringify(format)}`,()=>{
 const envelope=readWavEnvelope(wav(format));
 assert.ok(envelope);
 assert.equal(mouthOpennessAt(envelope,.1),0);
 assert.ok(mouthOpennessAt(envelope,.35)>.1);
 assert.equal(mouthOpennessAt(envelope,.6),0);
 assert.ok(mouthOpennessAt(envelope,.85)>mouthOpennessAt(envelope,.35));
 for(const t of [-1,1,2,NaN,Infinity])assert.equal(mouthOpennessAt(envelope,t),0);
});
test('invalid/unsupported/truncated audio cannot animate or throw',()=>{
 for(let size=0;size<44;size++)assert.equal(readWavEnvelope(new ArrayBuffer(size)),null);
 const buffer=wav();const v=new DataView(buffer);v.setUint16(34,8,true);
 assert.equal(readWavEnvelope(buffer),null);
 assert.equal(readWavEnvelope(wav().slice(0,100)),null);
 assert.equal(mouthOpennessAt(null,.5),0);
});
test('real Gemini samples produce varying openings and silence',()=>{
 for(const name of ['leda','fenrir','sadachbia','zephyr']) {
  const file=`../AI/artifacts/voice-previews/chrono-${name}-vi.wav`;
  if(!fs.existsSync(file))continue;
  const b=fs.readFileSync(file);const env=readWavEnvelope(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
  assert.ok(env,name);
  assert.ok(env.levels.some(x=>x===0),`${name}: silent frames`);
  assert.ok(env.levels.some(x=>x>.5),`${name}: speech frames`);
  assert.ok(env.levels.some(x=>x>.05 && x<.5),`${name}: quieter speech frames`);
 }
});
