// src/data/mock/profile.ts
import { images } from '../../assets/images'

export const profile = {
  name: 'Time Traveler',
  title: 'Nhà Khám Phá Cổ Đại',
  level: 12,
  avatar: images.profileAvatar,
  xpCurrent: 2450,
  xpMax: 3000,
  xpPercent: 82,
  stats: {
    xpEarned: 2450,
    questsCompleted: 8,
    sitesVisited: 15,
  },
  badges: [
    { id: '1', name: 'Mắt Thần Cổ Đại', icon: 'visibility', earned: true },
    { id: '2', name: 'Bảo Vệ Hoàng Thành', icon: 'shield', earned: true },
    { id: '3', name: 'Người Bảo Vệ Thời Gian', icon: 'timelapse', earned: false },
    { id: '4', name: 'Sử Gia Trẻ', icon: 'menu_book', earned: true },
    { id: '5', name: 'Thám Hiểm AR', icon: 'view_in_ar', earned: false },
    { id: '6', name: 'Nhà Sưu Tập', icon: 'museum', earned: false },
    { id: '7', name: 'Du Hành Thời Gian', icon: 'history_toggle_off', earned: true },
    { id: '8', name: 'Chiến Binh Di Sản', icon: 'military_tech', earned: false },
  ],
}
