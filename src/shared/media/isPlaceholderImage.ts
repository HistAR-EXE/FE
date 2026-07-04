const PLACEHOLDER_HINTS = ['/map/hero.jpg', 'placehold.co', 'via.placeholder.com']

export function isPlaceholderImage(url: string | undefined | null): boolean {
  if (!url?.trim()) return true
  return PLACEHOLDER_HINTS.some((hint) => url.includes(hint))
}
