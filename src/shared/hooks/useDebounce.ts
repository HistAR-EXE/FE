import { useEffect, useState } from 'react'

/**
 * Debounces a value — useful for search inputs, resize handlers, etc.
 *
 * @param value The raw (fast-changing) value
 * @param delayMs Debounce window in milliseconds (default 300)
 * @returns The debounced value
 *
 * @example
 * const [search, setSearch] = useState('')
 * const debouncedSearch = useDebounce(search, 400)
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
