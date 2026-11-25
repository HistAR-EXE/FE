import { useEffect, useState } from 'react'
import { feedbackApi, type Review } from './api'

export function LandingReviews() {
  const [reviews, setReviews] = useState<Review[]>([])
  useEffect(() => {
    let active = true
    feedbackApi.featured().then(data => { if (active) setReviews(data) }).catch(() => undefined)
    return () => { active = false }
  }, [])
  if (!reviews.length) return null
  return <section className="mx-auto max-w-6xl px-5 py-12" aria-labelledby="landing-review-title">
    <h2 id="landing-review-title" className="mb-5 text-2xl font-bold">Người dùng nói gì về TimeLens?</h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review, index) => <article key={index} className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-800">
        <p className="font-semibold text-blue-700">{review.rating}/5 sao</p>
        <blockquote className="my-3 whitespace-pre-wrap break-words">{review.comment}</blockquote>
        <p className="text-sm text-slate-600">Người dùng TimeLens · {review.tier}</p>
      </article>)}
    </div>
  </section>
}

