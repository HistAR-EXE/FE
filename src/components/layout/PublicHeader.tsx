// src/components/layout/PublicHeader.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MaterialIcon } from '../ui/MaterialIcon';
import { useAuth } from '../../shared/auth/useAuth';

export const PublicHeader: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation(); // Hook để lấy đường dẫn hiện tại
    const { isAuthenticated, logout } = useAuth(); // Lấy thêm hàm logout (nếu có)
    const [scrolled, setScrolled] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Hiệu ứng đổi màu nền Header khi cuộn trang
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Hiệu ứng click ra ngoài để đóng Dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Hàm kiểm tra Tab đang Active
    const isActive = (path: string) => location.pathname === path;

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-[#0275FB]/15 shadow-[0_4px_30px_rgba(2,117,251,0.05)]' : 'bg-gradient-to-b from-[#FAF8F3] to-transparent'}`}>
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between h-20 sm:h-24">

                {/* LOGO */}
                <Link to="/" className="flex items-center gap-3 sm:gap-4 group">
                    <div className="relative flex items-center">
                        <img src="/brand/logo-histar.png" alt="HistAR Logo" className="relative h-24 sm:h-28 w-auto object-contain drop-shadow-md group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="h-16 w-[2px] bg-[#0275FB]/30 rounded-full hidden sm:block"></div>
                    <div className="flex flex-col justify-center">
                        <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#0275FB] leading-none">TimeLens</span>
                        <span className="text-[11px] font-black text-[#D97706] tracking-widest uppercase mt-1">Heritage EdTech Platform</span>
                    </div>
                </Link>

                {/* MENU ĐIỀU HƯỚNG TỰ ĐỘNG ACTIVE */}
                <nav className="hidden md:flex items-center gap-8 text-sm font-extrabold text-[#475569]">
                    <Link to="/" className={`py-1 transition-colors ${isActive('/') ? 'text-[#0275FB] border-b-2 border-[#0275FB]' : 'hover:text-[#0275FB]'}`}>Trang Chủ</Link>
                    <Link to="/about" className={`py-1 transition-colors ${isActive('/about') ? 'text-[#0275FB] border-b-2 border-[#0275FB]' : 'hover:text-[#0275FB]'}`}>Về HistAR</Link>
                    <Link to="/pricing" className={`py-1 transition-colors ${isActive('/pricing') ? 'text-[#0275FB] border-b-2 border-[#0275FB]' : 'hover:text-[#0275FB]'}`}>Khả Thi Thương Mại</Link>
                </nav>

                {/* KHU VỰC NÚT BẤM / USER DROPDOWN */}
                <div className="flex items-center gap-3 sm:gap-4">
                    {isAuthenticated ? (
                        <div className="flex items-center gap-4">
                            {/* Nút "Vào Không Gian Khám Phá" */}
                            <button onClick={() => navigate('/home')} className="hidden sm:flex px-6 py-2.5 rounded-full bg-[#0275FB] text-white font-extrabold text-xs tracking-wider uppercase hover:bg-[#1d4ed8] transition-all shadow-md items-center gap-2">
                                <span>Vào Không Gian Khám Phá</span>
                                <MaterialIcon name="explore" className="text-base" />
                            </button>

                            {/* User Dropdown */}
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="flex items-center gap-3 bg-white border border-[#CBD5E1] p-1 pr-4 rounded-full hover:border-[#0275FB] transition-colors shadow-sm"
                                >
                                    <img src="https://ui-avatars.com/api/?name=Nguyen+Quoc+Huy&background=FDC908&color=fff" alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0" />
                                    <span className="text-sm font-bold text-[#1E293B] whitespace-nowrap">Nguyễn Quốc Huy</span>
                                    <MaterialIcon name="arrow_drop_down" className={`text-[#64748B] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isDropdownOpen && (
                                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-[#E2E8F0] overflow-hidden py-2 animate-[fadeIn_0.2s_ease-out]">
                                        <div className="px-4 py-3 border-b border-[#F1F5F9] mb-2">
                                            <p className="text-sm font-black text-[#1E293B]">Nguyễn Quốc Huy</p>
                                            <p className="text-xs font-medium text-[#64748B] truncate">Lữ hành mới (Cấp 1)</p>
                                        </div>

                                        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0275FB] transition-colors">
                                            <MaterialIcon name="person" className="text-[20px]" /> Hồ sơ
                                        </Link>

                                        <Link to="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0275FB] transition-colors">
                                            <MaterialIcon name="settings" className="text-[20px]" /> Cài đặt
                                        </Link>
                                        <Link to="/settings/billing" className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0275FB] transition-colors">
                                            <MaterialIcon name="shopping_cart" className="text-[20px]" /> Lịch sử thanh toán
                                        </Link>

                                        <div className="h-[1px] bg-[#F1F5F9] my-2"></div>

                                        <button
                                            onClick={() => { logout?.(); navigate('/login'); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                                        >
                                            <MaterialIcon name="logout" className="text-[20px]" /> Đăng xuất
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <button onClick={() => navigate('/login')} className="px-5 py-2.5 rounded-full border-2 border-[#0275FB]/40 hover:border-[#0275FB] text-[#0275FB] font-extrabold text-xs tracking-wider uppercase transition-all hidden sm:flex items-center gap-1.5 bg-white/50 backdrop-blur-sm">
                                <MaterialIcon name="login" className="text-base text-[#0275FB]" />
                                <span>Đăng nhập</span>
                            </button>
                            <button onClick={() => navigate('/login')} className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#0275FB] to-[#1d4ed8] text-white font-black text-xs tracking-wider uppercase shadow-[0_4px_20px_rgba(2,117,251,0.4)] hover:shadow-[0_6px_25px_rgba(2,117,251,0.6)] hover:scale-105 transition-all flex items-center gap-1.5">
                                <span>Đăng ký</span>
                                <MaterialIcon name="person_add" className="text-base font-bold" />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};