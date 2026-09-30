// src/pages/PrivacyPage.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../components/ui/MaterialIcon';
import { PublicHeader } from '../components/layout/PublicHeader';
import { PublicFooter } from '../components/layout/PublicFooter';

export const PrivacyPage: React.FC = () => {
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
                    <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-xl border border-[#0275FB]/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#FFF2C3]/60 to-transparent rounded-bl-full pointer-events-none"></div>

                        <div className="relative z-10 border-b border-[#E2E8F0] pb-8 mb-8">
                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#0275FB]/10 border border-[#0275FB]/20 text-[#0275FB] text-xs font-black uppercase tracking-widest mb-4">
                                <MaterialIcon name="shield" className="text-base" />
                                <span>HistAR Team</span>
                            </div>
                            <h1 className="text-3xl sm:text-5xl font-black text-[#1E293B] tracking-tight mb-4">
                                Chính Sách <span className="text-[#0275FB]">Bảo Mật</span>
                            </h1>
                            <p className="text-[#64748B] font-medium flex items-center gap-2">
                                <MaterialIcon name="update" className="text-lg" />
                                Cập nhật lần cuối: 30/09/2026
                            </p>
                        </div>

                        {/* Nội dung chi tiết */}
                        <div className="relative z-10 space-y-10 text-[#334155] leading-relaxed">
                            <p className="text-lg font-medium text-[#475569]">
                                Chào mừng bạn đến với <strong>TimeLens</strong> - Nền tảng công nghệ số hóa di sản và du lịch tương tác do <strong>HistAR Team</strong> phát triển. Việc bảo vệ dữ liệu cá nhân của bạn là ưu tiên hàng đầu của chúng tôi. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn khi bạn tham gia vào các không gian trải nghiệm 360°, sử dụng Trợ lý AI và các tính năng thực địa (O2O).
                            </p>

                            <section className="space-y-4">
                                <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#FDC908] text-white flex items-center justify-center text-sm shadow-md">1</span>
                                    Dữ liệu chúng tôi thu thập
                                </h2>
                                <div className="p-6 rounded-2xl bg-[#FAF8F3] border border-[#CBD5E1] space-y-4">
                                    <ul className="space-y-3 list-none pl-0">
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="badge" className="text-[#0275FB] mt-0.5" />
                                            <div><strong>Thông tin định danh:</strong> Họ tên, địa chỉ email, ảnh đại diện, và mã số học sinh/nhân viên (nếu truy cập qua gói B2B Master Account của Nhà trường/Tổ chức).</div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="pin_drop" className="text-[#0275FB] mt-0.5" />
                                            <div><strong>Dữ liệu Vị trí (Location & Geofencing):</strong> Tọa độ GPS gần đúng chỉ được thu thập <em>khi và chỉ khi</em> bạn chủ động sử dụng tính năng Check-in tại di tích thực tế để nhận XP hoặc mở khóa mô hình AR.</div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="photo_camera" className="text-[#0275FB] mt-0.5" />
                                            <div><strong>Dữ liệu Camera & Hình ảnh:</strong> Sử dụng để quét mã QR và kết xuất các vật thể AR 3D vào môi trường thực tế. TimeLens không lưu trữ hình ảnh cá nhân của bạn trên máy chủ trừ khi bạn chủ động lưu vào "Hồ sơ".</div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="forum" className="text-[#0275FB] mt-0.5" />
                                            <div><strong>Nhật ký Tương tác AI (RAG):</strong> Các đoạn hội thoại giữa bạn và Trợ lý Lịch sử AI Chrono được lưu trữ ẩn danh để cải thiện độ chính xác của ngữ cảnh lịch sử.</div>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <MaterialIcon name="payment" className="text-[#0275FB] mt-0.5" />
                                            <div><strong>Thông tin Thanh toán:</strong> Xử lý qua đối tác cổng thanh toán (SePay/VNPay). HistAR Team <strong>không</strong> lưu trữ số thẻ tín dụng hay dữ liệu ngân hàng nhạy cảm của bạn.</div>
                                        </li>
                                    </ul>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#FDC908] text-white flex items-center justify-center text-sm shadow-md">2</span>
                                    Mục đích sử dụng dữ liệu
                                </h2>
                                <p>Chúng tôi chỉ sử dụng dữ liệu để mang lại trải nghiệm giáo dục và du lịch tốt nhất:</p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-[#0275FB]">
                                    <li>Vận hành hệ thống Gamification: Tính toán điểm XP, thăng cấp Lữ hành, và mở khóa huy hiệu (Badges) trên bảng xếp hạng (Leaderboard).</li>
                                    <li>Xác thực chống gian lận (Anti-fraud) khi người dùng check-in tại các điểm di tích thực địa.</li>
                                    <li>Đối với tài khoản B2B (Khối trường học): Dữ liệu tiến độ học tập và tương tác AI của học sinh (Sub-accounts) sẽ được tổng hợp thành biểu đồ (Heatmap) trên Teacher Dashboard để giáo viên đánh giá.</li>
                                </ul>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#FDC908] text-white flex items-center justify-center text-sm shadow-md">3</span>
                                    Bảo vệ & Chia sẻ dữ liệu
                                </h2>
                                <div className="p-5 border-l-4 border-[#0275FB] bg-[#0275FB]/5 rounded-r-xl">
                                    <p className="font-bold text-[#0275FB]">HistAR Team cam kết nguyên tắc "KHÔNG bán dữ liệu".</p>
                                    <p className="mt-2 text-sm">Toàn bộ mật khẩu và thông tin cá nhân được mã hóa. Dữ liệu của bạn không bao giờ được bán cho bên thứ ba vì mục đích quảng cáo thương mại. Chúng tôi chỉ chia sẻ dữ liệu với cơ quan pháp luật khi có yêu cầu chính thức, hoặc chia sẻ báo cáo học tập nội bộ cho Nhà trường (đối với gói B2B).</p>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h2 className="text-xl sm:text-2xl font-black text-[#1E293B] flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-[#FDC908] text-white flex items-center justify-center text-sm shadow-md">4</span>
                                    Quyền của người dùng
                                </h2>
                                <p>Bạn có toàn quyền kiểm soát đối với dữ liệu của mình trên TimeLens:</p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-[#FDC908]">
                                    <li>Quyền từ chối cấp phép GPS và Camera (bạn vẫn có thể dùng tính năng Tour 360° cơ bản).</li>
                                    <li>Quyền yêu cầu trích xuất toàn bộ lịch sử tương tác và học tập.</li>
                                    <li>Quyền xóa vĩnh viễn tài khoản và toàn bộ dữ liệu liên quan khỏi hệ thống HistAR (Right to be forgotten).</li>
                                </ul>
                            </section>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
};