import test from 'node:test'
import assert from 'node:assert/strict'
import { createPortalAudio } from '../src/features/time-portal/timeline/portalAudioController.ts'
function setup(voices = [{ lang: 'vi-VN', localService: true }]) {
 const utterances = []; const listeners = new Set(); let completed = 0
 const speech = { getVoices: () => voices, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn), cancel() {}, pause() { this.pauses = (this.pauses || 0) + 1 }, resume() { this.resumes = (this.resumes || 0) + 1 }, speak: u => utterances.push(u) }
 const audio = { volume: 0, loop: false, play: async () => {}, pause() {}, removeAttribute() {}, load() {} }
 const c = createPortalAudio({ speech, audio, utterance: text => ({text}), onEnd: () => completed++ })
 return { c, speech, audio, utterances, listeners, completed: () => completed, voices }
}
test('speaks Vietnamese automatically, ducks music, and completes only the active session', () => {
 const x = setup(); x.c.segment('a','First'); assert.equal(x.utterances.length,1); assert.match(x.utterances[0].text,/First/); assert.equal(x.c.getSnapshot().waitingForNarration,true)
 const old = x.utterances[0]; x.c.segment('b','Second'); old.onend(); assert.equal(x.completed(),0); x.utterances[1].onend(); x.utterances[1].onend(); assert.equal(x.completed(),1); assert.equal(x.c.getSnapshot().waitingForNarration,false); x.c.dispose()
})
test('pause/resume preserves utterance and cancellation never completes', () => {
 const x=setup(); x.c.segment('a','Text'); x.c.setPaused(true); x.c.setPaused(false); assert.equal(x.utterances.length,1); assert.equal(x.speech.pauses,1); assert.equal(x.speech.resumes,1); x.c.toggleNarration(); x.utterances[0].onend(); assert.equal(x.completed(),0); x.c.dispose()
})
test('late Vietnamese voices start pending text without falling back to other languages', () => {
 const x=setup([{lang:'en-US'}]); x.c.segment('a','Text'); assert.equal(x.utterances.length,0); assert.equal(x.c.getSnapshot().waitingForNarration,false); x.voices.push({lang:'vi-VN'}); x.listeners.forEach(fn=>fn()); assert.equal(x.utterances.length,1); x.c.dispose()
})
test('autoplay rejection exposes start action, and speech errors unlock advancement', async () => {
 const x=setup(); x.audio.play=async()=>{throw Error('blocked')}; x.c.segment('a','Text'); await new Promise(resolve => setImmediate(resolve)); assert.equal(x.c.getSnapshot().blocked,true); x.utterances[0].onerror({error:'synthesis-failed'}); assert.equal(x.c.getSnapshot().waitingForNarration,false); assert.equal(x.completed(),0); x.c.dispose()
})

test('music volume ducks during narration and restores after successful completion', async () => {
 const x = setup(); x.c.segment('a', 'Text'); await new Promise(r => setTimeout(r, 650)); assert.ok(Math.abs(x.audio.volume - .07) < .01); x.utterances[0].onend(); await new Promise(r => setTimeout(r, 650)); assert.ok(Math.abs(x.audio.volume - .24) < .01); x.c.dispose()
})
test('intro is read once, paused queued segments wait, and disposal ignores callbacks', () => {
 const x=setup(); x.c.segment('a','First'); assert.match(x.utterances[0].text,/Chào mừng/); x.utterances[0].onend(); x.c.setPaused(true); x.c.segment('b','Second'); assert.equal(x.utterances.length,1); x.c.setPaused(false); assert.equal(x.utterances[1].text,'Second'); assert.equal(x.speech.resumes,1); x.c.dispose(); x.utterances[1].onend(); x.utterances[1].onend(); assert.equal(x.completed(),1); assert.equal(x.listeners.size,0)
})


test('speech starting does not hide blocked music recovery', async () => {
 const x=setup(); x.audio.play=async()=>{throw Error('blocked')}; x.c.segment('a','Text'); await new Promise(r=>setImmediate(r)); x.utterances[0].onstart(); assert.equal(x.c.getSnapshot().blocked,true); x.c.dispose()
})
test('invalid saved volume uses the safe default', () => {
 const audio={volume:0,loop:false,play:async()=>{},pause(){},removeAttribute(){},load(){}}
 const c=createPortalAudio({speech:null,audio,utterance:text=>({text}),storage:{getItem:()=> 'invalid',setItem(){}}}); assert.equal(c.getSnapshot().volume,.24); c.dispose()
})
test('queued speech watchdog rearms after pause and resume', t => {
 t.mock.timers.enable({apis:['setTimeout']}); const x=setup(); x.c.segment('a','Text'); x.c.setPaused(true); t.mock.timers.tick(9000); assert.equal(x.c.getSnapshot().waitingForNarration,true); x.c.setPaused(false); t.mock.timers.tick(8001); assert.equal(x.c.getSnapshot().waitingForNarration,false); assert.equal(x.c.getSnapshot().blocked,true); x.c.dispose()
})
test('music off fades out, and enabling mid-fade never pauses resumed playback', async () => {
 const x=setup(); let pauses=0; x.audio.pause=()=>{pauses++}; x.c.segment('a','Text'); await new Promise(r=>setImmediate(r)); await new Promise(r=>setTimeout(r,650)); const before=x.audio.volume;
 x.c.toggleMusic(); assert.equal(pauses,0); await new Promise(r=>setTimeout(r,80)); assert.ok(x.audio.volume>0 && x.audio.volume<before); x.c.toggleMusic(); await new Promise(r=>setImmediate(r)); await new Promise(r=>setTimeout(r,650)); assert.equal(pauses,0); assert.ok(x.audio.volume>.06);
 x.c.toggleMusic(); await new Promise(r=>setTimeout(r,240)); assert.equal(pauses,1); assert.equal(x.audio.volume,0); x.c.dispose()
})


