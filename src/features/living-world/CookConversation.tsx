import {useState} from 'react'
import {cookReply, type CookTopic} from './npcConversation'

export function CookConversation({facts,echoSeen,onEcho,pending,durable}:{facts:readonly string[];echoSeen:boolean;onEcho:()=>void;pending:boolean;durable:boolean}) {
 const [topic,setTopic]=useState<CookTopic|null>(null)
 const titles:Record<CookTopic,string>={MEAL:'Một người góp một việc',SMOKE:'Lần theo điều chưa thấy',COMMUNITY:'Bữa ăn nối những căn phòng'}
 return <div className="lw-conversation">
  <p className="lw-conversation-scene">Tiếng dụng cụ lắng xuống. Người nấu bếp quay lại, dành cho bạn một khoảng trò chuyện.</p>
  {topic&&<section className="lw-conversation-reply" aria-label="Lời người nấu bếp">
   <span className="lw-conversation-speaker">NGƯỜI NẤU BẾP · NHÂN VẬT HƯ CẤU</span>
   <h3>{titles[topic]}</h3>
   <p role="status" aria-live="polite" aria-atomic="true">{cookReply(topic,facts)}</p>
  </section>}
  <p className="lw-conversation-invite">Bạn muốn hỏi điều gì?</p>
  <div className="lw-targets lw-conversation-choices" aria-label="Chủ đề trò chuyện">
   <button onClick={onEcho}>{echoSeen?'Nghe lại · tiếng dụng cụ':'Tiếng dụng cụ kể điều gì?'}</button>
   <button aria-pressed={topic==='MEAL'} onClick={()=>setTopic('MEAL')}>Tôi có thể giúp việc gì?</button>
   <button aria-pressed={topic==='SMOKE'} onClick={()=>setTopic('SMOKE')}>Về đường khói của bếp</button>
   <button aria-pressed={topic==='COMMUNITY'} onClick={()=>setTopic('COMMUNITY')}>Bữa ăn liên quan tới những ai?</button>
  </div>
  {echoSeen&&<details className="lw-conversation-echo"><summary>Âm thanh của góc bếp</summary><p>Những tiếng chạm nhỏ đi cùng việc chuẩn bị bữa ăn. Theo âm thanh, bạn đã gặp người đang làm việc ở đây. Âm thanh do TimeLens tổng hợp; câu chuyện diễn giải, không phải bản ghi lịch sử.</p></details>}
  {echoSeen&&pending&&<p role="status">Tiến độ đang chờ đồng bộ.</p>}
  {echoSeen&&!durable&&<p>Lựa chọn này chỉ được giữ trong lượt xem hiện tại.</p>}
  <details><summary>Về lời kể này</summary><p>FICTIONAL_EDUCATIONAL · nhân vật và lời thoại do TimeLens sáng tác, không phải lời chứng lịch sử. Nội dung đang chờ kiểm duyệt; trò chuyện không xác nhận khám phá hoặc cấp thưởng.</p></details>
  <p className="lw-conversation-exit">Đóng lời trò chuyện để tiếp tục khám phá. Người nấu bếp sẽ trở lại với công việc.</p>
 </div>
}
