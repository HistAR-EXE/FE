import { useEffect, useRef, useState } from 'react'
import { DirectorsCutPlayer, ExhibitionPreview } from './M2MediaPreview'
import { composePostcard, requestWorldFrame, requireMediaConsent } from './m2Media'
import {
  ACTIVITY_CATALOG_24,
  CEDAR_FALLS_SECTIONS,
  CROSS_ACTIVITY_CHAINS_8,
  DIRECTORS_CUT_MOMENTS,
  FUTURE_LETTER_PROMPTS,
  HERITAGE_CANDIDATE_ITEMS,
  ZONE_NPC_PROFILES,
  getActivityStatus,
  type ActivityCompletionContext,
  type M2OwnerState,
  type PostcardItem,
} from './m2WorldExpansion'

export function ZoneNpcConversation({
  targetId,
  ctx,
  onTopicSeen,
  onEchoHeard,
}: {
  targetId: string
  ctx: ActivityCompletionContext
  onTopicSeen: (topicId: string) => void
  onEchoHeard: (echoId: string) => void
}) {
  const profile = ZONE_NPC_PROFILES[targetId]
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(profile?.topics[0]?.id ?? null)
  if (!profile) return null
  const activeTopic = profile.topics.find(t => t.id === selectedTopicId) ?? profile.topics[0]
  const echoHeard = ctx.m2.echoesHeard.includes(profile.echoId)

  return (
    <div className="lw-conversation" data-npc={targetId}>
      <p className="lw-conversation-scene">{profile.sceneIntro}</p>
      {activeTopic && (
        <section className="lw-conversation-reply" aria-label={`Lời ${profile.roleTitle}`}>
          <span className="lw-conversation-speaker">{profile.speakerLabel}</span>
          <h3>{activeTopic.title}</h3>
          <p role="status" aria-live="polite" aria-atomic="true">
            {activeTopic.reply(ctx)}
          </p>
        </section>
      )}
      <p className="lw-conversation-invite">Bạn muốn trao đổi điều gì? (Hoạt động A22 · Trò chuyện tự do)</p>
      <div className="lw-targets lw-conversation-choices" aria-label="Chủ đề trò chuyện">
        <button
          type="button"
          aria-pressed={echoHeard}
          onClick={() => onEchoHeard(profile.echoId)}
        >
          {echoHeard ? 'Nghe lại · Tiếng vọng không gian (A16)' : 'Lắng nghe tiếng vọng dẫn lối (A16)'}
        </button>
        {profile.topics.map(topic => (
          <button
            type="button"
            key={topic.id}
            aria-pressed={activeTopic?.id === topic.id}
            onClick={() => {
              setSelectedTopicId(topic.id)
              onTopicSeen(topic.id)
            }}
          >
            {topic.question}
          </button>
        ))}
      </div>
      {echoHeard && (
        <details className="lw-conversation-echo" open>
          <summary>Tiếng vọng không gian (A16)</summary>
          <p>{profile.echoPrompt}</p>
          <p className="lw-small">{profile.echoDescription}</p>
        </details>
      )}
      <details>
        <summary>Về lời kể này</summary>
        <p>
          FICTIONAL_EDUCATIONAL · Nhân vật và lời thoại do TimeLens biên soạn phục vụ giáo dục, phản hồi theo những gì bạn đã khám phá trong thế giới; không phải biên bản lời chứng nguyên văn và không cộng điểm thưởng.
        </p>
      </details>
    </div>
  )
}

