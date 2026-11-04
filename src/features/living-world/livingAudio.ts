import type {LivingZone} from './livingSpaces'
/** Original quiet synthesized room ambience and object feedback; explicit opt-in, no historical recording claim. */
export function createLivingAudio(zone:LivingZone){
 const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=.04;master.connect(ctx.destination)
 const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let last=0
 for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*3}
 const bed=ctx.createBufferSource(),filter=ctx.createBiquadFilter();bed.buffer=buffer;bed.loop=true;filter.type='lowpass';filter.frequency.value=zone==='L3-C'?850:zone==='L1-C'?440:180;bed.connect(filter);filter.connect(master);bed.start();void ctx.resume()
 const strike=()=>{const at=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(zone==='L3-C'?680:250,at);o.frequency.exponentialRampToValueAtTime(zone==='L3-C'?340:120,at+.3);g.gain.setValueAtTime(.6,at);g.gain.exponentialRampToValueAtTime(.001,at+.35);o.connect(g);g.connect(master);o.start(at);o.stop(at+.4)}
 return {strike,partner:()=>{},close:()=>{bed.stop();void ctx.close()}}
}
