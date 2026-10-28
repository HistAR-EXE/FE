import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { viralApi, type UserCreation } from '../viral/api'
import { useAuth } from '../../shared/auth/useAuth'
import { readStoredUser } from '../../shared/auth/session'
import { useToast } from '../../shared/ui/toast/useToast'
import { useProfileResource } from '../profile/useProfileResource'
import { ProfileIcon, ProfileResourceState } from '../profile/ProfileUi'
import { safeProfileImage, profileDate } from '../profile/profileState'
import { resolveMediaUrl } from '../../shared/config/env'
import { downloadBlob } from '../../lib/heritageImage'
import { loadPhotoFrameReturnDraft } from '../../lib/photoFrameReturnDraft'
import { buildDioramaReturnPath, buildStationPagePath, readHeritageEntrySource, readStationRouteContext } from '../stations/stationRoutes'
import { savedPhotoFile, photoFlowPath, sharePhoto } from './photoFlow'
import type { PhotoStage } from './photoFlow'

export function PhotoSharePanel({ creationId, stage, onContinue }: { creationId: string; stage: PhotoStage; onContinue: () => void }) {
  const { user } = useAuth()
  const creations = useProfileResource(user ? `${user.id}:photo-flow` : null, viralApi.myCreations)
  return <ProfileResourceState resource={creations} label="ảnh đã lưu của bạn">{items => {
    const creation = items.find(item => item.id === creationId)
    return creation && user ? <SavedPhotoActions key={`${user.id}:${creation.id}`} ownerId={user.id} creation={creation} stage={stage} onContinue={onContinue} /> : <section className="pf-card ph-missing" role="alert"><ProfileIcon name="image_not_supported"/><h2>Không tìm thấy ảnh trong tài khoản này</h2><p>Ảnh có thể đã bị xóa hoặc không thuộc tài khoản đang đăng nhập.</p><Link className="pf-button" to="/photo-frame">Tạo ảnh mới</Link><Link className="pf-button secondary" to="/profile">Xem ảnh trong hồ sơ</Link></section>
  }}</ProfileResourceState>
}
function SavedPhotoActions({ ownerId, creation, stage, onContinue }: { ownerId: string; creation: UserCreation; stage: PhotoStage; onContinue: () => void }) {
  const [params] = useSearchParams(), navigate = useNavigate(), { showToast } = useToast()
  const [caption, setCaption] = useState('Khám phá di sản Việt cùng TimeLens!')
  const captionTouched = useRef(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [confirmManual, setConfirmManual] = useState(false), [shared, setShared] = useState(creation.shared)
  const [failedImage, setFailedImage] = useState(false)
  const cachedFile = useRef<File | null>(null)
  const [prepared, setPrepared] = useState(false), [preparing, setPreparing] = useState(false)
  const outputUrl = resolveMediaUrl(safeProfileImage(creation.outputUrl))
  const shareUrl = outputUrl ? new URL(outputUrl, window.location.origin).href : ''
  const contextParams = new URLSearchParams(params)
  if (!contextParams.get('site') && creation.siteCode) contextParams.set('site', creation.siteCode)
  if (!contextParams.get('station') && creation.stationCode) contextParams.set('station', creation.stationCode)
  const stationContext = readStationRouteContext(contextParams)
  const savedStationPath = creation.siteCode && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(creation.siteCode) && creation.stationCode && /^ST\d{2}$/.test(creation.stationCode) ? '/sites/'+encodeURIComponent(creation.siteCode)+'/stations/'+encodeURIComponent(creation.stationCode)+'/media' : null
  const entrySource = readHeritageEntrySource(creation.source || params.get('source'))
  const editorParams = new URLSearchParams(contextParams)
  editorParams.set('mode', creation.kind === 'heritage' ? 'heritage' : 'original')
  if (creation.roleId) editorParams.set('role', creation.roleId)
  const studioPath = photoFlowPath(editorParams, 'create')
  const assertOwner = () => { if (readStoredUser()?.id !== ownerId) throw new Error('Phiên tài khoản đã thay đổi. Vui lòng mở lại ảnh.') }
  useEffect(() => { let active = true; void viralApi.sharePrefill().then(data => { if (active && !captionTouched.current && data.caption?.trim() && !data.caption.startsWith('${')) setCaption(data.caption) }).catch(() => undefined); return () => { active = false } }, [])
  const loadFile = async () => {
    assertOwner()
    if (cachedFile.current) return cachedFile.current
    const blob = await viralApi.downloadCreationImage(creation.id)
    assertOwner()
    const file = await savedPhotoFile(blob, creation.variant)
    assertOwner()
    cachedFile.current = file
    setPrepared(true)
    return file
  }
  useEffect(() => {
    if (stage !== 'share') return
    let active = true
    setPreparing(true)
    void loadFile().catch(e => { if(active) setError(e instanceof Error ? e.message : 'Chưa tải được ảnh.') }).finally(() => { if(active) setPreparing(false) })
    return () => { active = false }
  }, [stage])
  const trackShare = async () => {
    assertOwner()
    try { const result = await viralApi.recordShare(creation.id); assertOwner(); setShared(true); setConfirmManual(false); setNotice(result.bonusPointsAwarded > 0 ? `Đã ghi nhận chia sẻ · +${result.bonusPointsAwarded} XP.` : 'Ảnh này đã được ghi nhận chia sẻ. Không cộng lặp XP.') }
    catch { setNotice('Ảnh đã được chia sẻ hoặc xác nhận, nhưng chưa ghi nhận được trên tài khoản. Bạn có thể thử ghi nhận lại.') }
  }
  const run = async (action: 'download'|'share'|'manual'|'edit'|'prepare') => {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      assertOwner()
      if (action === 'edit') {
        const draft = await loadPhotoFrameReturnDraft(ownerId, creation.id)
        assertOwner()
        navigate(studioPath, { state: draft ? { undoReturnCreationId: creation.id } : null })
        showToast({ message: draft ? 'Đã mở bản chỉnh sửa. Ảnh đã lưu được giữ nguyên.' : 'Bản nháp không còn trên thiết bị này. Chọn ảnh để tạo bản mới; ảnh đã lưu được giữ nguyên.', type: 'info' })
      } else if (action === 'manual') await trackShare()
      else {
        const file = cachedFile.current || await loadFile()
        assertOwner()
        if (action === 'prepare') setNotice('Ảnh đã sẵn sàng để chia sẻ.')
        else if (action === 'download') { downloadBlob(file, file.name); setNotice('Đã tải ảnh. Bạn có thể đăng ảnh bằng ứng dụng mình chọn; đây chưa phải lượt chia sẻ được xác nhận.') }
        else {
          const outcome = await sharePhoto(navigator, file, caption, shareUrl, () => downloadBlob(file, file.name))
          assertOwner()
          if (outcome === 'shared') await trackShare()
          else if (outcome === 'downloaded') setNotice('Thiết bị chưa hỗ trợ chia sẻ trực tiếp. Đã tải ảnh để bạn đăng thủ công; chưa ghi nhận chia sẻ.')
          else setNotice('Bạn đã hủy chia sẻ. Không ghi nhận lượt chia sẻ hoặc cộng XP.')
        }
      }
    } catch (e) { if (readStoredUser()?.id === ownerId) setError(e instanceof Error ? e.message : 'Chưa thực hiện được thao tác. Vui lòng thử lại.') }
    finally { setBusy(false) }
  }
  const copy = async (text: string) => { try { assertOwner(); await navigator.clipboard.writeText(text); setNotice('Đã sao chép. Thao tác sao chép không ghi nhận lượt chia sẻ.') } catch { setError('Không sao chép được trên trình duyệt này. Bạn có thể chọn và sao chép nội dung trực tiếp.') } }
  return <div className="ph-saved-grid"><section className="ph-saved-preview"><div className={`ph-saved-image ${creation.variant === 'square' ? 'is-square' : ''}`}>{outputUrl && !failedImage ? <img src={outputUrl} alt="Ảnh đã lưu của bạn" onError={() => setFailedImage(true)}/> : <div className="pf-empty"><ProfileIcon name="broken_image"/><h3>Chưa tải được ảnh xem trước</h3><p>Bạn vẫn có thể thử tải ảnh qua tài khoản.</p><button className="pf-text-button" onClick={() => setFailedImage(false)}>Thử lại ảnh</button></div>}</div><div className="ph-preview-caption"><span className="pf-pill green"><ProfileIcon name="check_circle"/> Đã lưu vào tài khoản</span><span>{creation.variant === 'square' ? 'Vuông 1:1' : 'Dọc 9:16'}</span></div></section><section className="pf-card ph-share-controls"><span className="pf-kicker">{stage === 'review' ? 'ẢNH CỦA BẠN ĐÃ SẴN SÀNG' : 'MANG CÂU CHUYỆN ĐI XA HƠN'}</span><h2>{stage === 'review' ? 'Xem lại khoảnh khắc' : 'Tải & chia sẻ'}</h2><p>{creation.kind === 'heritage' ? 'Ảnh nhập vai di sản' : 'Ảnh kỷ niệm của bạn'} · {profileDate(creation.createdAt)}</p><p className="pf-footnote">Ảnh đã được lưu. Quay lại chỉnh sửa sẽ tạo một phiên bản mới và giữ nguyên bản này.</p>{stage === 'review' ? <><div className="ph-review-facts"><ProfileIcon name="verified_user"/><p>Chỉ xuất và lưu ảnh thành phẩm. Ảnh chân dung dùng để chỉnh sửa không được tự động tải lên.</p></div><button className="pf-button ph-primary" onClick={onContinue}>Tiếp tục tải & chia sẻ <ProfileIcon name="arrow_forward"/></button></> : <><label className="ph-caption-label" htmlFor="photo-share-caption">Lời nhắn cho bức ảnh</label><textarea id="photo-share-caption" value={caption} maxLength={2000} rows={4} onChange={e => { captionTouched.current = true; setCaption(e.target.value) }} /><p className="ph-caption-count">{caption.length}/2000 ký tự</p><div className="ph-caption-presets" role="group" aria-label="Gợi ý lời nhắn chia sẻ">{[{label: "Kỷ niệm", text: "Một khoảnh khắc ở Củ Chi, một câu chuyện còn mãi. 💛 #TimeLens #CuChi"}, {label: "Rủ bạn khám phá", text: "Bạn đã thử khám phá Củ Chi theo cách này chưa? Cùng mình trải nghiệm nhé! #TimeLens #KhamPhaDiSan"}, {label: "Tự hào di sản", text: "Chạm vào lịch sử, thêm yêu di sản Việt Nam. 🇻🇳 #TimeLens #DiSanVietNam"}].map(preset => <button key={preset.label} type="button" onClick={() => {captionTouched.current = true; setCaption(preset.text)}}>{preset.label}</button>)}</div><div className="ph-share-tools"><button className="pf-button secondary" disabled={busy} onClick={() => void copy(caption)}><ProfileIcon name="content_copy"/> Sao chép lời nhắn</button><button className="pf-button secondary" disabled={busy || !outputUrl} onClick={() => void copy(shareUrl)}><ProfileIcon name="link"/> Sao chép liên kết ảnh</button></div><button className="pf-button ph-primary" disabled={busy || !prepared} onClick={() => void run('share')}><ProfileIcon name="share"/>{busy ? 'Đang xử lý…' : preparing ? 'Đang chuẩn bị ảnh…' : 'Chia sẻ qua thiết bị'}</button><button className="pf-button secondary ph-primary" disabled={busy} onClick={() => void run('download')}><ProfileIcon name="download"/>Tải ảnh {creation.variant === 'square' ? '1:1' : '9:16'}</button>{shared ? <p className="ph-shared"><ProfileIcon name="check_circle"/> Đã ghi nhận chia sẻ cho ảnh này</p> : <button className="pf-text-button" disabled={busy} onClick={() => setConfirmManual(true)}>Tôi đã đăng ảnh thủ công</button>}{confirmManual && <div className="pf-notice ph-manual" role="group" aria-label="Xác nhận chia sẻ thủ công"><p>Chỉ xác nhận sau khi bạn đã đăng ảnh. TimeLens không tự kiểm tra bài đăng bên ngoài.</p><button className="pf-button secondary" disabled={busy} onClick={() => setConfirmManual(false)}>Chưa đăng</button><button className="pf-button" disabled={busy} onClick={() => void run('manual')}>Xác nhận đã đăng</button></div>}</>}{stage === 'share' && !prepared && !preparing && <button className="pf-text-button" disabled={busy} onClick={() => void run('prepare')}>Thử chuẩn bị lại ảnh</button>}{error && <p className="pf-notice error" role="alert">{error}</p>}{notice && <p className="pf-notice" role="status">{notice}</p>}<div className="ph-bottom-links"><button className="pf-text-button" disabled={busy} onClick={() => void run('edit')}><ProfileIcon name="edit"/> Quay lại chỉnh sửa</button><Link className="pf-text-button" to="/photo-frame">Tạo ảnh mới</Link><Link className="pf-text-button" to="/profile">Ảnh đã lưu trong hồ sơ ↗</Link>{!stationContext && savedStationPath && <Link className="pf-text-button" to={savedStationPath}>Về {creation.stationCode}</Link>}{stationContext && <Link className="pf-text-button" to={buildStationPagePath(stationContext)}>Về {stationContext.stationCode}</Link>}{entrySource === 'battle-diorama' && <Link className="pf-text-button" to={buildDioramaReturnPath(stationContext?.locationId || '')}>Về Sa bàn Cedar Falls</Link>}</div></section></div>
}
