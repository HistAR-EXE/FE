import {useState} from 'react'
import {coreObservations,smokeOrder,canConfirmCare} from './coreProofs'

type Props={target:string;facts:string[];pendingFacts?:string[];enabled?:boolean;onSpatial?:()=>void;onProof:(quest:string,action:string,target:string,payload:Record<string,unknown>,fact:string)=>void;onNote:(note:string)=>void}
export function CoreProofPanel({target,facts,pendingFacts=[],enabled=true,onSpatial,onProof,onNote}:Props){
 const [path,setPath]=useState<string[]>([])
 const available=[...facts,...pendingFacts],observation=coreObservations[target],has=(f:string)=>available.includes(f)
 const observe=()=>{if(target==='A14_SHARE'&&!has('WATER_STORAGE_INSPECTED')||target==='A15_CARE'&&!has('MEDICAL_PREPARATION_INSPECTED')){onNote('Hãy quan sát phần chuẩn bị ở điểm trước.');return}onProof(observation.quest,'INSPECT_TARGET',target,{},observation.fact)}
 if(!observation)return null
 if(!enabled)return <p className="lw-small">Phần ghi nhận khám phá này chưa được mở trên môi trường hiện tại. Bạn vẫn có thể tham gia hoạt động trong cảnh.</p>
 return <details className="lw-room-story lw-core-proof"><summary>Quan sát & kết nối</summary>
 {pendingFacts.length>0&&<p role="status">Tương tác đang chờ máy chủ xác nhận; chưa được tính là kết quả đã xác minh.</p>}
 {observation&&<button disabled={has(observation.fact)} onClick={observe}>{facts.includes(observation.fact)?'Đã ghi quan sát':pendingFacts.includes(observation.fact)?'Quan sát đang chờ xác nhận':'Ghi điều vừa quan sát'}</button>}
 {target==='A02_SMOKE'&&<>
  <p>Quan sát mô hình trong phòng rồi lần theo đường khói. Các khoang là diễn giải nguyên lý.</p>
  {onSpatial&&<button onClick={onSpatial}>Lần theo các vật thể trong phòng</button>}
  <details><summary>Thao tác thay thế bằng nút</summary>
  <div className="lw-targets">{[['HEARTH','Nguồn nhiệt'],['DIFFUSION','Khoang phân tán'],['CHANNEL','Rãnh dẫn']].map(([id,label])=><button key={id} onClick={()=>{const next=[...path,id].slice(-3);setPath(next);if(next.length===3){if(next.join()!==smokeOrder.join()){onNote('Hãy lần lại đường khói từ nguồn nhiệt.');setPath([])}else if(!has('KITCHEN_HEARTH_INSPECTED')||!has('KITCHEN_SMOKE_INSPECTED'))onNote('Quan sát cả bàn bếp và mô hình trước khi kết nối.');else onProof('Q4','SELECT_SMOKE_PATH','',{path:'SMOKE_HEARTH_CHANNEL_DIFFUSION'},'KITCHEN_SMOKE_PATH_CORRECT')}}}>{label}</button>)}</div>
  <p aria-live="polite">{path.map(x=>({HEARTH:'Nguồn nhiệt',CHANNEL:'Rãnh dẫn',DIFFUSION:'Khoang phân tán'}[x])).join(' → ')}</p>
  <button disabled={!has('KITCHEN_SMOKE_PATH_CORRECT')||has('KITCHEN_MEANING_CONFIRMED')} onClick={()=>onProof('Q4','CONFIRM_KITCHEN_MEANING','',{relation:'KITCHEN_SUPPORTS_COMMUNITY'},'KITCHEN_MEANING_CONFIRMED')}>Liên hệ bếp với bữa ăn cộng đồng</button>
  </details>
 </>}
 {['A14_SHARE','A15_CARE'].includes(target)&&<><p>Nước và sự chăm sóc bổ sung cho nhau. Hãy tìm hiểu cả hai không gian trước khi kết nối.</p><button disabled={!canConfirmCare(available)||has('CARE_MEANING_CONFIRMED')} onClick={()=>onProof('Q5','CONFIRM_CARE_MEANING','',{relation:'WATER_AND_MEDICAL_SUPPORT_COMMUNITY'},'CARE_MEANING_CONFIRMED')}>Kết nối nước và chăm sóc</button></>}
 {target==='A02_SMOKE'&&has('CARE_MEANING_CONFIRMED')&&has('KITCHEN_MEANING_CONFIRMED')&&!has('KITCHEN_CARE_REFLECTED')&&<><p>Trở lại bếp sau nơi chăm sóc, bữa ăn có thêm ý nghĩa: công trình, nước và những bàn tay cùng duy trì đời sống.</p><button onClick={()=>onProof('Q4','REFLECT_KITCHEN_CARE','',{},'KITCHEN_CARE_REFLECTED')}>Lưu góc nhìn mới về bếp</button></>}
 </details>
}
