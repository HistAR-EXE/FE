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
import { CU_CHI_LOCATION_ID, PILOT_SITES } from '../shared/config/constants'

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
        website: '',
        interestSiteCode: 'cu-chi' as
            | 'cu-chi'
            | 'hoang-thanh-thang-long'
            | 'dai-noi-hue',
    })

    const onSubmit = async (e: FormEvent) => {
        e.preventDefault()
        const siteName = form.siteName.trim()
        const contactName = form.contactName.trim()
        const contactEmail = form.contactEmail.trim()
        if (!siteName || !contactName || !contactEmail) {
            showToast({
                message: 'Vui lòng điền tên di tích, họ tên và email liên hệ.',
                type: 'error',
            })
            return
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
            showToast({
                message: 'Email liên hệ chưa đúng định dạng.',
                type: 'error',
            })
            return
        }
        if (form.website.trim()) {
            return
        }
        try {
            setLoading(true)
            await billingApi.submitB2b2cInquiry({
                siteName,
                contactName,
                contactEmail,
                contactPhone: form.contactPhone.trim() || undefined,
                packageType: form.packageType,
                message: form.message.trim() || undefined,
                website: form.website.trim() || undefined,
                interestSiteCode: form.interestSiteCode,
            })
            setSubmitted(true)
            showToast({
                message: 'Đã gửi yêu cầu. Đội ngũ sẽ phản hồi trong 02 ngày làm việc.',
                type: 'success',
            })
        } catch (err) {
            showToast({
                message: getFriendlyErrorMessage(err, 'quest'),
                type: 'error',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthLayout>
            <div className="relative z-10 flex h-screen flex-col overflow-hidden bg-[#07132C] font-sans text-white selection:bg-[#FDC908] selection:text-[#0F1B33]">
                {/* NỀN HIỆU ỨNG TỔNG THỂ CỦA TRANG THEO CHUẨN TIMELENS */}
                <div className="pointer-events-none fixed absolute inset-0 z-0">
                    <div
                        className="absolute inset-0 scale-105 bg-cover bg-center opacity-15 blur-[2px] filter"
                        style={{
                            backgroundImage: `url('${images.loginBg || '/media/banner-main.jpg'}')`,
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[#07132C]/90 via-[#0B1B3D]/95 to-[#0275FB]/30" />
                    <div className="absolute left-1/4 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-[100%] bg-[#FDC908]/10 blur-[120px]" />
                    <div className="absolute right-1/4 top-1/2 h-[600px] w-[600px] translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-[#0275FB]/15 blur-[120px]" />
                    <div
                        className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10"
                        aria-hidden="true"
                    />
                </div>

                <header className="relative z-20 flex h-20 w-full shrink-0 items-center justify-between px-6 sm:px-12">
                    <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FDC908] bg-[#0F1B33]/80 shadow-[0_0_15px_rgba(253,201,8,0.3)]">
              <MaterialIcon name="museum" className="text-xl text-[#FDC908]" />
            </span>
                        <span className="text-[11px] font-black uppercase tracking-widest text-white drop-shadow-md">
              Cổng Tư Vấn Số Hóa
            </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/pricing')}
                        className="group flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-gray-300 shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-md transition-all hover:border-[#FDC908]/60 hover:bg-[#FDC908]/20 hover:text-[#FDC908]"
                    >
                        <MaterialIcon
                            name="close"
                            className="text-xl transition-transform duration-300 group-hover:rotate-90"
                        />
                    </button>
                </header>

                <main className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 min-h-0 items-center justify-center px-4 pb-6 sm:px-6 lg:px-8">
                    <div className="relative flex w-full flex-col overflow-hidden rounded-[2.5rem] border-2 border-[#FDC908] bg-gradient-to-br from-[#0F1B33]/95 to-[#014296]/60 shadow-[0_30px_70px_rgba(7,19,44,0.8),0_0_30px_rgba(2,117,251,0.15)] backdrop-blur-3xl md:flex-row">
                        <div className="pointer-events-none absolute -left-32 -top-32 h-[350px] w-[350px] rounded-full bg-[#0275FB]/25 blur-[80px]" />

                        {/* ========================================================= */}
                        {/* CỘT TRÁI: THÔNG ĐIỆP CHÀO MỪNG & LỢI ÍCH */}
                        {/* ========================================================= */}
                        <div className="relative z-10 flex w-full flex-col justify-center border-b border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent px-8 py-8 md:w-[45%] md:border-b-0 md:border-r lg:w-[42%] lg:px-10">
                            <div className="mb-6">
                <span className="mb-3 inline-block rounded-lg border border-[#FDC908]/50 bg-[#FDC908]/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#FDC908] shadow-[0_0_15px_rgba(253,201,8,0.2)]">
                  DÀNH CHO BAN QUẢN LÝ DI TÍCH
                </span>
                                <h1 className="font-['Montserrat'] text-3xl font-black leading-tight tracking-tight text-white drop-shadow-md md:text-4xl">
                                    Đăng Ký Khảo Sát <br />
                                    Số Hóa Không Gian
                                </h1>
                            </div>

                            <p className="mb-6 text-sm font-medium leading-relaxed text-blue-100">
                                Nâng tầm điểm đến của bạn với công nghệ Panorama 360°, Tour
                                WebAR và Trợ lý AI tương tác. Đội ngũ chuyên gia từ{' '}
                                <strong>HistAR Team</strong> sẽ phân tích và phản hồi báo giá
                                tùy chỉnh trong vòng{' '}
                                <strong className="text-[#FDC908]">02 ngày làm việc</strong>.
                            </p>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07132C]/50 p-3 shadow-inner">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0275FB]/20">
                    <MaterialIcon
                        name="view_in_ar"
                        className="text-lg text-[#0275FB]"
                    />
                  </span>
                                    <p className="text-xs font-semibold text-gray-200">
                                        Panorama 360°, hotspot AR và trợ lý AI theo từng di tích.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07132C]/50 p-3 shadow-inner">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0275FB]/20">
                    <MaterialIcon
                        name="analytics"
                        className="text-lg text-[#0275FB]"
                    />
                  </span>
                                    <p className="text-xs font-semibold text-gray-200">
                                        Bảng thống kê visit_sessions &amp; phễu onsite cho ban quản
                                        lý.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#07132C]/50 p-3 shadow-inner">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0275FB]/20">
                    <MaterialIcon
                        name="support_agent"
                        className="text-lg text-[#0275FB]"
                    />
                  </span>
                                    <p className="text-xs font-semibold text-gray-200">
                                        Triển khai &amp; vận hành kèm đội HistAR — báo giá theo quy
                                        mô site.
                                    </p>
                                </div>

                                <Link
                                    to={`/tour/360/${CU_CHI_LOCATION_ID}`}
                                    className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-[#FDC908] underline transition-colors hover:text-white"
                                >
                                    <MaterialIcon name="map" className="text-sm" />
                                    Xem mẫu tour Củ Chi trên web
                                </Link>

                                <div className="flex items-center gap-3 rounded-2xl border border-[#FDC908]/30 bg-gradient-to-r from-[#0353B8]/30 to-[#07132C]/50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FDC908]/20">
                    <MaterialIcon
                        name="monetization_on"
                        className="text-lg text-[#FDC908]"
                    />
                  </span>
                                    <div>
                                        <p className="text-xs font-black text-white">
                                            Dự Án One-time (Mua Đứt)
                                        </p>
                                        <p className="mt-0.5 text-[9.5px] font-black uppercase tracking-wider text-[#93C5FD]">
                                            TỪ 50.000.000 VNĐ / SITE
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ========================================================= */}
                        {/* CỘT PHẢI: FORM ĐIỀN THÔNG TIN YÊU CẦU TƯ VẤN */}
                        {/* ========================================================= */}
                        <div className="relative z-10 flex w-full flex-col justify-center bg-gradient-to-tl from-[#0275FB]/10 to-transparent px-6 py-6 md:w-[55%] lg:w-[58%] lg:px-10 lg:py-8">
                            {submitted ? (
                                <div className="flex animate-[fadeInUp_0.5s_ease-out] flex-col items-center py-8 text-center">
                                    <div className="relative mb-5 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#FDC908]/60 bg-[#FDC908]/15 shadow-[0_0_40px_rgba(253,201,8,0.25)]">
                                        <div className="absolute inset-0 animate-ping rounded-full bg-[#FDC908]/25" />
                                        <MaterialIcon
                                            name="check_circle"
                                            className="relative z-10 text-6xl text-[#FDC908] drop-shadow-[0_0_15px_rgba(253,201,8,0.6)]"
                                        />
                                    </div>
                                    <h3 className="mb-3 font-['Montserrat'] text-2xl font-black tracking-tight text-white">
                                        Gửi Yêu Cầu Thành Công!
                                    </h3>
                                    <p className="mb-8 max-w-md text-sm font-medium leading-relaxed text-blue-100">
                                        Cảm ơn bạn đã tin tưởng TimeLens. Hồ sơ yêu cầu số hóa của
                                        bạn đã được ghi nhận. Chuyên gia của chúng tôi sẽ liên hệ
                                        qua Email / Số điện thoại trong vòng 48 giờ tới.
                                    </p>
                                    <Link to="/home" className="w-full max-w-[260px]">
                                        <Button
                                            type="button"
                                            className="h-12 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 text-xs font-black uppercase tracking-widest text-white transition-all hover:border-[#FDC908] hover:bg-[#FDC908] hover:text-[#0F1B33]"
                                        >
                                            Quay Về Trang Chủ
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <form
                                    onSubmit={(e) => void onSubmit(e)}
                                    className="mx-auto w-full max-w-2xl space-y-4"
                                >
                                    <input
                                        type="text"
                                        name="website"
                                        value={form.website}
                                        onChange={(e) =>
                                            setForm((f) => ({ ...f, website: e.target.value }))
                                        }
                                        className="hidden"
                                        tabIndex={-1}
                                        autoComplete="off"
                                        aria-hidden
                                    />

                                    <label className="block space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                      Pilot site quan tâm{' '}
                        <span className="text-[#FDC908]">*</span>
                    </span>
                                        <select
                                            required
                                            value={form.interestSiteCode}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    interestSiteCode: e.target.value as typeof f.interestSiteCode,
                                                }))
                                            }
                                            className="w-full appearance-none rounded-xl border border-white/20 bg-[#0F1B33]/80 px-4 py-3 text-sm font-bold text-white shadow-inner transition-colors focus:border-[#0275FB] focus:outline-none"
                                            data-testid="b2b2c-interest-site"
                                        >
                                            {PILOT_SITES.map((s) => (
                                                <option key={s.siteCode} value={s.siteCode}>
                                                    {s.region} · {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="block space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                        Tên Di Tích / Bảo Tàng{' '}
                          <span className="text-[#FDC908]">*</span>
                      </span>
                                            <input
                                                required
                                                value={form.siteName}
                                                onChange={(e) =>
                                                    setForm((f) => ({ ...f, siteName: e.target.value }))
                                                }
                                                className="w-full rounded-xl border border-white/20 bg-[#0F1B33]/80 px-4 py-3 text-sm font-semibold text-white shadow-inner transition-colors placeholder:font-medium placeholder:text-blue-300/50 focus:border-[#0275FB] focus:outline-none"
                                                placeholder="VD: Bảo Tàng Chứng Tích Chiến Tranh"
                                            />
                                        </label>
                                        <label className="block space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                        Họ Tên Người Liên Hệ{' '}
                          <span className="text-[#FDC908]">*</span>
                      </span>
                                            <input
                                                required
                                                value={form.contactName}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        contactName: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-xl border border-white/20 bg-[#0F1B33]/80 px-4 py-3 text-sm font-semibold text-white shadow-inner transition-colors placeholder:font-medium placeholder:text-blue-300/50 focus:border-[#0275FB] focus:outline-none"
                                                placeholder="VD: Nguyễn Văn A"
                                            />
                                        </label>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <label className="block space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                        Địa Chỉ Email <span className="text-[#FDC908]">*</span>
                      </span>
                                            <input
                                                required
                                                type="email"
                                                value={form.contactEmail}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        contactEmail: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-xl border border-white/20 bg-[#0F1B33]/80 px-4 py-3 text-sm font-semibold text-white shadow-inner transition-colors placeholder:font-medium placeholder:text-blue-300/50 focus:border-[#0275FB] focus:outline-none"
                                                placeholder="lienhe@baotang.gov.vn"
                                            />
                                        </label>
                                        <label className="block space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                        Số Điện Thoại
                      </span>
                                            <input
                                                type="tel"
                                                value={form.contactPhone}
                                                onChange={(e) =>
                                                    setForm((f) => ({
                                                        ...f,
                                                        contactPhone: e.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-xl border border-white/20 bg-[#0F1B33]/80 px-4 py-3 text-sm font-semibold text-white shadow-inner transition-colors placeholder:font-medium placeholder:text-blue-300/50 focus:border-[#0275FB] focus:outline-none"
                                                placeholder="090 123 4567"
                                            />
                                        </label>
                                    </div>

                                    <label className="block space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                      Gói Hình Thức Triển Khai
                    </span>
                                        <select
                                            value={form.packageType}
                                            onChange={(e) =>
                                                setForm((f) => ({
                                                    ...f,
                                                    packageType: e.target.value as 'ONE_TIME' | 'OPEX',
                                                }))
                                            }
                                            className="w-full appearance-none rounded-xl border border-white/20 bg-[#0F1B33]/80 px-4 py-3 text-sm font-bold text-white shadow-inner transition-colors focus:border-[#0275FB] focus:outline-none"
                                        >
                                            <option value="ONE_TIME">
                                                Dự Án One-time (Mua Đứt) — Từ 50.000.000 VNĐ / Site
                                            </option>
                                            <option value="OPEX">
                                                Dự Án OpEx (Thuê Bao Hàng Năm) — Gói Toàn Diện 250 Triệu
                                            </option>
                                        </select>
                                    </label>

                                    <label className="block space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-200">
                      Ghi Chú Yêu Cầu / Quy Mô Dự Kiến
                    </span>
                                        <textarea
                                            value={form.message}
                                            onChange={(e) =>
                                                setForm((f) => ({ ...f, message: e.target.value }))
                                            }
                                            className="custom-scrollbar min-h-[70px] w-full resize-none rounded-xl border border-white/20 bg-[#0F1B33]/80 px-4 py-3 text-sm font-semibold text-white shadow-inner transition-colors placeholder:font-medium placeholder:text-blue-300/50 focus:border-[#0275FB] focus:outline-none"
                                            placeholder="Cung cấp thêm thông tin về diện tích, số lượng hiện vật..."
                                        />
                                    </label>

                                    <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row">
                                        <Link to="/pricing" className="w-full sm:w-[35%]">
                                            <Button
                                                type="button"
                                                className="h-12 w-full cursor-pointer items-center justify-center rounded-xl border-2 border-[#0275FB]/40 bg-white/5 text-xs font-black uppercase tracking-widest text-white transition-all hover:border-[#0275FB] hover:bg-white/15"
                                            >
                                                Hủy Bỏ
                                            </Button>
                                        </Link>
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                            className="flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border-2 border-white/20 bg-gradient-to-r from-[#0353B8] via-[#0275FB] to-[#014296] text-xs font-black uppercase tracking-wider text-white shadow-[0_8px_25px_rgba(2,117,251,0.35)] transition-all hover:brightness-110 sm:w-[65%]"
                                        >
                                            {loading ? (
                                                <>
                                                    <MaterialIcon
                                                        name="hourglass_empty"
                                                        className="animate-spin text-lg"
                                                    />{' '}
                                                    Đang gửi...
                                                </>
                                            ) : (
                                                <>
                                                    <MaterialIcon
                                                        name="send"
                                                        className="text-lg text-[#FDC908]"
                                                    />{' '}
                                                    Gửi Yêu Cầu Khảo Sát
                                                </>
                                            )}
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