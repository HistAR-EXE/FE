// src/features/gamification/QuestStepList.tsx
// Danh sách bước của một nhiệm vụ (API v2). Trạng thái từng bước do BE tính theo khóa, không theo vị trí.

import { Link } from 'react-router-dom'
import { SaBanQuizButton } from './SaBanQuizButton'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { siteCodeFromLocationId } from '../../shared/config/constants'
import { SmartImage } from '../../shared/ui/SmartImage'
import { questStepAction, questStepIcon } from './questStepAction'
import type { QuestV2Card, QuestV2Step } from './questsV2Api'

type Props = {
    quest: QuestV2Card
    steps: QuestV2Step[]
    onOpenArtifact: (step: QuestV2Step) => void
    onPremium: (step: QuestV2Step) => void
}

export function QuestStepList({ quest, steps, onOpenArtifact, onPremium }: Props) {
    const locked = quest.status === 'LOCKED'
    const showNext = quest.status === 'AVAILABLE' || quest.status === 'IN_PROGRESS'
    const thumbs = uniqueThumbnails(steps, quest.coverImage)

    return (
        <ol className="space-y-3" data-testid="quest-steps">
            {steps.map((step, index) => (
                <QuestStepItem
                    key={step.id}
                    index={index}
                    step={step}
                    thumbnail={thumbs[step.id] ?? null}
                    quest={quest}
                    isNext={showNext && step.id === quest.nextStepId}
                    actionsDisabled={locked}
                    onOpenArtifact={onOpenArtifact}
                    onPremium={onPremium}
                />
            ))}
        </ol>
    )
}

/**
 * Mỗi ảnh chỉ hiện một lần trong danh sách và không lặp ảnh bìa nhiệm vụ.
 * Bước bị trùng ảnh (dữ liệu cũ) hiện ô biểu tượng theo loại bước thay vì lặp lại cùng một ảnh.
 */
function uniqueThumbnails(steps: QuestV2Step[], cover: string | null): Record<string, string | null> {
    const seen = new Set<string>()
    if (cover) seen.add(cover)
    const result: Record<string, string | null> = {}
    for (const step of steps) {
        const image = step.previewImage?.trim() || null
        if (image && !seen.has(image) && !image.endsWith('.svg')) {
            seen.add(image)
            result[step.id] = image
        } else {
            result[step.id] = null
        }
    }
    return result
}

