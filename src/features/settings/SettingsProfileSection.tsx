import { ProfileEditForm } from '../profile/ProfileEditForm'
import type { ProfileMe } from '../profile/api'

type Props = {
  profile: ProfileMe
  onSaved: (profile: ProfileMe) => void
}

export function SettingsProfileSection({ profile, onSaved }: Props) {
  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-lg">
      <ProfileEditForm profile={profile} onSaved={onSaved} />
    </section>
  )
}
