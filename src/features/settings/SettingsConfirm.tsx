import { useEffect,useRef } from 'react'
export type SettingsAction='leave'|'cancel'|'logout'
const copy={leave:{title:'Rời tổ chức hiện tại?',text:'Bạn sẽ mất quyền Premium và các quyền học tập do tổ chức này cấp. Premium cá nhân được giữ riêng. Giáo viên có thể không còn theo dõi được tiến độ của bạn.',button:'Xác nhận rời tổ chức'},cancel:{title:'Hủy gói Premium cá nhân?',text:'Gói cá nhân sẽ bị chấm dứt ngay sau khi xác nhận. Quyền Premium từ tổ chức, nếu còn hiệu lực, vẫn được giữ. Thao tác này không tự thực hiện hoàn tiền.',button:'Xác nhận hủy gói cá nhân'},logout:{title:'Đăng xuất phiên hiện tại?',text:'Bạn sẽ cần đăng nhập lại để tiếp tục. Tài khoản và tiến độ đã lưu trên hệ thống vẫn được giữ.',button:'Xác nhận đăng xuất'}}
export function SettingsConfirm({action,busy,onClose,onConfirm}:{action:SettingsAction|null;busy:boolean;onClose:()=>void;onConfirm:()=>void}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(action&&!ref.current?.open)ref.current?.showModal();if(!action&&ref.current?.open)ref.current.close()},[action])
 return <dialog ref={ref} className="st-dialog" aria-labelledby="settings-confirm-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}} onClose={onClose}>{action&&<><h2 id="settings-confirm-title">{copy[action].title}</h2><p>{copy[action].text}</p><div className="pf-actions"><button className="pf-button secondary" disabled={busy} onClick={onClose}>Giữ nguyên</button><button className="pf-button st-danger" disabled={busy} onClick={onConfirm}>{busy?'Đang xử lý…':copy[action].button}</button></div></>}</dialog>
}
