// src/routes/AppRoutes.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { CharacterExplorePage } from '../pages/CharacterExplorePage'
import { CharacterDetailPage } from '../pages/CharacterDetailPage'
import { TeacherRoute } from '../shared/router/TeacherRoute'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { PhotoFramePage } from '../pages/PhotoFramePage'
import { ProfilePage } from '../pages/ProfilePage'
import { SettingsPage } from '../pages/SettingsPage'
import { ScanPage } from '../pages/ScanPage'
import { SecretStoryPage } from '../pages/SecretStoryPage'
import { SharePage } from '../pages/SharePage'
import { JoinPage } from '../pages/JoinPage'
import { VerifyEmailPage } from '../pages/VerifyEmailPage'
import { VerifyEmailPendingPage } from '../pages/VerifyEmailPendingPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
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
import { ProtectedRoute } from '../shared/router/ProtectedRoute'
import { VisitSessionProvider } from '../features/visit/VisitSessionProvider'
import { AboutPage } from '../pages/AboutPage'
import { GoogleRedirectCompletion } from '../shared/auth/GoogleRedirectCompletion'
import { AdminConsoleLayout } from '../components/admin/AdminConsoleLayout'

const ArtifactsPage = lazy(() => import('../pages/ArtifactsPage').then((module) => ({ default: module.ArtifactsPage })))
const ArtifactDetailPage = lazy(() => import('../pages/ArtifactDetailPage').then((module) => ({ default: module.ArtifactDetailPage })))
const TeacherDashboardPage = lazy(() => import('../pages/TeacherDashboardPage').then((module) => ({ default: module.TeacherDashboardPage })))
const TeacherAssignmentsPage = lazy(() => import('../pages/TeacherAssignmentsPage').then((module) => ({ default: module.TeacherAssignmentsPage })))
const TeacherLiveBoardPage = lazy(() => import('../pages/TeacherLiveBoardPage').then((module) => ({ default: module.TeacherLiveBoardPage })))
const ChatPage = lazy(() => import('../pages/ChatPage').then((module) => ({ default: module.ChatPage })))
const ExplorePage = lazy(() => import('../pages/ExplorePage').then((module) => ({ default: module.ExplorePage })))
const HeritageDetailPage = lazy(() => import('../pages/HeritageDetailPage').then((module) => ({ default: module.HeritageDetailPage })))
const LeaderboardPage = lazy(() => import('../pages/LeaderboardPage').then((module) => ({ default: module.LeaderboardPage })))
const QuestDetailPage = lazy(() => import('../pages/QuestDetailPage').then((module) => ({ default: module.QuestDetailPage })))
const QuestsPage = lazy(() => import('../pages/QuestsPage').then((module) => ({ default: module.QuestsPage })))
const MinigamePage = lazy(() => import('../pages/MinigamePage').then((module) => ({ default: module.MinigamePage })))
const BattleDioramaPage = lazy(() => import('../pages/BattleDioramaPage').then((module) => ({ default: module.BattleDioramaPage })))
const PricingPage = lazy(() => import('../pages/PricingPage').then((module) => ({ default: module.PricingPage })))
const CheckoutB2CPage = lazy(() => import('../pages/CheckoutB2CPage').then((module) => ({ default: module.CheckoutB2CPage })))
const CheckoutB2BPage = lazy(() => import('../pages/CheckoutB2BPage').then((module) => ({ default: module.CheckoutB2BPage })))
const CheckoutB2B2CPage = lazy(() => import('../pages/CheckoutB2B2CPage').then((module) => ({ default: module.CheckoutB2B2CPage })))
const Tour360Page = lazy(() => import('../pages/Tour360Page').then((module) => ({ default: module.Tour360Page })))
const TimePortalPage = lazy(() => import('../pages/TimePortalPage').then((module) => ({ default: module.TimePortalPage })))
const AdminAnalyticsPage = lazy(() => import('../pages/AdminAnalyticsPage').then((module) => ({ default: module.AdminAnalyticsPage })))
const AdminBillingPage = lazy(() => import('../pages/AdminBillingPage').then((module) => ({ default: module.AdminBillingPage })))
const AdminContentPage = lazy(() => import('../pages/AdminContentPage').then((module) => ({ default: module.AdminContentPage })))
const AdminOrganizationsPage = lazy(() => import('../pages/AdminOrganizationsPage').then((module) => ({ default: module.AdminOrganizationsPage })))
const AdminUsersPage = lazy(() => import('../pages/AdminUsersPage').then((module) => ({ default: module.AdminUsersPage })))
const AdminDashboardPage = lazy(() => import('../pages/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })))
const AdminNarrativePilotsPage = lazy(() => import('../pages/AdminNarrativePilotsPage').then((module) => ({ default: module.AdminNarrativePilotsPage })))
const AdminTrashPage = lazy(() => import('../pages/AdminTrashPage').then((module) => ({ default: module.AdminTrashPage })))
const AdminAuditPage = lazy(() => import('../pages/AdminAuditPage').then((module) => ({ default: module.AdminAuditPage })))

function RouteLoadingFallback() {
    return (
        <main className="min-h-screen bg-slate-950 text-white grid place-items-center" data-testid="route-loading" role="status">
            Đang tải trải nghiệm…
        </main>
    )
}

function LegacyTimePortalArRedirect() {
    const { locationId } = useParams<{ locationId: string }>()
    const location = useLocation()
    const params = new URLSearchParams(location.search)
    params.set('view', 'ar')
    return <Navigate replace to={`/time-portal/${locationId ?? ''}?${params.toString()}`} />
}

export function AppRoutes() {
    return (
        <BrowserRouter>
            <GoogleRedirectCompletion />
            <VisitSessionProvider>
                <Suspense fallback={<RouteLoadingFallback />}>
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
                                {/* Chuyển hướng các route cũ đã gỡ bỏ về Explore */}
                                <Route path="/mode-select" element={<Navigate replace to="/explore" />} />
                                <Route path="/home" element={<Navigate replace to="/explore" />} />

                                <Route path="/pricing" element={<PricingPage />} />
                                <Route path="/explore" element={<ExplorePage />} />
                                <Route path="/explore/:locationId" element={<HeritageDetailPage />} />
                                <Route path="/diorama/:locationId?" element={<BattleDioramaPage />} />
                                <Route path="/time-portal/:locationId/ar" element={<LegacyTimePortalArRedirect />} />
                                <Route path="/time-portal/:locationId" element={<TimePortalPage />} />
                                <Route path="/tour/360/:locationId?" element={<Tour360Page />} />
                                <Route path="/quests" element={<QuestsPage />} />
                                <Route path="/quests/:questId/play/:minigameId" element={<MinigamePage />} />
                                <Route path="/quests/:questId" element={<QuestDetailPage />} />
                                <Route path="/leaderboard" element={<LeaderboardPage />} />

                                <Route element={<AdminRoute />}>
                                    <Route path="/admin" element={<AdminConsoleLayout />}>
                                        <Route index element={<AdminDashboardPage />} />
                                        <Route path="content" element={<AdminContentPage />} />
                                        <Route path="narrative-pilots" element={<AdminNarrativePilotsPage />} />
                                        <Route path="trash" element={<AdminTrashPage />} />
                                        <Route path="users" element={<AdminUsersPage />} />
                                        <Route path="organizations" element={<AdminOrganizationsPage />} />
                                        <Route path="billing" element={<AdminBillingPage />} />
                                        <Route path="analytics" element={<AdminAnalyticsPage />} />
                                        <Route path="audit" element={<AdminAuditPage />} />
                                    </Route>
                                </Route>

                                <Route element={<TeacherRoute />}>
                                    <Route path="/teacher" element={<TeacherDashboardPage />} />
                                    <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
                                    <Route path="/teacher/live-board" element={<TeacherLiveBoardPage />} />
                                </Route>

                                {/* Đưa các route chính ra ngoài ModeGuardRoute để không bị đá về /mode-select -> /explore khi xóa localStorage */}
                                <Route path="/characters" element={<CharacterExplorePage />} />
                                <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
                                <Route path="/artifacts" element={<ArtifactsPage />} />
                                <Route path="/artifacts/:id" element={<ArtifactDetailPage />} />
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

                        <Route path="/404" element={<NotFoundPage />} />
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                </Suspense>
            </VisitSessionProvider>
        </BrowserRouter>
    )
}