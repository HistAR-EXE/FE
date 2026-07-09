// src/features/gamification/QuestJourneyPanel.tsx
import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { EraLockedModal } from '../../components/monetization/EraLockedModal'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { analyticsApi } from '../analytics/api'
import { shouldShowB2CPaywall } from '../../shared/access/contentAccess'
import { useAuth } from '../../shared/auth/useAuth'
import { useAppMode } from '../../shared/context/useAppMode'
import type { QuestStep } from './api'

type QuestJourneyPanelProps = {
    steps: QuestStep[]
    questId: string
    locationId: string
    status: string
    currentStep: number
    hasCheckin?: boolean
    stepImages?: Record<string, string>
}

// Logic kiểm tra Node Premium từ Back-end
function isPremiumPortalStep(step: QuestStep): boolean {
    if (step.actionType !== 'portal') return false
    const era = step.portalEra
    return era === 1948 || era === 1968
}

export function QuestJourneyPanel({
                                      steps,
                                      questId,
                                      locationId,
                                      status,
                                      currentStep,
                                      stepImages, // Đã gỡ bỏ hasCheckin ở đây để fix lỗi TS6133
                                  }: QuestJourneyPanelProps) {
    const { mode } = useAppMode()
    const { user } = useAuth()
    const isOnline = mode !== 'offline'

    // Logic hiển thị Paywall của đồng đội
    const showPaywall = shouldShowB2CPaywall(user)
    const [eraModalOpen, setEraModalOpen] = useState(false)
    const [paywallEra, setPaywallEra] = useState<number>(1948)

    const openStepperPaywall = useCallback((era: number) => {
        setPaywallEra(era)
        setEraModalOpen(true)
        void analyticsApi.recordEvent({
            eventType: 'PAYWALL_ERA_LOCKED_VIEW',
            locationId: locationId || undefined,
            source: 'quest_stepper',
        })
    }, [locationId])

    const onUpgradeClick = useCallback(() => {
        void analyticsApi.recordEvent({
            eventType: 'PAYWALL_ERA_UPGRADE_CLICK',
            locationId: locationId || undefined,
            source: 'quest_stepper',
        })
    }, [locationId])

    const pricingHref = `/pricing?next=${encodeURIComponent(
        typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/quests',
    )}`

    if (!steps || steps.length === 0) return null

    return (
        <div className="relative mt-12 mb-12">
            <h3 className="font-black text-2xl text-white mb-8 flex items-center gap-3 border-b border-white/10 pb-4">
                <MaterialIcon name="radar" className="text-[#fe951c] text-3xl drop-shadow-[0_0_8px_#fe951c]" />
                TIẾN TRÌNH CHIẾN DỊCH
            </h3>

            <div className="relative space-y-6 md:space-y-10">
                {/* Trục năng lượng chưa kích hoạt */}
                <div className="absolute left-[39px] md:left-[47px] top-8 bottom-8 w-1 bg-[#1a1c29] rounded-full shadow-inner" aria-hidden />

                {/* Trục năng lượng SÁNG LÊN */}
                {status !== 'not_started' && steps.length > 0 && (
                    <div
                        className="absolute left-[39px] md:left-[47px] top-8 w-1 bg-gradient-to-b from-[#fe951c] via-[#fdb438] to-[#388cf1] shadow-[0_0_15px_#fdb438] transition-all duration-1000 ease-out rounded-full"
                        style={{ height: `calc(${(currentStep / steps.length) * 100}% - 32px)` }}
                        aria-hidden
                    />
                )}

                {steps.map((step, index) => {
                    const isCompleted = status === 'completed' || currentStep > index
                    const isActive = status === 'in_progress' && currentStep === index
                    const isLocked = status === 'not_started' || (status === 'in_progress' && currentStep < index)

                    // Kiểm tra Node này có dính Paywall hay không
                    const portalLocked = showPaywall && isPremiumPortalStep(step) && !isCompleted

                    const imageUrl = stepImages?.[step.unlockKey] || step.previewImage

                    // Logic tạo Link truy xuất
                    let href = `/explore/${locationId}`
                    if (step.actionType === 'artifact') href = `/artifacts?locationId=${locationId}&discoverKey=${step.unlockKey}`
                    if (step.actionType === 'tour') href = `/tour/360/${locationId}?panorama=${step.unlockKey.replace('scene:', '')}`
                    if (step.actionType === 'portal') href = `/time-portal/${locationId}?era=${step.portalEra ?? 2026}`
                    if (step.actionType === 'checkin') href = `/scan?locationId=${locationId}`
                    if (step.actionType === 'dialogue') {
                        const persona = step.unlockKey.replace('dialogue:', '')
                        href = `/chat?locationId=${locationId}&persona=${persona}&questPrompt=${encodeURIComponent(step.chatPrompt || '')}&questId=${questId}`
                    }

                    // Tên Action Label thông minh phân biệt Online/Offline
                    let ctaLabel = step.actionLabel || 'TRUY XUẤT'
                    if (!step.actionLabel) {
                        if (step.actionType === 'artifact') ctaLabel = isOnline ? 'CHIÊM NGƯỠNG HIỆN VẬT' : 'QUÉT AR MÔ HÌNH 3D'
                        if (step.actionType === 'tour') ctaLabel = 'THÂM NHẬP TOUR 360°'
                        if (step.actionType === 'portal') ctaLabel = 'MỞ CỔNG THỜI GIAN'
                        if (step.actionType === 'dialogue') ctaLabel = 'THẨM VẤN ĐẠI SỨ'
                    }

                    const getIcon = () => {
                        if (step.actionType === 'artifact') return isOnline ? 'view_in_ar' : 'document_scanner'
                        if (step.actionType === 'tour') return '360'
                        if (step.actionType === 'portal') return 'history'
                        if (step.actionType === 'dialogue') return 'record_voice_over'
                        if (step.actionType === 'checkin') return 'my_location'
                        return 'diamond'
                    }

                    return (
                        <div key={step.id || index} className={`relative flex items-start gap-4 md:gap-8 transition-all duration-700 ${isLocked || portalLocked ? 'opacity-40 grayscale' : 'opacity-100'}`}>

                            {/* KHỐI NODE ICON */}
                            <div className="relative z-10 shrink-0 mt-2 md:mt-0">
                                {isActive && !portalLocked && (
                                    <div className="absolute inset-0 rounded-3xl bg-[#fe951c]/20 animate-ping" />
                                )}

                                <div className={`relative w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center border-2 shadow-2xl overflow-hidden bg-[#0f1015] transition-colors duration-500 ${
                                    isCompleted ? 'border-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.3)]' :
                                        isActive && !portalLocked ? 'border-[#fe951c] bg-[#fe951c]/10 shadow-[0_0_35px_rgba(254,149,28,0.5)]' :
                                            'border-white/10'
                                }`}>
                                    {imageUrl ? (
                                        <>
                                            <img src={imageUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1015]/90 to-transparent" />
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                                    )}

                                    {!isCompleted && !isLocked && !portalLocked && (
                                        <MaterialIcon name={getIcon()} className={`absolute text-4xl drop-shadow-2xl ${isActive ? 'text-[#fe951c]' : 'text-white'}`} />
                                    )}

                                    {isCompleted && (
                                        <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[2px] flex items-center justify-center">
                                            <MaterialIcon name="check_circle" className="text-4xl md:text-5xl text-emerald-400 drop-shadow-[0_0_15px_#10b981]" />
                                        </div>
                                    )}
                                    {(isLocked || portalLocked) && (
                                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                            <MaterialIcon name="lock" className="text-3xl text-gray-500" />
                                        </div>
                                    )}
                                </div>

                                {/* Node Number Badge */}
                                <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs md:text-sm border-[3px] border-[#0f1015] shadow-lg transition-colors ${
                                    isCompleted ? 'bg-emerald-500 text-black' :
                                        isActive && !portalLocked ? 'bg-[#fe951c] text-black shadow-[0_0_15px_#fe951c]' :
                                            'bg-[#1b1e2c] text-gray-400'
                                }`}>
                                    {index + 1}
                                </div>
                            </div>

                            {/* KHỐI THÔNG TIN BƯỚC */}
                            <div className={`flex-1 p-5 md:p-7 rounded-3xl border bg-[#161824]/80 backdrop-blur-md transition-all duration-500 ${
                                isActive && !portalLocked ? 'border-[#fe951c]/50 shadow-[0_10px_40px_rgba(254,149,28,0.15)] transform md:-translate-y-1' : 'border-white/5'
                            }`}>
                                <div className="flex items-start justify-between gap-4 flex-col sm:flex-row sm:flex-wrap">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <span className={`px-2.5 py-1 rounded text-[9px] md:text-[10px] font-black uppercase tracking-widest border ${
                                                isCompleted ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                                                    isActive ? 'bg-[#fe951c]/10 border-[#fe951c]/30 text-[#fe951c]' :
                                                        'bg-white/5 border-white/10 text-gray-500'
                                            }`}>
                                                NODE {index + 1}
                                            </span>
                                            {step.actionType === 'artifact' && !isOnline && (
                                                <span className="px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                    <MaterialIcon name="document_scanner" className="text-[12px]" /> NHIỆM VỤ QUÉT AR (THỰC TẾ)
                                                </span>
                                            )}
                                            {/* Hiện Tag Premium nếu bị khóa */}
                                            {portalLocked && (
                                                <span className="px-2.5 py-1 rounded bg-[#fdb438]/10 border border-[#fdb438]/30 text-[#fdb438] text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                                                    <MaterialIcon name="stars" className="text-[12px]" /> PREMIUM
                                                </span>
                                            )}
                                        </div>
                                        <h4 className={`text-xl md:text-2xl font-black leading-tight mb-1 ${isActive && !portalLocked ? 'text-white' : 'text-gray-300'}`}>{step.title}</h4>
                                        <p className={`text-xs md:text-sm font-bold mt-1.5 uppercase tracking-wider ${isActive && !portalLocked ? 'text-[#388cf1]' : 'text-gray-500'}`}>
                                            MỤC TIÊU: {step.objective}
                                        </p>
                                    </div>

                                    {step.xpPartial && (
                                        <div className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/5 shadow-inner">
                                            <MaterialIcon name="stars" className={`text-lg ${isCompleted ? 'text-emerald-400' : 'text-[#fdb438]'}`} />
                                            <span className={`text-xs font-black ${isCompleted ? 'text-emerald-400' : 'text-white'}`}>
                                                +{step.xpPartial} XP
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-white/5">
                                    <p className="text-sm md:text-base text-gray-400 leading-relaxed font-medium">
                                        {step.description}
                                    </p>
                                </div>

                                {step.hint && (isActive || isCompleted) && !portalLocked && (
                                    <div className="mt-5 p-3 md:p-4 rounded-2xl bg-[#fe951c]/5 border border-[#fe951c]/20 flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#fe951c]/20 flex items-center justify-center shrink-0 mt-0.5">
                                            <MaterialIcon name="lightbulb" className="text-base text-[#fdb438]" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black text-[#fe951c] uppercase tracking-widest block mb-1">Gợi ý từ Hệ thống</span>
                                            <span className="text-sm text-gray-300 font-medium leading-relaxed">{step.hint}</span>
                                        </div>
                                    </div>
                                )}

                                {/* NÚT HÀNH ĐỘNG THÔNG MINH */}
                                {isActive && (
                                    <div className="mt-6">
                                        {portalLocked ? (
                                            <button
                                                type="button"
                                                onClick={() => openStepperPaywall(step.portalEra ?? 1948)}
                                                className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl bg-gradient-to-r from-gray-800 to-gray-700 text-white font-black text-xs md:text-sm uppercase tracking-widest border border-gray-600 transition-all hover:scale-105 hover:border-[#fdb438] hover:shadow-[0_0_20px_rgba(253,180,56,0.3)] cursor-pointer"
                                            >
                                                <MaterialIcon name="lock" className="text-base md:text-lg text-[#fdb438]" /> MỞ KHÓA ERA {step.portalEra}
                                            </button>
                                        ) : (
                                            <Link to={href} className="inline-flex items-center justify-center w-full sm:w-auto gap-2 px-6 py-3.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl bg-gradient-to-r from-[#fe951c] to-[#e07d0b] text-black font-black text-xs md:text-sm uppercase tracking-widest shadow-[0_5px_20px_rgba(254,149,28,0.4)] transition-all hover:scale-105 hover:shadow-[0_8px_30px_rgba(254,149,28,0.6)]">
                                                <MaterialIcon name={getIcon()} className="text-base md:text-lg" /> {ctaLabel}
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    )
                })}
            </div>

            {/* Modal Thanh toán được giữ lại nguyên vẹn từ logic Backend */}
            <EraLockedModal
                open={eraModalOpen}
                onClose={() => setEraModalOpen(false)}
                eraLabel={paywallEra}
                xpBonus={50}
                pricingHref={pricingHref}
                onUpgradeClick={onUpgradeClick}
            />
        </div>
    )
}