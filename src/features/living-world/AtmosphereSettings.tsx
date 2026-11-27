import {atmosphereEligible} from './worldAtmosphere'
export function AtmosphereSettings({zone,enabled,onEnabled,onReplay}:{zone:string;enabled:boolean;onEnabled:(value:boolean)=>void;onReplay:()=>void}){
 return <fieldset className="lw-atmosphere-settings"><legend>Nhịp không gian</legend>
  <label><input type="checkbox" checked={enabled} onChange={e=>onEnabled(e.target.checked)}/>Nhịp cảnh tái dựng</label>
  <p className="lw-small">Tín hiệu xa có báo trước và mô tả bằng chữ. Bạn có thể bỏ qua; tiến độ khám phá không phụ thuộc vào nhịp cảnh.</p>
  <button disabled={!enabled||!atmosphereEligible(zone)} onClick={onReplay}>Xem lại nhịp cảnh</button>
 </fieldset>
}
