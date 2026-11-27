import {useState} from 'react'
import {khaTopics,khaReply,type KhaTopic} from './worldNarrative'
import {WorldStoryArt} from './WorldStoryArt'

export function KhaConversation({facts,onBoard}:{facts:readonly string[];onBoard:()=>void}){
 const [topic,setTopic]=useState<KhaTopic>('OBSERVE')
 return <div className="lw-kha-conversation"><div className="lw-kha-intro"><WorldStoryArt kind="kha"/><div><p className="lw-eyebrow">KHA · NGƯỜI GIỮ TRẠM</p><p>“Mình giữ đường trở về. Còn điều bạn tìm thấy trên đường đi, hãy để chính bạn kể lại.”</p></div></div><div className="lw-kha-topics" aria-label="Hỏi người giữ trạm">{khaTopics.map(t=><button key={t.id} aria-pressed={topic===t.id} onClick={()=>setTopic(t.id)}>{t.label}</button>)}</div><p className="lw-kha-reply" role="status" aria-live="polite">{khaReply(topic,facts)}</p><p className="lw-small">Nhân vật và lời thoại do TimeLens sáng tác cho trải nghiệm giáo dục.</p><button className="lw-primary" onClick={onBoard}>Tới cỗ máy</button></div>
}
