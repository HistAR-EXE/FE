import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { profileApi, type ProfileMe } from '../features/profile/api'
import { SettingsClassroomSection } from '../features/settings/SettingsClassroomSection'
import { SettingsLogoutSection } from '../features/settings/SettingsLogoutSection'
import { SettingsPremiumSection } from '../features/settings/SettingsPremiumSection'
import { SettingsProfileSection } from '../features/settings/SettingsProfileSection'
import { SettingsTeacherSection } from '../features/settings/SettingsTeacherSection'
import { orgApi } from '../features/org/api'
import { useAuth } from '../shared/auth/useAuth'
import { getSettingsSections } from '../shared/auth/settingsAccess'
import { normalizeOrgSubscription, normalizeRole } from '../shared/auth/types'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

export function SettingsPage() {
  const { logout, user, updateUser } = useAuth()
  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [orgInviteCode, setOrgInviteCode] = useState('')
  const [orgJoining, setOrgJoining] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    profileApi.me().then(setProfile).catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
  }, [showToast])

  const sections = useMemo(() => {
    if (!user) return ['profile', 'logout'] as const
    return getSettingsSections(user.role, user.tier, user.orgId)
  }, [user])

  const handleJoinOrg = async () => {
    if (!orgInviteCode.trim()) return
    try {
      setOrgJoining(true)
      const result = await orgApi.join(orgInviteCode.trim())
      const next = await profileApi.me()
      setProfile(next)
      updateUser({
        role: normalizeRole(result.platformRole),
        orgId: result.organizationId,
        orgName: result.organizationName,
        orgRole: result.orgRole,
        orgSubscription: normalizeOrgSubscription(next.orgSubscription),
      })
      setOrgInviteCode('')
      showToast({ message: `Đã tham gia ${result.organizationName}`, type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setOrgJoining(false)
    }
  }

  const handleLeaveOrg = async () => {
    if (!window.confirm('Bạn có chắc muốn rời tổ chức? Giáo viên sẽ không còn theo dõi tiến độ của bạn.')) return
    try {
      await orgApi.leave()
      const next = await profileApi.me()
      setProfile(next)
      updateUser({
        role: 'USER',
        orgId: null,
        orgName: null,
        orgRole: null,
        orgSubscription: 'NONE',
      })
      showToast({ message: 'Đã rời tổ chức', type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    }
  }

  const handleUpgrade = async () => {
    try {
      setUpgrading(true)
      const next = await profileApi.upgrade()
      setProfile(next)
      updateUser({ tier: 'PREMIUM' })
      showToast({ message: 'Đã nâng cấp Premium (demo)!', type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Cài đặt" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-3xl mx-auto w-full">
        {!profile && (
          <div className="space-y-md">
            <div className="h-32 rounded-xl bg-surface-container animate-pulse border border-outline-variant" />
            <p className="text-on-surface-variant text-sm">Đang tải cài đặt...</p>
          </div>
        )}
        {profile && (
          <div className="space-y-md">
            {sections.map((section) => {
              switch (section) {
                case 'profile':
                  return (
                    <SettingsProfileSection
                      key={section}
                      profile={profile}
                      onSaved={setProfile}
                    />
                  )
                case 'classroom':
                  return (
                    <SettingsClassroomSection
                      key={section}
                      profile={profile}
                      orgInviteCode={orgInviteCode}
                      orgJoining={orgJoining}
                      onInviteCodeChange={setOrgInviteCode}
                      onJoin={() => void handleJoinOrg()}
                      onLeave={() => void handleLeaveOrg()}
                    />
                  )
                case 'teacher':
                  return <SettingsTeacherSection key={section} />
                case 'premium':
                  return (
                    <SettingsPremiumSection
                      key={section}
                      upgrading={upgrading}
                      onUpgrade={() => void handleUpgrade()}
                    />
                  )
                case 'logout':
                  return <SettingsLogoutSection key={section} onLogout={logout} />
                default:
                  return null
              }
            })}
          </div>
        )}
      </main>
    </AppLayout>
  )
}
