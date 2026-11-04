import type {Point} from './worldModel'
export type LivingZone='L1-C'|'L2-C'|'L3-B'|'L3-C'
export const isLivingZone=(zone:string):zone is LivingZone=>['L1-C','L2-C','L3-B','L3-C'].includes(zone)
export const livingSpaces:Record<LivingZone,{title:string;goal:string;targets:{id:string;label:string;at:Point;approach:Point;description:string;action:string;requires?:string;payoff:string}[]}>= {
 'L1-C':{title:'Bếp Hoàng Cầm · cảnh bếp chủ đề',goal:'Từ gạo và nước tới một bữa cơm',targets:[
  {id:'A02_PREPARE',label:'Vo gạo bên bàn chuẩn bị',at:[-2,0],approach:[-1,0],description:'Gạo, nước và công sức từ xóm lao động gặp nhau ở bàn bếp.',action:'Vo gạo, đặt nồi',payoff:'Nồi đã được đưa tới bếp. Người làm bếp tiếp tục chuẩn bị bữa ăn.'},
  {id:'A02_SMOKE',label:'Theo rãnh dẫn khói',at:[1.7,-1.5],approach:[1,-1],description:'Mô hình minh họa đưa khói qua rãnh và các khoang trước khi tản ra. Đây là diễn giải nguyên lý, không phải thiết kế để sử dụng.',action:'Mở cửa quan sát rãnh khói',requires:'A02_PREPARE',payoff:'Khói trong mô hình đi qua các khoang thấp. Kỹ thuật và đời sống gắn với nhau trong một bữa ăn.'}]},
 'L2-C':{title:'Một khoảng nghỉ · cảnh sinh hoạt chủ đề',goal:'Dành lại một chỗ nghỉ giữa các vật dụng',targets:[
  {id:'A13_BELONGINGS',label:'Chiếc túi và bát bên chiếu',at:[-2,-1],approach:[-1,-.5],description:'Một chiếc túi, bát và đôi dép chia sẻ khoảng trống nhỏ. Đồ dùng và nhân vật được phục dựng để kể về nhu cầu nghỉ ngơi.',action:'Xếp túi lên kệ',payoff:'Lối cạnh chiếu đã thoáng. Người đang nghỉ có thêm một khoảng nhỏ để duỗi chân.'},
  {id:'A13_REST',label:'Sửa lại góc chiếu',at:[1.8,-1.5],approach:[1,-.5],description:'Một chỗ nghỉ cần khô ráo, gọn gàng và yên tĩnh. Không gian mẫu không khẳng định phòng nghỉ nằm cố định ở tầng này.',action:'Trải lại mép chiếu',requires:'A13_BELONGINGS',payoff:'Chiếu đã trải phẳng, bát được đặt gọn bên kệ. Một khoảng lặng giữa nhịp sinh hoạt.'}]},
 'L3-B':{title:'Một chỗ chăm sóc · cảnh quân y chủ đề',goal:'Chuẩn bị vật dụng, rồi hỗ trợ người chăm sóc',targets:[
  {id:'A15_CLOTH',label:'Bàn chuẩn bị khăn và nước',at:[-2,0],approach:[-1,0],description:'Thao tác hỗ trợ mang tính giáo dục, không mô phỏng điều trị. Người chăm sóc và người nằm nghỉ là nhân vật hư cấu đại diện.',action:'Đặt khăn sạch lên khay',payoff:'Khăn đã sẵn trên khay. Người chăm sóc quay lại bên người đang nghỉ.'},
  {id:'A15_CARE',label:'Đưa khay tới người chăm sóc',at:[1.8,-1.5],approach:[1,-.5],description:'Việc chăm sóc phụ thuộc vào nước và hậu cần. Quan sát các nhu cầu cùng nhau thay vì coi quân y là một căn phòng tách rời.',action:'Đưa khay, nhường lối',requires:'A15_CLOTH',payoff:'Khay đã ở bên giường. Từ đây, hãy tìm hiểu nguồn nước cần cho sinh hoạt và chăm sóc.'}]},
 'L3-C':{title:'Nguồn nước và đời sống · hồ sơ diễn giải',goal:'Đưa nước tới bếp và nơi chăm sóc',targets:[
  {id:'A14_WATER',label:'Lấy nước ở mô hình minh họa',at:[-2,-1],approach:[-1,-.5],description:'Cảnh riêng minh họa nguồn nước; không khẳng định có giếng nằm ở tầng 3. Vị trí và hình thức cụ thể cần đối chiếu hồ sơ địa điểm.',action:'Hạ gàu, lấy nước',payoff:'Gàu đã có nước. Một nguồn phải đáp ứng nhiều nhu cầu trong ngày.'},
  {id:'A14_SHARE',label:'Chia nước cho hai nhu cầu',at:[1.8,-1],approach:[1,-.5],description:'Bếp cần nước, nơi chăm sóc cũng cần nước. Mô hình không mô phỏng chất lượng nước hoặc hướng dẫn xử lý y tế.',action:'Rót vào hai bình bếp và chăm sóc',requires:'A14_WATER',payoff:'Hai bình đã đầy: một cho bếp, một cho nơi chăm sóc. Nước nối những hoạt động tưởng như riêng rẽ.'}]},
}
export const livingTarget=(id:string)=>Object.values(livingSpaces).flatMap(s=>s.targets).find(t=>t.id===id)
/** Presentation-only actions. Never canonical evidence, a foundation or a queued reward. */
export function performLivingAction(done:string[],id:string):string[]{const target=livingTarget(id);return !target||done.includes(id)||(target.requires&&!done.includes(target.requires))?done:[...done,id]}
export function livingWalkable([x,z]:Point){return Math.abs(x)<=2.75&&z>=-2&&z<=3&&(z<1.5||Math.abs(x)<=.3)&&!(x< -1.5&&z<.5)&&!(x>1.5&&z<-.5)}
