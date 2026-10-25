import { useEffect, useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'
import { siteWorkspaceApi, workspaceErrorMessage, type SiteMembership } from './api'
import { SiteWorkspacePage } from '../../pages/SiteWorkspacePage'

export function SiteWorkspaceRoute() {
  const [memberships, setMemberships] = useState<SiteMembership[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    siteWorkspaceApi
      .mine()
      .then((items) => {
        if (!cancelled) setMemberships(Array.isArray(items) ? items : [])
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(workspaceErrorMessage(cause))
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <AppLayout>
        <main className="px-4 py-8 md:px-8">
          <h1 className="text-2xl font-black text-slate-900">Quản lý di tích</h1>
          <p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        </main>
      </AppLayout>
    )
  }

  if (!memberships) {
    return (
      <AppLayout>
        <main className="px-4 py-8 md:px-8">
          <h1 className="text-2xl font-black text-slate-900">Quản lý di tích</h1>
          <p className="mt-4 text-sm text-slate-600">Đang tải không gian di tích...</p>
        </main>
      </AppLayout>
    )
  }

  if (memberships.length === 0) {
    return (
      <AppLayout>
        <main className="px-4 py-8 md:px-8">
          <h1 className="text-2xl font-black text-slate-900">Quản lý di tích</h1>
          <p className="mt-4 max-w-xl text-sm text-slate-700">Bạn chưa được phân quyền quản lý di tích nào.</p>
        </main>
      </AppLayout>
    )
  }

  return <SiteWorkspacePage memberships={memberships} />
}
