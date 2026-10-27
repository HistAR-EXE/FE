import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { orgApi, type OrgEmailInvitation, type OrgInviteCode, type OrgRosterMember } from '../features/org/api'
import { useTeacherWorkspace } from '../features/org/teacher-workspace-context'
import { invitationDeliveryMessage, isTeachingMembership } from '../features/org/teacherWorkspaceState'
import { useToast } from '../shared/ui/toast/useToast'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'

export function TeacherDashboardPage() {
  const { orgId, capabilities, billing, reload } = useTeacherWorkspace()
  const { showToast } = useToast()
  const [roster, setRoster] = useState<OrgRosterMember[]>([])
  const [invitations, setInvitations] = useState<OrgEmailInvitation[]>([])
  const [invite, setInvite] = useState<OrgInviteCode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [search, setSearch] = useState('')
  const [email, setEmail] = useState('')
  const [studentName, setStudentName] = useState('')
  const [provisionEmail, setProvisionEmail] = useState('')
  const [provisionName, setProvisionName] = useState('')
  const [teacherEmail, setTeacherEmail] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [provisionResult, setProvisionResult] = useState('')
  const [teacherResult, setTeacherResult] = useState('')
  const [inviteResult, setInviteResult] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([orgApi.roster(orgId), orgApi.emailInvitations(orgId), orgApi.getInviteCode(orgId)])
      .then(([members, pending, code]) => { if (!cancelled) { setRoster(members); setInvitations(pending); setInvite(code) } })
      .catch(error => { if (!cancelled) setError(getFriendlyErrorMessage(error, 'quest')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orgId, revision])

  const refresh = () => { setRevision(value => value + 1); reload() }
  const reportError = (error: unknown) => showToast({ message: getFriendlyErrorMessage(error, 'quest'), type: 'error' })
  const students = roster.filter(member => !isTeachingMembership(member.orgRole))
  const filtered = students.filter(member => `${member.displayName} ${member.email}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')))
  const staff = roster.filter(member => isTeachingMembership(member.orgRole))

  const sendInvitation = async (event: FormEvent) => {
    event.preventDefault(); setBusy('invite'); setInviteResult('')
    try {
      const result = await orgApi.sendInviteEmail(orgId, { studentEmail: email.trim(), studentName: studentName.trim() || undefined })
      setInviteResult(invitationDeliveryMessage(result.deliveryStatus, result.email))
      setEmail(''); setStudentName('')
      setInvitations(await orgApi.emailInvitations(orgId))
      showToast({ message: result.deliveryStatus === 'SENT' ? 'Đã gửi lời mời' : 'Đã lưu lời mời local', type: 'success' })
    } catch (error) { reportError(error) } finally { setBusy('') }
  }
  const provision = async (event: FormEvent, kind: 'student' | 'teacher') => {
    event.preventDefault(); setBusy(kind)
    const setResult = kind === 'student' ? setProvisionResult : setTeacherResult
    setResult('')
    try {
      const payload = { email: (kind === 'student' ? provisionEmail : teacherEmail).trim(), displayName: (kind === 'student' ? provisionName : teacherName).trim() || undefined, sendCredentialsEmail: false }
      const result = await (kind === 'student' ? orgApi.provisionStudent(orgId, payload) : orgApi.provisionTeacher(orgId, payload))
      setResult(result.accountCreated ? `Đã cấp tài khoản ${result.email}.${result.temporaryPassword ? ` Mật khẩu tạm: ${result.temporaryPassword}` : ''} Hãy lưu và bàn giao riêng cho người dùng.` : `Đã thêm ${result.email} vào tổ chức.`)
      if (kind === 'student') { setProvisionEmail(''); setProvisionName('') } else { setTeacherEmail(''); setTeacherName('') }
      setRoster(await orgApi.roster(orgId))
      reload()
      showToast({ message: 'Đã cấp quyền tài khoản', type: 'success' })
    } catch (error) { reportError(error) } finally { setBusy('') }
  }
  const removeStudent = async (member: OrgRosterMember) => {
    if (!window.confirm(`Loại ${member.displayName} khỏi tổ chức? Quyền Premium do tổ chức cấp sẽ bị thu hồi.`)) return
    setBusy(member.userId)
    try { await orgApi.removeMember(member.userId); refresh() } catch (error) { reportError(error) } finally { setBusy('') }
  }
  const copyInvite = async () => {
    if (!invite?.inviteCode) return
    const url = invite.inviteUrl?.startsWith('http') ? invite.inviteUrl : `${window.location.origin}/join?code=${encodeURIComponent(invite.inviteCode)}`
    try { await navigator.clipboard.writeText(url); showToast({ message: 'Đã sao chép link tham gia', type: 'success' }) } catch { setInviteResult(url) }
  }
  const renewInvite = async () => {
    setBusy('code')
    try { setInvite(await orgApi.generateInviteCode(orgId)) } catch (error) { reportError(error) } finally { setBusy('') }
  }

  return <main>
    <div className="tw-page-head"><div><span className="tw-eyebrow">MỖI LỚP HỌC, MỘT HÀNH TRÌNH</span><h1>Chào lớp học của bạn.</h1><p>Mời học sinh, chuẩn bị nhiệm vụ và theo dõi những bước khám phá đầu tiên. Mọi quyền và hạn mức được cập nhật từ tổ chức.</p></div><a className="tw-button" href="#invite-students"><span className="material-symbols-outlined" aria-hidden="true">person_add</span>Mời học sinh</a></div>
    <section className="tw-journey"><div className="tw-journey-icon"><span className="material-symbols-outlined" aria-hidden="true">school</span></div><div><h2>{students.length ? 'Lớp học đã sẵn sàng khám phá.' : 'Bắt đầu từ lời mời đầu tiên.'}</h2><p>{students.length ? `${students.length} học sinh đã có mặt. Theo dõi tiến độ hoặc chuẩn bị hoạt động tiếp theo cho lớp.` : 'Gửi email mời hoặc cấp tài khoản học sinh. Học sinh đăng nhập bằng email đã xác thực để nhận quyền Premium theo tổ chức.'}</p></div>{capabilities?.assignments && <Link className="tw-button secondary" to="/teacher/assignments">Chuẩn bị bài tập ↗</Link>}</section>
    {billing && <section className="tw-stats" aria-label="Hạn mức tổ chức">
      <Stat label="TÀI KHOẢN XÁC THỰC" value={`${billing.verifiedAccounts} / ${billing.maxVerifiedAccounts.toLocaleString('vi-VN')}`} detail="Bao gồm tài khoản được cấp trong tổ chức" used={billing.verifiedAccounts} limit={billing.maxVerifiedAccounts} />
      <Stat label="ĐANG SỬ DỤNG ĐỒNG THỜI" value={`${billing.ccuCurrent} / ${billing.maxCcu}`} detail="Số tài khoản hoạt động cùng lúc" used={billing.ccuCurrent} limit={billing.maxCcu} />
      <Stat label="AI DÙNG CHUNG / THÁNG" value={billing.aiQueriesLimit == null ? 'Không giới hạn' : `${billing.aiQueriesUsed.toLocaleString('vi-VN')} / ${billing.aiQueriesLimit.toLocaleString('vi-VN')}`} detail={billing.aiQueriesLimit == null ? 'Không giới hạn theo gói Premium' : `Làm mới: ${new Date(`${billing.quotaResetsOn}T00:00:00`).toLocaleDateString('vi-VN')}`} used={billing.aiQueriesUsed} limit={billing.aiQueriesLimit} />
      <Stat label="THỜI HẠN GÓI" value={billing.endDate ? new Date(`${billing.endDate}T00:00:00`).toLocaleDateString('vi-VN') : 'Đang hoạt động'} detail={`Gói ${billing.planType} · Quyền Premium theo tổ chức`} />
    </section>}
    {error && <div className="tw-note error" role="alert">Chưa tải được dữ liệu lớp học: {error} <button onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}
    <div className="tw-columns"><div className="tw-stack">
      <section className="tw-card" id="invite-students"><span className="tw-eyebrow">01 / KẾT NỐI LỚP HỌC</span><h2>Mời học sinh bằng email</h2><p>Hệ thống ghi nhận lời mời cho đúng email. Khi học sinh đăng nhập và xác thực email, quyền Premium được cấp theo thời hạn và hạn mức của tổ chức.</p><form className="tw-form" onSubmit={sendInvitation}><div className="tw-form-grid"><label>Email học sinh<input type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="hocsinh@truong.edu.vn" /></label><label>Tên học sinh (tùy chọn)<input value={studentName} onChange={event => setStudentName(event.target.value)} placeholder="Nguyễn Minh Anh" /></label></div><button className="tw-button" disabled={Boolean(busy) || !capabilities?.manageMembers || billing?.accountLimitReached}>Gửi email mời ↗</button></form>{inviteResult && <p className="tw-note" role="status">{inviteResult}</p>}{invitations.length > 0 && <ul className="tw-invites" aria-label="Lời mời đã tạo">{invitations.slice(0, 8).map(item => <li key={item.email}><div><strong>{item.email}</strong><small>Hết hạn {new Date(item.expiresAt).toLocaleDateString('vi-VN')}</small></div><span>{item.status === 'ACCEPTED' ? 'Đã tham gia' : item.status === 'EXPIRED' ? 'Hết hạn' : 'Chờ tham gia'} · {item.deliveryStatus === 'SENT' ? 'Đã gửi thư' : 'Chỉ lưu local'}</span></li>)}</ul>}</section>
      <section className="tw-card"><div className="tw-section-row"><div><span className="tw-eyebrow">02 / THÀNH VIÊN & TIẾN ĐỘ</span><h2>Học sinh trong tổ chức <span className="tw-plan-badge">{students.length}</span></h2></div><input className="tw-search" aria-label="Tìm học sinh" placeholder="Tìm tên hoặc email…" value={search} onChange={event => setSearch(event.target.value)} /></div><p className="tw-table-hint">Vuốt ngang bảng để xem đầy đủ tiến độ và thao tác.</p><div className="tw-table-scroll"><table className="tw-table"><thead><tr><th>Học sinh</th><th>Điểm</th><th>Quest</th><th>Tiến độ</th><th>Thao tác</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="tw-empty">Đang tải thành viên…</td></tr> : !filtered.length ? <tr><td colSpan={5} className="tw-empty">{search ? 'Không tìm thấy học sinh phù hợp.' : 'Chưa có học sinh. Hãy gửi lời mời đầu tiên.'}</td></tr> : filtered.map(member => <tr key={member.userId}><td><strong>{member.displayName}</strong><small>{member.email}</small></td><td>{member.totalPoints}</td><td>{member.questsCompleted}</td><td>{member.questProgress?.length ? member.questProgress.slice(0, 2).map(quest => <div key={quest.questId}><small>{quest.title} · {quest.completionPct}%</small><div className="tw-meter"><span style={{ width: `${Math.min(100, Math.max(0, quest.completionPct))}%` }} /></div></div>) : <small>Chưa có hoạt động</small>}</td><td><button className="tw-button danger" disabled={Boolean(busy)} onClick={() => void removeStudent(member)}>Loại khỏi lớp</button></td></tr>)}</tbody></table></div></section>
    </div><div className="tw-stack">
      {capabilities?.manageTeachers && <section className="tw-card"><span className="tw-eyebrow">DÀNH CHO QUẢN LÝ B2B</span><h2>Cấp tài khoản giáo viên</h2><p>Giáo viên quản lý học sinh và các nghiệp vụ của gói. Quyền quản lý tổ chức không được cấp qua biểu mẫu này.</p><form className="tw-form" onSubmit={event => void provision(event, 'teacher')}><label>Email giáo viên<input type="email" required value={teacherEmail} onChange={event => setTeacherEmail(event.target.value)} placeholder="giaovien@truong.edu.vn" /></label><label>Tên hiển thị<input value={teacherName} onChange={event => setTeacherName(event.target.value)} placeholder="Cô Nguyễn Lan" /></label><button className="tw-button" disabled={Boolean(busy) || billing?.accountLimitReached}>Cấp quyền giáo viên</button></form>{teacherResult && <p className="tw-note success" role="status">{teacherResult}</p>}<ul className="tw-invites">{staff.map(member => <li key={member.userId}><div><strong>{member.displayName}</strong><small>{member.email}</small></div><span>{member.orgRole === 'owner' ? 'Quản lý B2B' : 'Giáo viên'}</span></li>)}</ul></section>}
      <section className="tw-card"><h2>Cấp tài khoản học sinh</h2><p>Dành cho học sinh chưa có tài khoản. Mật khẩu tạm hiển thị sau khi tạo; không tự gửi email đăng nhập.</p><form className="tw-form" onSubmit={event => void provision(event, 'student')}><label>Email học sinh<input type="email" required value={provisionEmail} onChange={event => setProvisionEmail(event.target.value)} placeholder="hocsinh@truong.edu.vn" /></label><label>Tên hiển thị<input value={provisionName} onChange={event => setProvisionName(event.target.value)} placeholder="Nguyễn Minh Anh" /></label><button className="tw-button secondary" disabled={Boolean(busy) || !capabilities?.manageMembers || billing?.accountLimitReached}>Tạo tài khoản học sinh</button></form>{provisionResult && <p className="tw-note success" role="status">{provisionResult}</p>}{billing?.accountLimitReached && <p className="tw-note warning">Tổ chức đã đạt giới hạn tài khoản. Liên hệ quản lý để nâng gói.</p>}</section>
      <section className="tw-card"><h2>Tham gia bằng mã lớp</h2><p>Học sinh đã có tài khoản có thể dùng mã tại Cài đặt → Lớp học.</p>{invite?.inviteCode && <div className="tw-journey" style={{ marginTop: 15, padding: 16, marginBottom: 12 }}><strong style={{ letterSpacing: 4, color: '#0875f9' }}>{invite.inviteCode}</strong><button className="tw-button secondary" onClick={() => void copyInvite()}>Copy link</button></div>}<button className="tw-button secondary" disabled={Boolean(busy)} onClick={() => void renewInvite()}>Tạo mã mới</button>{invite?.expiresAt && <p style={{ marginTop: 10 }}>Hết hạn: {new Date(invite.expiresAt).toLocaleString('vi-VN')}</p>}</section>
      <section className="tw-card"><h2>Quyền trong gói {billing?.planType}</h2><div className="tw-capability-list">{[['Quản lý thành viên & tiến độ', capabilities?.manageMembers], ['Tạo và giao bài tập', capabilities?.assignments], ['Live Board & report snapshot', capabilities?.liveBoard], ['Hoạt động nhóm', capabilities?.groups], ['Chuyến tham quan', capabilities?.fieldTrips]].map(([label, enabled]) => <div key={String(label)}><span className={`material-symbols-outlined ${enabled ? '' : 'is-locked'}`} aria-hidden="true">{enabled ? 'check_circle' : 'lock'}</span>{label}</div>)}</div><p className="tw-note warning" style={{ marginTop: 18 }}>Khi rời tổ chức hoặc gói hết hạn, quyền Premium do tổ chức cấp sẽ hết hiệu lực. Gói Premium cá nhân đã mua được giữ riêng.</p></section>
    </div></div>
  </main>
}

function Stat({ label, value, detail, used, limit }: { label: string; value: string; detail: string; used?: number; limit?: number | null }) {
  const ratio = limit && used != null ? Math.min(100, Math.max(0, used / limit * 100)) : 0
  return <div className={`tw-stat ${ratio >= 90 ? 'is-warning' : ''}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small>{limit != null && <div className="tw-meter"><span style={{ width: `${ratio}%` }} /></div>}</div>
}
