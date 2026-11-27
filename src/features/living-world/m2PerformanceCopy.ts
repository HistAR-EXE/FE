/** Original interpretive direction, not a transcript or sourced craft reconstruction. */
export function performanceCopy(target:string){
 if(target.startsWith('A03_'))return 'Nhìn theo chiếc muôi: đưa bột lên mặt vải, trải đều rồi chuyển sang giàn. Hai bàn tay làm chậm để bạn quan sát; vị trí dụng cụ là minh họa.'
 if(target.startsWith('A12_'))return 'Một tay giữ đế, một tay đưa quai vào vị trí. Khi chuyển sang bàn ráp, hãy nhìn sự khác nhau giữa miếng đế và đôi dép đã có quai.'
 if(target.startsWith('A05_'))return 'Một tay giữ nan, tay kia đưa nan qua lại. Quan sát nhịp xen kẽ và phần đan xuất hiện sau thao tác của bạn.'
 if(target.startsWith('A06_'))return 'Nhìn hai tay giữ cán cuốc; ở điểm chuyền đất, dụng cụ đổi thành giỏ. Đất trong giỏ và hàng giỏ giúp bạn theo dõi kết quả.'
 if(target.startsWith('A10_'))return 'Hỏi: Nan tre qua tay, giỏ đan nên dáng. Đáp: Mỗi việc cùng làm, đường dài bớt xa. Lời đối đáp do dự án sáng tác để minh họa sự hợp tác; không phải lời hò tư liệu.'
 if(target.startsWith('A07_'))return 'Theo dõi hai thanh tre giữ nhịp và cử chỉ đối đáp trên sân. Đây là động tác minh họa do dự án dựng, chưa đại diện cho một tiết mục lịch sử cụ thể.'
 if(target.startsWith('A09_')||target.startsWith('A11_'))return 'Quan sát gói đồ được giữ bằng hai tay: từ câu chuyện của một người đến sự chia sẻ trong cộng đồng. Nhân vật và vật dụng trong cảnh là diễn giải giáo dục.'
 if(target.startsWith('L2B_'))return 'Một tay giữ trang giấy, một tay ghi chép; hãy liên hệ việc lưu tên, việc chung với lá thư suy ngẫm của riêng bạn. Bản ghi trong cảnh không phải hồ sơ của nhân vật có thật.'
 return null
}
