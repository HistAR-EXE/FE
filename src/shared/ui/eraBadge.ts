/** Heritage-era badge classes for timeline chips and tier labels. */
export function eraBadgeClass(era: number): string {
  if (era === 1948) {
    return 'bg-heritage-crimson/15 text-heritage-crimson border-heritage-crimson/40'
  }
  if (era === 1968) {
    return 'bg-heritage-bronze/15 text-heritage-bronze border-heritage-bronze/40'
  }
  if (era >= 2000) {
    return 'bg-heritage-jade/15 text-heritage-jade border-heritage-jade/40'
  }
  return 'bg-primary-500/15 text-primary-500 border-primary-500/40'
}