export function CedarFallsTablePanel({
  m2,
  completed = false,
  onInspectSection,
  onCompleteActivity,
}: {
  m2: M2OwnerState
  onInspectSection: (sectionId: string) => void
  onCompleteActivity: () => void
  completed?: boolean
}) {
  const [activeId, setActiveId] = useState<string>(CEDAR_FALLS_SECTIONS[0].id)
  const current = CEDAR_FALLS_SECTIONS.find(s => s.id === activeId) ?? CEDAR_FALLS_SECTIONS[0]
  const inspectedCount = CEDAR_FALLS_SECTIONS.filter(s => m2.cedarFallsSections.includes(s.id)).length
  const allSeen = inspectedCount === CEDAR_FALLS_SECTIONS.length

  return (
    <div className="lw-workbench" data-activity="A23">
      <p className="lw-eyebrow">SA BÀN BỐI CẢNH LỊCH SỬ · A23 &amp; CẦU NỐI A17</p>
      <p className="lw-small">
        Tiến độ đọc tư liệu: {inspectedCount}/{CEDAR_FALLS_SECTIONS.length} mục · Phân loại: <b>{current.truth}</b>
      </p>
      <div className="lw-targets" role="tablist" aria-label="Các lớp bối cảnh tháng 01/1967">
        {CEDAR_FALLS_SECTIONS.map(sec => {
          const seen = m2.cedarFallsSections.includes(sec.id)
          return (
            <button
              type="button"
              key={sec.id}
              aria-pressed={activeId === sec.id}
              onClick={() => {
                setActiveId(sec.id)
                onInspectSection(sec.id)
              }}
            >
              {sec.title} {seen ? '· Đã đọc' : ''}
            </button>
          )
        })}
      </div>
      <section className="lw-card" aria-live="polite">
        <h3>{current.title}</h3>
        <p className="lw-small">
          <b>Mốc / Phạm vi:</b> {current.period} · <b>Nhãn sự thật:</b> {current.truth}
        </p>
        <p>{current.content}</p>
        <p>
          <b>Ý nghĩa đối chiếu:</b> {current.takeaway}
        </p>
        <p className="lw-small">
          <b>Nguồn tham chiếu:</b> {current.sourceCitation}
        </p>
      </section>
      <button
        type="button"
        disabled={!allSeen || completed}
        onClick={() => {
          if (!allSeen) return
          onCompleteActivity()
        }}
      >
        {completed
          ? 'Đã ghi nhận đối chiếu bối cảnh 01/1967 (A23)'
          : 'Đánh dấu đã đọc trọn 4 lớp bối cảnh 01/1967'}
      </button>
    </div>
  )
}

export function FutureLetterPanel({
  m2,
  onSaveLetter,
  onToggleConsent,
}: {
  m2: M2OwnerState
  onSaveLetter: (entry: { promptId: string; recipient: string; message: string }) => void
  onToggleConsent?: (accepted: boolean) => void
}) {
  const [promptId, setPromptId] = useState<string>(m2.futureLetter?.promptId ?? FUTURE_LETTER_PROMPTS[0].id)
  const activePrompt = FUTURE_LETTER_PROMPTS.find(p => p.id === promptId) ?? FUTURE_LETTER_PROMPTS[0]
  const [recipient, setRecipient] = useState<string>(m2.futureLetter?.recipient ?? 'Thế hệ hôm nay và mai sau')
  const [message, setMessage] = useState<string>(m2.futureLetter?.message ?? activePrompt.suggestedReply)
  const [error, setError] = useState('')

  return (
    <div className="lw-workbench" data-activity="A21">
      <p className="lw-eyebrow">HOẠT ĐỘNG A21 · MỘT LÁ THƯ GỬI TƯƠNG LAI</p>
      <p className="lw-small">
        Nhãn sự thật: <b>FICTIONAL_EDUCATIONAL</b> · Thư lưu riêng tư trên tài khoản/thiết bị của bạn, không gửi công khai lên mạng.
      </p>
      <div className="lw-targets">
        {FUTURE_LETTER_PROMPTS.map(p => (
          <button
            type="button"
            key={p.id}
            aria-pressed={promptId === p.id}
            onClick={() => {
              setPromptId(p.id)
              setMessage(p.suggestedReply)
            }}
          >
            {p.title}
          </button>
        ))}
      </div>
      <blockquote className="lw-card">
        <p>{activePrompt.excerpt1967}</p>
      </blockquote>
      <label>
        Người nhận lời nhắn
        <input
          type="text"
          aria-label="Người nhận lời nhắn"
          value={recipient}
          onChange={e => setRecipient(e.target.value)}
        />
      </label>
      <label>
        Lời nhắn suy ngẫm của bạn (có thể chọn mẫu hoặc viết riêng)
        <textarea
          rows={3}
          aria-label="Lời nhắn suy ngẫm của bạn"
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      </label>
      <button
        type="button"
        disabled={!m2.consentAccepted}
        onClick={() => {
          try {
            requireMediaConsent(m2.consentAccepted)
            onSaveLetter({
            promptId: activePrompt.id,
            recipient: recipient.trim() || 'Thế hệ hôm nay và mai sau',
            message: message.trim() || activePrompt.suggestedReply,
            })
            setError('')
          } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được thư. Hãy thử lại.') }
        }}
      >
        {m2.futureLetter ? 'Cập nhật lá thư trong sổ ký ức (A21)' : 'Lưu lá thư gửi tương lai (A21)'}
      </button>
      {onToggleConsent && <label className="lw-small"><input type="checkbox" checked={m2.consentAccepted} onChange={e => onToggleConsent(e.target.checked)}/> Tôi đồng ý lưu sáng tạo cá nhân trên thiết bị này, gồm lá thư.</label>}
      {!m2.consentAccepted && <p className="lw-small">Cần chủ động đồng ý lưu sáng tạo cá nhân trước khi lưu lá thư.</p>}
      {error && <p role="alert">{error}</p>}
      {m2.futureLetter && (
        <p role="status">
          Đã lưu lá thư gửi “{m2.futureLetter.recipient}” vào sổ ký ức cá nhân. Tuyến Văn hóa (C04) và Khép lại (C08) đã nhận kết nối này.
        </p>
      )}
    </div>
  )
}

