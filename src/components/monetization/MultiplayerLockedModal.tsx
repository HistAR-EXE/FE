import { Link } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'
import { Button } from '../ui/Button'

type MultiplayerLockedModalProps = {
  open: boolean
  onClose: () => void
}

export function MultiplayerLockedModal({ open, onClose }: MultiplayerLockedModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-md bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-outline-variant bg-surface-container p-lg shadow-2xl space-y-md">
        <div className="flex items-start gap-sm">
          <MaterialIcon name="groups" className="text-secondary text-3xl shrink-0" />
          <div>
            <h2 className="font-title-md text-on-surface">Team-based Quest Room</h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Tính năng chia đội theo mã phòng (Team-based Quest Room) chỉ có ở gói B2B Standard/Premium. Giáo viên tạo phòng, học sinh vào cùng room code và hệ thống cộng điểm theo tiến độ quest.
            </p>
          </div>
        </div>
        <div className="flex gap-sm">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Đóng
          </Button>
          <Link to="/pricing#b2b" className="flex-1" onClick={onClose}>
            <Button type="button" className="w-full">
              Xem gói trường
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
