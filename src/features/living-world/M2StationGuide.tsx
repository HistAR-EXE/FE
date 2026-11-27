import {performanceCopy} from './m2PerformanceCopy'
import {describeM2Station} from './m2JourneyGuidance'
import type {Zone} from './worldModel'
export function M2StationGuide({target,completed,onApproach,onNavigate}:{target:string;completed:readonly string[];onApproach:(id:string)=>void;onNavigate:(zone:Zone)=>void}){
 const guide=describeM2Station(target,completed)
 if(!guide)return null
 return <section className="lw-station-guide" aria-label="Nhịp khám phá công việc" data-station-phase={guide.phase}>
  <p className="lw-eyebrow">{guide.phase==='PREPARE'?'CHUẨN BỊ':guide.phase==='TRY'?'THỬ VÀ QUAN SÁT':guide.phase==='NEXT'?'KẾT QUẢ & BƯỚC TIẾP':'NHÌN LẠI & KẾT NỐI'}</p>
  <h4>{guide.title}</h4><p>{guide.body}</p>
  {performanceCopy(target)&&<details className="lw-motion-story"><summary>Nhìn theo đôi tay</summary><p>{performanceCopy(target)}</p><p className="lw-small">Bạn có thể quan sát ở chế độ giảm chuyển động và thực hiện bằng một chạm.</p></details>}
  {guide.nextTarget&&<button type="button" onClick={()=>onApproach(guide.nextTarget!)}>{guide.label}</button>}
  {guide.nextZone&&<button type="button" onClick={()=>onNavigate(guide.nextZone!)}>{guide.label}</button>}
 </section>
}
