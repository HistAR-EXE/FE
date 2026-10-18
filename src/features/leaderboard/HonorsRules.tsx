// src/features/leaderboard/HonorsRules.tsx
import { useEffect, useRef } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'

export function HonorsRules({ onClose }: { onClose: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const element = dialog.current
        const previous =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null
        const overflow = document.body.style.overflow
        element?.showModal()
        document.body.style.overflow = 'hidden'
        return () => {
            element?.close()
            document.body.style.overflow = overflow
            previous?.focus()
        }
    }, [])

    return (
        <dialog
            ref={dialog}
            className="honors-dialog rounded-[2.2rem] border-4 border-[#FDC908] bg-white p-0 max-w-xl w-full shadow-[0_25px_80px_rgba(2,117,251,0.35)] text-[#0F1B33] backdrop:bg-[#0F1B33]/70 backdrop:backdrop-blur-sm overflow-hidden"
            aria-labelledby="honors-rules-title"
            onCancel={(event) => {
                event.preventDefault()
                onClose()
            }}
        >
            <header className="bg-gradient-to-r from-[#0353B8] via-[#0275FB] to-[#014296] px-6 py-5 border-b-4 border-[#FDC908] flex items-start justify-between gap-4 text-white">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-[#FFF2C3] flex items-center gap-1.5">
                        <MaterialIcon name="verified" className="text-sm text-[#FDC908]" />
                        <span>Công bằng · Minh bạch · Bền bỉ</span>
                    </p>
                    <h2 id="honors-rules-title" className="text-xl sm:text-2xl font-black mt-1">
                        Ghi nhận cả một hành trình
                    </h2>
                </div>
                <button
                    type="button"
                    className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    aria-label="Đóng nguyên tắc vinh danh"
                    onClick={onClose}
                >
                    <MaterialIcon name="close" className="text-lg" />
                </button>
            </header>

            <div className="p-6 sm:p-7 space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed max-h-[70vh] overflow-y-auto custom-scrollbar">
                <p className="p-4 rounded-2xl bg-[#F2F7FF] border border-[#0275FB]/20 font-medium text-[#0F1B33]">
                    Mỗi điểm XP là một hoạt động được hệ thống ghi nhận. Thứ hạng dựa trên{' '}
                    <strong className="font-black text-[#0275FB]">tổng XP toàn hệ thống</strong>, tích lũy trong suốt hành trình.
                </p>

                <ul className="space-y-2.5">
                    {[
                        'Mọi tài khoản đã đăng nhập, Free và Premium, được áp dụng cùng quy tắc.',
                        'Những người có cùng XP được cùng hạng: ví dụ 1, 1, 3. Thứ tự giữa người đồng hạng không mang ý nghĩa hơn kém.',
                        'Bảng tiêu biểu hiển thị tối đa 10 người. Trong nhóm đồng XP, số huy hiệu sắp thứ tự hiển thị; nếu vẫn bằng nhau, dùng thứ tự tài khoản ổn định. Hạng XP không thay đổi.',
                        'Người ngoài top 10 vẫn thấy hạng thật và các vị trí quanh mình. Các góc vinh danh theo tiêu chí riêng chỉ hiển thị tối đa 3 người tiêu biểu.',
                        'Không chia tuần hay tháng, không đặt lại điểm. Có XP đầu tiên thì bắt đầu được xếp hạng.',
                        'Bảng cộng đồng ghi nhận người dùng thật. Tài khoản quản trị và dữ liệu mẫu hệ thống không tham gia vinh danh chính thức.',
                        'Huy hiệu ghi nhận cột mốc cá nhân, không tự quy đổi thành điểm xếp hạng bổ sung.',
                    ].map((rule, idx) => (
                        <li
                            key={idx}
                            className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 flex items-start gap-3 font-medium"
                        >
                            <span className="w-6 h-6 rounded-full bg-[#0275FB] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <span>{rule}</span>
                        </li>
                    ))}
                </ul>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FFF2C3] to-[#FFFBEB] border border-[#FDC908] font-black text-[#0F1B33] text-center">
                    “Không cần đứng đầu để hành trình của bạn trở nên đáng tự hào.”
                </div>
            </div>

            <footer className="px-6 py-4 bg-[#F8FAFC] border-t border-slate-200 flex justify-end">
                <button
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#FDC908] via-[#FFD93D] to-[#FDB900] hover:brightness-105 text-[#0F1B33] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                    type="button"
                    onClick={onClose}
                >
                    <span>Tiếp bước hành trình</span>
                    <MaterialIcon name="arrow_forward" className="text-base text-[#0275FB]" />
                </button>
            </footer>
        </dialog>
    )
}
