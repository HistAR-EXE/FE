// P3 departure sound for the Chrono Vessel, synthesised in the browser (no recorded/downloaded audio).
// Played only from the player's own activation (a user gesture), ~2.4 s: power hum rising, a filtered sweep, a soft chime.
export function playVesselDeparture(){
 try{
  const Ctx=window.AudioContext;if(!Ctx)return
  const ctx=new Ctx(),out=ctx.createGain();out.gain.value=.12;out.connect(ctx.destination);const t=ctx.currentTime
  const hum=ctx.createOscillator(),hg=ctx.createGain();hum.type='sawtooth';hum.frequency.setValueAtTime(55,t);hum.frequency.exponentialRampToValueAtTime(220,t+2);hg.gain.setValueAtTime(.0001,t);hg.gain.exponentialRampToValueAtTime(.35,t+.6);hg.gain.exponentialRampToValueAtTime(.0001,t+2.4)
  const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.setValueAtTime(300,t);lp.frequency.exponentialRampToValueAtTime(2400,t+2);hum.connect(lp);lp.connect(hg);hg.connect(out);hum.start(t);hum.stop(t+2.5)
  const n=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1
  const src=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),ng=ctx.createGain();src.buffer=n;bp.type='bandpass';bp.Q.value=4;bp.frequency.setValueAtTime(400,t+.4);bp.frequency.exponentialRampToValueAtTime(5000,t+2.2);ng.gain.setValueAtTime(.0001,t+.4);ng.gain.exponentialRampToValueAtTime(.25,t+1.4);ng.gain.exponentialRampToValueAtTime(.0001,t+2.3);src.connect(bp);bp.connect(ng);ng.connect(out);src.start(t+.4);src.stop(t+2.4)
  for(const [hz,at] of [[880,1.9],[1320,2.05]] as const){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=hz;g.gain.setValueAtTime(.0001,t+at);g.gain.exponentialRampToValueAtTime(.18,t+at+.02);g.gain.exponentialRampToValueAtTime(.0001,t+at+.6);o.connect(g);g.connect(out);o.start(t+at);o.stop(t+at+.65)}
  setTimeout(()=>{void ctx.close()},3000)
 }catch{/* audio is optional; never blocks the journey */}
}
