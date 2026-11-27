import { useEffect, useRef, useState } from 'react'
import { DIRECTORS_CUT_MOMENTS, HERITAGE_CANDIDATE_ITEMS } from './m2WorldExpansion'
import { advanceFilmPlayback, FILM_DURATION_MS, filmSceneIndex } from './m2Media'

// Original symbolic illustrations, deliberately separate from historical photography.
export function MemoryIllustration({ scene, title }: { scene: number; title: string }) {
  return <svg viewBox="0 0 640 320" role="img" aria-label={`Minh họa giáo dục: ${title}`} style={{ width: '100%', display: 'block', background: '#202c28' }}>
    <defs><linearGradient id={`sky-${scene}`} x2="0" y2="1"><stop stopColor="#283e38"/><stop offset="1" stopColor="#82774e"/></linearGradient></defs>
    <rect width="640" height="320" fill={`url(#sky-${scene})`}/>
    <circle cx="520" cy="58" r="26" fill="#f5df9f"/>
    <path d="M0 238 Q160 175 320 228T640 220V320H0Z" fill="#666848"/>
    {scene % 5 === 0 && <g stroke="#c3a775" strokeWidth="10" fill="#34352b"><path d="M95 226V285H530V226M225 226V165H420V226M320 165V100"/><path d="M260 100h110v24H260z" fill="#8c9b61"/><path d="M50 40v180m-30-120 30-50 30 50m440-10v130m-30-90 30-50 30 50" stroke="#34462d"/></g>}
    {scene % 5 === 1 && <g stroke="#d4ba78" strokeWidth="6" fill="#9b7e4f"><ellipse cx="220" cy="230" rx="75" ry="44"/><path d="M145 230q75 100 150 0M165 212l20 50m15-66 12 73m28-68-3 65m35-53-10 45M350 210l105-92 42 42-105 92z"/><path d="M45 260l40-80m-20 40 40-20m390 60 30-70m-10 40 35-25" stroke="#a2b579"/></g>}
    {scene % 5 === 2 && <g stroke="#d6bd80" strokeWidth="7" fill="#a27843"><path d="M130 90h380v170H130zM110 90l210-55 210 55M130 150h380"/><path d="M145 153q175 80 350 0" fill="none"/><circle cx="320" cy="125" r="18" fill="#ffe0a0"/><path d="M170 260v-60m300 60v-60"/></g>}
    {scene % 5 === 3 && <g stroke="#e0bf79" strokeWidth="7"><path d="M130 255h170l-20-70H150z" fill="#78674c"/><path d="M190 200q-30-40 10-85 20 40 10 65 35-25 20-55 65 80-40 75" fill="#f0b768" stroke="none"/><ellipse cx="435" cy="175" rx="52" ry="18" fill="#c4ab7b"/><path d="M383 175q-20 100 52 100t52-100" fill="#8b7657"/><path d="M398 192q35 25 74 0" fill="none"/></g>}
    {scene % 5 === 4 && <g stroke="#d9c596" strokeWidth="6" fill="#a99e7a"><path d="M240 260V95h160v165M215 95h210l-105-50zM180 275h280M155 294h330"/><path d="M314 255q-24-46-70-49m70 49q-5-54 38-76" fill="none" stroke="#9ab48a"/><circle cx="245" cy="206" r="12" fill="#e8d9b1"/><circle cx="351" cy="179" r="12" fill="#e8d9b1"/></g>}
    <text x="20" y="305" fill="#fff5d9" fontFamily="sans-serif" fontSize="13">MINH HỌA GỐC · TÁI DỰNG GIÁO DỤC · TIMELENS</text>
  </svg>
}

export function ExhibitionPreview({ themeTitle, curatorNote, itemIds }: { themeTitle: string; curatorNote: string; itemIds: string[] }) {
  return <section className="lw-exhibition-preview" aria-label="Xem trước triển lãm cá nhân" style={{ padding: 16, background: '#ede9d8', border: '1px solid #ad9665', borderRadius: 8 }}>
    <p className="lw-eyebrow">PHÒNG TRƯNG BÀY CÁ NHÂN · MINH HỌA GIÁO DỤC</p>
    <h4>{themeTitle}</h4><p>{curatorNote}</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
      {itemIds.map(id => { const item = HERITAGE_CANDIDATE_ITEMS.find(x => x.id === id); if (!item) return null
        const index = HERITAGE_CANDIDATE_ITEMS.indexOf(item)
        return <article key={id} data-exhibit-card={id} style={{ background: '#faf7eb', border: '1px solid #c4b88e', padding: 10 }}>
          <MemoryIllustration scene={index === 8 ? 4 : index === 6 || index === 7 ? 3 : index === 5 ? 2 : index === 0 ? 0 : 1} title={item.title}/>
          <h5>{item.title}</h5><p className="lw-small">{item.zone} · {item.truth}</p><p>{item.reflection}</p>
        </article>
      })}
    </div>
  </section>
}

