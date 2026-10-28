import mascot from '../../assets/mascot.png'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import './exploreLoading.css'

type Props = { signedIn: boolean; error: boolean; onRetry: () => void }

export function ExploreLoading({ signedIn, error, onRetry }: Props) {
    const loading = signedIn && !error
    return (
        <main className="explore-wait" aria-busy={loading}>
            <div className="explore-wait__grid" aria-hidden="true" />
            <section className="explore-wait__panel">
                <div className="explore-wait__scene" aria-hidden="true">
                    <span className="explore-wait__orbit" />
                    <span className="explore-wait__spark explore-wait__spark--one">✦</span>
                    <span className="explore-wait__spark explore-wait__spark--two">✦</span>
                    <img src={mascot} alt="" />
                    <span className="explore-wait__badge"><MaterialIcon name={error ? 'cloud_off' : 'explore'} /></span>
                </div>
                <div role={error && signedIn ? 'alert' : 'status'} aria-live="polite" className="explore-wait__message">
                    <span className="explore-wait__eyebrow">TIMELENS · KHÁM PHÁ DI SẢN</span>
                    <h1>{!signedIn ? 'Hành trình đang chờ bạn' : error ? 'Cùng kết nối lại nhé!' : 'Một chút nữa, cùng khám phá!'}</h1>
                    <p>{!signedIn ? 'Đăng nhập để xem XP và thành tích của tài khoản.' : error ? 'Chưa thể tải tiến độ đã lưu. Hãy thử kết nối lại để tiếp tục hành trình.' : 'Chrono đang chuẩn bị hành trình Củ Chi và tải XP, huy hiệu cùng tiến độ của bạn.'}</p>
                </div>
                {loading && <>
                    <div className="explore-wait__track" aria-hidden="true"><span /></div>
                    <div className="explore-wait__chips" aria-hidden="true">
                        <span><MaterialIcon name="stars" /> Điểm XP</span>
                        <span><MaterialIcon name="military_tech" /> Huy hiệu</span>
                        <span><MaterialIcon name="map" /> Hành trình</span>
                    </div>
                </>}
                {error && signedIn && <button type="button" onClick={onRetry} className="explore-wait__retry"><MaterialIcon name="refresh" /> Thử lại</button>}
            </section>
            {loading && <div className="explore-wait__preview" aria-hidden="true">
                {[0, 1, 2].map(item => <div className="explore-wait__placeholder" key={item}><i /><div><span /><span /></div></div>)}
            </div>}
        </main>
    )
}
