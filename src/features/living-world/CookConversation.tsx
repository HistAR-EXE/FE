import {useState} from 'react'
import {cookReply, type CookTopic} from './npcConversation'

export function CookConversation({facts,echoSeen,onEcho,pending,durable}:{facts:readonly string[];echoSeen:boolean;onEcho:()=>void;pending:boolean;durable:boolean}) {
 const [topic,setTopic]=useState<CookTopic|null>(null)
 return <>
  <p>Người nấu bếp dừng tay để lắng nghe. Bạn có thể hỏi hoặc rời đi để người ấy tiếp tục công việc.</p>
  <div className="lw-targets">
   <button onClick={onEcho}>{echoSeen?'Nghe lại · tiếng dụng cụ':'Tiếng dụng cụ kể điều gì?'}</button>
   <button onClick={()=>setTopic('MEAL')}>Tôi có thể giúp việc gì?</button>
   <button onClick={()=>setTopic('SMOKE')}>Về đường khói của bếp</button>
   <button onClick={()=>setTopic('COMMUNITY')}>Bữa ăn liên quan tới những ai?</button>
  </div>
  {echoSeen&&<p>Những tiếng chạm nhỏ đi cùng việc chuẩn bị bữa ăn. Theo âm thanh, bạn đã gặp người đang làm việc ở đây. Âm thanh do TimeLens tổng hợp; câu chuyện diễn giải, không phải bản ghi lịch sử.</p>}
  {echoSeen&&pending&&<p role="status">Tiến độ đang chờ đồng bộ.</p>}
  {echoSeen&&!durable&&<p>Lựa chọn này chỉ được giữ trong lượt xem hiện tại.</p>}
  {topic&&<p role="status" aria-live="polite">{cookReply(topic,facts)}</p>}
  <details><summary>Về lời kể này</summary><p>FICTIONAL_EDUCATIONAL · nhân vật và lời thoại do TimeLens sáng tác, không phải lời chứng lịch sử. Nội dung đang chờ kiểm duyệt; trò chuyện không xác nhận khám phá hoặc cấp thưởng.</p></details>
 </>
}
