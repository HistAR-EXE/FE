import * as T from 'three'
import {createKhanRanTexture,createCamoParachuteTexture} from './costumeTextures'

/** TimeLens working-person & revolutionary/villager sample, authored geometry (2026-11-04 / updated 2026-11-26).
 * No source body vertices, garment shells, textures, or face scans are used.
 * The supplied CC0 UAL rig is retained so existing walk/work clips stay usable.
 * This is a review candidate, not a claim of period costume or final art approval. */
export type AuthoredCostume={
 style?:'baba'|'soldier'|'modern'
 hat?:'non'|'taibeo'
 scarf?:boolean
 headScarf?:boolean
 camoCape?:boolean
 belt?:boolean|'leather'|'web'
 canteen?:boolean
}
export type Palette={skin:string;hair:string;top:string;bottom:string;female:boolean;costume?:AuthoredCostume}
type Weight=(p:T.Vector3,index?:number)=>[string,number][]
type Ring={p:T.Vector3;w:number;d:number}
export function buildAuthoredCharacter(template:T.Object3D,palette:Palette):T.Group{
 const model=new T.Group();model.name='TimeLens_Worker_01';model.userData.artStatus='REVIEW_CANDIDATE'
 model.userData.provenance='Original geometry; Quaternius CC0 UAL skeleton/animation only'
 const cloneRig=(src:T.Object3D):T.Bone=>{const b=new T.Bone();b.name=src.name;b.position.copy(src.position);b.quaternion.copy(src.quaternion);b.scale.copy(src.scale);for(const c of src.children)if(!(c instanceof T.Mesh))b.add(cloneRig(c));return b}
 model.add(cloneRig(template));model.updateMatrixWorld(true)
 const bones:T.Bone[]=[];model.traverse(o=>{if(o instanceof T.Bone)bones.push(o)})
 const skeleton=new T.Skeleton(bones),index=new Map(bones.map((b,i)=>[b.name,i]))
 const point=(name:string)=>model.getObjectByName(name)!.getWorldPosition(new T.Vector3())
 const rigid=(name:string):Weight=>()=>[[name,1]]
 const spine:Weight=p=>{
  const stops:[number,string][]=[[.91,'pelvis'],[1.05,'spine_01'],[1.17,'spine_02'],[1.32,'spine_03'],[1.48,'neck_01']]
  if(p.y<=stops[0][0])return [[stops[0][1],1]]
  for(let i=1;i<stops.length;i++)if(p.y<=stops[i][0]){const [y,b]=stops[i],[prev,a]=stops[i-1],k=(p.y-prev)/(y-prev);return [[a,1-k],[b,k]]}
  return [['neck_01',1]]
 }
 const chain=(names:string[]):Weight=>p=>{
  let best=Infinity,result:[string,number][]=[[names[0],1]]
  for(let i=1;i<names.length;i++){
   const a=point(names[i-1]),b=point(names[i]),ab=b.clone().sub(a),k=T.MathUtils.clamp(p.clone().sub(a).dot(ab)/ab.lengthSq(),0,1),d=p.distanceTo(a.addScaledVector(ab,k))
   if(d<best){best=d;const blend=T.MathUtils.smoothstep(k,.72,1);result=[[names[i-1],1-blend],[names[i],blend]]}
  }return result
 }
 const batches=new Map<string,{g:T.BufferGeometry[];color:string;rough:number;map?:T.Texture}>()
 const add=(name:string,g:T.BufferGeometry,color:string,weight:Weight,rough=.9,map?:T.Texture)=>{
  if(!g.attributes.uv){const cnt=g.attributes.position.count;g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(cnt*2),2))}
  const p=g.attributes.position,si:number[]=[],sw:number[]=[],colors:number[]=[],v=new T.Vector3(),base=new T.Color(color)
  for(let i=0;i<p.count;i++){
   v.fromBufferAttribute(p,i)
   // Adjacent garment panels can contribute the same joint. Merge first so
   // truncating to four influences does not discard the arm contribution.
   const merged=new Map<string,number>();for(const [bone,w] of weight(v,i))if(w>0)merged.set(bone,(merged.get(bone)??0)+w)
   const weights=[...merged].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=weights.reduce((s,[,w])=>s+w,0)||1
   for(let k=0;k<4;k++){si.push(index.get(weights[k]?.[0]??bones[0].name)??0);sw.push((weights[k]?.[1]??0)/sum)}
   const weave=name==='shirt'||name==='trousers'||name==='hat'?Math.sin(v.y*1050)*.018+Math.sin(v.x*720+v.z*500)*.014:0
   colors.push(base.r*(1+weave),base.g*(1+weave),base.b*(1+weave))
  }
  g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setAttribute('color',new T.Float32BufferAttribute(colors,3))
  const batch=batches.get(name)??{g:[],color,rough,map};if(map&&!batch.map)batch.map=map;batch.g.push(g);batches.set(name,batch)
 }
 const ellipsoid=(at:T.Vector3,size:[number,number,number],segments=24)=>new T.SphereGeometry(1,segments,16).scale(...size).translate(at.x,at.y,at.z)
 // A stitched ring surface, with small asymmetric folds authored into the cloth.
 const loft=(rings:Ring[],axis:'y'|'x'='y',fold=0,segments=32)=>{
  const positions:number[]=[],uv:number[]=[],idx:number[]=[]
  rings.forEach(({p,w,d},row)=>{for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2,f=1+fold*(Math.sin(a*7+row*.72)*.6+Math.sin(a*13-row)*.4),u=Math.cos(a)*w*f,v=Math.sin(a)*d*f
   positions.push(p.x+(axis==='y'?u:0),p.y+(axis==='x'?u:0),p.z+v);uv.push(i/segments,row/(rings.length-1))
   if(row&&i){const n=row*(segments+1)+i;idx.push(n,n-1,n-segments-2,n,n-segments-2,n-segments-1)}
  }})
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g
 }
 const v=(x:number,y:number,z=0)=>new T.Vector3(x,y,z)
 const ring=(y:number,w:number,d:number,z=0):Ring=>({p:v(0,y,z),w,d})
 // Loose straight shirt, side slits and narrow collar; not inflated body topology.
 const shape=palette.female?.96:1
 const costume=palette.costume??{}
 const torso=[ring(.91,.173,.116,-.025),ring(.93,.177,.118,-.025),ring(.97,.173,.119,-.025),ring(1.01,.165,.113,-.015),ring(1.12,.158,.112),ring(1.24,.177,.115),ring(1.34,.195,.112),ring(1.4,.202,.1),ring(1.445,.165,.078),ring(1.47,.064,.056)]
 torso.forEach(r=>r.w*=shape)
 const shirtWeight:Weight=p=>{
  if(p.y<.98)return [['pelvis',1]]
  const shoulder=T.MathUtils.smoothstep(Math.abs(p.x),.1,.19)*T.MathUtils.smoothstep(p.y,1.3,1.42)
  const side=p.x>=0?'l':'r'
  return [...spine(p).map(([b,w]):[string,number]=>[b,w*(1-shoulder)]),['clavicle_'+side,shoulder*.55],['upperarm_'+side,shoulder*.45]]
 }
 const torsoGeometry=loft(torso,'y',.022),torsoIndices:number[]=[]
 for(let row=1;row<torso.length;row++)for(let i=1;i<=32;i++){
  const mid=i-.5,hole=row>=7&&row<=8&&(mid<4||mid>=28||mid>=12&&mid<20)
  if(!hole){const n=row*33+i;torsoIndices.push(n,n-1,n-34,n,n-34,n-33)}
 }
 torsoGeometry.setIndex(torsoIndices);torsoGeometry.computeVertexNormals()
 const armholes=(['l','r'] as const).map(side=>{
  const start=side==='l'?28:12,end=start+8,edge:T.Vector3[]=[]
  const vertex=(row:number,column:number)=>new T.Vector3().fromBufferAttribute(torsoGeometry.attributes.position,row*33+(column%32))
  for(let c=start;c<=end;c++)edge.push(vertex(6,c))
  for(let r=7;r<=8;r++)edge.push(vertex(r,end))
  for(let c=end-1;c>=start;c--)edge.push(vertex(8,c))
  for(let r=7;r>=7;r--)edge.push(vertex(r,start))
  return edge
 })
 add('shirt',torsoGeometry,palette.top,shirtWeight)
 add('skin',loft([ring(1.43,.056,.051),ring(1.52,.052,.048),ring(1.565,.057,.049)]),palette.skin,chain(['neck_01','Head']))
 // A mandible, cheek planes, brow and cranium rather than the original muscle base.
 const head=loft([ring(1.545,.023,.025,.022),ring(1.559,.047,.055,.013),ring(1.58,.066,.066,.006),ring(1.61,.077,.074),ring(1.645,.081,.082,-.004),ring(1.68,.08,.081,-.012),ring(1.715,.069,.071,-.015),ring(1.74,.043,.046,-.015),ring(1.75,.002,.002,-.015)],'y',0,40)
 add('skin',head,palette.skin,rigid('Head'))
 for(const side of [-1,1]){
  add('skin',ellipsoid(v(side*.081,1.635,-.012),[.014,.028,.013]),palette.skin,rigid('Head'))
  add('detail',ellipsoid(v(side*.083,1.635,-.001),[.006,.016,.004]),'#91674f',rigid('Head'))
  add('eyes',ellipsoid(v(side*.032,1.655,.071),[.016,.006,.005],16),'#c4b9a2',rigid('Head'),.45)
  add('detail',ellipsoid(v(side*.032,1.655,.075),[.005,.005,.002],12),'#201a13',rigid('Head'),.4)
  add('hair',ellipsoid(v(side*.032,1.667,.073),[.02,.003,.003],16),palette.hair,rigid('Head'))
 }
 add('skin',ellipsoid(v(0,1.633,.081),[.013,.027,.015]),palette.skin,rigid('Head'))
 add('detail',ellipsoid(v(0,1.595,.067),[.022,.003,.005]),'#8d5c49',rigid('Head'))
 // Parted cap with an irregular hairline; bun or twin braids for female revolutionary/villager look.
 const hair=new T.SphereGeometry(1,36,18,0,Math.PI*2,0,Math.PI*.57).scale(.085,.087,.087).translate(0,1.677,-.014)
 const hp=hair.attributes.position;for(let i=0;i<hp.count;i++){const x=hp.getX(i),y=hp.getY(i),z=hp.getZ(i);hp.setY(i,y+Math.sin(x*62+z*37)*.002+(z>.03&&y<1.68?.018:0))}hair.computeVertexNormals()
 add('hair',hair,palette.hair,rigid('Head'))
 if(palette.female)add('hair',ellipsoid(v(0,1.645,-.102),[.052,.047,.042]),palette.hair,rigid('Head'))
 for(const side of ['l','r']){
  const sign=side==='l'?1:-1,upper=point('upperarm_'+side),elbow=point('lowerarm_'+side),wrist=point('hand_'+side)
  const armWeight=chain(['upperarm_'+side,'lowerarm_'+side,'hand_'+side])
  // Sleeve starts at the actual armhole boundary, sharing positions and
  // weights with the torso. No overlapping shoulder tubes or rigid caps.
  const edge=armholes[side==='l'?0:1],center=edge.reduce((sum,p)=>sum.add(p),new T.Vector3()).multiplyScalar(1/edge.length)
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],weights:[string,number][][]=[]
  for(let row=0;row<=24;row++)for(let j=0;j<=edge.length;j++){
   const k=row/24,origin=edge[j%edge.length],angle=Math.atan2((origin.z-center.z)/.1,(origin.y-center.y)/.075)
   const axis=upper.clone().lerp(wrist,.82*k),radius=.078-(.078-.049)*k,depth=.077-(.077-.046)*k
   const destination=axis.add(v(0,Math.cos(angle)*radius,Math.sin(angle)*depth))
   const blend=T.MathUtils.smoothstep(k,0,.2),pt=origin.clone().lerp(destination,blend)
   positions.push(pt.x,pt.y,pt.z);uv.push(j/edge.length,k)
   const support=T.MathUtils.smoothstep(k,0,.3)
   weights.push([...shirtWeight(origin).map(([b,w]):[string,number]=>[b,w*(1-support)]),...armWeight(pt).map(([b,w]):[string,number]=>[b,w*support])])
   if(row&&j){const n=row*(edge.length+1)+j;indices.push(n,n-1,n-edge.length-2,n,n-edge.length-2,n-edge.length-1)}
  }
  const sleeveGeometry=new T.BufferGeometry();sleeveGeometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));sleeveGeometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));sleeveGeometry.setIndex(indices);sleeveGeometry.computeVertexNormals()
  add('shirt',sleeveGeometry,palette.top,(_p,i=0)=>weights[i])
  const cuff=upper.clone().lerp(wrist,.82);add('seams',loft([{p:cuff.clone(),w:.052,d:.05},{p:cuff.clone().add(v(sign*.028,0,0)),w:.053,d:.05}],'x'),palette.top,armWeight)
  add('skin',loft([{p:elbow.clone().lerp(wrist,.5),w:.042,d:.037},{p:wrist,w:.027,d:.028}],'x'),palette.skin,armWeight)
  const palm=wrist.clone().add(v(sign*.052,0,0));add('skin',ellipsoid(palm,[.062,.022,.038]),palette.skin,rigid('hand_'+side))
  for(const finger of ['index','middle','ring','pinky','thumb']){
   const names=[1,2,3].map(n=>`${finger}_0${n}_${side}`),end=`${finger}_04_leaf_${side}`
   const joints=[...names,end].map(n=>point(n)),rs=finger==='thumb'?.014:.011
   // Continuous finger tubes follow individual finger joints; no mittens or rigid cylinders.
   const curve=new T.CatmullRomCurve3(joints),g=new T.TubeGeometry(curve,12,rs,8,false)
   add('skin',g,palette.skin,chain([...names,end]))
   add('skin',ellipsoid(joints[3],[rs,rs,rs],12),palette.skin,rigid(names[2]))
  }
  const hip=point('thigh_'+side),knee=point('calf_'+side),ankle=point('foot_'+side),legWeight=chain(['thigh_'+side,'calf_'+side,'foot_'+side])
  const leg:Ring[]=[]
  for(let i=0;i<=20;i++){const k=i/20,p=k<.5?ankle.clone().lerp(knee,k*2):knee.clone().lerp(hip,(k-.5)*2);p.y+=.025;leg.push({p,w:.061+k*.036,d:.062+k*.042})}
  add('trousers',loft(leg,'y',.04),palette.bottom,legWeight)
  add('skin',ellipsoid(ankle.clone().add(v(0,-.031,.065)),[.046,.037,.105]),palette.skin,rigid('foot_'+side))
  // Dép cao su (dép râu): đế lốp xe đen sẫm kèm hai quai cao su bắt chéo ôm mu bàn chân + quai hậu
  add('sandals',ellipsoid(ankle.clone().add(v(0,-.067,.071)),[.052,.012,.116],16),'#23211e',rigid('foot_'+side))
  for(const cross of [-1,1]){
   const strap=ellipsoid(ankle.clone().add(v(0,-.015,.082)),[.051,.0075,.013],12)
   strap.rotateY(cross*.36)
   add('sandals',strap,'#2d2a26',rigid('foot_'+side))
  }
  add('sandals',ellipsoid(ankle.clone().add(v(0,-.022,-.012)),[.048,.007,.011],12),'#2d2a26',rigid('foot_'+side))
 }
 add('trousers',loft([ring(.91,.169,.106,-.022),ring(.97,.162,.108,-.022),ring(1.02,.154,.11,-.016)]),palette.bottom,spine)
 // Placket, small cloth buttons and pocket edges (túi áo bà ba dưới vạt hoặc túi ngực quân phục), all weighted with the shirt.
 for(let i=0;i<6;i++){const y=1.4-i*.075;add('seams',ellipsoid(v(0,y,.113),[.009,.014,.004],12),palette.top,spine);add('buttons',ellipsoid(v(0,y,.119),[.004,.004,.002],10),costume.style==='soldier'?'#5c6344':'#b2a68c',spine)}
 if(costume.style==='soldier'){
  // Cổ bẻ sơ mi quân phục xanh lá & hai túi ngực có nắp
  for(const side of [-1,1]){
   const lapel=new T.BoxGeometry(.052,.038,.012);lapel.rotateZ(side*-.38);lapel.rotateY(side*.32);lapel.translate(side*.045,1.462,.068)
   add('seams',lapel,palette.top,rigid('neck_01'))
   const chestPocket=new T.PlaneGeometry(.072,.08,4,4).translate(side*.082,1.285,.118)
   add('seams',chestPocket,palette.top,spine)
  }
 }else{
  for(const side of [-1,1]){
   const pocket=new T.PlaneGeometry(.08,.09,6,6).translate(side*.09,1.03,.116)
   add('seams',pocket,palette.top,spine)
  }
 }

 // ---- Khăn rằn Nam Bộ quàng cổ thả hai vạt trước ngực (sọc caro đen trắng + hai đường chỉ đỏ gấu khăn) ----
 if(costume.scarf){
  const scarfTex=createKhanRanTexture(true,[1,1])
  // Vòng khăn quàng ôm quanh cổ và vai
  const neckRings:Ring[]=[
   {p:v(0,1.425,.018),w:.092*shape,d:.094},
   {p:v(0,1.462,.004),w:.082*shape,d:.084},
   {p:v(0,1.494,-.008),w:.074*shape,d:.076},
  ]
  const collarLoop=loft(neckRings,'y',.015,28)
  const cu=collarLoop.attributes.uv;for(let i=0;i<cu.count;i++)cu.setXY(i,cu.getX(i)*2.4,.35+cu.getY(i)*.55)
  add('scarf',collarLoop,'#ffffff',chain(['spine_03','neck_01']),.92,scarfTex)
  // Nút giao nhẹ trước cổ ngực
  const knot=ellipsoid(v(0,1.392,.118),[.034,.026,.019],16)
  const ku=knot.attributes.uv;for(let i=0;i<ku.count;i++)ku.setXY(i,ku.getX(i),.45+ku.getY(i)*.3)
  add('scarf',knot,'#ffffff',spine,.92,scarfTex)
  // Hai vạt khăn rằn thả dài tự nhiên trước ngực (có vạch đỏ gấu khăn ở v < 0.22)
  for(const side of [-1,1]){
   const len=side<0?.29:.32,tail=new T.PlaneGeometry(.054,len,5,16)
   const tp=tail.attributes.position,tu=tail.attributes.uv
   for(let i=0;i<tp.count;i++){
    const lx=tp.getX(i),ly=tp.getY(i),k=.5-ly/len // k=0 ở nút cổ, k=1 ở gấu khăn dưới
    const px=side*(.022+k*.017)+lx*(1+k*.12)
    const py=1.39-k*len
    const pz=.123+Math.sin(k*Math.PI)*.012+Math.cos(lx*42)*.003+(side>0?.004:0)
    tp.setXYZ(i,px,py,pz)
    tu.setXY(i,(lx/.054+.5),1-k)
   }
   tail.computeVertexNormals()
   add('scarf',tail,'#ffffff',spine,.92,scarfTex)
  }
 }

 // ---- Khăn rằn quấn ngang trán (thanh niên tòng quân S4 / người dân nghỉ dưỡng) ----
 if(costume.headScarf){
  const bandTex=createKhanRanTexture(false,[3.2,.55])
  const band=loft([
   {p:v(0,1.662,-.008),w:.087,d:.089},
   {p:v(0,1.686,-.01),w:.088,d:.09},
   {p:v(0,1.708,-.012),w:.084,d:.086},
  ],'y',.01,32)
  add('headscarf',band,'#ffffff',rigid('Head'),.92,bandTex)
  add('headscarf',ellipsoid(v(-.062,1.672,-.078),[.02,.018,.018],12),'#ffffff',rigid('Head'),.92,bandTex)
  const tailEnd=new T.PlaneGeometry(.032,.085,3,6)
  tailEnd.rotateX(.28);tailEnd.rotateZ(-.22);tailEnd.translate(-.072,1.628,-.092)
  add('headscarf',tailEnd,'#ffffff',rigid('Head'),.92,bandTex)
 }

 // ---- Nón tai bèo cách mạng xanh lá & Nón lá truyền thống ----
 if(costume.hat==='taibeo'){
  // Chóp mũ vải mềm xanh lá bộ đội / giải phóng
  const crown=new T.SphereGeometry(1,28,12,0,Math.PI*2,0,Math.PI*.52).scale(.092,.078,.096).translate(0,1.694,-.01)
  const cp=crown.attributes.position
  for(let i=0;i<cp.count;i++){const x=cp.getX(i),y=cp.getY(i),z=cp.getZ(i);cp.setY(i,y-Math.max(0,y-1.752)*.35+Math.sin(x*38+z*31)*.0025)}
  crown.computeVertexNormals()
  add('hat',crown,'#495c31',rigid('Head'),.92)
  // Đai vải chân mũ
  add('hat',loft([{p:v(0,1.691,-.01),w:.093,d:.097},{p:v(0,1.707,-.01),w:.091,d:.095}],'y',0,28),'#3b4b27',rigid('Head'),.94)
  // Vành nón tai bèo rủ mềm lượn sóng tự nhiên
  const segs=40,rows=5,bp:number[]=[],bu:number[]=[],bi:number[]=[]
  for(let r=0;r<=rows;r++){
   const k=r/rows
   for(let i=0;i<=segs;i++){
    const a=i/segs*Math.PI*2
    const rx=.091+k*.088,rz=.095+k*.092
    const wave=(Math.sin(a*5+.45)*.009+Math.cos(a*3-.3)*.005)*k
    const droop=-.036*Math.pow(k,1.25)+wave
    bp.push(Math.sin(a)*rx,1.694+droop,Math.cos(a)*rz-.01)
    bu.push(i/segs,k)
    if(r&&i){const n=r*(segs+1)+i;bi.push(n,n-1,n-segs-2,n,n-segs-2,n-segs-1)}
   }
  }
  const brim=new T.BufferGeometry();brim.setAttribute('position',new T.Float32BufferAttribute(bp,3));brim.setAttribute('uv',new T.Float32BufferAttribute(bu,2));brim.setIndex(bi);brim.computeVertexNormals()
  add('hat',brim,'#4c6034',rigid('Head'),.92)
  // Phù hiệu nhỏ phía trước trán mũ (nửa đỏ nửa xanh sao vàng thu nhỏ) & quai mũ dưới cằm
  add('detail',ellipsoid(v(0,1.732,.083),[.011,.011,.004],14),'#c63428',rigid('Head'),.6)
  add('buttons',ellipsoid(v(0,1.732,.086),[.0045,.0045,.002],10),'#ecc83a',rigid('Head'),.5)
  const strapCurve=new T.CatmullRomCurve3([v(-.076,1.68,-.005),v(-.056,1.59,.018),v(0,1.548,.032),v(.056,1.59,.018),v(.076,1.68,-.005)])
  add('hat',new T.TubeGeometry(strapCurve,14,.0026,6,false),'#354224',rigid('Head'),.95)
 }else if(costume.hat==='non'){
  const cone=new T.ConeGeometry(.245,.16,32,2,true);cone.translate(0,1.765,-.008)
  add('hat',cone,'#d9c89c',rigid('Head'),.86)
 }

 // ---- Áo choàng vải dù cách mạng ngụy trang lá rừng (buộc trước cổ, choàng qua hai vai rủ sau lưng) ----
 if(costume.camoCape){
  const capeTex=createCamoParachuteTexture([2.0,2.4])
  const capeWeight:Weight=p=>{
   if(p.y>1.31){
    const side=p.x>=0?'l':'r',sh=T.MathUtils.smoothstep(Math.abs(p.x),.07,.21)
    return [...spine(p).map(([b,w]):[string,number]=>[b,w*(1-sh*.38)]),['clavicle_'+side,sh*.38]]
   }
   if(p.y<.92){
    const side=p.x>=0?'l':'r',legShare=T.MathUtils.smoothstep(.92-p.y,0,.34)*.42
    return [['pelvis',1-legShare],['thigh_'+side,legShare]]
   }
   return spine(p)
  }
  const cols=22,rows=11,cp:number[]=[],cu:number[]=[],ci:number[]=[]
  for(let r=0;r<=rows;r++){
   const k=r/rows // k=0 ở cổ vai (y=1.445), k=1 ở gấu áo choàng sau lưng (y=0.58)
   const span=T.MathUtils.lerp(.82,.64,Math.pow(k,.75))*Math.PI // ôm 2 vai ở trên, mở chữ V phía trước để tay cử động tự do
   for(let c=0;c<=cols;c++){
    const u=c/cols,ang=(u-.5)*2*span // ang=0 là chính giữa sau lưng (-Z), ±span là hai mép trước vai
    const edgeFade=Math.sin(u*Math.PI)
    const pleat=Math.sin(u*Math.PI*9)*.013*k*edgeFade
    const rx=(.105*shape+T.MathUtils.smoothstep(k,0,.16)*.128*shape+k*.048)*1.02
    const rz=.095+T.MathUtils.smoothstep(k,0,.18)*.048+k*.032+pleat
    const yTop=1.452,yBottom=.57+(.14*(1-edgeFade))
    const py=T.MathUtils.lerp(yTop,yBottom,k)
    const px=Math.sin(ang)*rx
    const pz=-Math.cos(ang)*rz-.018
    cp.push(px,py,pz)
    cu.push(u,1-k)
    if(r&&c){const n=r*(cols+1)+c;ci.push(n,n-1,n-cols-2,n,n-cols-2,n-cols-1)}
   }
  }
  const capeGeo=new T.BufferGeometry();capeGeo.setAttribute('position',new T.Float32BufferAttribute(cp,3));capeGeo.setAttribute('uv',new T.Float32BufferAttribute(cu,2));capeGeo.setIndex(ci);capeGeo.computeVertexNormals()
  add('cape',capeGeo,'#ffffff',capeWeight,.74,capeTex)
  // Dây vải dù buộc nút trước hõm cổ
  for(const side of [-1,1]){
   const tieCurve=new T.CatmullRomCurve3([v(side*.095*shape,1.438,.062),v(side*.048*shape,1.418,.108),v(0,1.408,.124)])
   add('cape',new T.TubeGeometry(tieCurve,8,.009,6,false),'#ffffff',spine,.76,capeTex)
  }
  add('cape',ellipsoid(v(0,1.406,.126),[.022,.018,.014],12),'#ffffff',spine,.76,capeTex)
 }

 // ---- Thắt lưng quân trang & Bi-đông nước màu xanh rêu bên hông ----
 if(costume.belt){
  const beltColor=costume.belt==='leather'?'#543922':'#485235'
  const beltGeo=loft([
   {p:v(0,.988,-.018),w:.173*shape,d:.121},
   {p:v(0,1.032,-.017),w:.171*shape,d:.119},
  ],'y',0,28)
  add('gear',beltGeo,beltColor,spine,.82)
  const buckle=new T.BoxGeometry(.044,.048,.014);buckle.translate(0,1.01,.108)
  add('buttons',buckle,costume.belt==='leather'?'#a58952':'#6e705b',spine,.48)
 }
 if(costume.canteen){
  const hipX=-.178*shape
  add('gear',ellipsoid(v(hipX,.905,-.012),[.036,.064,.048],16),'#55603d',rigid('pelvis'),.88)
  add('gear',ellipsoid(v(hipX,.935,-.012),[.03,.052,.042],16),'#3a502d',rigid('pelvis'),.62)
  const cap=new T.CylinderGeometry(.012,.014,.026,10);cap.translate(hipX,.992,-.012)
  add('detail',cap,'#23251f',rigid('pelvis'),.55)
 }

 // Merge each material's independent pattern pieces while preserving its skin weights.
 for(const [name,batch] of batches){
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[],colors:number[]=[],si:number[]=[],sw:number[]=[],idx:number[]=[];let offset=0
  for(const g of batch.g){const a=g.attributes;positions.push(...a.position.array);normals.push(...a.normal.array);uvs.push(...a.uv.array);colors.push(...a.color.array);si.push(...a.skinIndex.array);sw.push(...a.skinWeight.array);if(g.index)for(const n of g.index.array)idx.push(n+offset);offset+=a.position.count;g.dispose()}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(idx)
  // Pattern pieces keep their own UVs/weights, but sewn coincident edges need
  // shared shading normals. Independent normals made the shoulder read as a tear.
  if(name==='shirt'){
   const groups=new Map<string,number[]>(),p=g.attributes.position,n=g.attributes.normal
   for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>v.toFixed(5)).join(',');groups.set(key,[...(groups.get(key)??[]),i])}
   for(const indices of groups.values())if(indices.length>1){const normal=new T.Vector3();for(const i of indices)normal.add(new T.Vector3().fromBufferAttribute(n,i));normal.normalize();for(const i of indices)n.setXYZ(i,normal.x,normal.y,normal.z)}
  }
  const m=new T.SkinnedMesh(g,new T.MeshStandardMaterial({vertexColors:true,map:batch.map??null,roughness:batch.rough,side:T.DoubleSide}));m.name='authored-'+name;m.bind(skeleton);m.castShadow=true;m.frustumCulled=false;model.add(m)
 }
 return model
}
