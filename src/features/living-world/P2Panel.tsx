import {P2_ERAS,P2_SITES,type P2State} from './p2Data'
export function P2Panel({ state, onChange, onActivate }: { state: P2State; onChange: (s: P2State) => void; onActivate: () => void }) {
 const era = P2_ERAS.find(e => e.id === state.era), site = P2_SITES.find(s => s.id === state.site)
 return <div className="lw-p2" role="group" aria-label="Trục thời gian">
  <ol className="lw-p2-steps" aria-label="Các bước"><li aria-current={state.stage === 'ERA' ? 'step' : undefined}>Mốc thời gian</li><li aria-current={state.stage === 'SITE' ? 'step' : undefined}>Địa điểm</li><li aria-current={state.stage === 'CONFIRM' ? 'step' : undefined}>Xác nhận</li></ol>
  {state.stage === 'ERA' && <div className="lw-p2-list">{P2_ERAS.map(e => <button key={e.id} disabled={!e.open} aria-pressed={state.era === e.id} onClick={() => onChange({ ...state, era: e.id, stage: 'SITE' })}>{e.label}<small>{e.note}</small></button>)}</div>}
  {state.stage === 'SITE' && <><p className="lw-p2-picked">Mốc: {era?.label}</p><div className="lw-p2-list">{P2_SITES.map(s => <button key={s.id} disabled={!s.open} aria-pressed={state.site === s.id} onClick={() => onChange({ ...state, site: s.id, stage: 'CONFIRM' })}>{s.label}<small>{s.note}</small></button>)}</div>
   <button className="lw-p2-back" onClick={() => onChange({ ...state, stage: 'ERA', site: null })}>Quay lại · chọn mốc khác</button></>}
  {state.stage === 'CONFIRM' && <><p className="lw-p2-picked">{era?.label} · {site?.label}</p>
   <blockquote className="lw-p2-kha"><b>Kha:</b> Đây là bối cảnh tái dựng có kiểm soát, dựng từ tư liệu. Bến Dược chỉ là site tham chiếu, không đại diện cho mọi nơi hay mọi sự kiện của chiến dịch. Chúng ta quan sát và tìm hiểu, không thay đổi điều đã xảy ra.</blockquote>
   <p className="lw-small">Đặt tay lên bàn điều khiển (E / chạm vào cỗ máy) để khởi động, hoặc dùng nút dưới đây.</p>
   <button className="lw-primary" onClick={onActivate}>Bước vào bối cảnh tái dựng</button>
   <button className="lw-p2-back" onClick={() => onChange({ ...state, stage: 'SITE', site: null })}>Quay lại · chọn địa điểm</button></>}
 </div>
}
