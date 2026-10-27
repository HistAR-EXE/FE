import { Link } from 'react-router-dom'
import type { ProfileMe, ProfileOverview } from './api'
import type { ProfileResource } from './useProfileResource'
import { ProfileFact, ProfileIcon, ProfileResourceState } from './ProfileUi'
import { metricValue, profileDate, roleLabel } from './profileState'
import { ProfileCreations } from './ProfileCreations'

export function ProfileOverviewTab({ userId, profile, overview, onJourney }: { userId: string; profile: ProfileMe; overview: ProfileResource<ProfileOverview>; onJourney: () => void }) {
  const stats = overview.status === 'ready' ? overview.data?.stats : null
  const cards = [
    ['Nhiệm vụ hoàn thành', metricValue(stats, 'completedQuests'), 'task_alt', 'Trên toàn tài khoản'],
    ['Di tích đã khám phá', metricValue(stats, 'discoveredLocations'), 'explore', 'Có hoạt động khám phá được ghi nhận'],
    ['Di tích đã check-in', metricValue(stats, 'checkedInLocations'), 'location_on', 'Check-in thực địa được hệ thống ghi nhận'],
    ['Dấu hộ chiếu', metricValue(stats, 'passportStamps'), 'menu_book', 'Từ check-in và nhiệm vụ hoàn thành'],
    ['Huy hiệu hệ thống', metricValue(stats, 'earnedBadges'), 'workspace_premium', 'Huy hiệu sự kiện & cộng đồng'],
  ] as const
  return <div className="pf-tab-content">
    <div className="pf-section-heading"><div><span className="pf-kicker">MỖI BƯỚC CHÂN ĐỀU ĐƯỢC GHI NHỚ</span><h2>Bức tranh hành trình của bạn</h2><p>Các chỉ số dưới đây tổng hợp trên toàn tài khoản. Tiến độ từng di tích nằm ở tab Hành trình & thành tích.</p></div><button className="pf-button secondary" onClick={onJourney}>Xem hành trình <ProfileIcon name="arrow_forward" /></button></div>
    {overview.status === 'error' && <ProfileResourceState resource={overview} label="số liệu tổng quan">{() => null}</ProfileResourceState>}
    <div className="pf-metrics">{cards.map(([label, value, icon, hint]) => <article className="pf-metric" key={label}><span className="pf-metric-icon"><ProfileIcon name={icon} /></span><strong>{value === null ? '—' : value.toLocaleString('vi-VN')}</strong><h3>{label}</h3><p>{value === null ? overview.status === 'error' ? 'Chưa tải được dữ liệu' : 'Đang tải số liệu…' : hint}</p></article>)}</div>
    <div className="pf-columns">
      <section className="pf-card"><div className="pf-card-heading"><ProfileIcon name="person" /><h2>Thông tin nhanh</h2></div><dl className="pf-facts"><ProfileFact label="Vai trò hệ thống" value={roleLabel(profile.role)} /><ProfileFact label="Email" value={profile.email} hint={profile.emailVerified ? 'Email đã xác thực' : 'Email chưa xác thực'} /><ProfileFact label="Thành phố" value={profile.city || 'Chưa cập nhật'} /><ProfileFact label="Tham gia TimeLens" value={overview.data ? profileDate(overview.data.account.createdAt) : 'Chưa tải được dữ liệu'} /></dl><Link className="pf-text-button" to="/settings">Cài đặt tài khoản <ProfileIcon name="arrow_outward" /></Link></section>
      <section className="pf-card pf-next-step"><span className="pf-kicker">HÀNH ĐỘNG TIẾP THEO</span><h2>{stats && stats.completedQuests > 0 ? 'Tiếp nối những điều bạn đã khám phá.' : 'Một hành trình mới đang chờ bạn.'}</h2><p>Khám phá di tích, thực hiện nhiệm vụ và lưu lại những dấu mốc của riêng mình. Tiến độ được đồng bộ từ các hoạt động thực tế trong hệ thống.</p><div className="pf-actions"><Link className="pf-button" to="/quests">Đến nhiệm vụ <ProfileIcon name="arrow_forward" /></Link><Link className="pf-button secondary" to="/explore">Khám phá di sản</Link></div><Link className="pf-text-button" to="/journey-wrapped">Xem tổng kết hành trình</Link></section>
    </div>
    <ProfileCreations userId={userId} />
    {overview.data && <p className="pf-footnote">Số liệu tổng hợp lúc {profileDate(overview.data.generatedAt, true)}. XP và cấp độ do hệ thống tính; không cộng lặp điểm ở từng khu vực.</p>}
  </div>
}
