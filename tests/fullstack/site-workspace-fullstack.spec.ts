import { expect, test } from '@playwright/test'
import { accounts, authHeaders, data, login, signInPage, SITE } from './fixtures.ts'

type Version = {
  id: string
  version: number
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED'
  revision: number
  submittedBy: string | null
  reviewedBy: string | null
}

const versions = `/api/site-workspaces/${SITE}/content/SITE_PROFILE/profile/versions`
const baseline = {
  name: 'Di tích kiểm thử E2E',
  description: 'Hồ sơ công khai ban đầu từ cổng full-stack.',
  formattedAddress: 'Khu kiểm thử HistAR',
  coverImage: '/brand/logo-histar.png',
  sources: 'Fixture kiểm thử tự động',
}
const revised = {
  ...baseline,
  name: 'Di tích kiểm thử E2E đã cập nhật',
  description: 'Hồ sơ đã qua biên tập và duyệt độc lập.',
}

test('onboarding creates membership and content enforces review, publish, conflict, and rollback', async ({ request, page }) => {
  const admin = await login(request, accounts.admin)
  const candidate = await login(request, accounts.candidate)
  const editor = await login(request, accounts.editor)
  const reviewer = await login(request, accounts.reviewer)

  const onboarding = await data<{ id: string; status: string }>(await request.post('/api/site-onboarding-requests', {
    headers: authHeaders(candidate),
    data: {
      representativeName: 'Quản lý Full-stack',
      organizationName: 'Ban quản lý E2E',
      representativeEmail: candidate.email,
      siteCode: SITE,
      evidenceNote: 'Hồ sơ xác minh dùng riêng cho Playwright full-stack.',
    },
  }))
  expect(onboarding.status).toBe('PENDING')

  const approved = await data<{ status: string; requesterId: string }>(await request.post(
    `/api/admin/site-onboarding-requests/${onboarding.id}/approve`,
    { headers: authHeaders(admin), data: { note: 'Đã xác minh fixture.' } },
  ))
  expect(approved).toMatchObject({ status: 'APPROVED', requesterId: accounts.candidate.id })

  const memberships = await data<Array<{ siteCode: string; role: string }>>(await request.get(
    '/api/site-workspaces/mine', { headers: authHeaders(candidate) },
  ))
  expect(memberships).toContainEqual(expect.objectContaining({ siteCode: SITE, role: 'SITE_MANAGER' }))

  for (const [userId, role] of [
    [accounts.editor.id, 'CONTENT_EDITOR'],
    [accounts.reviewer.id, 'CONTENT_REVIEWER'],
  ] as const) {
    await data(await request.put(`/api/site-workspaces/${SITE}/members`, {
      headers: authHeaders(candidate),
      data: { userId, role },
    }))
  }

  const first = await createSubmitApprovePublish(request, editor, reviewer, candidate, baseline)
  expect(first.status).toBe('PUBLISHED')
  await expectPublicProfile(request, baseline.name, baseline.description)

  const secondDraft = await data<Version>(await request.post(versions, {
    headers: authHeaders(candidate), data: { snapshot: revised, expectedRevision: null },
  }))
  const updated = await data<Version>(await request.patch(`${versions}/${secondDraft.version}`, {
    headers: authHeaders(candidate),
    data: { snapshot: revised, expectedRevision: secondDraft.revision },
  }))
  const stale = await request.patch(`${versions}/${secondDraft.version}`, {
    headers: authHeaders(candidate),
    data: { snapshot: { ...revised, name: 'Ghi đè cũ' }, expectedRevision: secondDraft.revision },
  })
  expect(stale.status()).toBe(409)

  const submitted = await data<Version>(await request.post(`${versions}/${secondDraft.version}/submit`, {
    headers: authHeaders(candidate), data: { expectedRevision: updated.revision },
  }))
  const selfReview = await request.post(`${versions}/${secondDraft.version}/review`, {
    headers: authHeaders(candidate),
    data: { expectedRevision: submitted.revision, decision: 'APPROVE', note: 'Không được chấp nhận' },
  })
  expect(selfReview.ok()).toBe(false)
  expect(await selfReview.text()).toContain('Không thể tự duyệt')

  const approvedSecond = await data<Version>(await request.post(`${versions}/${secondDraft.version}/review`, {
    headers: authHeaders(reviewer),
    data: { expectedRevision: submitted.revision, decision: 'APPROVE', note: 'Duyệt độc lập' },
  }))
  const publishedSecond = await data<Version>(await request.post(`${versions}/${secondDraft.version}/publish`, {
    headers: authHeaders(candidate), data: { expectedRevision: approvedSecond.revision },
  }))
  await expectPublicProfile(request, revised.name, revised.description)

  const rolledBack = await data<Version>(await request.post(`${versions}/${first.version}/rollback`, {
    headers: authHeaders(candidate),
    data: { expectedRevision: publishedSecond.revision, reason: 'Khôi phục bản công khai đã xác nhận' },
  }))
  expect(rolledBack).toMatchObject({ status: 'PUBLISHED', version: 3 })
  await expectPublicProfile(request, baseline.name, baseline.description)

  await signInPage(page, candidate)
  await page.goto('/site-workspace')
  await expect(page.getByText('Vai trò của bạn: Quản lý di tích')).toBeVisible()
  await page.getByRole('tab', { name: 'Đã phát hành' }).click()
  await expect(page.getByText('Phiên bản 3')).toBeVisible()
})

async function createSubmitApprovePublish(
  request: Parameters<typeof login>[0],
  editor: Awaited<ReturnType<typeof login>>,
  reviewer: Awaited<ReturnType<typeof login>>,
  manager: Awaited<ReturnType<typeof login>>,
  snapshot: typeof baseline,
) {
  const draft = await data<Version>(await request.post(versions, {
    headers: authHeaders(editor), data: { snapshot, expectedRevision: null },
  }))
  const submitted = await data<Version>(await request.post(`${versions}/${draft.version}/submit`, {
    headers: authHeaders(editor), data: { expectedRevision: draft.revision },
  }))
  expect(submitted).toMatchObject({ status: 'IN_REVIEW', submittedBy: accounts.editor.id })

  const selfReview = await request.post(`${versions}/${draft.version}/review`, {
    headers: authHeaders(editor), data: { expectedRevision: submitted.revision, decision: 'APPROVE' },
  })
  expect(selfReview.ok()).toBe(false)

  const approved = await data<Version>(await request.post(`${versions}/${draft.version}/review`, {
    headers: authHeaders(reviewer), data: { expectedRevision: submitted.revision, decision: 'APPROVE' },
  }))
  return data<Version>(await request.post(`${versions}/${draft.version}/publish`, {
    headers: authHeaders(manager), data: { expectedRevision: approved.revision },
  }))
}

async function expectPublicProfile(request: Parameters<typeof login>[0], name: string, description: string) {
  const response = await request.get('/api/locations')
  const payload = await data<{ items: Array<{ siteCode?: string; name: string; description: string }> }>(response)
  expect(payload.items).toContainEqual(expect.objectContaining({ name, description }))
}
