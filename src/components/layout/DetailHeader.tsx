// src/components/layout/DetailHeader.tsx
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'

type DetailHeaderProps = {
    backTo?: string
    backLabel?: string
}

export function DetailHeader({
                                 backTo = '/explore',
                                 backLabel = 'Quay lại Khám phá',
                             }: DetailHeaderProps) {
    return (
        <header className="fixed top-0 right-0 left-0 md:left-16 lg:left-[16rem] z-50 hidden md:flex h-16 items-center justify-between border-b-2 border-[#0275FB]/15 bg-white/92 px-6 backdrop-blur-xl shadow-[0_8px_28px_rgba(2,117,251,0.06)] font-sans">
            <Link
                to={backTo}
                className="inline-flex items-center gap-2 rounded-full border border-[#0275FB]/20 bg-[#F2F7FF] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#0275FB] shadow-2xs transition-all hover:border-[#0275FB] hover:bg-[#0275FB] hover:text-white"
            >
                <MaterialIcon name="arrow_back" className="text-base" />
                <span>{backLabel}</span>
            </Link>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-[#475569] shadow-2xs transition-all hover:border-[#0275FB] hover:bg-[#F2F7FF] hover:text-[#0275FB] cursor-pointer"
                >
                    <MaterialIcon name="bookmark" className="text-xl" />
                </button>
                <Link
                    to="/photo-frame"
                    aria-label="Ảnh & chia sẻ"
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#FDC908] bg-[#FFFBEB] text-[#0275FB] shadow-2xs transition-all hover:bg-[#FDC908] hover:text-[#0F1B33]"
                >
                    <MaterialIcon name="share" className="text-xl" />
                </Link>
            </div>
        </header>
    )
}