// S2 soundscape, synthesised in the browser (no recorded/downloaded audio; WEQ03 ambient, WEQ08 mute).
// Starts only after an explicit user action because browsers block autoplay.
export function createS2Audio(){
 const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=.09;master.connect(ctx.destination)
 const now=()=>ctx.currentTime
 const noiseBuffer=(()=>{const b=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b})()
 const tone=(hz:number,duration:number,type:OscillatorType='sine',gain=.3,end=.65,at=now())=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(hz,at);o.frequency.exponentialRampToValueAtTime(hz*end,at+duration);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.01);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(master);o.start(at);o.stop(at+duration+.02)}
 const burst=(duration:number,freq:number,gain:number,q=.8,at=now())=>{const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuffer;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;g.gain.setValueAtTime(gain,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);s.connect(f);f.connect(g);g.connect(master);s.start(at,Math.random());s.stop(at+duration+.02)}
 // Wind bed: looping filtered noise with a slow swell.
 const wind=ctx.createBufferSource(),windFilter=ctx.createBiquadFilter(),windGain=ctx.createGain(),lfo=ctx.createOscillator(),lfoGain=ctx.createGain()
 wind.buffer=noiseBuffer;wind.loop=true;windFilter.type='lowpass';windFilter.frequency.value=420;windGain.gain.value=.08;lfo.frequency.value=.07;lfoGain.gain.value=.045
 lfo.connect(lfoGain);lfoGain.connect(windGain.gain);wind.connect(windFilter);windFilter.connect(windGain);windGain.connect(master);wind.start();lfo.start()
 const bird=()=>{const base=1500+Math.random()*900,at=now();for(let i=0;i<2+Math.floor(Math.random()*3);i++)tone(base*(1+Math.random()*.15),.11,'sine',.12,1.35,at+i*.14)}
 const hen=()=>{const at=now();for(let i=0;i<3;i++)tone(520+Math.random()*80,.09,'square',.025,.8,at+i*.12)}
 const crackle=()=>{for(let i=0;i<3;i++)burst(.03,2500+Math.random()*2000,.08,3,now()+i*.05*Math.random())}
 const timers=[setInterval(bird,5200),setInterval(()=>{if(Math.random()<.5)hen()},7300),setInterval(crackle,900)]
 void ctx.resume()
 // Pestle thud: low body + short noise transient; the partner's strokes are softer.
 const thud=(gain:number)=>{tone(95,.18,'sine',gain,.6);burst(.07,600,gain*.6,1.2)}
 return{strike:()=>thud(.42),partner:()=>thud(.16),setVolume:(value:number)=>{if(ctx.state!=='closed'&&Number.isFinite(value))master.gain.setTargetAtTime(.09*Math.max(0,Math.min(1,value)),ctx.currentTime,.025)},close:()=>{timers.forEach(clearInterval);try{wind.stop();lfo.stop()}catch{/* already stopped */}void ctx.close()}}
}
