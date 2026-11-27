// Browser test instrumentation: record the app's actual Web Audio output before the
// hardware destination. This generates no sound or gameplay state of its own.
export async function installRuntimeAudioProof(page){
 await page.addInitScript(()=>{
  const Native=window.AudioContext,connect=AudioNode.prototype.connect,contexts=new WeakMap()
  window.__qaAudioCaptures=[]
  window.__qaAudioStreams=[]
  AudioNode.prototype.connect=function(destination,...args){
   const result=connect.call(this,destination,...args),capture=contexts.get(this.context)
   if(capture&&destination===this.context.destination)connect.call(this,capture.meter)
   return result
  }
  window.AudioContext=class extends Native{
   constructor(...args){
    super(...args)
    const sink=this.createMediaStreamDestination(),meter=this.createAnalyser();meter.fftSize=1024;connect.call(meter,sink)
    window.__qaAudioStreams.push(sink.stream)
    const recorder=new MediaRecorder(sink.stream,{mimeType:'audio/webm;codecs=opus'}),chunks=[],record={startedMs:performance.now(),peak:0,mime:recorder.mimeType}
    const data=new Float32Array(meter.fftSize),timer=setInterval(()=>{meter.getFloatTimeDomainData(data);for(const x of data)record.peak=Math.max(record.peak,Math.abs(x))},100)
    record.finished=new Promise(resolve=>{recorder.onstop=async()=>{clearInterval(timer);record.stoppedMs=performance.now();record.base64=btoa(Array.from(new Uint8Array(await new Blob(chunks,{type:recorder.mimeType}).arrayBuffer()),x=>String.fromCharCode(x)).join(''));resolve()}})
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.start(500)
    record.stop=()=>{if(recorder.state!=='inactive')recorder.stop()};contexts.set(this,{meter,record});window.__qaAudioCaptures.push(record)
   }
   close(){contexts.get(this)?.record.stop();return super.close()}
  }
 })
}
export async function readRuntimeAudioProof(page){
 return page.evaluate(async()=>{const captures=window.__qaAudioCaptures??[];for(const c of captures)c.stop();await Promise.all(captures.map(c=>c.finished));return captures.map(({startedMs,stoppedMs,peak,mime,base64})=>({startedMs,stoppedMs,peak,mime,base64}))})
}
