export type FeedbackActivity = 'artifact' | 'time_portal' | 'tour'
export const feedbackActivityEvent = 'timelens:feedback-activity'

export function noteFeedbackActivity(group: FeedbackActivity, premium = false) {
  window.dispatchEvent(new CustomEvent(feedbackActivityEvent, { detail: { group, premium } }))
}
