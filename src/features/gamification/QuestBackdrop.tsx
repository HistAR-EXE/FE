// src/features/gamification/QuestBackdrop.tsx
// Nền sáng thương hiệu dùng chung cho trang Nhiệm vụ và trang chi tiết nhiệm vụ (cố định khi cuộn).

export function QuestBackdrop() {
    return (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#DCEBFF]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#C7DDFF_0%,#DCEBFF_40%,#EEF5FF_66%,#FFF2C3_100%)]" />
            <div className="absolute -left-24 -top-32 h-[460px] w-[460px] rounded-full bg-[#0275FB]/20 blur-[120px]" />
            <div className="absolute -bottom-32 -right-24 h-[480px] w-[480px] rounded-full bg-[#FDC908]/35 blur-[120px]" />
            <div className="absolute inset-0 bg-[radial-gradient(#0275FB_1px,transparent_1px)] [background-size:22px_22px] opacity-[0.08]" />
        </div>
    )
}