function QuestStepItem({
    index,
    step,
    thumbnail,
    quest,
    isNext,
    actionsDisabled,
    onOpenArtifact,
    onPremium,
}: {
    index: number
    step: QuestV2Step
    thumbnail: string | null
    quest: QuestV2Card
    isNext: boolean
    actionsDisabled: boolean
    onOpenArtifact: (step: QuestV2Step) => void
    onPremium: (step: QuestV2Step) => void
}) {
    const done = step.state === 'DONE'
    const premiumLocked = step.state === 'PREMIUM_LOCKED'
    const action = questStepAction(step, { questId: quest.id, locationId: quest.locationId })
    // Bước trạm (Tại di tích) chỉ hoàn thành bằng quét QR, nhưng ở nhà vẫn xem trước được trạm.
    const stationCode = /^station:(ST\d{2})$/i.exec(step.key)?.[1]?.toUpperCase()
    const stationPreview = stationCode ? `/sites/${siteCodeFromLocationId(quest.locationId)}/stations/${stationCode}/media` : null

    const marker = done
        ? 'border-emerald-500 bg-emerald-500 text-white'
        : premiumLocked
          ? 'border-[#FDC908] bg-[#FFF2C3] text-[#7A5B00]'
          : isNext
            ? 'border-[#0275FB] bg-[#0275FB] text-white'
            : 'border-[#0275FB]/25 bg-white text-[#0275FB]'

    return (
        <li
            data-testid="quest-step"
            data-state={step.state}
            className={`relative flex gap-3 rounded-2xl border-2 bg-white p-4 transition-shadow sm:gap-4 sm:p-5 ${
                isNext ? 'border-[#0275FB] shadow-[0_14px_34px_-14px_rgba(2,117,251,0.55)]' : done ? 'border-emerald-200' : 'border-[#0275FB]/12'
            }`}
        >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black ${marker}`} aria-hidden>
                {done ? <MaterialIcon name="check" className="text-xl" /> : premiumLocked ? <MaterialIcon name="lock" className="text-lg" /> : index + 1}
            </span>

            <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    {isNext && (
                        <span className="rounded-full bg-[#0275FB] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                            Bước tiếp theo
                        </span>
                    )}
                    {step.required ? (
                        <span className="rounded-full border border-[#0275FB]/20 bg-[#F2F7FF] px-2 py-0.5 text-[10px] font-bold text-[#0275FB]">Bắt buộc</span>
                    ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">Tùy chọn</span>
                    )}
                    {step.premium && (
                        <span className="flex items-center gap-0.5 rounded-full bg-[#0F1B33] px-2 py-0.5 text-[10px] font-bold text-[#FDC908]">
                            <MaterialIcon name="workspace_premium" className="text-[12px]" /> Premium
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500">
                        <MaterialIcon name={questStepIcon(step.actionType)} className="text-sm" />
                        {stateLabel(step)}
                    </span>
                </div>

                <h3 className={`text-base font-black leading-snug sm:text-lg ${done ? 'text-slate-700' : 'text-[#0F1B33]'}`}>{step.title}</h3>
                {step.objective && <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.objective}</p>}
                {!done && step.hint && (
                    <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                        <MaterialIcon name="lightbulb" className="mt-px text-sm text-[#F5A800]" />
                        <span>{step.hint}</span>
                    </p>
                )}

                {(!actionsDisabled || stationPreview) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {!actionsDisabled && (
                            <StepButton
                                action={action}
                                primary={!done}
                                label={done ? (action.kind === 'premium' ? action.label : 'Xem lại') : action.label}
                                onArtifact={() => onOpenArtifact(step)}
                                onPremium={() => onPremium(step)}
                            />
                        )}
                        {stationPreview && (
                            <Link
                                to={stationPreview}
                                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#0275FB]/25 bg-white px-3 text-xs font-bold text-[#0275FB] transition-colors hover:bg-[#F2F7FF]"
                            >
                                <MaterialIcon name="photo_library" className="text-lg" /> Xem trước trạm
                            </Link>
                        )}
                    </div>
                )}
            </div>

            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#DCEBFF] to-[#B9D7FF] sm:h-20 sm:w-28">
                {thumbnail ? (
                    <SmartImage src={thumbnail} fallback={thumbnail} alt="" fill className="object-cover" />
                ) : (
                    <span className="flex h-full w-full items-center justify-center text-[#0275FB]" aria-hidden>
                        <MaterialIcon name={questStepIcon(step.actionType)} className="text-3xl" />
                    </span>
                )}
                {done && (
                    <span className="absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <MaterialIcon name="check" className="text-sm" />
                    </span>
                )}
            </div>
        </li>
    )
}

function stateLabel(step: QuestV2Step): string {
    if (step.state === 'DONE') return step.preDiscovered ? 'Đã khám phá trước đó' : 'Đã xong'
    if (step.state === 'PREMIUM_LOCKED') return 'Cần Premium'
    return 'Chưa làm'
}

function StepButton({
    action,
    primary,
    label,
    onArtifact,
    onPremium,
}: {
    action: ReturnType<typeof questStepAction>
    primary: boolean
    label: string
    onArtifact: () => void
    onPremium: () => void
}) {
    const className = primary
        ? 'inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0275FB] px-4 text-sm font-black text-white shadow-[0_8px_18px_-8px_rgba(2,117,251,0.8)] transition-colors hover:bg-[#015CC8]'
        : 'inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-[#0275FB]/25 bg-white px-3 text-xs font-bold text-[#0275FB] transition-colors hover:bg-[#F2F7FF]'

    if (action.kind === 'sa-ban-quiz') {
        return <SaBanQuizButton locationId={action.locationId} className={className}>
            <MaterialIcon name={action.icon} className="text-lg" /> {label}
        </SaBanQuizButton>
    }
    if (action.kind === 'premium') {
        return (
            <button
                type="button"
                onClick={onPremium}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#FDC908] px-4 text-sm font-black text-[#0F1B33] transition-colors hover:bg-[#FFB800]"
            >
                <MaterialIcon name={action.icon} className="text-lg" /> {label}
            </button>
        )
    }
    if (action.kind === 'unavailable') {
        return <span role="status" className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs font-bold text-amber-800">
            <MaterialIcon name={action.icon} className="text-lg" /> {label}
        </span>
    }
    if (action.kind === 'artifact') {
        return (
            <button type="button" onClick={onArtifact} className={className}>
                <MaterialIcon name={action.icon} className="text-lg" /> {label}
            </button>
        )
    }
    return (
        <Link to={action.href} className={className}>
            <MaterialIcon name={action.icon} className="text-lg" /> {label}
        </Link>
    )
}
