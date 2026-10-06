// src/routes/AppRoutes.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ArtifactsPage } from '../pages/ArtifactsPage'
import { CharacterExplorePage } from '../pages/CharacterExplorePage'
import { CharacterDetailPage } from '../pages/CharacterDetailPage'
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage'
import { TeacherAssignmentsPage } from '../pages/TeacherAssignmentsPage'
import { TeacherLiveBoardPage } from '../pages/TeacherLiveBoardPage'
import { TeacherRoute } from '../shared/router/TeacherRoute'
import { ChatPage } from '../pages/ChatPage'
import { ExplorePage } from '../pages/ExplorePage'
import { HeritageDetailPage } from '../pages/HeritageDetailPage'
import { HomePage } from '../pages/HomePage'
import { LeaderboardPage } from '../pages/LeaderboardPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { PhotoFramePage } from '../pages/PhotoFramePage'
import { ProfilePage } from '../pages/ProfilePage'
import { SettingsPage } from '../pages/SettingsPage'
import { QuestDetailPage } from '../pages/QuestDetailPage'
import { QuestsPage } from '../pages/QuestsPage'
import { MinigamePage } from '../pages/MinigamePage'
import { ScanPage } from '../pages/ScanPage'
import { SecretStoryPage } from '../pages/SecretStoryPage'
import { SharePage } from '../pages/SharePage'
import { TimePortalPage } from '../pages/TimePortalPage'
import { PricingPage } from '../pages/PricingPage'
import { CheckoutB2CPage } from '../pages/CheckoutB2CPage'
import { CheckoutB2BPage } from '../pages/CheckoutB2BPage'
import { CheckoutB2B2CPage } from '../pages/CheckoutB2B2CPage'
import { JoinPage } from '../pages/JoinPage'
import { VerifyEmailPage } from '../pages/VerifyEmailPage'
import { VerifyEmailPendingPage } from '../pages/VerifyEmailPendingPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { ModeSelectPage } from '../pages/ModeSelectPage'
import { Tour360Page } from '../pages/Tour360Page'
import { AdminAnalyticsPage } from '../pages/AdminAnalyticsPage'
import { AdminBillingPage } from '../pages/AdminBillingPage'
import { AdminContentPage } from '../pages/AdminContentPage'
import { AdminOrganizationsPage } from '../pages/AdminOrganizationsPage'
import { AdminUsersPage } from '../pages/AdminUsersPage'
import { GroupHubPage } from '../pages/GroupHubPage'
import { SquadLobbyPage } from '../pages/SquadLobbyPage'
import { GroupProgressPage } from '../pages/GroupProgressPage'
import { PackPrepPage } from '../pages/PackPrepPage'
import { StationMediaDemoPage } from '../pages/StationMediaDemoPage'
import { StationGamePage } from '../pages/StationGamePage'
import { JourneyWrappedPage } from '../pages/JourneyWrappedPage'
import { CreatorLandingPage } from '../pages/CreatorLandingPage'
import { CreatorStatsPage } from '../pages/CreatorStatsPage'
import { PrivacyPage } from '../pages/PrivacyPage'
import { TermsPage } from '../pages/TermsPage'
import { AdminRoute } from '../shared/router/AdminRoute'
import { AuthRoute } from '../shared/router/AuthRoute'
import { EmailVerifiedRoute } from '../shared/router/EmailVerifiedRoute'
import { ModeGuardRoute } from '../shared/router/ModeGuardRoute'
import { ProtectedRoute } from '../shared/router/ProtectedRoute'
import { VisitSessionProvider } from '../features/visit/VisitSessionProvider'
import { ARLoadingFallback } from '../features/ar/ARHud'
import { AboutPage } from '../pages/AboutPage'
import { GoogleRedirectCompletion } from '../shared/auth/GoogleRedirectCompletion'

const TimePortalARPage = lazy(() =>
  import('../pages/TimePortalARPage').then((m) => ({ default: m.TimePortalARPage })),
)

export function AppRoutes() {
  return (
    <BrowserRouter>
      <GoogleRedirectCompletion />
      <VisitSessionProvider>
      <Routes>
          {/* Public — guest landing only */}
          <Route path="/" element={<OnboardingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/pricing" element={<PricingPage />} />

        {/* Auth — guest only */}
        <Route element={<AuthRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage defaultMode="register" />} />
        </Route>

        {/* Action exceptions — external links / unauthenticated recovery */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/pack-prep" element={<PackPrepPage />} />
        <Route path="/sites/:siteCode/stations/:code/media" element={<StationMediaDemoPage />} />
        <Route path="/sites/:siteCode/stations/:code/game/:gameId" element={<StationGamePage />} />
        <Route path="/stations/:code/media" element={<StationMediaDemoPage />} />
        <Route path="/stations/:code/game/:gameId" element={<StationGamePage />} />
        <Route path="/creator/:code" element={<CreatorLandingPage />} />
        <Route path="/creator/:code/stats" element={<CreatorStatsPage />} />

        {/* Protected — login required */}
        <Route element={<ProtectedRoute />}>
          <Route path="/verify-email/pending" element={<VerifyEmailPendingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/checkout/b2c" element={<CheckoutB2CPage />} />
          <Route path="/checkout/b2b" element={<CheckoutB2BPage />} />
          <Route path="/checkout/b2b2c" element={<CheckoutB2B2CPage />} />

          <Route element={<EmailVerifiedRoute />}>
            <Route path="/mode-select" element={<ModeSelectPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:locationId" element={<HeritageDetailPage />} />
            <Route path="/time-portal/:locationId?" element={<TimePortalPage />} />
            <Route
              path="/time-portal/:locationId/ar"
              element={
                <Suspense fallback={<ARLoadingFallback />}>
                  <TimePortalARPage />
                </Suspense>
              }
            />
            <Route path="/tour/360/:locationId?" element={<Tour360Page />} />
            <Route path="/quests" element={<QuestsPage />} />
            <Route path="/quests/:questId/play/:minigameId" element={<MinigamePage />} />
            <Route path="/quests/:questId" element={<QuestDetailPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/content" element={<AdminContentPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/billing" element={<AdminBillingPage />} />
              <Route path="/admin/organizations" element={<AdminOrganizationsPage />} />
            </Route>

            <Route element={<TeacherRoute />}>
              <Route path="/teacher" element={<TeacherDashboardPage />} />
              <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
              <Route path="/teacher/live-board" element={<TeacherLiveBoardPage />} />
            </Route>

            <Route element={<ModeGuardRoute />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/characters" element={<CharacterExplorePage />} />
              <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
              <Route path="/artifacts" element={<ArtifactsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/journey-wrapped" element={<JourneyWrappedPage />} />
              <Route path="/groups" element={<GroupHubPage />} />
              <Route path="/squad" element={<SquadLobbyPage />} />
              <Route path="/groups/:groupId/progress" element={<GroupProgressPage />} />
              <Route path="/share" element={<SharePage />} />
              <Route path="/photo-frame" element={<PhotoFramePage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:characterId" element={<ChatPage />} />
              <Route path="/secret/:locationId" element={<SecretStoryPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </VisitSessionProvider>
    </BrowserRouter>
  )
}
