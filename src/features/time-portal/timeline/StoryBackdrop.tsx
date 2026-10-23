import type { EraStory, StoryVisual } from './storyData'

type Props = { story: EraStory; visual: StoryVisual; visualKey: string; durationMs: number }

/** A quiet exhibition surface keeps the historical image and narration in focus. */
export function StoryBackdrop({ story }: Props) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: 'radial-gradient(ellipse at 58% 20%, #ffffff 0%, #f0f6ff 65%, #e8f1ff 100%)' }}>
      <div className="absolute -right-24 top-8 h-[580px] w-[580px] rounded-full border border-blue-200/40" />
      <div className="absolute -right-12 top-20 h-[480px] w-[480px] rounded-full border border-blue-200/30" />
      <span className="absolute bottom-5 left-6 text-[90px] font-black tracking-tighter text-blue-200/15 sm:text-[180px]">{story.era === 2026 ? 'CỦ CHI' : story.era}</span>
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ffcf25] via-blue-400 to-transparent" />
    </div>
  )
}
