// src/pages/TermsPage.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../components/ui/MaterialIcon';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';

export const TermsPage: React.FC = () => {
    const navigate = useNavigate();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="bg-[#FAF8F3] text-[#1E293B] min-h-screen flex flex-col font-sans">
            <PublicHeader />

            <main className="flex-grow pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Nút Quay Lại */}
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 text-[#475569] hover:text-[#0275FB] font-bold text-sm mb-8 transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-white border border-[#CBD5E1] flex items-center justify-center group-hover:border-[#0275FB] group-hover:bg-[#0275FB]/5 transition-all">
                            <MaterialIcon name="arrow_back" className="text-lg" />
                        </div>
                        Quay lại trang trước
                    </button>

                    {/* Header Tài Liệu */}
                    <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-[#FDC908]/30 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#0275FB]/10 to-transparent rounded-bl-full pointer-events-none"></div>

                        <div className="relative z-10 border-b border-[#E2E8F0] pb-8 mb-8">
                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#FFF2C3] border border-[#FDC908] text-[#d97706] text-xs font-black uppercase tracking-widest mb-4 shadow-sm">
                                <MaterialIcon name="gavel" className="text-base" />
                                <span>HistAR Team</span>
                            </div>
                            <h1 className="text-3xl sm:text-5xl font-black text-[#1E293B] tracking-tight mb-4">
                                Điều Khoản <span className="text-[#D97706]">Dịch Vụ</span>
                            </h1>
                            <p className="text-[#64748B] font-medium flex items-center gap-2">
                                <MaterialIcon name="update" className="text-lg" />
                                Hiệu lực từ: 30/09/2026
                            </p>
                        </div>

                        {/* Nội dung chi tiết */}
                        <div className="relative z-10 space-y-10 text-[#334155] leading-relaxed">
                            <div className="p-5 rounded-xl bg-[#FFF2C3]/40 border border-[#FDC908] text-sm font-semibold text-[#92400e]">
                                Việc bạn truy cập, đăng ký tài khoản và sử dụng nền tảng EdTech <strong>TimeLens</strong> đồng nghĩa với việc bạn đồng ý tuân thủ hoàn toàn các điều khoản và điều kiện dưới đây do <strong>HistAR Team</strong> quy định. Vui lòng đọc kỹ trước khi sử dụng.
                            </div>

                            <section className="space-y-4">
                                <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#0275FB] text-white flex items-center justify-center text-sm shadow-md">1</span>
                                    Bản Quyền & Sở Hữu Trí Tuệ
                                </h2>
                                <p>
                                    Nền tảng TimeLens là một sản phẩm trí tuệ độc quyền của <strong>HistAR Team</strong> (thuộc Đại học FPT TP.HCM). Toàn bộ nội dung bao gồm nhưng không giới hạn ở:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-[#0275FB] font-medium">
                                    <li>Mã nguồn (Source code), Kiến trúc phần mềm và thuật toán.</li>
                                    <li>Thiết kế giao diện UI/UX, Logo, Mascot (Chrono) và bộ nhận diện thương hiệu.</li>
                                    <li>Các mô hình thực tế ảo (AR 3D Models), không gian Tour 360° và hệ thống âm thanh, thuyết minh không gian.</li>
                                </ul>
                                <p className="text-sm italic text-[#64748B] border-l-2 border-[#CBD5E1] pl-4">
                                    Nghiêm cấm mọi hành vi sao chép, dịch ngược mã nguồn (reverse engineering), trích xuất mô hình 3D, hoặc sử dụng thương mại các tài sản trên mà không có sự cho phép bằng văn bản từ HistAR.
                                </p>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#0275FB] text-white flex items-center justify-center text-sm shadow-md">2</span>
                                    Giới Hạn Trách Nhiệm Về Trí Tuệ Nhân Tạo (AI)
                                </h2>
                                <div className="p-6 rounded-2xl bg-[#FAF8F3] border border-[#CBD5E1]">
                                    <p className="font-semibold text-[#1E293B] mb-2">Về tính chính xác của dữ liệu lịch sử:</p>
                                    <p className="text-sm">
                                        Hệ thống <strong>Trợ Lý Lịch Sử AI Chrono</strong> được xây dựng dựa trên kiến trúc RAG (Retrieval-Augmented Generation), kết hợp LLM với kho sử liệu chính thống đã được số hóa. Mặc dù chúng tôi nỗ lực loại bỏ hiện tượng "ảo giác AI" (Hallucination), HistAR không đảm bảo độ chính xác tuyệt đối 100% trong mọi ngữ cảnh trò chuyện mở.
                                        <br/><br/>
                                        Người dùng (đặc biệt là học sinh) <strong>bắt buộc phải tham chiếu các nguồn tài liệu trích dẫn (Cited Sources)</strong> được AI đính kèm bên dưới mỗi câu trả lời trước khi sử dụng thông tin vào mục đích nghiên cứu, làm bài tập hoặc thi cử.
                                    </p>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#0275FB] text-white flex items-center justify-center text-sm shadow-md">3</span>
                                    Quy Tắc Hành Xử & Tài Khoản
                                </h2>
                                <p>Để đảm bảo tính công bằng trong hệ thống Gamification và an toàn cho cộng đồng, người dùng cam kết KHÔNG thực hiện các hành vi sau:</p>
                                <ul className="space-y-3 list-none pl-0">
                                    <li className="flex items-start gap-2">
                                        <MaterialIcon name="block" className="text-red-500 mt-0.5" />
                                        <span><strong>Gian lận vị trí (Spoofing):</strong> Sử dụng phần mềm giả mạo GPS (Fake GPS) để check-in nhận điểm thưởng tại các di tích mà không có mặt thực tế.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <MaterialIcon name="block" className="text-red-500 mt-0.5" />
                                        <span><strong>Lạm dụng AI:</strong> Gửi các truy vấn (prompts) chứa nội dung độc hại, vi phạm pháp luật, chống phá Nhà nước hoặc cố tình tiêm nhiễm mã độc (Prompt Injection) vào Trợ lý AI.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <MaterialIcon name="block" className="text-red-500 mt-0.5" />
                                        <span><strong>Chia sẻ tài khoản:</strong> Đối với tài khoản Premium B2C hoặc tài khoản nội bộ B2B, việc chia sẻ quyền truy cập cho nhiều người sử dụng cùng lúc (vượt quá CCU cho phép) sẽ dẫn đến khóa tài khoản vĩnh viễn.</span>
                                    </li>
                                </ul>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#0275FB] text-white flex items-center justify-center text-sm shadow-md">4</span>
                                    Thanh Toán & Hoàn Tiền
                                </h2>
                                <p>
                                    Các giao dịch nâng cấp tài khoản Premium (79.000đ/tháng) hoặc các gói Cấp phép B2B (Software Package Licensing) được xử lý thông qua hệ thống tự động. <strong>Chúng tôi áp dụng chính sách KHÔNG HOÀN TIỀN (Non-refundable)</strong> cho các gói cước đã được kích hoạt thành công, trừ trường hợp hệ thống TimeLens gặp sự cố kỹ thuật ngừng hoạt động quá 48 giờ liên tục.
                                </p>
                            </section>

                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
};