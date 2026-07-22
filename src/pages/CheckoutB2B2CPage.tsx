// src/pages/CheckoutB2B2CPage.tsx
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Button } from '../components/ui/Button'
import { billingApi } from '../features/billing/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'
import { images } from '../assets/images'
import { MaterialIcon } from '../components/ui/MaterialIcon'

export function CheckoutB2B2CPage() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [form, setForm] = useState({
        siteName: '',
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        packageType: 'ONE_TIME' as 'ONE_TIME' | 'OPEX',
        message: '',
    })

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault()
        try {
            setLoading(true)
            await billingApi.submitB2b2cInquiry({
                siteName: form.siteName.trim(),
                contactName: form.contactName.trim(),
                contactEmail: form.contactEmail.trim(),
                contactPhone: form.contactPhone.trim() || undefined,
                packageType: form.packageType,
                message: form.message.trim() || undefined,
            })
            setSubmitted(true)
            showToast({ message: 'Đã gửi yêu cầu số hóa di tích thành công!', type: 'success' })
        } catch (err) {
            showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout>
            {/* THÊM overflow-hidden ĐỂ KHÓA CHẶT THANH CUỘN DỌC CỦA TRÌNH DUYỆT */}
            <div className="relative z-10 flex flex-col h-screen overflow-hidden bg-[#0f1015] text-white font-sans selection:bg-emerald-500 selection:text-white">

                {/* NỀN HIỆU ỨNG TỔNG THỂ CỦA TRANG */}
                <div className="absolute inset-0 z-0 pointer-events-none fixed">
                    <div className="absolute inset-0 bg-cover bg-center opacity-15 scale-105 filter blur-[2px]" style={{ backgroundImage: `url('${images.loginBg || '/media/banner-main.jpg'}')` }} />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0B1120]/90 via-[#0B1120]/95 to-[#064e3b]/30" />
                    <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-emerald-500/10 rounded-[100%] blur-[120px] animate-pulse" />
                    <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-[100%] blur-[120px]" />
                </div>

                <header className="w-full top-0 h-20 shrink-0 flex justify-between items-center px-6 sm:px-12 relative z-20">
                    <div className="flex items-center gap-3">
                        <MaterialIcon name="museum" className="text-emerald-400 text-2xl drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                        <span className="text-sm font-black tracking-widest uppercase text-white drop-shadow-md">Cổng Tư Vấn Số Hóa</span>
                    </div>
                    <button
                        onClick={() => navigate('/pricing')}
                        className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-gray-300 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/60 transition-all backdrop-blur-md shadow-[0_0_15px_rgba(255,255,255,0.05)] cursor-pointer group"
                    >
                        <MaterialIcon name="close" className="text-xl group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </header>

                <main className="flex-1 min-h-0 flex items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 relative z-10">

                    <div className="w-full bg-gradient-to-br from-[#1b1e2c]/95 to-[#062c22]/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 border-t-white/30 shadow-[0_30px_70px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.1)] flex flex-col md:flex-row overflow-hidden relative">

                        <div className="absolute -top-32 -left-32 w-[350px] h-[350px] bg-emerald-500/20 rounded-full blur-[80px] pointer-events-none" />

                        {/* ========================================================= */}
                        {/* CỘT TRÁI: THÔNG ĐIỆP CHÀO MỪNG & LỢI ÍCH */}
                        {/* ========================================================= */}
                        {/* ĐÃ GIẢM PADDING XUỐNG pt-8 pb-8 ĐỂ THU GỌN CHIỀU CAO */}
                        <div className="w-full md:w-[45%] lg:w-[40%] px-8 md:px-10 py-8 border-b md:border-b-0 md:border-r border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent flex flex-col justify-center relative z-10">

                            <div className="mb-6">
                                <span className="inline-block px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                    DÀNH CHO BAN QUẢN LÝ DI TÍCH
                                </span>
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight drop-shadow-md leading-tight">
                                    Đăng Ký Khảo Sát <br/>Số Hóa Không Gian
                                </h1>
                            </div>

                            <p className="text-sm text-gray-300 mb-6 font-medium leading-relaxed">
                                Nâng tầm điểm đến của bạn với công nghệ Panorama 360°, Tour WebAR và Trợ lý AI tương tác. Đội ngũ chuyên gia từ <strong>HistAR Team</strong> sẽ phân tích và phản hồi báo giá tùy chỉnh trong vòng <strong className="text-emerald-400">02 ngày làm việc</strong>.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 bg-[#0B1120]/40 p-3 rounded-2xl border border-white/5">
                                    <MaterialIcon name="monetization_on" className="text-emerald-400 text-xl shrink-0" />
                                    <div>
                                        <p className="text-sm font-black text-white">Dự Án One-time (Mua Đứt)</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">TỪ 50.000.000 VNĐ / SITE</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-[#0B1120]/40 p-3 rounded-2xl border border-white/5">
                                    <MaterialIcon name="autorenew" className="text-emerald-400 text-xl shrink-0" />
                                    <div>
                                        <p className="text-sm font-black text-white">Dự Án OpEx (Thuê Bao Năm)</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">GÓI TOÀN DIỆN 250.000.000 VNĐ / NĂM</p>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* ========================================================= */}
                        {/* CỘT PHẢI: FORM ĐIỀN THÔNG TIN YÊU CẦU TƯ VẤN */}
                        {/* ========================================================= */}
                        {/* ĐÃ THU GỌN PADDING VÀ KHOẢNG CÁCH CÁC Ô NHẬP LIỆU */}
                        <div className="w-full md:w-[55%] lg:w-[60%] px-6 md:px-10 py-6 md:py-8 bg-gradient-to-tl from-[#064e3b]/10 to-transparent flex flex-col justify-center relative z-10">

                            {submitted ? (
                                <div className="flex flex-col items-center text-center animate-[fadeInUp_0.5s_ease-out] py-8">
                                    <div className="w-20 h-20 mb-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)] relative">
                                        <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                                        <MaterialIcon name="check_circle" className="text-5xl text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)] relative z-10" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Gửi Yêu Cầu Thành Công!</h3>
                                    <p className="text-sm text-gray-300 mb-8 max-w-md">
                                        Cảm ơn bạn đã tin tưởng TimeLens. Hồ sơ yêu cầu số hóa của bạn đã được ghi nhận. Chuyên gia của chúng tôi sẽ liên hệ qua Email / Số điện thoại trong vòng 48 giờ tới.
                                    </p>
                                    <Link to="/home" className="w-full max-w-[250px]">
                                        <Button type="button" className="w-full h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer">
                                            Quay Về Trang Chủ
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={(e) => void onSubmit(e)} className="w-full max-w-2xl mx-auto space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        <label className="block space-y-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tên Di Tích / Bảo Tàng <span className="text-red-400">*</span></span>
                                            <input
                                                required
                                                value={form.siteName}
                                                onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))}
                                                className="w-full bg-[#0B1120]/60 border border-white/10 focus:border-emerald-500/50 rounded-lg px-3 py-2.5 text-sm text-white font-medium focus:outline-none transition-all shadow-inner placeholder:text-gray-600"
                                                placeholder="VD: Bảo Tàng Chứng Tích Chiến Tranh"
                                            />
                                        </label>
                                        <label className="block space-y-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Họ Tên Người Liên Hệ <span className="text-red-400">*</span></span>
                                            <input
                                                required
                                                value={form.contactName}
                                                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                                                className="w-full bg-[#0B1120]/60 border border-white/10 focus:border-emerald-500/50 rounded-lg px-3 py-2.5 text-sm text-white font-medium focus:outline-none transition-all shadow-inner placeholder:text-gray-600"
                                                placeholder="VD: Nguyễn Văn A"
                                            />
                                        </label>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                        <label className="block space-y-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Địa Chỉ Email <span className="text-red-400">*</span></span>
                                            <input
                                                required
                                                type="email"
                                                value={form.contactEmail}
                                                onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                                                className="w-full bg-[#0B1120]/60 border border-white/10 focus:border-emerald-500/50 rounded-lg px-3 py-2.5 text-sm text-white font-medium focus:outline-none transition-all shadow-inner placeholder:text-gray-600"
                                                placeholder="lienhe@baotang.gov.vn"
                                            />
                                        </label>
                                        <label className="block space-y-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Số Điện Thoại</span>
                                            <input
                                                type="tel"
                                                value={form.contactPhone}
                                                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                                                className="w-full bg-[#0B1120]/60 border border-white/10 focus:border-emerald-500/50 rounded-lg px-3 py-2.5 text-sm text-white font-medium focus:outline-none transition-all shadow-inner placeholder:text-gray-600"
                                                placeholder="090 123 4567"
                                            />
                                        </label>
                                    </div>

                                    <label className="block space-y-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Gói Hình Thức Triển Khai</span>
                                        <select
                                            value={form.packageType}
                                            onChange={(e) => setForm((f) => ({ ...f, packageType: e.target.value as 'ONE_TIME' | 'OPEX' }))}
                                            className="w-full bg-[#0B1120]/60 border border-white/10 focus:border-emerald-500/50 rounded-lg px-3 py-2.5 text-sm text-white font-bold focus:outline-none transition-all appearance-none shadow-inner"
                                        >
                                            <option value="ONE_TIME">Dự Án One-time (Mua Đứt) — Từ 50.000.000 VNĐ / Site</option>
                                            <option value="OPEX">Dự Án OpEx (Thuê Bao Hàng Năm) — Gói Toàn Diện 250 Triệu</option>
                                        </select>
                                    </label>

                                    {/* ĐÃ GIẢM MIN-HEIGHT CỦA TEXTAREA */}
                                    <label className="block space-y-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ghi Chú Yêu Cầu / Quy Mô Dự Kiến</span>
                                        <textarea
                                            value={form.message}
                                            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                                            className="w-full bg-[#0B1120]/60 border border-white/10 focus:border-emerald-500/50 rounded-lg px-3 py-2.5 text-sm text-white font-medium focus:outline-none transition-all shadow-inner min-h-[70px] resize-none placeholder:text-gray-600 custom-scrollbar"
                                            placeholder="Cung cấp thêm thông tin về diện tích, số lượng hiện vật..."
                                        />
                                    </label>

                                    <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                                        <Link to="/pricing" className="w-full sm:w-1/3">
                                            <Button type="button" className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer">
                                                Hủy Bỏ
                                            </Button>
                                        </Link>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full sm:w-2/3 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-teal-500 hover:to-emerald-500 text-black font-black text-xs uppercase tracking-wider shadow-[0_5px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            {loading ? <><MaterialIcon name="hourglass_empty" className="animate-spin text-base" /> Đang gửi...</> : <><MaterialIcon name="send" className="text-base" /> Gửi Yêu Cầu Khảo Sát</>}
                                        </Button>
                                    </div>
                                </form>
                            )}

                        </div>

                    </div>
                </main>
            </div>
        </AuthLayout>
    )
}