import { ERA_STORIES } from '../src/features/time-portal/timeline/storyData.ts'
import { writeFileSync } from 'node:fs'
const entries=[]
for(const [era,story] of Object.entries(ERA_STORIES)){
 story.moments.forEach((moment,index)=>entries.push({key:`${era}-${index}`,text:`${story.chapter}. ${moment.date}. ${moment.title}. ${moment.body}${moment.dyk ? ` Bạn có biết? ${moment.dyk}` : ''}`}))
 entries.push({key:`${era}-${story.moments.length}`,text:`Thử thách. ${story.quiz.question}`})
}
writeFileSync(process.argv[2] || 'test-results/portal-narration-text.json',JSON.stringify(entries,null,2))
console.log(`${entries.length} narration segments exported`)
