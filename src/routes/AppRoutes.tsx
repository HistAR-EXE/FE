// src/routes/AppRoutes.tsx
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ArtifactsPage } from '../pages/ArtifactsPage'
import { CharacterExplorePage } from '../pages/CharacterExplorePage'
import { CharacterDetailPage } from '../pages/CharacterDetailPage'
import { TeacherDashboardPage } from '../pages/TeacherDashboardPage'
import { TeacherRoute } from '../shared/router/TeacherRoute'
import { CharacterSelectPage } from '../pages/CharacterSelectPage'
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
import { QuestDetailPage } from '../pages/QuestDetailPage'
import { QuestsPage } from '../pages/QuestsPage'
import { ScanPage } from '../pages/ScanPage'
import { SecretStoryPage } from '../pages/SecretStoryPage'
import { SharePage } from '../pages/SharePage'
import { TimePortalPage } from '../pages/TimePortalPage'
import { ModeSelectPage } from '../pages/ModeSelectPage'
import { Tour360Page } from '../pages/Tour360Page'
import { AdminAnalyticsPage } from '../pages/AdminAnalyticsPage'
import { AdminContentPage } from '../pages/AdminContentPage'
import { AdminOrganizationsPage } from '../pages/AdminOrganizationsPage'
import { AdminUsersPage } from '../pages/AdminUsersPage'
import { AdminRoute } from '../shared/router/AdminRoute'
import { ModeGuardRoute } from '../shared/router/ModeGuardRoute'
import { ProtectedRoute } from '../shared/router/ProtectedRoute'
import { VisitSessionProvider } from '../features/visit/VisitSessionProvider'
import { ARLoadingFallback } from '../features/ar/ARHud'

const TimePortalARPage = lazy(() =>
  import('../pages/TimePortalARPage').then((m) => ({ default: m.TimePortalARPage })),
)

export function AppRoutes() {
  return (
    <BrowserRouter>
      <VisitSessionProvider>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
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
        <Route path="/quests/:questId" element={<QuestDetailPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route element={<AdminRoute />}>
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/content" element={<AdminContentPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/organizations" element={<AdminOrganizationsPage />} />
        </Route>
        <Route element={<TeacherRoute />}>
          <Route path="/teacher" element={<TeacherDashboardPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/mode-select" element={<ModeSelectPage />} />
          <Route element={<ModeGuardRoute />}>
            <Route path="/character-select" element={<CharacterSelectPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/characters" element={<CharacterExplorePage />} />
            <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
            <Route path="/artifacts" element={<ArtifactsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
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
      </VisitSessionProvider>
    </BrowserRouter>
  )
}
