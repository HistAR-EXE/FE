import test from 'node:test'
import assert from 'node:assert/strict'
import { formatVideoTime, videoCompletionCount, canSeekVideo, videoRewardTotal } from '../src/features/explore/videoState.ts'
test('formats duration without invalid or negative display', () => {
 assert.equal(formatVideoTime(77.21),'1:17')
 assert.equal(formatVideoTime(NaN),'0:00')
 assert.equal(formatVideoTime(-1),'0:00')
})
test('completion counts only canonical seven video discoveries once', () => {
 assert.equal(videoCompletionCount(['video:tunnel-digging','video:tunnel-digging','video:cedar-falls','dossier:architecture']),1)
 assert.equal(videoRewardTotal(['video:tunnel-digging','video:women-house']),60)
})
test('seek allows review and verified progress but not skipping unseen content', () => {
 assert.equal(canSeekVideo(8,10,false),true)
 assert.equal(canSeekVideo(60,10,false),false)
 assert.equal(canSeekVideo(60,10,true),true)
 assert.equal(canSeekVideo(NaN,10,true),false)
})
