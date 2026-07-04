// src/data/mock/leaderboard.ts
import { images } from '../../assets/images'

export type LeaderboardEntry = {
  rank: number
  name: string
  xp: number
  avatar: string
  isCurrentUser?: boolean
}

export const leaderboardEntries: LeaderboardEntry[] = [
  { rank: 1, name: 'HeritageMaster', xp: 12500, avatar: images.leaderboardRank1 },
  { rank: 2, name: 'TimeWalker', xp: 11200, avatar: images.leaderboardRank2 },
  { rank: 3, name: 'AncientSeeker', xp: 9800, avatar: images.leaderboardRank3 },
  { rank: 4, name: 'Time Traveler', xp: 2450, avatar: images.profileAvatar, isCurrentUser: true },
  { rank: 5, name: 'DiSanFan', xp: 2100, avatar: images.leaderboardRank1 },
  { rank: 6, name: 'ARExplorer', xp: 1850, avatar: images.leaderboardRank2 },
]

export const leaderboardStats = {
  totalPlayers: 1247,
  yourRank: 4,
  weeklyXp: 320,
}