export function DirectorsCutPlayer({ title, momentIds, narrationStyle, onCompleted }: { title: string; momentIds: string[]; narrationStyle: string; onCompleted: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const illustration = useRef<HTMLDivElement>(null)
  const [elapsed, setElapsed] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [visualReady, setVisualReady] = useState(false)
  const [inView, setInView] = useState(false)
  const [renderError, setRenderError] = useState('')
  useEffect(() => {
    const target = canvas.current
    if (!target || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(entries => setInView(entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25)), { threshold: [0, .25, 1] })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])
  const completed = useRef(false)
  const callback = useRef(onCompleted)
  useEffect(() => { callback.current = onCompleted }, [onCompleted])
  const moment = DIRECTORS_CUT_MOMENTS.find(x => x.id === momentIds[filmSceneIndex(elapsed)]) ?? DIRECTORS_CUT_MOMENTS[0]
  const scene = DIRECTORS_CUT_MOMENTS.indexOf(moment)

  useEffect(() => {
    const svg = illustration.current?.querySelector('svg')
    const target = canvas.current
    if (!svg || !target) return
    const image = new Image()
    let active = true
    image.onload = () => {
      if (!active) return
      const ctx = target.getContext('2d')
      if (!ctx) { setRenderError('Trình duyệt chưa hỗ trợ hiển thị phim. Chưa ghi nhận hoàn thành.'); return }
      ctx.drawImage(image, 0, 0, 960, 480)
      ctx.fillStyle = '#202c28'; ctx.fillRect(0, 480, 960, 60)
      ctx.fillStyle = '#fff3d0'; ctx.font = 'bold 20px sans-serif'; ctx.fillText(moment.zone, 24, 516)
      ctx.font = '15px sans-serif'; ctx.fillText('MINH HỌA GỐC · TÁI DỰNG GIÁO DỤC · TIMELENS', 330, 516, 606)
      setVisualReady(true)
    }
    image.onerror = () => { if (active) { setVisualReady(false); setRenderError('Không hiển thị được minh họa. Chưa ghi nhận hoàn thành.'); } }
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`
    return () => { active = false }
  }, [moment])

  useEffect(() => {
    if (!playing || !visualReady || !inView) return
    let request = 0
    let previous = performance.now()
    let time = elapsed
    const frame = (now: number) => {
      time = advanceFilmPlayback(time, now - previous, !document.hidden)
      previous = now
      setElapsed(time)
      if (time >= FILM_DURATION_MS) {
        setPlaying(false)
        if (!completed.current) { completed.current = true; callback.current() }
      } else request = requestAnimationFrame(frame)
    }
    request = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(request)
    // elapsed is the starting offset for this play interval; subsequent frames own their clock.
  }, [playing, visualReady, inView])

  return <section className="lw-reveal" data-directors-cut={elapsed >= FILM_DURATION_MS ? 'ended' : !inView ? 'paused-offscreen' : playing ? 'playing' : 'paused'} aria-label="Trình chiếu phim hành trình">
    <h4>{title}</h4>
    <p className="lw-small">45 giây · Ba minh họa gốc, không phải ảnh tư liệu · Phụ đề luôn bật · Không âm thanh</p>
    <div ref={illustration} style={{ display: 'none' }}><MemoryIllustration scene={scene} title={moment.title}/></div>
    <canvas ref={canvas} width={960} height={540} role="img" aria-label={`Cảnh minh họa: ${moment.title}`} style={{ display: 'block', width: '100%', background: '#202c28', borderRadius: 6 }}/>
    {renderError && <p role="alert">{renderError}</p>}
    {!inView && playing && elapsed < FILM_DURATION_MS && <p role="status">Cuộn tới khung phim để tiếp tục. Thời gian chỉ tính khi khung phim đang hiển thị.</p>}
    <p data-film-caption="true"><b>{moment.title}</b> · {moment.subtitle}</p>
    <p className="lw-small">Góc nhìn: {narrationStyle === 'EMPATHY' ? 'Ký ức con người & lời tri ân' : narrationStyle === 'ARCHITECTURAL' ? 'Kỹ thuật dân gian & cấu trúc ba tầng' : 'Sức sống cộng đồng & sự sẻ chia'} · {moment.zone}</p>
    <progress value={elapsed} max={FILM_DURATION_MS} aria-label="Tiến độ phim" style={{ width: '100%' }}/>
    <p data-film-elapsed={Math.floor(elapsed / 1000)}>{Math.floor(elapsed / 1000)} / 45 giây {elapsed >= FILM_DURATION_MS ? '· Đã trình chiếu trọn vẹn' : playing ? '· Đang trình chiếu' : '· Tạm dừng'}</p>
    <div className="lw-targets">
      <button type="button" disabled={elapsed >= FILM_DURATION_MS} onClick={() => setPlaying(value => !value)}>{playing ? 'Tạm dừng phim' : 'Tiếp tục phim'}</button>
      <button type="button" onClick={() => { completed.current = false; setElapsed(0); setPlaying(false); requestAnimationFrame(() => setPlaying(true)) }}>Phát lại từ đầu</button>
    </div>
  </section>
}
