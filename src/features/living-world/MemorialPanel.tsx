import {describeMemorialContext,type MemorialCheckpoint} from './memorialExperience'

type Props = {
 checkpoint: MemorialCheckpoint | null
 pending: boolean
 available: boolean
 epilogueReturned?: boolean
 synthesisConfirmed?: boolean
 onOffer?: () => void
 onReturnStation?: () => void
 onChange: (value: MemorialCheckpoint) => void
 onClose: () => void
}

export function MemorialPanel({checkpoint,pending,available,epilogueReturned=false,synthesisConfirmed=false,onOffer,onReturnStation,onChange,onClose}: Props) {
 const choosing = !checkpoint || checkpoint.phase === 'LEFT'
 const context = describeMemorialContext(checkpoint,epilogueReturned,synthesisConfirmed)
 return <section className="lw-dialog lw-memorial" role="dialog" aria-modal="false" aria-label="Khoảng lặng tưởng niệm">
  <button className="lw-close" onClick={onClose}>Rời ngay</button>
  <p className="lw-eyebrow">{context.isEpilogue ? 'EPILOGUE · CỦ CHI HÔM NAY' : 'TƯỞNG NIỆM TỰ NGUYỆN · HIỆN TẠI'}</p>
  <h2>Một khoảng lặng cho ký ức</h2>
  <p>{context.epilogueSummary}</p>
  <p>Bạn có thể dâng hoa, dâng hương, mặc niệm hoặc tiếp tục tham quan.</p>
  {!available && <p role="status">Hoạt động chưa được mở trên môi trường này. Bạn vẫn có thể tham quan và rời đi.</p>}
  {choosing && <div className="lw-targets">
   <button disabled={!available} onClick={()=>onChange({choice:'FLOWERS',phase:'SELECTED'})}>Chọn hoa</button>
   <button disabled={!available} onClick={()=>onChange({choice:'INCENSE',phase:'SELECTED'})}>Chọn hương</button>
   <button disabled={!available} onClick={()=>onChange({choice:'QUIET',phase:'REFLECTING'})}>Dành một khoảng yên lặng</button>
   <button onClick={onClose}>Tiếp tục tham quan</button>
  </div>}
  {checkpoint?.phase === 'SELECTED' && <>
   <p role="status">{checkpoint.choice === 'FLOWERS' ? 'Chạm bó hoa trên bàn để đặt hoa.' : 'Chạm lư hương để tiếp tục nghi thức.'}</p>
   {onOffer && <button onClick={onOffer}>{checkpoint.choice === 'FLOWERS' ? 'Đặt hoa tại bàn tưởng niệm' : 'Thắp hương tại lư hương'}</button>}
  </>}
  {checkpoint?.phase === 'OFFERED' && <>
   <p role="status">{context.phaseOutcome}</p>
   <p>Bạn có thể ở lại một chút, hoặc tiếp tục hành trình.</p>
   <div className="lw-targets">
    <button onClick={()=>onChange({...checkpoint,phase:'REFLECTING'})}>Ở lại yên lặng</button>
    <button onClick={()=>onChange({choice:'SKIP',phase:'LEFT'})}>Chọn nghi thức khác</button>
   </div>
  </>}
  {checkpoint?.phase === 'REFLECTING' && <>
   <p role="status">Hãy dành khoảng thời gian bạn muốn. Bạn có thể rời đi bất cứ lúc nào.</p>
   <div className="lw-targets">
    <button onClick={()=>onChange({choice:'SKIP',phase:'LEFT'})}>Chọn nghi thức khác</button>
    {onReturnStation && <button onClick={onReturnStation}>Trở về trạm thời gian</button>}
   </div>
  </>}
  {pending && <p role="status">Lựa chọn đang chờ đồng bộ.</p>}
 </section>
}
