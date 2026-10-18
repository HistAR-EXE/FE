import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { Button } from '../../components/ui/Button'
import { getData, httpClient } from '../../shared/api/httpClient'
import { useToast } from '../../shared/ui/toast/useToast'

type CreatorPublicStats = {
  code: string
  creatorName: string
  visits30d: number
  uniqueUsers30d: number
}

type Props = {
  /** Referral code to display share widget for */
  code: string
}

export function ReferralShareWidget({ code }: Props) {
  const { showToast } = useToast()
  const [info, setInfo] = useState<CreatorPublicStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!code) return
    setLoading(true)
    getData<CreatorPublicStats>(
      httpClient.get(`/api/referral/${encodeURIComponent(code)}/stats`, { params: { days: 30 } }),
    )
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }, [code])

  const referralUrl = `${window.location.origin}/creator/${encodeURIComponent(code)}`

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      showToast({ type: 'success', message: 'Đã sao chép link giới thiệu!' })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast({ type: 'error', message: 'Không thể sao chép' })
    }
  }, [referralUrl, showToast])

  const shareNative = useCallback(async () => {
    if (!navigator.share) return
    try {
      await navigator.share({
        title: 'Khám phá di sản cùng TimeLens',
        text: `${info?.creatorName ?? 'TimeLens'} mời bạn khám phá di sản Việt Nam — trải nghiệm AR & AI độc đáo!`,
        url: referralUrl,
      })
    } catch {
      /* user cancelled */
    }
  }, [info, referralUrl])

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl bg-surface-container-low p-space-md">
        <div className="h-4 w-32 rounded bg-surface-container-high" />
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <MaterialIcon name="loyalty" className="text-[20px] text-primary" />
        <h3 className="font-headline-sm text-headline-sm text-on-surface">Link giới thiệu</h3>
      </div>

      {/* Referral link */}
      <div className="mb-3 flex items-center gap-2 rounded-lg bg-surface-container p-2">
        <code className="flex-1 truncate font-code-sm text-code-sm text-on-surface">{referralUrl}</code>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary hover:bg-primary/20"
          aria-label="Sao chép link"
        >
          <MaterialIcon name={copied ? 'check' : 'content_copy'} className="text-[16px]" />
        </button>
      </div>

      {/* Stats */}
      {info && (
        <div className="mb-3 grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center rounded-lg bg-surface-container p-3">
            <span className="font-headline-md text-headline-md text-primary">{info.visits30d}</span>
            <span className="font-code-sm text-code-sm text-outline">Lượt truy cập</span>
          </div>
          <div className="flex flex-col items-center rounded-lg bg-surface-container p-3">
            <span className="font-headline-md text-headline-md text-secondary">{info.uniqueUsers30d}</span>
            <span className="font-code-sm text-code-sm text-outline">Người dùng mới</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {'share' in navigator && (
          <Button variant="primary" className="flex-1 text-sm min-h-[44px]" onClick={() => void shareNative()}>
            <MaterialIcon name="share" className="text-[16px]" />
            Chia sẻ
          </Button>
        )}
        <Link
          to={`/creator/${encodeURIComponent(code)}/stats`}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-neutral-200 px-3 py-2.5 font-semibold text-sm text-neutral-700 dark:text-neutral-700 hover:bg-neutral-100 min-h-[44px]"
        >
          <MaterialIcon name="bar_chart" className="text-[16px]" />
          Chi tiết
        </Link>
      </div>
    </div>
  )
}
