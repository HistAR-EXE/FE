import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { ERA_STORIES } from '../src/features/time-portal/timeline/storyData.ts'
import { PORTAL_NARRATIONS } from '../src/features/time-portal/timeline/portalNarrationManifest.ts'

test('every current timeline segment and quiz has matching Vietnamese audio in the repo',()=>{
 let count=0
 for(const [era,story] of Object.entries(ERA_STORIES)){
  const texts=story.moments.map(moment=>`${story.chapter}. ${moment.date}. ${moment.title}. ${moment.body}${moment.dyk ? ` Bạn có biết? ${moment.dyk}` : ''}`)
  texts.push(`Thử thách. ${story.quiz.question}`)
  for(const [index,text] of texts.entries()){
   const key=`${era}-${index}`,clip=PORTAL_NARRATIONS[key]
   assert.ok(clip,`Missing ${key}`);assert.equal(clip.text,text,`Regenerate changed narration ${key}`)
   const hash=createHash('sha256').update(text).digest('hex').slice(0,12)
   assert.ok(clip.src.endsWith(`${key}-${hash}.mp3`))
   const bytes=readFileSync(new URL('../public'+clip.src,import.meta.url))
   assert.ok(bytes.length>1000,`Audio missing/empty ${key}`)
   assert.ok(bytes.toString('ascii',0,3)==='ID3'||bytes[0]===0xff,`Not an MP3 ${key}`)
   count++
  }
 }
 assert.equal(Object.keys(PORTAL_NARRATIONS).length,count)
})
