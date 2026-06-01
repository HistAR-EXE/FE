import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ArtifactsPage } from '../pages/ArtifactsPage'
import { CharacterExplorePage } from '../pages/CharacterExplorePage'
import { CharacterSelectPage } from '../pages/CharacterSelectPage'
import { ChatPage } from '../pages/ChatPage'
import { ExplorePage } from '../pages/ExplorePage'
import { HeritageDetailPage } from '../pages/HeritageDetailPage'
import { HomePage } from '../pages/HomePage'
import { LeaderboardPage } from '../pages/LeaderboardPage'
import { LoginPage } from '../pages/LoginPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { PhotoFramePage } from '../pages/PhotoFramePage'
import { ProfilePage } from '../pages/ProfilePage'
import { QuestDetailPage } from '../pages/QuestDetailPage'
import { QuestsPage } from '../pages/QuestsPage'
import { ScanPage } from '../pages/ScanPage'
import { SharePage } from '../pages/SharePage'
import { TimePortalPage } from '../pages/TimePortalPage'
import { Tour360Page } from '../pages/Tour360Page'

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OnboardingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/character-select" element={<CharacterSelectPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/characters" element={<CharacterExplorePage />} />
        <Route path="/artifacts" element={<ArtifactsPage />} />
        <Route path="/explore/:slug" element={<HeritageDetailPage />} />
        <Route path="/quests" element={<QuestsPage />} />
        <Route path="/quests/:slug" element={<QuestDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/share" element={<SharePage />} />
        <Route path="/photo-frame" element={<PhotoFramePage />} />
        <Route path="/time-portal/:slug?" element={<TimePortalPage />} />
        <Route path="/tour/360/:slug?" element={<Tour360Page />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/chat/nguyen-du" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
