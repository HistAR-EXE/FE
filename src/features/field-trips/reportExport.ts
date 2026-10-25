import { participationLabel, type FieldTripReport } from './types'

function csvField(value: string | number): string {
  const text = String(value)
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function buildFieldTripCsv(report: FieldTripReport): string {
  const header = ['Nhóm', 'Hình thức', 'Sĩ số', 'Trạm hoàn thành', 'Hoàn thành nhiệm vụ', 'Điểm']
  const lines = [
    header.join(','),
    ...report.groups.map((group) => [
      csvField(group.name),
      csvField(participationLabel(group.participationMode)),
      csvField(group.headcount),
      csvField(group.stationsCompleted),
      csvField(group.questCompletions),
      csvField(group.points),
    ].join(',')),
  ]
  return lines.join('\n')
}
