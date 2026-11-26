import { ReviewPhotos } from './ReviewPhotos'
import { useEffect, useState } from 'react'
import './landingReviews.css'
import { feedbackApi, type Review } from './api'

export function LandingReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [page, setPage] = useState(0)
  const [stars, setStars] = useState(0)
  useEffect(() => {
    let active = true
    feedbackApi.featured().then(data => {
      if (active) setReviews(data.filter(item => import.meta.env.DEV || !/^\s*\[demo\]/i.test(item.comment)))
    }).catch(() => undefined)
    return () => { active = false }
  }, [])
  if (!reviews.length) return null
  const filtered = reviews.filter(item => !stars || item.rating === stars)
  const pages = Math.ceil(filtered.length / 6)
  return <section className="tl-reviews" aria-labelledby="landing-review-title">
    <h2 id="landing-review-title">TimeLens qua lời <em>người trải nghiệm</em></h2>
    {reviews.length > 3 && <div className="tl-review-tools">
      <span>{reviews.length} đánh giá</span>
      <label>Lọc theo sao <select value={stars} onChange={event => { setStars(Number(event.target.value)); setPage(0) }}>
        <option value={0}>Tất cả</option>
        {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} sao ({reviews.filter(item => item.rating === value).length})</option>)}
      </select></label>
    </div>}
    <div className="tl-review-list">
      {filtered.slice(page * 6, page * 6 + 6).map((review, index) => <figure key={index} className="tl-review-card">
        <div className="tl-review-rating" role="img" aria-label={review.rating + ' trên 5 sao'}>
          <span aria-hidden="true">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
        </div>
        <blockquote>{review.comment.replace(/^\s*\[demo\]\s*/i, '').normalize('NFC')}</blockquote>
        <ReviewPhotos photos={review.photos} />
        <figcaption>
          <span className="tl-review-monogram" aria-hidden="true">{review.avatarUrl && <img src={review.avatarUrl} alt="" onError={e => { e.currentTarget.hidden = true }} />}{review.authorName?.trim().split(/\s+/).map(word => Array.from(word)[0]).filter((_, i, words) => i === 0 || i === words.length - 1).join('').toLocaleUpperCase('vi') || 'TL'}</span>
          <span>{review.authorName || 'Người dùng TimeLens'}<small>Gói {review.tier.toUpperCase() === 'FREE' ? 'miễn phí' : review.tier.toUpperCase() === 'PREMIUM' ? 'Premium' : review.tier}</small></span>
        </figcaption>
      </figure>)}
    </div>
    {!filtered.length && <p className="tl-review-tools">Chưa có đánh giá ở mức sao này.</p>}
    {pages > 1 && <nav aria-label="Trang đánh giá" className="tl-review-tools">
      <button disabled={!page} onClick={() => setPage(page - 1)}>← Trước</button>
      <span aria-live="polite">Trang {page + 1} / {pages}</span>
      <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Sau →</button>
    </nav>}
  </section>
}