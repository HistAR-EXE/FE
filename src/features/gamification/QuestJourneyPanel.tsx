import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { useAppMode } from '../../shared/context/useAppMode'
import {
  actionIcon,
  isStepDone,
  resolveStepImage,
  stepActionLabel,
  stepHref,
  type QuestStepMeta,
} from './heritageQuestSteps'

type QuestJourneyPanelProps = {
  steps: QuestStepMeta[]
  questId: string
  locationId: string
  status: string
  currentStep: number
  hasCheckin?: boolean
  stepImages?: Record<string, string>
}

function stepTypeBadge(actionType: QuestStepMeta['actionType']): string {
  if (actionType === 'artifact') return 'view_in_ar'
  if (actionType === 'portal') return 'history'
  if (actionType === 'tour') return '360'
  if (actionType === 'checkin') return 'my_location'
  return 'flag'
}

export function QuestJourneyPanel({
  steps,
  questId,
  locationId,
  status,
  currentStep,
  hasCheckin,
  stepImages,
}: QuestJourneyPanelProps) {
  const { mode } = useAppMode()
  const firstOpenIndex = steps.findIndex(
    (step, index) => !isStepDone(step, currentStep, index, status, hasCheckin),
  )

  return (
    <div className="border border-outline-variant rounded-xl p-md bg-surface-container">
      <h3 className="font-title-md mb-sm flex items-center gap-2">
        <MaterialIcon name="route" /> Hành trình
      </h3>
      <p className="text-xs text-on-surface-variant mb-md">
        Hoàn thành từng chương theo thứ tự — mỗi bước mở khóa phần tiếp theo.
      </p>
      <div className="space-y-md relative">
        {steps.length > 1 && (
          <div
            className="absolute left-[58px] top-10 bottom-10 w-0.5 bg-outline-variant/50"
            aria-hidden
          />
        )}
        {steps.length === 0 && (
          <p className="text-sm text-on-surface-variant">Đang cập nhật các bước nhiệm vụ.</p>
        )}
        {steps.map((step, index) => {
          const done = isStepDone(step, currentStep, index, status, hasCheckin)
          const active = !done && index === firstOpenIndex
          const locked = !done && index > firstOpenIndex && firstOpenIndex >= 0
          const imageUrl = resolveStepImage(step, stepImages)
          const ctaLabel = stepActionLabel(step, mode)

          return (
            <div
              key={step.unlockKey}
              className={`relative rounded-lg p-sm border flex gap-sm ${
                done
                  ? 'border-secondary/40 bg-secondary/10'
                  : active
                    ? 'border-primary/50 bg-primary/5 shadow-sm'
                    : 'border-outline-variant/60 opacity-85'
              }`}
            >
              <div className="relative shrink-0 w-20 h-20">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className={`w-20 h-20 rounded-lg object-cover border ${
                      active ? 'border-primary/60' : 'border-outline-variant/60'
                    } ${locked ? 'blur-[2px] brightness-75' : ''}`}
                  />
                ) : (
                  <div
                    className={`w-20 h-20 rounded-lg border flex items-center justify-center bg-surface-container-highest ${
                      active ? 'border-primary/60' : 'border-outline-variant/60'
                    }`}
                  >
                    <MaterialIcon
                      name={actionIcon(step.actionType)}
                      className={`text-2xl ${active ? 'text-primary' : 'text-on-surface-variant'}`}
                    />
                  </div>
                )}
                {locked && (
                  <div className="absolute inset-0 rounded-lg bg-background/40 flex items-center justify-center">
                    <MaterialIcon name="lock" className="text-lg text-on-surface-variant" />
                  </div>
                )}
                <span
                  className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border text-xs ${
                    done
                      ? 'border-secondary bg-secondary text-on-secondary'
                      : active
                        ? 'border-primary bg-primary text-on-primary'
                        : 'border-outline-variant bg-surface-container text-on-surface-variant'
                  }`}
                >
                  {done ? <MaterialIcon name="check" className="text-sm" /> : index + 1}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-0.5 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant">
                    <MaterialIcon name={stepTypeBadge(step.actionType)} className="text-xs" />
                    {step.actionType === 'artifact'
                      ? 'Hiện vật'
                      : step.actionType === 'portal'
                        ? 'Portal'
                        : step.actionType === 'tour'
                          ? '360°'
                          : step.actionType === 'checkin'
                            ? 'Check-in'
                            : 'Bước'}
                  </span>
                  <p className="font-title-md w-full">{step.title}</p>
                </div>
                <p className="text-xs text-primary/90 mt-0.5 font-medium">{step.objective}</p>
                <p className="text-sm text-on-surface-variant mt-1">{step.description}</p>
                {step.hint && (active || done) && (
                  <p className="text-xs text-on-surface-variant/80 mt-1 flex items-start gap-1">
                    <MaterialIcon name="lightbulb" className="text-sm text-secondary shrink-0" />
                    {step.hint}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs text-on-surface-variant">
                    {done ? 'Hoàn tất' : active ? 'Đang thực hiện' : locked ? 'Chưa mở' : 'Sẵn sàng'}
                  </span>
                  {step.xpPartial && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                      +{step.xpPartial} XP
                    </span>
                  )}
                </div>
                {!done && !locked && locationId && (status === 'in_progress' || status === 'completed') && (
                  <Link
                    to={stepHref(locationId, step, questId)}
                    className={`inline-flex items-center gap-1 mt-sm px-md py-xs rounded-full text-sm ${
                      active
                        ? 'bg-primary text-on-primary'
                        : 'border border-secondary text-secondary'
                    }`}
                  >
                    {ctaLabel}
                    <MaterialIcon
                      name={step.actionType === 'checkin' ? 'my_location' : 'arrow_forward'}
                      className="text-sm"
                    />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
