import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { useLocalStorage } from '../../shared/hooks/useLocalStorage'

type WizardStep = {
  title: string
  description: string
  icon: string
  action?: string
  actionLabel?: string
}

const WIZARD_STEPS: WizardStep[] = [
  {
    title: 'Chào mừng đến TimeLens cho Giáo viên!',
    description:
      'TimeLens giúp bạn tổ chức chuyến trải nghiệm lịch sử tương tác cho học sinh. Hãy cùng thiết lập lớp học trong vài bước đơn giản.',
    icon: 'school',
  },
  {
    title: 'Mời học sinh tham gia',
    description:
      'Chia sẻ mã mời hoặc gửi email để học sinh tham gia lớp. Mỗi học sinh sẽ có tài khoản riêng để theo dõi tiến trình.',
    icon: 'group_add',
    action: 'invite',
    actionLabel: 'Tạo mã mời',
  },
  {
    title: 'Theo dõi tiến trình thời gian thực',
    description:
      'Live Board hiển thị vị trí và tiến trình của từng học sinh. Bạn có thể gửi thông báo Rally để tập hợp lớp.',
    icon: 'dashboard',
    action: 'live-board',
    actionLabel: 'Mở Live Board',
  },
  {
    title: 'Tạo bài tập & đánh giá',
    description:
      'Giao nhiệm vụ khám phá di tích, quiz kiến thức hoặc bài viết cảm nhận. Kết quả tự động tổng hợp.',
    icon: 'assignment',
    action: 'assignments',
    actionLabel: 'Xem Bài tập',
  },
  {
    title: 'Sẵn sàng khám phá!',
    description:
      'Mọi thứ đã sẵn sàng. Bạn có thể quay lại hướng dẫn này bất cứ lúc nào từ menu Cài đặt.',
    icon: 'rocket_launch',
  },
]

const STORAGE_KEY = 'timelens:teacher-onboarding-complete'

type TeacherOnboardingWizardProps = {
  orgId: string
  onComplete: () => void
  onAction?: (action: string) => void
}

export function TeacherOnboardingWizard({ orgId, onComplete, onAction }: TeacherOnboardingWizardProps) {
  // Kept in the public prop contract for callers that scope onboarding to an organization.
  void orgId
  const [step, setStep] = useState(0)
  const [, setComplete] = useLocalStorage(STORAGE_KEY, false)

  const current = WIZARD_STEPS[step]
  const isLast = step === WIZARD_STEPS.length - 1
  const isFirst = step === 0

  const handleNext = () => {
    if (isLast) {
      setComplete(true)
      onComplete()
    } else {
      setStep((s) => s + 1)
    }
  }

  const handleSkip = () => {
    setComplete(true)
    onComplete()
  }

  const handleAction = () => {
    if (current.action && onAction) {
      onAction(current.action)
    }
  }

  return (
    <div className="bg-neutral-0 dark:bg-neutral-100 rounded-2xl border border-primary-500/30 shadow-lg p-lg space-y-md">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-xs">
        {WIZARD_STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === step ? 'w-6 bg-primary-500' : i < step ? 'w-2 bg-primary-300' : 'w-2 bg-neutral-200'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="text-center space-y-sm">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary-500/10 flex items-center justify-center">
          <MaterialIcon name={current.icon} className="text-primary-500 text-3xl" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          {current.title}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          {current.description}
        </p>
      </div>

      {/* Action button (optional, step-specific) */}
      {current.action && current.actionLabel && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleAction} className="text-sm">
            <MaterialIcon name={current.icon} className="text-base" />
            {current.actionLabel}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-sm border-t border-neutral-200">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Bỏ qua hướng dẫn
        </button>
        <div className="flex gap-sm">
          {!isFirst && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="text-sm">
              Quay lại
            </Button>
          )}
          <Button variant="primary" onClick={handleNext} className="text-sm">
            {isLast ? 'Hoàn tất' : 'Tiếp theo'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Hook to check if teacher onboarding has been completed */
export function useTeacherOnboardingStatus() {
  const [isComplete] = useLocalStorage(STORAGE_KEY, false)
  return { showOnboarding: !isComplete }
}
