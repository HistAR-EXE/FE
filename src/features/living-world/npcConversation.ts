// Authored educational dialogue, not testimony or a canonical evidence producer.
export const cookTopics = ['MEAL', 'SMOKE', 'COMMUNITY'] as const
export type CookTopic = typeof cookTopics[number]
export function cookReply(topic: CookTopic, facts: readonly string[]): string {
 if(topic==='MEAL')return 'Bạn có thể giúp chuẩn bị gạo ở chiếc bát bên cạnh. Tôi tiếp tục trông nồi; mỗi người góp một việc cho bữa ăn. Thử bắt đầu từ chiếc bát, rồi nhìn xem công việc của mình nối với người bên cạnh thế nào.'
 if(topic==='SMOKE')return facts.includes('KITCHEN_SMOKE_PATH_CORRECT')
  ? 'Bạn đã đối chiếu đường khói. Bây giờ hãy nhìn cả công việc quanh bếp: chuẩn bị, nấu và chia phần đều cần người chăm nom. Một đường nối trên mô hình chỉ là điểm bắt đầu để nhìn thấy những người cùng làm việc ở đây.'
  : 'Hãy quan sát nắp nồi và mô hình đường khói bên cạnh. Đừng vội kết luận chỉ từ làn khói đang thấy. Bạn có thể lần từ nguồn nhiệt qua rãnh dẫn đến khoang phân tán, rồi quay lại cùng nhìn cả gian bếp.'
 return facts.includes('CARE_MEANING_CONFIRMED')&&facts.includes('KITCHEN_MEANING_CONFIRMED')
  ? 'Bạn đã thấy cả việc nấu ăn và chăm sóc. Nước, bữa ăn và những bàn tay giúp nhau nối các căn phòng thành đời sống chung. Khi trở lại chiếc bát ban đầu, có lẽ bạn đã nhìn thấy nhiều người hơn người đang đứng cạnh bếp.'
  : 'Một bữa ăn còn liên quan tới nước và người cần được chăm sóc. Khi ghé những nơi ấy, bạn có thể quay lại kể điều mình nhận ra. Không cần vội: cứ đi theo điều khiến bạn tò mò, gian bếp vẫn ở đây để bạn trở lại.'
}