export function CreativeMemoryStudio({
  currentZone,
  currentZoneTitle,
  ctx,
  onToggleConsent,
  onSavePostcard,
  onSaveExhibition,
  onSaveDirectorsCut,
  onSaveLetter,
  onClearPersonalData,
}: {
  currentZone: string
  currentZoneTitle: string
  ctx: ActivityCompletionContext
  onToggleConsent: (accepted: boolean) => void
  onSavePostcard: (card: Omit<PostcardItem, 'id' | 'createdAt' | 'watermark'>) => void
  onSaveExhibition: (themeTitle: string, curatorNote: string, itemIds: string[], previewVerified: true) => void
  onSaveDirectorsCut: (title: string, momentIds: string[], narrationStyle: 'EMPATHY' | 'ARCHITECTURAL' | 'COMMUNITY', verification: { durationSeconds: 45; completed: true; rendered: true; playbackVerified: true }) => void
  onSaveLetter: (entry: { promptId: string; recipient: string; message: string }) => void
  onClearPersonalData: () => void
}) {
  const [tab, setTab] = useState<'A18' | 'A19' | 'A20' | 'A21'>('A18')
  const [caption, setCaption] = useState<string>(`Khoảnh khắc tại ${currentZoneTitle} — ghi nhớ nhịp sống và con người Củ Chi.`)
  const [frameStyle, setFrameStyle] = useState<PostcardItem['frameStyle']>('LANTERN_GLOW')

  const [themeTitle, setThemeTitle] = useState<string>(ctx.m2.exhibition?.themeTitle ?? 'Mạch Sống Dưới Lòng Đất & Tình Người Củ Chi')
  const [curatorNote, setCuratorNote] = useState<string>(
    ctx.m2.exhibition?.curatorNote ?? 'Những vật dụng bình dị kết nối mặt đất với ba tầng hầm thành một cộng đồng kiên cường.'
  )
  const [selectedExhibitIds, setSelectedExhibitIds] = useState<string[]>(
    ctx.m2.exhibition?.itemIds ?? ['EX_HATCH_Q1', 'EX_MORTAR_A04', 'EX_HEARTH_A02_Q4', 'EX_CARE_A14_A15_Q5']
  )

  const [filmTitle, setFilmTitle] = useState<string>(ctx.m2.directorsCut?.title ?? 'Hành trình Mạch Sống Củ Chi 1967 – Hiện tại')
  const [narrationStyle, setNarrationStyle] = useState<'EMPATHY' | 'ARCHITECTURAL' | 'COMMUNITY'>(
    ctx.m2.directorsCut?.narrationStyle ?? 'COMMUNITY'
  )
  const [selectedMoments, setSelectedMoments] = useState<string[]>(
    ctx.m2.directorsCut?.momentIds ?? ['DC_M1_ENTRANCE', 'DC_M4_HEARTH_CARE', 'DC_M5_EPILOGUE']
  )
  const [playingCut, setPlayingCut] = useState<{ title: string; momentIds: string[]; narrationStyle: typeof narrationStyle; key: number } | null>(null)
  const [captureBusy, setCaptureBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<{ imageDataUrl: string; zone: string; zoneTitle: string; caption: string; frameStyle: PostcardItem['frameStyle'] } | null>(null)
  const captureAbort = useRef<AbortController | null>(null)
  const consent = useRef(ctx.m2.consentAccepted)
  useEffect(() => { consent.current = ctx.m2.consentAccepted }, [ctx.m2.consentAccepted])
  useEffect(() => () => captureAbort.current?.abort(), [])

  const capture = async () => {
    try {
      requireMediaConsent(consent.current)
      setError(''); setCaptureBusy(true)
      const abort = new AbortController()
      captureAbort.current = abort
      const dataUrl = await requestWorldFrame(abort.signal)
      const text = caption.trim() || `Ký ức tại ${currentZoneTitle}`
      const imageDataUrl = await composePostcard(dataUrl, `${currentZoneTitle} (${currentZone})`, text, frameStyle)
      if (abort.signal.aborted) return
      requireMediaConsent(consent.current)
      setPreview({ imageDataUrl, zone: currentZone, zoneTitle: currentZoneTitle, caption: text, frameStyle })
    } catch (cause) { if (!captureAbort.current?.signal.aborted) setError(cause instanceof Error ? cause.message : 'Không tạo được bưu thiếp.') }
    finally { if (!captureAbort.current?.signal.aborted) setCaptureBusy(false) }
  }

  const save = (action: () => void) => {
    try { requireMediaConsent(consent.current); action(); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không lưu được trên thiết bị. Hãy thử lại hoặc xóa bớt sáng tạo cũ.') }
  }

  const toggleExhibitItem = (id: string) => {
    setSelectedExhibitIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 5) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  const toggleMoment = (id: string) => {
    setSelectedMoments(prev => {
      if (prev.includes(id)) return prev.length > 1 ? prev.filter(x => x !== id) : prev
      if (prev.length >= 3) return [...prev.slice(1), id]
      return [...prev, id]
    })
  }

  return (
    <section className="lw-card" aria-label="Xưởng ký ức và sáng tạo cá nhân">
      <p className="lw-eyebrow">KÝ ỨC CÁ NHÂN &amp; DI SẢN SỐ · A18 · A19 · A20 · A21</p>
      <h2>Lưu giữ &amp; Kể lại hành trình của bạn</h2>
      <p className="lw-small">
        Mọi sản phẩm sáng tạo đều gắn nhãn <b>TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO</b>, chỉ lưu cục bộ theo tài khoản hiện tại và có thể xóa bất cứ lúc nào.
      </p>
      <label className="lw-small" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
        <input
          type="checkbox"
          checked={ctx.m2.consentAccepted}
          onChange={e => onToggleConsent(e.target.checked)}
        />
        Tôi đồng ý lưu bưu thiếp, triển lãm, thước phim và lá thư trên thiết bị này (có thể xóa toàn bộ bất kỳ lúc nào).
      </label>
      {!ctx.m2.consentAccepted && <p className="lw-small">Chưa đồng ý: các nút lưu đang khóa. Bỏ chọn sẽ dừng việc lưu mới; dùng nút xóa để xóa dữ liệu đã lưu.</p>}
      {error && <p role="alert">{error}</p>}

      <div className="lw-targets" role="tablist" aria-label="Công cụ sáng tạo ký ức">
        <button type="button" aria-pressed={tab === 'A18'} onClick={() => setTab('A18')}>
          A18 · Máy ảnh &amp; Bưu thiếp ({ctx.m2.postcards.length})
        </button>
        <button type="button" aria-pressed={tab === 'A19'} onClick={() => setTab('A19')}>
          A19 · Triển lãm của tôi ({ctx.m2.exhibition ? `${ctx.m2.exhibition.itemIds.length} mục` : 'Chưa lưu'})
        </button>
        <button type="button" aria-pressed={tab === 'A20'} onClick={() => setTab('A20')}>
          A20 · Phim hành trình 45s ({ctx.m2.directorsCut?.playbackVerified ? 'Đã trình chiếu' : ctx.m2.directorsCut ? 'Bản nháp cũ' : 'Chưa dựng'})
        </button>
        <button type="button" aria-pressed={tab === 'A21'} onClick={() => setTab('A21')}>
          A21 · Lá thư gửi tương lai ({ctx.m2.futureLetter ? 'Đã lưu' : 'Chưa lưu'})
        </button>
      </div>

      {tab === 'A18' && (
        <div className="lw-workbench" data-activity="A18">
          <h3>A18 · Máy ảnh thời gian &amp; Bưu thiếp ký ức</h3>
          <p className="lw-small">
            Đang căn khung tại: <b>{currentZoneTitle} ({currentZone})</b> · Nhãn bắt buộc: <code>TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO · TIMELENS</code>
          </p>
          <label>
            Phong cách khung bưu thiếp
            <select
              aria-label="Phong cách khung bưu thiếp"
              value={frameStyle}
              onChange={e => setFrameStyle(e.target.value as PostcardItem['frameStyle'])}
            >
              <option value="LANTERN_GLOW">Ánh đèn dầu ấm (Lantern Glow)</option>
              <option value="SEPIA_SKETCH">Ký họa màu thời gian (Sepia Sketch)</option>
              <option value="DAYLIGHT_ARCHIVE">Tư liệu sáng rõ (Daylight Archive)</option>
            </select>
          </label>
          <label>
            Lời đề tặng / Ghi chú trên bưu thiếp
            <input
              type="text"
              aria-label="Lời đề tặng trên bưu thiếp"
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />
          </label>
          <button
            type="button"
            disabled={!ctx.m2.consentAccepted || captureBusy}
            onClick={() => void capture()}
          >
            Chụp &amp; Xem trước bưu thiếp tại khu này (A18)
          </button>
          {captureBusy && <p role="status">Đang lấy khung hình cảnh 3D…</p>}
          {preview && <figure className="lw-postcard-preview"><img src={preview.imageDataUrl} alt={`Bưu thiếp ${preview.zoneTitle}: ${preview.caption}`} style={{ width: '100%', display: 'block' }}/><figcaption>Khung ảnh gốc từ cảnh 3D · watermark đã nằm trong ảnh PNG.</figcaption><button type="button" disabled={!ctx.m2.consentAccepted} onClick={() => save(() => onSavePostcard(preview))}>Lưu bưu thiếp đã xem trước</button><a href={preview.imageDataUrl} download={`TimeLens-${preview.zone}.png`}>Tải bưu thiếp PNG</a></figure>}
          {ctx.m2.postcards.length > 0 && (
            <div aria-live="polite">
              <h4>Bộ sưu tập bưu thiếp đã lưu ({ctx.m2.postcards.length})</h4>
              <ul>
                {ctx.m2.postcards.map(card => (
                  <li key={card.id}>
                    {card.imageDataUrl ? <><img src={card.imageDataUrl} alt={`Bưu thiếp ${card.zoneTitle}: ${card.caption}`} style={{ width: '100%', maxWidth: 480 }}/><a href={card.imageDataUrl} download={`TimeLens-${card.zone}.png`}>Tải PNG</a></> : <span>Bản nháp cũ · chưa có ảnh · </span>}
                    <b>[{card.zoneTitle}]</b> “{card.caption}” · <small>{card.watermark}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tab === 'A19' && (
        <div className="lw-workbench" data-activity="A19">
          <h3>A19 · Triển lãm di sản của tôi (Chọn 3–5 hiện vật / mảnh chuyện)</h3>
          <label>
            Chủ đề trưng bày
            <input
              type="text"
              aria-label="Chủ đề trưng bày"
              value={themeTitle}
              onChange={e => setThemeTitle(e.target.value)}
            />
          </label>
          <label>
            Lời dẫn của người tuyển chọn
            <input
              type="text"
              aria-label="Lời dẫn của người tuyển chọn"
              value={curatorNote}
              onChange={e => setCuratorNote(e.target.value)}
            />
          </label>
          <p className="lw-small">Đã chọn {selectedExhibitIds.length}/5 mục (tối thiểu 3 mục):</p>
          <div className="lw-targets">
            {HERITAGE_CANDIDATE_ITEMS.map(item => {
              const picked = selectedExhibitIds.includes(item.id)
              return (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={picked}
                  onClick={() => toggleExhibitItem(item.id)}
                >
                  {picked ? '✓ ' : '+ '}
                  {item.title} ({item.zone} · {item.truth})
                </button>
              )
            })}
          </div>
          <ExhibitionPreview themeTitle={themeTitle} curatorNote={curatorNote} itemIds={selectedExhibitIds}/>
          <button
            type="button"
            disabled={!ctx.m2.consentAccepted || selectedExhibitIds.length < 3 || selectedExhibitIds.length > 5 || !themeTitle.trim() || !curatorNote.trim()}
            onClick={() => save(() => onSaveExhibition(themeTitle.trim(), curatorNote.trim(), selectedExhibitIds, true))}
          >
            Lưu &amp; Mở triển lãm cá nhân (A19)
          </button>
          {ctx.m2.exhibition && (
            <div className="lw-reveal" aria-live="polite">
              <h4>Triển lãm đã lưu: {ctx.m2.exhibition.themeTitle}</h4>
              <p>{ctx.m2.exhibition.curatorNote}</p>
              {!ctx.m2.exhibition.previewVerified && <p>Bản nháp cũ · hãy xem trước và lưu lại để ghi nhận triển lãm.</p>}
              <ExhibitionPreview themeTitle={ctx.m2.exhibition.themeTitle} curatorNote={ctx.m2.exhibition.curatorNote} itemIds={ctx.m2.exhibition.itemIds}/>
            </div>
          )}
        </div>
      )}

      {tab === 'A20' && (
        <div className="lw-workbench" data-activity="A20">
          <h3>A20 · Phim hành trình 30–60 giây (Director&apos;s Cut · 45 giây)</h3>
          <label>
            Tựa đề thước phim
            <input
              type="text"
              aria-label="Tựa đề thước phim"
              value={filmTitle}
              onChange={e => setFilmTitle(e.target.value)}
            />
          </label>
          <label>
            Giọng kể chuyện chủ đạo
            <select
              aria-label="Giọng kể chuyện chủ đạo"
              value={narrationStyle}
              onChange={e => setNarrationStyle(e.target.value as 'EMPATHY' | 'ARCHITECTURAL' | 'COMMUNITY')}
            >
              <option value="COMMUNITY">Sức sống cộng đồng &amp; sự sẻ chia</option>
              <option value="ARCHITECTURAL">Kỹ thuật dân gian &amp; cấu trúc ba tầng</option>
              <option value="EMPATHY">Ký ức con người &amp; lời tri ân</option>
            </select>
          </label>
          <p className="lw-small">Chọn đủ 3 phân cảnh, mỗi cảnh 15 giây ({selectedMoments.length}/3). Phim trình chiếu minh họa gốc, không dùng ảnh lịch sử giả. Tạm dừng hoặc chuyển thẻ trình duyệt không tăng thời gian.</p>
          <div className="lw-targets">
            {DIRECTORS_CUT_MOMENTS.map(m => {
              const active = selectedMoments.includes(m.id)
              return (
                <button
                  type="button"
                  key={m.id}
                  aria-pressed={active}
                  onClick={() => toggleMoment(m.id)}
                >
                  {active ? '🎬 ' : '+ '}
                  {m.title} ({m.zone})
                </button>
              )
            })}
          </div>
          <button
            type="button"
            disabled={!ctx.m2.consentAccepted || selectedMoments.length !== 3 || !filmTitle.trim()}
            onClick={() => {
              if (!ctx.m2.consentAccepted) return
              setError('')
              setPlayingCut({ title: filmTitle.trim(), momentIds: [...selectedMoments], narrationStyle, key: Date.now() })
            }}
          >
            Dựng &amp; Trình chiếu phim hành trình 45 giây (A20)
          </button>
          {playingCut && ctx.m2.consentAccepted && <DirectorsCutPlayer key={playingCut.key} title={playingCut.title} momentIds={playingCut.momentIds} narrationStyle={playingCut.narrationStyle} onCompleted={() => save(() => onSaveDirectorsCut(playingCut.title, playingCut.momentIds, playingCut.narrationStyle, { durationSeconds: 45, completed: true, rendered: true, playbackVerified: true }))}/>}
          {ctx.m2.directorsCut && <p role="status">{ctx.m2.directorsCut.playbackVerified ? `Đã lưu sau khi trình chiếu đủ 45 giây: ${ctx.m2.directorsCut.title}` : 'Bản nháp kịch bản cũ · chưa có xác nhận trình chiếu đủ 45 giây.'}</p>}
        </div>
      )}

      {tab === 'A21' && <FutureLetterPanel m2={ctx.m2} onSaveLetter={onSaveLetter} />}

      <div style={{ marginTop: 12, borderTop: '1px solid #cdd0bc', paddingTop: 10 }}>
        <button type="button" onClick={() => { try { onClearPersonalData(); captureAbort.current?.abort(); setCaptureBusy(false); setPreview(null); setPlayingCut(null); setError('') } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xóa được dữ liệu trên thiết bị.') } }}>
          Xóa toàn bộ dữ liệu sáng tạo cá nhân (A18–A21) trên thiết bị này
        </button>
      </div>
    </section>
  )
}

export function ActivityChainsAtlasSection({
  ctx,
  onGoToZone,
}: {
  ctx: ActivityCompletionContext
  onGoToZone: (zone: string) => void
}) {
  const completedActivities = ACTIVITY_CATALOG_24.filter(a => getActivityStatus(a, ctx) === 'COMPLETE')
  const unlockedChains = CROSS_ACTIVITY_CHAINS_8.filter(c => c.isUnlocked(ctx))

  return (
    <>
      <section className="lw-card" aria-label="Tuyến liên kết xuyên hoạt động C01 đến C08">
        <p className="lw-eyebrow">CHƯƠNG 27 BASELINE · 8 TUYẾN LIÊN KẾT XUYÊN HOẠT ĐỘNG (C01–C08)</p>
        <h2>Mạch liên kết giữa các hoạt động ({unlockedChains.length}/8 tuyến hoàn tất)</h2>
        <p className="lw-small">
          Các hoạt động trên mặt đất (S2, S3, S4) và dưới lòng đất (L1, L2, L3, S5) không đứng rời rạc mà nối với nhau thành 8 tuyến ý nghĩa.
        </p>
        <ul>
          {CROSS_ACTIVITY_CHAINS_8.map(chain => {
            const prog = chain.progressCount(ctx)
            const done = chain.isUnlocked(ctx)
            return (
              <li key={chain.code} data-chain={chain.code} data-unlocked={done ? 'true' : 'false'}>
                <b>
                  {chain.code} · {chain.title} ({prog.done}/{prog.total}) [{chain.steps.join(' → ')}]
                </b>
                : {chain.meaning}
                {chain.code === 'C06' && !done && <p className="lw-small">Chưa hoàn tất: đối chiếu hai lớp thời gian tại cùng địa điểm còn chờ tư liệu được xác minh.</p>}
                {done && (
                  <p className="lw-small" style={{ color: '#254e40', fontWeight: 600 }}>
                    ✓ Callback mở khóa: {chain.callbackLine}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="lw-card" aria-label="Danh mục 24 hoạt động A01 đến A24">
        <p className="lw-eyebrow">CHƯƠNG 10.2 &amp; 25 BASELINE · 24 HOẠT ĐỘNG TRONG THẾ GIỚI (A01–A24)</p>
        <h2>Tiến độ khám phá hoạt động ({completedActivities.length}/24 hoạt động)</h2>
        <div className="lw-targets">
          <button type="button" onClick={() => onGoToZone('S2')}>Tới Xóm nghề (S2 · A03/A04/A12)</button>
          <button type="button" onClick={() => onGoToZone('S3')}>Tới Đồng ruộng (S3 · A05/A06/A10)</button>
          <button type="button" onClick={() => onGoToZone('S4')}>Tới Sân sinh hoạt (S4 · A07/A09/A11/A23)</button>
          <button type="button" onClick={() => onGoToZone('L2-B')}>Tới Phòng họp ngầm (L2-B · A21/A22)</button>
        </div>
        <ul>
          {ACTIVITY_CATALOG_24.map(act => {
            const status = getActivityStatus(act, ctx)
            const done = status === 'COMPLETE'
            return (
              <li key={act.code} data-activity-item={act.code} data-completed={done ? 'true' : 'false'} data-activity-status={status}>
                <b>
                  {done ? '✓ ' : '○ '}
                  {act.code} · {act.title}
                </b>{' '}
                <span>{status === 'LOCKED' ? '· Chưa đủ tư liệu' : status === 'PARTIAL' ? '· Đang khám phá, chưa hoàn tất' : status === 'COMPLETE' ? '· Đã hoàn tất' : '· Sẵn sàng khám phá'}</span>{' '}
                <span>({act.zone} · {act.truth})</span> — {act.summary}
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
