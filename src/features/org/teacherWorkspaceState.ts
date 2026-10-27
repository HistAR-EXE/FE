export function isTeachingMembership(role: string): boolean {
  return ['owner', 'teacher'].includes(role.toLowerCase())
}

export function teacherRouteCapability(path: string): 'assignments' | 'liveBoard' | 'fieldTrips' | null {
  if (path.startsWith('/teacher/assignments')) return 'assignments'
  if (path.startsWith('/teacher/live-board')) return 'liveBoard'
  if (path.startsWith('/teacher/trips')) return 'fieldTrips'
  return null
}

export function invitationDeliveryMessage(delivery: string, email: string): string {
  return delivery === 'SENT'
    ? `Đã gửi email mời tới ${email}.`
    : `Đã lưu lời mời cho ${email}; chưa gửi email vì môi trường local chưa bật gửi thư.`
}

export function teacherSnapshotCsv(rows: Array<{ displayName: string; email: string; stationsCompleted: number; score: number; lastStationCode: string | null; lastActivityAt: string | null }>): string {
  const cells: Array<Array<string | number>> = [
    ['Học sinh', 'Email', 'Trạm hoàn thành', 'Điểm', 'Trạm cuối', 'Hoạt động cuối'],
    ...rows.map(row => [row.displayName, row.email, row.stationsCompleted, row.score, row.lastStationCode ?? '', row.lastActivityAt ?? '']),
  ]
  return '\uFEFF' + cells.map(row => row.map(value => {
    const text = String(value)
    const safe = /^[=+@\-\t\r]/.test(text) ? `'${text}` : text
    return `"${safe.replace(/"/g, '""')}"`
  }).join(',')).join('\r\n')
}
