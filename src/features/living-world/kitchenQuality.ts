/** Respond to tail latency: a 40 FPS mean can still spend >10% of frames below 30 FPS. */
export function kitchenPixelRatio(current:number,maximum:number,seconds:readonly number[]):number {
 if(seconds.length<8)return current
 const sorted=[...seconds].sort((a,b)=>a-b),p90=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.9))]
 if(p90>.031)return Math.max(.6,current-.1)
 if(p90<.019)return Math.min(maximum,current+.05)
 return current
}
