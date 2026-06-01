export const dailyQuests = {
  completed: 2,
  total: 5,
  refreshIn: '08:42:15',
  items: [
    {
      id: 'photo-artifact',
      title: 'Chụp ảnh cổ vật',
      description: 'Tìm và quét 3 cổ vật thời Lý tại bảo tàng gần nhất.',
      xp: 50,
      completed: false,
    },
    {
      id: 'decode-poem',
      title: 'Giải mã thơ cổ',
      description: 'Dịch một đoạn thơ chữ Nôm tại Văn Miếu.',
      xp: 30,
      completed: false,
    },
    {
      id: 'daily-login',
      title: 'Đăng nhập hàng ngày',
      description: 'Trở lại ứng dụng hôm nay.',
      xp: 10,
      completed: true,
    },
  ],
} as const
