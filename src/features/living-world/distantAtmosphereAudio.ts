/** Original filtered ambience, never a historical recording or an impulsive alarm. */
export function createDistantAtmosphereCue(context:AudioContext,destination:AudioNode,noise:AudioBuffer){
 const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain()
 source.buffer=noise;source.loop=true;filter.type='lowpass';filter.frequency.value=150;filter.Q.value=.5
 gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(destination);source.start()
 let closed=false,active=false
 return {
  setAlert(on:boolean){
   if(closed||context.state==='closed'||on===active)return
   active=on;gain.gain.cancelScheduledValues(context.currentTime)
   gain.gain.setTargetAtTime(on?.18:0,context.currentTime,on?1.2:.12)
  },
  close(){if(closed)return;closed=true;source.stop();source.disconnect();filter.disconnect();gain.disconnect()},
 }
}
