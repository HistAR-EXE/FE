import type {Zone} from './worldModel'
/** Original quiet synthesized room ambience and object feedback; explicit opt-in, no historical recording claim. */
export function createLivingAudio(zone:Zone){
 const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=.04;master.connect(ctx.destination)
 const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);let last=0
 for(let i=0;i<data.length;i++){last=(last+Math.random()*.04-.02)/1.02;data[i]=last*3}
 const bed=ctx.createBufferSource(),filter=ctx.createBiquadFilter();bed.buffer=buffer;bed.loop=true;filter.type='lowpass';filter.frequency.value=zone==='L3-C'?850:zone==='L1-C'?440:180;bed.connect(filter);filter.connect(master);bed.start();void ctx.resume()
 // Object response uses filtered noise: water/cloth/leaf rustle rather than an electronic reward beep.
 const strike=()=>{const at=ctx.currentTime,s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=buffer;f.type='bandpass';f.frequency.value=zone==='L3-C'?1400:zone==='S1'?2200:zone==='L2-C'||zone==='L3-B'?700:450;f.Q.value=.6;g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(.75,at+.035);g.gain.exponentialRampToValueAtTime(.001,at+.5);s.connect(f);f.connect(g);g.connect(master);s.start(at);s.stop(at+.55)}
 const bird=()=>{if(zone!=='S1')return;const at=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(1700,at);o.frequency.exponentialRampToValueAtTime(2600,at+.12);g.gain.setValueAtTime(.001,at);g.gain.linearRampToValueAtTime(.1,at+.03);g.gain.exponentialRampToValueAtTime(.001,at+.22);o.connect(g);g.connect(master);o.start(at);o.stop(at+.25)}
 const timer=zone==='S1'?setInterval(bird,6100):null
 const source=ctx.createPanner();source.panningModel='HRTF';source.distanceModel='inverse';source.refDistance=1;source.rolloffFactor=1;source.positionX.value=1.15;source.positionY.value=.7;source.positionZ.value=-1.85;source.connect(master)
 const echo=()=>{if(zone!=='L1-C'||ctx.state==='closed')return;const at=ctx.currentTime;for(let i=0;i<2;i++){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=330+i*90;g.gain.setValueAtTime(.0001,at+i*.22);g.gain.linearRampToValueAtTime(.16,at+i*.22+.025);g.gain.exponentialRampToValueAtTime(.0001,at+i*.22+.24);o.connect(g);g.connect(source);o.start(at+i*.22);o.stop(at+i*.22+.25)}}
 const echoTimer=zone==='L1-C'?setInterval(echo,6000):null
 const setListener=(x:number,z:number,yaw:number)=>{const l=ctx.listener;l.positionX.value=x;l.positionY.value=1.3;l.positionZ.value=z;l.forwardX.value=Math.sin(yaw);l.forwardY.value=0;l.forwardZ.value=Math.cos(yaw);l.upY.value=1}
 let closed=false
 const setVolume=(value:number)=>{if(!closed&&Number.isFinite(value))master.gain.setTargetAtTime(.04*Math.max(0,Math.min(1,value)),ctx.currentTime,.025)}
 return {strike,echo,setListener,setVolume,partner:()=>{},close:()=>{if(closed)return;closed=true;if(timer)clearInterval(timer);if(echoTimer)clearInterval(echoTimer);bed.stop();void ctx.close()}}
}
