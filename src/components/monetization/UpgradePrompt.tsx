import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { Button } from '../../components/ui/Button'

type UpgradePromptProps = {
  title?: string
  message?: string
  compact?: boolean
  onUpgrade?: () => void
}

export function UpgradePrompt({
  title = 'Nâng cấp Premium',
  message = 'Mở khóa nội dung cao cấp và chat không giới hạn với nhân vật lịch sử.',
  compact = false,
  onUpgrade,
}: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-md text-sm text-on-surface-variant">
        <p>{message}</p>
        <Link to="/pricing" className="inline-block mt-sm text-primary underline font-medium">
          Xem gói Premium
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-surface-container p-lg text-center space-y-md">
      <MaterialIcon name="lock" className="text-primary text-4xl mx-auto" />
      <div>
        <h3 className="font-title-md text-on-surface">{title}</h3>
        <p className="text-sm text-on-surface-variant mt-xs max-w-md mx-auto">{message}</p>
      </div>
      {onUpgrade ? (
        <Button type="button" onClick={onUpgrade}>
          Nâng cấp Premium
        </Button>
      ) : (
        <Link to="/pricing">
          <Button type="button">Nâng cấp Premium</Button>
        </Link>
      )}
    </div>
  )
}
