import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { profileApi, type ProfileMe } from '../features/profile/api'
import { SettingsClassroomSection } from '../features/settings/SettingsClassroomSection'
import { SettingsLogoutSection } from '../features/settings/SettingsLogoutSection'
import { SettingsPremiumSection } from '../features/settings/SettingsPremiumSection'
import { SettingsProfileSection } from '../features/settings/SettingsProfileSection'
import { SettingsTeacherSection } from '../features/settings/SettingsTeacherSection'
import { EmailVerificationBanner } from '../components/auth/EmailVerificationBanner'
import { orgApi } from '../features/org/api'
import { billingApi } from '../features/billing/api'
import { useAuth } from '../shared/auth/useAuth'
import { getSettingsSections } from '../shared/auth/settingsAccess'
import { normalizeOrgSubscription, normalizeRole } from '../shared/auth/types'
import { useToast } from '../shared/ui/toast/useToast'
import { handleActionLinkError } from '../shared/router/actionErrors'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import type { B2cBillingStatus, B2cSubscriptionHistoryItem } from '../features/billing/api'

export function SettingsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { logout, user, updateUser } = useAuth()
  const [profile, setProfile] = useState<ProfileMe | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [orgInviteCode, setOrgInviteCode] = useState('')
  const [orgJoining, setOrgJoining] = useState(false)
  const [billingStatus, setBillingStatus] = useState<B2cBillingStatus | null>(null)
  const [billingHistory, setBillingHistory] = useState<B2cSubscriptionHistoryItem[]>([])
  const { showToast } = useToast()

  useEffect(() => {
    profileApi.me().then(setProfile).catch((e) => showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' }))
  }, [showToast])

  useEffect(() => {
    if (user?.orgId) {
      setBillingStatus(null)
      setBillingHistory([])
      return
    }
    billingApi.getB2CStatus().then(setBillingStatus).catch(() => setBillingStatus(null))
    billingApi.getB2CHistory().then(setBillingHistory).catch(() => setBillingHistory([]))
  }, [user?.orgId])

  useEffect(() => {
    const joinCode = searchParams.get('joinCode')
    if (joinCode) setOrgInviteCode(joinCode)
  }, [searchParams])

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
      navigate('/home', { replace: true })
    } catch (e) {
      const joinCode = searchParams.get('joinCode')
      const autoJoin = searchParams.get('autoJoin') === '1'
      if (autoJoin && joinCode) {
        handleActionLinkError(e, navigate, showToast, '/home')
        return
      }
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setOrgJoining(false)
    }
  }

  useEffect(() => {
    const joinCode = searchParams.get('joinCode')?.trim()
    const autoJoin = searchParams.get('autoJoin') === '1'
    if (!autoJoin || !joinCode || !user || profile?.orgId || orgJoining) return
    void handleJoinOrg()
  }, [searchParams, user, profile?.orgId, orgJoining, handleJoinOrg])

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
    setUpgrading(true)
    navigate('/checkout/b2c?next=/settings')
  }

  const handleCancelPremium = async () => {
    if (!window.confirm('Bạn muốn hủy gói Premium demo hiện tại?')) return
    try {
      setCancelling(true)
      const nextStatus = await billingApi.cancelB2C()
      setBillingStatus(nextStatus)
      updateUser({ tier: 'FREE' })
      const nextProfile = await profileApi.me()
      setProfile(nextProfile)
      setBillingHistory(await billingApi.getB2CHistory())
      showToast({ message: 'Đã hủy gói Premium demo', type: 'success' })
    } catch (e) {
      showToast({ message: getFriendlyErrorMessage(e, 'quest'), type: 'error' })
    } finally {
      setCancelling(false)
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
            <EmailVerificationBanner
              emailVerified={profile.emailVerified !== false}
              onVerified={() =>
                profileApi.me().then((next) => setProfile(next)).catch(() => undefined)
              }
            />
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
                      cancelling={cancelling}
                      billingStatus={billingStatus}
                      history={billingHistory}
                      onUpgrade={() => void handleUpgrade()}
                      onCancel={() => void handleCancelPremium()}
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
