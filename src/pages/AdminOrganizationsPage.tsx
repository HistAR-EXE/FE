import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { adminApi, type OrganizationAnalytics } from '../features/admin/api'

const DEMO_ORG_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

export function AdminOrganizationsPage() {
  const [data, setData] = useState<OrganizationAnalytics | null>(null)

  useEffect(() => {
    adminApi.organizationAnalytics(DEMO_ORG_ID).then(setData).catch(() => setData(null))
  }, [])

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="B2B Organizations" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-3xl mx-auto w-full space-y-md">
        <div className="flex gap-2">
          <Link to="/admin/analytics" className="text-sm text-secondary underline">
            Analytics
          </Link>
        </div>
        <h1 className="font-display-md text-on-surface">Organization Dashboard</h1>
        {data && (
          <section className="bg-surface-container border border-outline-variant rounded-xl p-md space-y-sm">
            <p className="font-title-md">{data.name}</p>
            <p className="text-sm text-on-surface-variant">Loại: {data.orgType}</p>
            <p className="text-sm">Thành viên: {data.memberCount}</p>
            <p className="text-sm">Hoàn thành: {data.completionRatePct}%</p>
            <p className="text-sm">Xem hết tour: {data.fullTourRatePct}%</p>
            <p className="text-xs text-on-surface-variant mt-2">{data.note}</p>
          </section>
        )}
      </main>
    </AppLayout>
  )
}
