// src/features/explore/ProductTour.tsx
import { useState, useCallback, type ReactNode } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { Button } from '../../components/ui/Button'
import { useLocalStorage } from '../../shared/hooks/useLocalStorage'

const STORAGE_KEY = 'timelens:product-tour-complete'

type TourStep = {
  title: string
  description: string
  icon: string
  image?: string
}

const TOUR_STEPS: readonly TourStep[] = [
  {
    title: 'Khám phá Di sản',
    description: 'Duyệt qua các di tích lịch sử trên bản đồ tương tác. Mỗi điểm đến mang câu chuyện riêng chờ bạn khám phá.',
    icon: 'explore',
  },
  {
    title: 'Tham quan 360°',
    description: 'Trải nghiệm toàn cảnh 360° với hiệu ứng Parallax 2.5D. Di chuyển điện thoại để nhìn xung quanh như đang đứng tại di tích.',
    icon: '360',
  },
  {
    title: 'Sa bàn Lịch sử',
    description: 'Kéo thanh trượt thời gian để xem di tích thay đổi qua các thời kỳ. Mỗi lớp phủ số hóa tái hiện một giai đoạn lịch sử.',
    icon: 'layers',
  },
  {
    title: 'Trợ lý AI Chrono',
    description: 'Hỏi bất kỳ điều gì về lịch sử Việt Nam. Chrono sử dụng RAG AI với nguồn tài liệu đã xác minh để trả lời chính xác.',
    icon: 'forum',
  },
  {
    title: 'Nhiệm vụ & Cổ vật',
    description: 'Hoàn thành nhiệm vụ tại di tích để thu thập thẻ cổ vật số. Thăng cấp từ Explorer lên Legend trên bảng xếp hạng.',
    icon: 'emoji_events',
  },
] as const

type ProductTourProps = {
  onComplete: () => void
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-8 h-2.5 bg-primary-500'
              : i < current
                ? 'w-2.5 h-2.5 bg-primary-500/50'
                : 'w-2.5 h-2.5 bg-neutral-200'
          }`}
        />
      ))}
    </div>
  )
}

function TourCard({ step, stepIndex, total, onNext, onBack, onSkip }: {
  step: TourStep
  stepIndex: number
  total: number
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}) {
  const isFirst = stepIndex === 0
  const isLast = stepIndex === total - 1

  return (
    <div className="flex flex-col items-center text-center gap-5 px-4">
      <div className="w-20 h-20 rounded-2xl bg-primary-500/10 flex items-center justify-center">
        <MaterialIcon name={step.icon} className="text-4xl text-primary-500" />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-0">
          {step.title}
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-xs">
          {step.description}
        </p>
      </div>

      <StepDots current={stepIndex} total={total} />

      <div className="flex items-center gap-3 w-full max-w-xs">
        {!isFirst && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            <MaterialIcon name="arrow_back" className="text-base" />
            <span>Quay lại</span>
          </Button>
        )}
        {isFirst && (
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors py-3 min-h-[44px]"
          >
            Bỏ qua
          </button>
        )}
        <Button onClick={onNext} className="flex-1">
          <span>{isLast ? 'Bắt đầu khám phá' : 'Tiếp tục'}</span>
          <MaterialIcon name={isLast ? 'rocket_launch' : 'arrow_forward'} className="text-base" />
        </Button>
      </div>
    </div>
  )
}

export function ProductTour({ onComplete }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      onComplete()
    }
  }, [currentStep, onComplete])

  const handleBack = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1))
  }, [])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-neutral-0 dark:bg-neutral-100 rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full">
        <TourCard
          step={TOUR_STEPS[currentStep]}
          stepIndex={currentStep}
          total={TOUR_STEPS.length}
          onNext={handleNext}
          onBack={handleBack}
          onSkip={onComplete}
        />
      </div>
    </div>
  )
}

export function useProductTourStatus() {
  const [isComplete, setIsComplete] = useLocalStorage(STORAGE_KEY, false)
  const markComplete = useCallback(() => {
    setIsComplete(true)
  }, [setIsComplete])

  return { showTour: !isComplete, markComplete }
}

export function ProductTourWrapper({ children }: { children: ReactNode }) {
  const { showTour, markComplete } = useProductTourStatus()
  const [dismissed, setDismissed] = useState(false)

  const handleComplete = useCallback(() => {
    markComplete()
    setDismissed(true)
  }, [markComplete])

  return (
    <>
      {children}
      {showTour && !dismissed && <ProductTour onComplete={handleComplete} />}
    </>
  )
}
