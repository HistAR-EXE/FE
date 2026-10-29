const AXIS_INTERVALS = 5

export function getRevenueAxis(values: number[]) {
  const maximum = Math.max(0, ...values.filter((value) => Number.isFinite(value)))
  if (maximum === 0) return { maximum: 0, ticks: [0] }

  const rawInterval = maximum / AXIS_INTERVALS
  const magnitude = 10 ** Math.floor(Math.log10(rawInterval))
  const normalized = rawInterval / magnitude
  const niceInterval = [1, 2, 2.5, 5, 10].find((step) => step >= normalized) ?? 10
  const interval = niceInterval * magnitude
  const axisMaximum = interval * AXIS_INTERVALS

  return {
    maximum: axisMaximum,
    ticks: Array.from({ length: AXIS_INTERVALS + 1 }, (_, index) => index * interval),
  }
}

export function formatRevenueTick(value: number) {
  if (value === 0) return '0'
  const units: [number, string][] = [[1_000_000_000, 'tỷ'], [1_000_000, 'triệu'], [1_000, 'nghìn']]
  const unit = units.find(([threshold]) => value >= threshold)
  if (!unit) return `${value.toLocaleString('vi-VN')} đ`
  return `${(value / unit[0]).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ${unit[1]}`
}