test('late Vietnamese voice must not hide a pending music autoplay failure', async () => {
 const x=setup([]);let rejectMusic;
 x.audio.play=()=>new Promise((_,reject)=>{rejectMusic=reject});
 x.c.segment('a','Text');x.voices.push({lang:'vi-VN'});x.listeners.forEach(fn=>fn());
 rejectMusic(new Error('blocked'));await new Promise(r=>setImmediate(r));
 assert.equal(x.c.getSnapshot().blocked,true);x.c.dispose();
});
test('switching to music-only clears obsolete speech blockage', () => {
 const x=setup();x.c.segment('a','Text');x.utterances[0].onerror({error:'not-allowed'});
 assert.equal(x.c.getSnapshot().blocked,true);x.c.segment('comparison','');
 assert.equal(x.c.getSnapshot().blocked,false);assert.equal(x.c.getSnapshot().waitingForNarration,false);x.c.dispose();
});

test('bundled Vietnamese narration works without system speech voices', async () => {
 const utterances=[]; const music={volume:0,play:async()=>{},pause(){},removeAttribute(){},load(){}};
 const clips=[];let completed=0;
 const c=createPortalAudio({speech:null,audio:music,utterance:text=>{utterances.push(text);return {text}},recording:()=>{const clip={play:async()=>{},pause(){},removeAttribute(){},load(){},onplaying:null,onended:null,onerror:null};clips.push(clip);return clip},onEnd:()=>completed++});
 c.segment('1948-0','First');await new Promise(r=>setImmediate(r));assert.equal(c.getSnapshot().supported,true);assert.equal(c.getSnapshot().waitingForNarration,true);assert.equal(utterances.length,0);
 clips[0].onplaying();assert.equal(c.getSnapshot().speaking,true);clips[0].onended();assert.equal(completed,1);assert.equal(c.getSnapshot().waitingForNarration,false);c.dispose();
})

test('recorded narration rejects stale completion and resumes after pause', async () => {
 const clips=[];let completed=0;
 const c=createPortalAudio({speech:null,audio:{volume:0,play:async()=>{},pause(){},removeAttribute(){},load(){}},utterance:text=>({text}),recording:()=>{const clip={plays:0,pauses:0,play:async function(){this.plays++},pause(){this.pauses++},removeAttribute(){},load(){}};clips.push(clip);return clip},onEnd:()=>completed++});
 c.segment('a','First');const oldEnd=clips[0].onended;c.segment('b','Second');oldEnd();assert.equal(completed,0);assert.ok(clips[0].pauses>0);clips[1].onplaying();c.setPaused(true);assert.ok(clips[1].pauses>0);c.setPaused(false);assert.ok(clips[1].plays>=2);c.dispose();assert.equal(clips[1].onended,null);
})

test('recorded audio autoplay rejection exposes recovery and can retry', async () => {
 let reject=true;const clips=[];
 const c=createPortalAudio({speech:null,audio:{volume:0,play:async()=>{},pause(){},removeAttribute(){},load(){}},utterance:text=>({text}),recording:()=>{const clip={play:async()=>{if(reject)throw Object.assign(Error('Gesture required'),{name:'NotAllowedError'})},pause(){},removeAttribute(){},load(){}};clips.push(clip);return clip}});
 c.segment('a','First');await new Promise(r=>setImmediate(r));assert.equal(c.getSnapshot().blocked,true);assert.equal(c.getSnapshot().waitingForNarration,false);reject=false;c.start();await new Promise(r=>setImmediate(r));clips.at(-1).onplaying();assert.equal(c.getSnapshot().blocked,false);c.dispose();
})

test('failed recording falls back to Vietnamese speech without clearing narration wait', async () => {
 const x=setup();let clip;
 x.c.dispose();
 const c=createPortalAudio({speech:x.speech,audio:x.audio,utterance:text=>({text}),recording:()=>clip={play:async()=>{},pause(){},removeAttribute(){},load(){}}});
 c.segment('a','First');clip.onerror();assert.equal(x.utterances.length,1);assert.equal(c.getSnapshot().waitingForNarration,true);c.setPaused(true);c.setPaused(false);assert.equal(c.getSnapshot().waitingForNarration,true);x.utterances[0].onend();assert.equal(c.getSnapshot().waitingForNarration,false);c.dispose();
})

test('late rejection of a resumed recording cannot block a newer narration session', async () => {
 const clips=[];let rejectResume;
 const c=createPortalAudio({speech:null,audio:{volume:0,play:async()=>{},pause(){},removeAttribute(){},load(){}},utterance:text=>({text}),recording:()=>{const clip={count:0,play(){this.count++;return this.count===2?new Promise((_,reject)=>{rejectResume=reject}):Promise.resolve()},pause(){},removeAttribute(){},load(){}};clips.push(clip);return clip}});
 c.segment('a','First');clips[0].onplaying();c.setPaused(true);c.setPaused(false);c.segment('b','Second');clips[1].onplaying();rejectResume(Error('Aborted old play'));await new Promise(r=>setImmediate(r));assert.equal(c.getSnapshot().blocked,false);assert.equal(c.getSnapshot().waitingForNarration,true);c.dispose();
})
