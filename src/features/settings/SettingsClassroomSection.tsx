import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import type { ProfileMe } from '../profile/api'

type Props = {
  profile: ProfileMe
  orgInviteCode: string
  orgJoining: boolean
  onInviteCodeChange: (value: string) => void
  onJoin: () => void
  onLeave: () => void
}

export function SettingsClassroomSection({
  profile,
  orgInviteCode,
  orgJoining,
  onInviteCodeChange,
  onJoin,
  onLeave,
}: Props) {
  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
      <div className="space-y-sm">
        <h2 className="font-title-md">Lớp học</h2>
        <p className="text-sm text-on-surface-variant">Nhập mã mời từ giáo viên để tham gia lớp.</p>
      </div>
      {profile.orgId ? (
        <div className="space-y-sm">
          <p className="text-sm text-on-surface-variant">
            Đang thuộc: <strong className="text-on-surface">{profile.orgName ?? profile.orgId}</strong>
            {profile.orgRole ? ` · ${profile.orgRole}` : ''}
          </p>
          <button type="button" onClick={onLeave} className="text-sm text-error underline">
            Rời tổ chức
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-sm">
          <input
            value={orgInviteCode}
            onChange={(e) => onInviteCodeChange(e.target.value.toUpperCase())}
            placeholder="Nhập mã mời lớp"
            className="flex-1 neo-input rounded-lg px-md py-sm uppercase tracking-wider"
          />
          <button
            type="button"
            disabled={orgJoining}
            onClick={onJoin}
            className="px-md py-sm border border-secondary text-secondary rounded-lg hover:bg-secondary/10 disabled:opacity-60"
          >
            {orgJoining ? 'Đang xử lý...' : 'Tham gia'}
          </button>
        </div>
      )}
      <Link to="/groups" className="inline-flex items-center gap-1 text-secondary text-sm underline">
        <MaterialIcon name="groups" className="text-base" />
        Quản lý nhóm học tập
      </Link>
    </section>
  )
}
