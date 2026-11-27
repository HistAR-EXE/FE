/** Authored interpretation for the journal. Reading it never writes world progress. */
type Chapter = {id:string; title:string; question:string; body:string; zones:readonly string[]; needs:readonly string[]}
const chapters:readonly Chapter[] = [
 {id:'threshold',title:'Dấu cửa giữa rừng',question:'Một dấu vết nhỏ dẫn tới đâu?',body:'Bắt đầu từ lớp lá và lối xuống. Nhìn thật kỹ trước khi đặt tên cho điều mình thấy; dấu cửa là câu hỏi đầu tiên về cả một thế giới bên dưới.',zones:['S0','S1','L1-A'],needs:['ENTRANCE_CONFIRMED']},
 {id:'shelter',title:'Đất giữ một khoảng sống',question:'Điều gì làm một căn hầm có thể sử dụng?',body:'Theo các lớp hầm và chi tiết thông khí. Một lỗ mở chỉ có ý nghĩa khi được đọc trong quan hệ với cấu trúc và điều kiện sinh hoạt.',zones:['L1-B','L1-D','L2-A','L3-A','L2-D'],needs:['AIR_MEANING_CONFIRMED','STRUCT_MEANING_CONFIRMED']},
 {id:'community',title:'Những bàn tay nối nhau',question:'Ai giữ cho đời sống tiếp diễn?',body:'Từ nhịp chày trên sân đến bữa cơm trong bếp, từ gàu nước đến chiếc khăn bên giường. Thử một việc nhỏ, nghe một câu chuyện, rồi nhìn lại cách mọi người nương tựa vào nhau.',zones:['S2','S3','S4','L1-C','L2-B','L2-C','L3-B','L3-C','L3-D'],needs:['KITCHEN_MEANING_CONFIRMED','CARE_MEANING_CONFIRMED']},
 {id:'return',title:'Mang một điều trở về',question:'Sau chuyến đi, bạn muốn ghi nhớ điều gì?',body:'Nối những phát hiện thành một góc nhìn về cộng đồng. Trở về Củ Chi hôm nay, dành một khoảng lặng tự nguyện hoặc tiếp tục khám phá theo cách của mình.',zones:['S5'],needs:['MS_SYNTHESIS_COMPLETE']},
]
export function describeStory(facts:readonly string[],zone:string,epilogueReturned:boolean){
 return chapters.map(c=>({...c,state:c.needs.every(f=>facts.includes(f))&&(c.id!=='return'||epilogueReturned)?'UNDERSTOOD' as const:c.zones.includes(zone)?'CURRENT' as const:'UNDISCOVERED' as const}))
}
export const storySources = [
 {title:'Cục Di sản văn hóa',url:'https://dsvh.gov.vn/di-tich-lich-su-dia-dao-cu-chi-1490',note:'Tư liệu nền về quá trình hình thành địa đạo, các công trình và không gian di tích. Không xác nhận sơ đồ phòng hay nhân vật trong trải nghiệm.'},
 {title:'UNESCO · Danh sách dự kiến',url:'https://whc.unesco.org/en/tentativelists/7038/',note:'Hồ sơ Cu Chi Tunnels thuộc Danh sách dự kiến. Việc công bố hồ sơ không có nghĩa UNESCO thẩm định hay bảo chứng TimeLens.'},
] as const
export const khaTopics = [
 {id:'OBSERVE',label:'Mình có thể thay đổi quá khứ không?'},
 {id:'RETURN',label:'Nếu muốn trở về sớm thì sao?'},
 {id:'MEMORY',label:'Mình nên mang theo điều gì?'},
] as const
export type KhaTopic = typeof khaTopics[number]['id']
export function khaReply(topic:KhaTopic,facts:readonly string[]){
 if(topic==='OBSERVE')return 'Ở đây, bạn là người quan sát. Cỗ máy đưa ta vào một không gian kể chuyện, không đưa ta quyền sửa lịch sử. Cứ hỏi, thử các thao tác minh họa và đối chiếu tư liệu. Gặp điều chưa rõ, mình sẽ giữ nó như một câu hỏi, không vội biến thành sự thật.'
 if(topic==='RETURN')return 'Đường trở về hiện tại luôn có trong Menu. Bạn không cần làm hết mọi việc để được rời đi. Trở về sớm là một chặng dừng; khi những phát hiện đã kết nối, câu chuyện sẽ có lời khép lại riêng. Chrono sẽ giúp bạn tìm bước tiếp theo.'
 return facts.includes('MS_SYNTHESIS_COMPLETE')
  ? 'Bạn đã nối những căn phòng với công việc của con người. Có lẽ điều mang về không chỉ là hình dáng đường hầm, mà là cách một bữa ăn, một gàu nước và sự chăm sóc nâng đỡ nhau. Trong Atlas, hãy giữ lại điều khiến bạn muốn nhìn khác đi.'
  : 'Đừng cố mang về thật nhiều đáp án. Hãy chọn một chi tiết khiến bạn tò mò: tiếng chày, chiếc bát, một gàu nước. Theo nó tới người đang làm việc, rồi thử tìm xem việc ấy liên quan tới ai. Atlas sẽ giữ những phát hiện đã được ghi nhận.'
}
