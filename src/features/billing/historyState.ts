export const paymentStatuses:Record<string,string>={PENDING:'Chờ thanh toán',UNDERPAID:'Chưa đủ tiền',PAID:'Đã thanh toán',EXPIRED:'Hết hạn thanh toán',FAILED:'Thất bại',REFUNDED:'Đã hoàn tiền',VOIDED:'Đã hủy'}
export const activationStatuses:Record<string,string>={ACTIVE:'Đang hiệu lực',EXPIRED:'Đã hết hiệu lực',REVOKED:'Đã thu hồi',PENDING:'Chờ kích hoạt',NOT_ACTIVATED:'Chưa kích hoạt',UNKNOWN:'Chưa xác định'}
export const paymentLabel=(value:string)=>paymentStatuses[value]||'Chưa xác định'
export const money=(value:number|null|undefined)=>value==null?'Chưa xác nhận':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND'}).format(value)
export const dateTime=(value:string|null)=>value?new Intl.DateTimeFormat('vi-VN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value)):'Chưa ghi nhận'
export const csvCell=(value:unknown)=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export function validDates(from:string,to:string){const valid=(s:string)=>!s||(/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s);return valid(from)&&valid(to)&&(!from||!to||from<=to)}
