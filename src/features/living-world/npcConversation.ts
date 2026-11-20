// Authored educational dialogue, not testimony or a canonical evidence producer.
export const cookTopics = ['MEAL', 'SMOKE', 'COMMUNITY'] as const
export type CookTopic = typeof cookTopics[number]
export function cookReply(topic: CookTopic, facts: readonly string[]): string {
 if(topic==='MEAL')return 'Bạn có thể giúp chuẩn bị gạo ở chiếc bát bên cạnh. Tôi tiếp tục trông nồi; mỗi người góp một việc cho bữa ăn.'
 if(topic==='SMOKE')return facts.includes('KITCHEN_SMOKE_PATH_CORRECT')
  ? 'Bạn đã đối chiếu đường khói. Bây giờ hãy nhìn cả công việc quanh bếp: chuẩn bị, nấu và chia phần đều cần người chăm nom.'
  : 'Hãy quan sát nắp nồi và mô hình đường khói bên cạnh. Đừng vội kết luận chỉ từ làn khói đang thấy.'
 return facts.includes('CARE_MEANING_CONFIRMED')&&facts.includes('KITCHEN_MEANING_CONFIRMED')
  ? 'Bạn đã thấy cả việc nấu ăn và chăm sóc. Nước, bữa ăn và những bàn tay giúp nhau nối các căn phòng thành đời sống chung.'
  : 'Một bữa ăn còn liên quan tới nước và người cần được chăm sóc. Khi ghé những nơi ấy, bạn có thể quay lại kể điều mình nhận ra.'
}
