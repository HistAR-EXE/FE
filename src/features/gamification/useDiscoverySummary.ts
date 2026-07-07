// src/features/gamification/useDiscoverySummary.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { discoveriesApi, type DiscoverySummary } from './api'
import { DISCOVERY_RECORDED_EVENT } from './discoveryRouting'
import { debounce } from '../../shared/utils/debounce'
import { useAuth } from '../../shared/auth/useAuth'

export function useDiscoverySummary(locationId: string, debounceMs = 500) {
    const { isAuthenticated } = useAuth()
    const [summary, setSummary] = useState<DiscoverySummary | null>(null)
    const [loading, setLoading] = useState(false)
    const lastVersionRef = useRef(0)

    const applySummary = useCallback((data: DiscoverySummary) => {
        const version = data.version ?? 0
        if (version >= lastVersionRef.current) {
            lastVersionRef.current = version
            setSummary(data)
        }
    }, [])

    const refetch = useCallback(async () => {
        if (!isAuthenticated) {
            lastVersionRef.current = 0
            setSummary(null)
            return
        }
        setLoading(true)
        try {
            const data = await discoveriesApi.summary(locationId)
            applySummary(data)
        } catch {
            setSummary(null)
        } finally {
            setLoading(false)
        }
    }, [applySummary, isAuthenticated, locationId])

    // eslint-disable-next-line react-hooks/refs
    const debouncedRefetch = useMemo(() => debounce(refetch, debounceMs), [refetch, debounceMs])

    useEffect(() => {
        void refetch()
    }, [refetch])

    useEffect(() => {
        const onRecorded = () => debouncedRefetch()
        window.addEventListener(DISCOVERY_RECORDED_EVENT, onRecorded)
        return () => {
            debouncedRefetch.cancel()
            window.removeEventListener(DISCOVERY_RECORDED_EVENT, onRecorded)
        }
    }, [debouncedRefetch])

    return { summary, loading, refetch }
}