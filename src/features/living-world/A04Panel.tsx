import type {A04Phase} from './a04Experience'
type Props={phase:A04Phase;processed:number;observe:boolean;onObserve:(v:boolean)=>void;onAction:(action:string)=>void;onStroke:(side:'LEFT'|'RIGHT')=>void;onContinue:()=>void}
export function A04Panel({phase,processed,observe,onObserve,onAction,onStroke,onContinue}:Props){return <>
 <div className="lw-targets"><button onClick={()=>onObserve(true)}>Chỉ quan sát</button><button onClick={()=>{onObserve(false);onAction('DEMO')}}>Thử phối hợp</button><button onClick={()=>onAction('STORY')}>Nghe chuyện lương thực</button></div>
 {observe?<p>Hai người cùng làm vẫn tiếp tục công việc. Bạn có thể lắng nghe tiếng cối, quan sát rồi rời đi bất cứ lúc nào.</p>:<>
 <p aria-live="polite">{processed>=6?'Mẻ gạo đã chuyển trạng thái. Một bữa ăn là kết quả của nhiều bàn tay.':`Đã phối hợp ${processed}/6 nhịp · luân phiên trái và phải.`}</p>
 {phase==='IDLE'&&<p>Tiến lại gần cối, xem một lượt phối hợp rồi chọn thử. Không có giới hạn thời gian hoặc phần thưởng bắt buộc.</p>}
 {phase==='DEMO'&&<><p>Người cùng làm: “Nắm chắc chày, nâng lên rồi hạ xuống. Mình thay nhau, không cần làm nhanh.”</p><button onClick={()=>onAction('READY')}>Sẵn sàng · đến lượt tôi</button></>}
 {processed<6&&['READY','HELD','RAISED'].includes(phase)&&<><p>{phase==='READY'?'Chạm chày của bạn để nắm.':phase==='HELD'?'Chạm lại để nâng chày; chưa có nguyên liệu nào được ghi hoàn thành.':'Chạm lần nữa để hạ chày. Người cùng làm sẽ đáp nhịp.'}</p><button disabled={phase!=='READY'} onClick={()=>onAction('GRIP')}>Nắm chày</button><button disabled={phase!=='HELD'} onClick={()=>onAction('LIFT')}>Nâng chày</button><button disabled={phase!=='RAISED'} onClick={()=>onAction('RELEASE')}>Hạ chày</button></>}
 <details><summary>Điều khiển luân phiên tương đương</summary><p>Sau khi nắm và nâng, chọn phía hạ; lặp cùng phía không tạo thêm tiến độ.</p><button onClick={()=>onStroke('LEFT')} disabled={processed>=6||phase!=='RAISED'}>Giã bên trái</button><button onClick={()=>onStroke('RIGHT')} disabled={processed>=6||phase!=='RAISED'}>Giã bên phải</button></details>
 <button onClick={()=>onAction('COMPARE')}>Nhìn thành phẩm · so sánh</button>
 {phase==='COMPARE'&&<p>Quan sát hai mẹt bên phải: lúa còn vỏ và gạo đã tách vỏ được thể hiện bằng màu, hình dáng khác nhau. Đây là minh họa biến đổi nguyên liệu, không phải hướng dẫn nghề chính xác. {processed<6?'Mẻ bạn đang làm chưa hoàn tất.':'Mẻ vừa phối hợp đã chuyển trạng thái.'}</p>}
 {phase==='STORY'&&<p>Người cùng làm: “Từ hạt lúa tới bữa ăn cần công sức của nhiều người. Có gạo rồi còn cần nước, bếp và những bàn tay chăm lo.” Lời thoại giáo dục hư cấu; chưa mở các khu chưa sản xuất.</p>}
 {['COMPARE','STORY'].includes(phase)&&processed<6&&<button onClick={()=>onAction('READY')}>Quay lại mẻ đang làm</button>}
 </>}
 {processed>=6&&<button onClick={()=>onAction('REPLAY')}>Làm lại một mẻ · không thưởng thêm</button>}
 <button onClick={onContinue}>Đi tiếp · Hơi thở của lòng đất</button>
 <p className="lw-small">RECONSTRUCTED · động tác và góc lao động cần duyệt. Không XP/foundation; rời đi giữ số nhịp đã xác nhận, không tự hoàn thành.</p>
 </>}
