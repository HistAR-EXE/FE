// src/components/layout/PublicFooter.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { MaterialIcon } from '../ui/MaterialIcon';

export const PublicFooter: React.FC = () => {
    return (
        <footer className="bg-gradient-to-br from-[#0275FB] via-[#1A79E5] to-[#0275FB] text-white pt-20 pb-10 border-t-4 border-[#FDC908] relative overflow-hidden shadow-[0_-10px_30px_rgba(2,117,251,0.2)] mt-auto">
            {/* Hiệu ứng ánh sáng hào quang (Glow) làm rực rỡ Footer */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FDC908]/25 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#FFF2C3]/20 rounded-full blur-[90px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                {/* ĐIỀU CHỈNH 1: Đổi lưới thành 12 cột (grid-cols-12) để chia tỷ lệ linh hoạt hơn */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">

                    {/* CỘT 1: Thông tin thương hiệu & Mạng xã hội (Cấp 5/12 cột để có không gian rộng rãi) */}
                    <div className="space-y-6 md:col-span-2 lg:col-span-5 lg:pr-8">
                        {/* ĐIỀU CHỈNH 2: Thêm flex-wrap để nếu màn hình chật, chữ TimeLens sẽ rớt dòng an toàn thay vì đè lên cột bên cạnh */}
                        <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                            <img
                                src="/brand/logo_2.png"
                                alt="HistAR Logo"
                                className="h-12 sm:h-16 w-auto object-contain filter brightness-0 invert opacity-95 drop-shadow-md shrink-0"
                            />

                            <div className="h-10 sm:h-12 w-[2px] bg-[#FDC908]/60 rounded-full shrink-0"></div>

                            <div className="flex flex-col justify-center shrink-0">
                                <span className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm leading-none">TimeLens</span>
                                <span className="text-[10px] font-black text-[#FDC908] tracking-widest uppercase mt-1 drop-shadow-sm">Heritage EdTech</span>
                            </div>
                        </div>
                        <p className="text-sm leading-relaxed text-blue-50 font-medium">
                            Nền tảng công nghệ số hóa di sản và du lịch tương tác. Định hình phương thức kết nối mới giữa cộng đồng hiện đại và các giá trị lịch sử văn hóa.
                        </p>

                        {/* SVG Icons Mạng xã hội */}
                        <div className="flex gap-4">
                            <a href="https://www.tiktok.com/@histar.timelens" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#FDC908] transition-colors border border-white/20 group cursor-pointer shadow-sm backdrop-blur-sm">
                                <svg className="w-4 h-4 fill-white group-hover:fill-[#0275FB] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                                </svg>
                            </a>
                            <a href="https://www.facebook.com/profile.php?id=61594813703026" target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#FDC908] transition-colors border border-white/20 group cursor-pointer shadow-sm backdrop-blur-sm">
                                <svg className="w-5 h-5 fill-white group-hover:fill-[#0275FB] group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* CỘT 2: Link hệ thống (Cấp 3/12 cột) */}
                    <div className="space-y-6 md:col-span-1 lg:col-span-3">
                        <h4 className="text-[#FDC908] font-black tracking-wider uppercase text-sm border-b border-[#FDC908]/30 pb-3 drop-shadow-sm">Hệ Thống Nền Tảng</h4>
                        <ul className="space-y-4 text-sm font-bold text-blue-50">
                            <li><Link to="/explore" className="hover:text-[#FDC908] hover:translate-x-1 inline-block transition-all"><span className="text-[#FDC908] mr-2 font-black">/</span> Bản Đồ Di Sản Số</Link></li>
                            <li><Link to="/quests" className="hover:text-[#FDC908] hover:translate-x-1 inline-block transition-all"><span className="text-[#FDC908] mr-2 font-black">/</span> Hành Trình Tương Tác</Link></li>
                            <li><Link to="/leaderboard" className="hover:text-[#FDC908] hover:translate-x-1 inline-block transition-all"><span className="text-[#FDC908] mr-2 font-black">/</span> Bảng Xếp Hạng Cộng Đồng</Link></li>
                            <li><Link to="/login" className="hover:text-[#FDC908] hover:translate-x-1 inline-block transition-all"><span className="text-[#FDC908] mr-2 font-black">/</span> Cổng Quản Trị Hệ Thống</Link></li>
                        </ul>
                    </div>

                    {/* CỘT 3: Liên hệ (Cấp 4/12 cột) */}
                    <div className="space-y-6 md:col-span-1 lg:col-span-4">
                        <h4 className="text-[#FDC908] font-black tracking-wider uppercase text-sm border-b border-[#FDC908]/30 pb-3 drop-shadow-sm">Liên Hệ & Hợp Tác</h4>
                        <ul className="space-y-4 text-sm font-semibold text-blue-50">
                            <li className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5 border border-white/20 backdrop-blur-md shadow-sm">
                                    <MaterialIcon name="mail" className="text-lg text-[#FDC908]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-blue-200 mb-1 font-bold">Email hợp tác trực tiếp</span>
                                    <a href="mailto:histar.timelens@gmail.com" className="hover:text-[#FDC908] transition-colors text-white font-black text-base drop-shadow-sm break-all">histar.timelens@gmail.com</a>
                                </div>
                            </li>
                            <li className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5 border border-white/20 backdrop-blur-md shadow-sm">
                                    <MaterialIcon name="location_on" className="text-lg text-[#FDC908]" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs text-blue-200 mb-1 font-bold">Trụ sở hoạt động</span>
                                    <span className="leading-relaxed text-white font-medium">Lô E2a-7, Đường D1, Khu Công nghệ cao,<br/> Phường Tăng Nhơn Phú A, TP. Thủ Đức, TP. Hồ Chí Minh</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-white/20 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-blue-100 font-bold tracking-wide">© 2026 HistAR Team (TimeLens Platform). All rights reserved.</p>
                    <div className="flex gap-6 text-xs text-blue-100 font-bold uppercase tracking-wider">
                        <Link to="/privacy" className="hover:text-[#FDC908] transition-colors cursor-pointer">Chính Sách Bảo Mật</Link>
                        <Link to="/terms" className="hover:text-[#FDC908] transition-colors cursor-pointer">Điều Khoản Dịch Vụ</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};