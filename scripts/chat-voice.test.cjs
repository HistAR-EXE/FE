const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function compile(file, context) {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/chat', file), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  context.exports = {};
  vm.runInNewContext(js, context, { filename: file });
  return context.exports;
}
const copy = compile('callCopy.ts', {});
const envelope = compile('speechEnvelope.ts', {});
function setup({ serverFails = false, voices = [{lang:'vi-VN'}], browserEnds = true, synthesize } = {}) {
  const state = { requests: [], utterances: [], audible: 0, cancelled: 0, plays: 0 };
  const listeners = new Set();
  const synthesis = {
    getVoices: () => voices, cancel: () => state.cancelled++, resume() {},
    addEventListener: (_, cb) => listeners.add(cb), removeEventListener: (_, cb) => listeners.delete(cb),
    speak: utterance => { state.utterances.push(utterance); queueMicrotask(() => { utterance.onstart?.(); if(browserEnds) utterance.onend?.(); }); },
  };
  class Audio {
    src = ''; volume = 1;
    async play() { state.plays++; queueMicrotask(() => { this.onplaying?.(); this.onended?.(); }); }
    pause() { this.onpause?.(); }
  }
  const context = { console, AbortController, Blob, Audio, queueMicrotask,
    URL: {createObjectURL: () => 'blob:test-audio', revokeObjectURL() {}},
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    window: {setTimeout, clearTimeout, setInterval, clearInterval, speechSynthesis: synthesis},
    require: name => name === './speechEnvelope' ? envelope : name === './callCopy' ? copy : name === './api' ? {chatApi:{recordVoiceFallback: async()=>{}}} : {
      synthesizeSpeechSentence: async (text, persona, signal) => {
        state.requests.push({text, persona, signal});
        if(synthesize) return synthesize(text, signal);
        if(serverFails) throw Error('TTS unavailable');
        return new Blob(['mp3']);
      },
    },
  };
  const voice = compile('voice.ts', context);
  return { voice, state, voices, context, changed: () => listeners.forEach(cb=>cb()), listeners };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('canceling a question immediately stops recognition and discards partial/late transcript', async () => {
  const x=setup();
  let recognition,stops=0;
  x.context.window.SpeechRecognition=class {
    constructor(){recognition=this;}
    start(){}
    stop(){stops++;this.onend?.();}
  };
  const updates=[];
  const result=x.voice.listenForUtterance(text=>updates.push(text),()=>false);
  recognition.onresult({results:[[{transcript:'câu nói nhầm'}]]});
  x.voice.stopActiveListening();
  assert.equal(await result,'');
  assert.equal(stops,1);
  recognition.onresult({results:[[{transcript:'phản hồi đến muộn'}]]});
  assert.deepEqual(updates,['câu nói nhầm']);
  x.voice.stopActiveListening();
  assert.equal(stops,1,'cancel cleanup must release its handler');
});

test('first response automatically uses Vietnamese server audio without native/default voices', async () => {
  const {voice, state} = setup({voices:[]});
  voice.prepareSpeechPlayback();
  assert.equal(await voice.speakReply('**Xin chào**, mình là Chrono!', 'chrono', {onAudible:()=>state.audible++}), 'played');
  assert.equal(state.requests.length, 1);
  assert.equal(state.utterances.length, 0);
  assert.equal(state.audible, 1);
  assert.ok(!state.requests[0].text.includes('**'));
});
test('late Vietnamese voice works without reload and never selects English/Chinese', async () => {
  const x = setup({serverFails:true, voices:[{lang:'en-US'},{lang:'zh-CN'}]});
  const result = x.voice.speakReply('Chrono có câu chuyện mới!', 'chrono', undefined, 'en');
  await tick();
  x.voices.push({lang:'vi-VN',name:'HoaiMy'}); x.changed();
  assert.equal(await result, 'played');
  assert.equal(x.state.utterances[0].lang, 'vi-VN');
  assert.equal(x.state.utterances[0].voice.lang, 'vi-VN');
  assert.ok(x.state.utterances[0].rate > 1);
  assert.ok(x.state.utterances[0].pitch > 1);
  assert.equal(x.listeners.size, 0);
});
test('does not read Vietnamese with an English-only native voice', async () => {
  const x = setup({serverFails:true, voices:[{lang:'en-US'}]});
  assert.equal(await x.voice.speakReply('Xin chào bạn'), 'silent');
  assert.equal(x.state.utterances.length, 0);
});
test('hangup cancels native speech without waiting for browser onend', async () => {
  const x = setup({serverFails:true, browserEnds:false});
  const result = x.voice.speakReply('Xin chào bạn'); await tick();
  assert.equal(x.state.utterances.length, 1);
  x.voice.stopActiveSpeech();
  assert.equal(await result, 'stopped');
  assert.ok(x.state.cancelled >= 2);
});
test('late TTS response cannot restart audio after hangup', async () => {
  let release;
  const x = setup({synthesize:()=>new Promise(resolve=>{release=resolve})});
  const result=x.voice.speakReply('Xin chào'); await tick();
  x.voice.stopActiveSpeech(); release(new Blob(['mp3']));
  assert.equal(await result, 'stopped');
  assert.equal(x.state.plays, 0);
});
test('premium denial never falls back to browser speech', async () => {
  const x = setup({synthesize: async () => { throw {status:403}; }});
  assert.equal(await x.voice.speakReply('Xin chào'), 'forbidden');
  assert.equal(x.state.plays, 0);
  assert.equal(x.state.utterances.length, 0);
});
test('long unpunctuated answers fit TTS limit without losing words', () => {
  const text = 'địa đạo '.repeat(250).trim();
  const chunks = copy.spokenChunks(text);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk=>chunk.length<=720));
  assert.equal(chunks.join(' '),text);
  assert.ok(!copy.spokenReply('[TimeLens](https://example.com)').includes('https'));
});
