import { Link } from 'react-router-dom'
import { SolutionIcon } from './SolutionIcon'
import './heritage-solutions.css'

const services = [
  { icon: '360', title: 'Không gian tham quan 360°', text: 'Đưa không gian di tích lên web, giúp người xem làm quen với điểm đến và tiếp cận câu chuyện qua từng góc nhìn.', items: ['Ảnh toàn cảnh và điểm thông tin', 'Liên kết nội dung theo khu vực', 'Khám phá từ xa trên thiết bị tương thích'] },
  { icon: 'layers', title: 'Tái hiện lịch sử & mô hình 3D', text: 'Kết nối tư liệu với trải nghiệm trực quan: dòng thời gian, so sánh xưa–nay và mô hình tương tác phù hợp từng câu chuyện.', items: ['Cổng Thời Gian theo giai đoạn', 'Ảnh đối chiếu xưa và nay', 'Mô hình 3D và AR theo phạm vi thống nhất'] },
  { icon: 'record_voice_over', title: 'Nội dung & trợ lý thuyết minh', text: 'Tổ chức câu chuyện, lời dẫn và nguồn tham khảo từ tư liệu được đơn vị cung cấp hoặc thống nhất sử dụng.', items: ['Biên soạn nội dung và lời thuyết minh', 'Hỏi đáp AI theo cấu hình triển khai', 'Rà soát tư liệu cùng đơn vị quản lý'] },
  { icon: 'analytics', title: 'Quản trị & hành trình trải nghiệm', text: 'Xác định cách cập nhật nội dung, tổ chức hoạt động tại trạm và theo dõi tiến trình phù hợp với nhu cầu vận hành.', items: ['Nhiệm vụ và hoạt động theo điểm đến', 'Phân quyền và cập nhật nội dung', 'Nhu cầu báo cáo, tích hợp được khảo sát riêng'] },
]
const steps = [
  ['Khảo sát & xác định', 'Làm rõ mục tiêu, đối tượng tham quan, tư liệu, quyền sử dụng hình ảnh và điều kiện tại điểm đến.'],
  ['Thiết kế & số hóa', 'Thống nhất kịch bản, danh mục nội dung, định dạng hình ảnh hoặc mô hình và tiêu chí nghiệm thu.'],
  ['Thử nghiệm & triển khai', 'Kiểm tra trải nghiệm trên thiết bị mục tiêu, rà soát nội dung và hướng dẫn người phụ trách vận hành.'],
  ['Vận hành & cập nhật', 'Thống nhất đầu mối hỗ trợ, lịch cập nhật, bảo trì và cách đánh giá trải nghiệm sau triển khai.'],
]

export function HeritageSolutions() {
  return <>
    <section id="heritage" className="pub-section pub-reveal">
      <div className="tl-container heritage-intro">
        <div><p className="tl-eyebrow">03 / GIẢI PHÁP SỐ HÓA DI SẢN · B2G</p><h2 className="tl-section-title">Giữ bản sắc điểm đến.<br /><em>Mở thêm cách <span className="heritage-title-phrase">kể chuyện.</span></em></h2><p className="pub-lead">Dành cho ban quản lý di tích, bảo tàng và đơn vị du lịch văn hóa muốn kết nối tư liệu, không gian thực và trải nghiệm số trên cùng một hành trình.</p><div className="heritage-actions"><Link to="/checkout/b2g" className="tl-button" data-testid="pricing-b2b2c-link">Trao đổi phương án hợp tác <span aria-hidden="true">↗</span></Link><a href="#services" className="heritage-service-link">Khám phá dịch vụ ↓</a></div></div>
        <aside className="heritage-brief"><SolutionIcon name="museum" /><h3>Mỗi di tích, một phạm vi phù hợp.</h3><p>Bắt đầu từ câu chuyện và tư liệu của đơn vị. Lựa chọn các hạng mục cần thiết, thử nghiệm trước khi mở rộng.</p><dl><div><dt>Trọng tâm</dt><dd>Nội dung · Trải nghiệm · Vận hành</dd></div><div><dt>Điểm khởi đầu</dt><dd>Củ Chi là pilot trọng tâm của TimeLens</dd></div><div><dt>Chi phí</dt><dd>Báo giá theo phạm vi được thống nhất</dd></div></dl></aside>
      </div>
    </section>
    <section id="services" className="pub-section heritage-services pub-reveal"><div className="tl-container"><div className="pub-heading-row"><div><p className="tl-eyebrow">CÁC HẠNG MỤC CÓ THỂ KẾT HỢP</p><h2 className="tl-section-title">Từ tư liệu di sản.<br /><em>Đến trải nghiệm số.</em></h2></div><p>Bốn nhóm giải pháp để cùng lựa chọn và thiết kế. Mức độ nội dung, tính năng và khả năng tích hợp được xác nhận cho từng dự án.</p></div><div className="heritage-service-grid">{services.map((service, index) => <article key={service.title}><div className="heritage-card-top"><SolutionIcon name={service.icon} /><span>0{index + 1}</span></div><h3>{service.title}</h3><p>{service.text}</p><ul>{service.items.map(item => <li key={item}>{item}</li>)}</ul></article>)}</div><p className="pub-note">Các hạng mục số hóa được tư vấn riêng, không mặc định bao gồm trong Journey Pass, Premium hoặc gói nhà trường. AR cần thiết bị tương thích và ảnh mục tiêu theo hướng dẫn; nội dung AI cần được kiểm chứng khi sử dụng.</p></div></section>
    <section className="pub-section heritage-delivery pub-reveal"><div className="tl-container"><div className="pub-heading-row"><div><p className="tl-eyebrow">TỪ Ý TƯỞNG ĐẾN VẬN HÀNH</p><h2 className="tl-section-title">Rõ từng bước.<br /><em>Đồng hành từng giai đoạn.</em></h2></div><p>Quy trình đề xuất giúp hai bên xác định trách nhiệm, sản phẩm bàn giao và điều kiện vận hành trước khi triển khai.</p></div><ol className="heritage-steps">{steps.map(([title, text], index) => <li key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol><div className="heritage-cooperation"><div><p className="tl-eyebrow">PHƯƠNG ÁN HỢP TÁC</p><h3>Triển khai theo dự án hoặc đồng hành vận hành.</h3><p>Trao đổi nhu cầu đầu tư một lần (One-time) hoặc thuê bao vận hành theo năm (OpEx). Hạng mục bàn giao, quyền sử dụng, lưu trữ, cập nhật và hỗ trợ được làm rõ trong đề xuất riêng.</p></div><div><Link className="tl-button" to="/checkout/b2g">Gửi nhu cầu tư vấn ↗</Link><p className="pub-note">Chuẩn bị tên đơn vị, điểm đến, tư liệu hiện có và mục tiêu trải nghiệm để việc tư vấn cụ thể hơn.</p></div></div></div></section>
  </>
}
