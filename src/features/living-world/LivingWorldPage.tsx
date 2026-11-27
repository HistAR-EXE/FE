import {WorldStoryOpening,WorldStoryPanel} from './WorldStoryPanel'
import {KhaConversation} from './KhaConversation'
import {M2StationGuide} from './M2StationGuide'
import {m2ZoneGoals} from './m2JourneyGuidance'
import {planM2ActivityMigration,mergeM2PresentationActivities} from './m2Persistence'
import {reconcileKitchenEcho} from './kitchenEcho'
import {selectSmokeNode,kitchenNodes} from './spatialKitchen'
import {CookConversation} from './CookConversation'
import {useWorldAtmosphere} from './useWorldAtmosphere'
import {AtmospherePanel} from './AtmospherePanel'
import {AtmosphereSettings} from './AtmosphereSettings'
import {ModelViewerPanel} from './ModelViewerPanel'
import {initialModelView,type ModelView} from './worldModelMedia'
import {connectSynthesis,synthesisNodes,synthesisPayoffs} from './spatialSynthesis'
import {readMemorialCheckpoint,reconcileMemorial,reconcileEpilogue,checkpointEpiloguePayload,type MemorialCheckpoint} from './memorialExperience'
import {MemorialPanel} from './MemorialPanel'
import {canSynthesize,synthesisRelations,describeCareProgress} from './coreProofs'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link,useSearchParams } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'
import { zones, factLabels, initialShell, enterZone, advanceShell, arrivedInteraction, startApproach, moveTo, modeDestination, nextStop, initialRice, strokeRice, type Mode, type Zone, type Point } from './worldModel'
import './livingWorld.css'
import './worldStory.css'
import {isLivingZone,livingSpaces,livingTarget,performLivingAction} from './livingSpaces'
import {createLivingAudio} from './livingAudio'
import {A04Panel} from './A04Panel'
import {CoreProofPanel} from './CoreProofPanel'
import {pendingCoreFacts,reconcileRoomActivities,coreObservations} from './coreProofs'
import {stepA04,type A04Phase} from './a04Experience'
import {createS2Audio} from './s2Audio'
import {RoutePanel} from './RoutePanel'
import {P2Panel} from './P2Panel'
import {initialP2,type P2State} from './p2Data'
import {playVesselDeparture} from './vesselAudio'
import {isQuestTarget} from './tunnelLayouts'
import {timeRoute,routesFrom,nextRouteStep,typeLabels,readNavigation,saveNavigation,readVerifiedState,resumeShell,type WorldRoute} from './worldContinuity'
import {prepareWorldZone,prepareR2Zone} from './worldSceneResources'
import {isSafeWorldPoint,openHeading,type Shell} from './worldModel'
import { enqueueWorld, readWorldState, pendingWorld, syncWorld, retryWorld } from './worldPersistence'
import { getSessionMeta } from '../../shared/auth/session'
import type { WorldIntent, WorldState, QueueRow } from './worldQueue'
import { readWhileCurrent, canPresentMoment } from './worldPresentation'
import {
 SERVER_ACTIVITY_TARGETS,
 SERVER_CHECKPOINT_ZONES,
 ZONE_NPC_PROFILES,
 clearM2PersonalCreations,
 getM2SurfaceTarget,
 readM2OwnerState,
 saveM2OwnerState,
 type ActivityCompletionContext,
 type M2OwnerState,
} from './m2WorldExpansion'
import {
 ActivityChainsAtlasSection,
 CedarFallsTablePanel,
 CreativeMemoryStudio,
 FutureLetterPanel,
 ZoneNpcConversation,
} from './M2ExperiencePanels'

const Scene=lazy(()=>import('./WorldScene'))
type HatchStage='HIDDEN'|'SWEEPING'|'REVEALED'|'OPENING'|'OPEN'|'DESCENDING'|'CLOSING'|'COVERED'
const HATCH_ACTION:Record<HatchStage,string>={HIDDEN:'Quan sát kỹ mặt đất',SWEEPING:'Đang gạt lớp lá…',REVEALED:'Nhấc nắp',OPENING:'Đang nhấc nắp…',OPEN:'Chui xuống',DESCENDING:'Đang chui xuống…',CLOSING:'Đang đậy nắp, phủ lại lá…',COVERED:'Gạt lớp lá'}
const isGroundClue=(id:string)=>id.startsWith('Q1_')||id.startsWith('S1_DECOY_')
const reducedMotion=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches
const sourceUrl='https://dsvh.gov.vn/di-tich-lich-su-dia-dao-cu-chi-1490'
const BARKS:Partial<Record<Zone,string>>={
 S1:'Khu rừng này có gì đó không khớp…',S2:'Nghe tiếng chày kìa.',
 S3:'Ánh trăng soi cánh đồng yên ả mà nhịp tay đan tre, đào đất vẫn bền bỉ.',
 S4:'Tiếng đàn đêm văn nghệ, phiên chợ nhỏ và lời dặn dò tuổi trẻ gặp nhau nơi sân xóm.',
 'L1-A':'Hẹp quá… cúi thấp nhé.','L1-B':'Không khí dưới này đến từ đâu?',
 'L1-C':'Có ánh lửa nhưng không thấy cột khói bốc lên…','L1-D':'Mỗi tầng nối với tầng khác ra sao?','L2-A':'Tầng này rộng hơn… người ta làm gì ở đây?',
 'L2-B':'Ánh đèn dầu nơi bàn họp tầng 2 nối lịch phân công các căn phòng với lá thư gửi tương lai.',
 'L2-C':'Một góc nhỏ giữa lòng đất vẫn dành chỗ cho sự nghỉ ngơi.','L2-D':'Bốn lớp không gian hiện ra trên bàn sa bàn.',
 'L3-A':'Sâu hơn, ẩm hơn. Cẩn thận bước chân.','L3-B':'Sự chăm sóc dưới lòng đất bắt đầu từ những điều giản dị nhất.',
 'L3-C':'Một nguồn nước phải chia sẻ cho nhiều nhu cầu sống.','L3-D':'Những mảnh ghép rời rạc đang chờ hội tụ thành một cộng đồng.',
 S5:'Củ Chi hôm nay yên bình. Bạn có thể dừng lại tưởng nhớ hoặc tự do tham quan.'}
const HINTS:Partial<Record<Zone,[string,string]>>={
 S0:['Kha đứng ở bàn vận hành bên trái cỗ máy.','Bàn điều khiển trước cỗ máy là nơi khởi hành.'],
 S1:['Một lối mòn thường dẫn tới đâu đó. Nó dừng lại ở chỗ nào?','Lá ở vài chỗ không cùng màu với xung quanh; hãy nhìn khu phía trước, quanh những gốc cây.'],
 S2:['Người cùng làm đang giã gạo giữa sân; hai bên sân có bếp tráng bánh (A03) và bàn thợ dép (A12).','Đứng cạnh cối để thử giã gạo hoặc ghé bếp tráng bánh, bàn thợ dép để hoàn chỉnh nghề xóm.'],
 S3:['Chiếu đan tre (A05) nằm bên trái bờ ruộng, khu đào đất và chuyền thúng (A06) nằm bên phải.','Giữa bờ ruộng phía bắc là nơi lắng nghe và đáp lại câu hò lao động (A10).'],
 S4:['Sân khấu văn nghệ (A07) bên trái, bàn thanh niên (A09) bên phải, sạp chợ quê (A11) ở phía trước.','Giữa sân phía bắc là sa bàn bối cảnh chiến dịch Cedar Falls tháng 01/1967 (A23).'],
 'L1-C':['Gạo và nước được chuẩn bị ở bàn bên trái.','Chuẩn bị nồi trước, rồi quan sát các khoang dẫn khói phía cuối phòng.'],
 'L2-B':['Sổ phân công công việc đặt ở bàn họp bên trái.','Xem sổ phân công trước rồi mở phong thư gửi tương lai (A21) bên bàn phải.'],
 'L2-C':['Những vật dụng đang chiếm chỗ cạnh chiếu.','Xếp túi lên kệ trước khi sửa lại góc chiếu.'],
 'L3-B':['Người chăm sóc cần một khay vật dụng sẵn sàng.','Chuẩn bị khăn ở bàn bên trái rồi đưa khay tới cạnh giường.'],
 'L3-C':['Nguồn nước đang được trình bày bằng một mô hình riêng.','Lấy nước trước, rồi chia cho nhu cầu bếp và chăm sóc.'],
 'L1-A':['Lối hầm tách hai nhánh phía trước.','Một nhánh dẫn tới chỗ có ánh sáng lọt xuống, nhánh kia tới các tầng.'],
 'L1-B':['Ánh sáng lọt xuống từ một ống nhỏ trên trần.','Lần theo: lỗ mở → đoạn dẫn → khoang bên trong.'],
 'L1-D':['Mỗi tầng có một điểm chuyển xuống tầng dưới.','Tìm nắp hầm ở cuối ngách.'],'L2-A':['Phòng sinh hoạt nằm bên trái hành lang.','Điểm chuyển xuống tầng sâu ở cuối ngách phải.'],
 'L3-A':['Tầng sâu nhất hẹp và ẩm.','Quan sát khoang cuối tuyến rồi thử nối các tầng.']}
export default function LivingWorldPage({presentation='standalone'}:{presentation?:'standalone'|'product'}){
 if(import.meta.env.VITE_LIVING_WORLD_INTERNAL==='false') // Living World is the quest tab now; an environment can still switch it off explicitly
 return <main className="lw-root"><h1>Bản thử nội bộ</h1><p>Trải nghiệm này chưa được mở trên môi trường hiện tại.</p><Link to="/explore">Trở về nhiệm vụ</Link></main>
 return <InternalWorldPage presentation={presentation}/>
}
function InternalWorldPage({presentation}:{presentation:'standalone'|'product'}){
 const [storyOpen,setStoryOpen]=useState(false)
 const storyOpenRef=useRef(false)
 useEffect(()=>{storyOpenRef.current=storyOpen},[storyOpen])
 const {user}=useAuth()
 // G3: the in-world continuous journey is the default. The G2 tab sandbox stays reachable only for QA via ?debug=1.
 const [search]=useSearchParams(),proof=search.get('debug')!=='1'
 type Transfer={route:WorldRoute;origin:Shell;id:number;owner:string|undefined;phase:'DEPARTING'|'LOADING'|'ARRIVING'|'FAILED'}
 const [presentationOwner,setPresentationOwner]=useState<string|null>(null)
 const [routePrompt,setRoutePrompt]=useState<WorldRoute|null>(null),[transfer,setTransfer]=useState<Transfer|null>(null)
 const passageWait=useRef<(()=>void)|null>(null),pendingDoor=useRef<WorldRoute|null>(null),pendingHatch=useRef(false)
 const transferRef=useRef<Transfer|null>(null),routeEpoch=useRef(0)
 const setTransferBoth=(value:Transfer|null)=>{transferRef.current=value;setTransfer(value)}
 const [shell,setShell]=useState(initialShell),[mode,setMode]=useState<Mode>('STORY'),[fallback,setFallback]=useState(false),[panel,setPanel]=useState<'WORLD'|'ATLAS'|'SOURCES'>('WORLD')
 const [livingDone,setLivingDone]=useState<string[]>([])
 const [rice,setRice]=useState(initialRice),[working,setWorking]=useState(false),[observe,setObserve]=useState(false),[note,setNote]=useState('Chrono: Một khe nhỏ trên mặt đất có thể liên quan gì tới cuộc sống bên dưới?'),[talk,setTalk]=useState<string|null>(null)
 const [facts,setFacts]=useState<string[]>([]),[path,setPath]=useState<string[]>([]),[pairFrom,setPairFrom]=useState('STRUCT_LAYER_1'),[pairTo,setPairTo]=useState('STRUCT_LAYER_2'),[pairs,setPairs]=useState<string[][]>([])
 const [prologue,setPrologue]=useState(true),[moment,setMoment]=useState(false),[callbackSeen,setCallbackSeen]=useState(false)
 const [cameraReset,setCameraReset]=useState(0)
 const [modelView,setModelView]=useState<ModelView|null>(null)
 const closeModelView=()=>{setModelView(null);requestAnimationFrame(()=>document.querySelector<HTMLElement>('.lw-canvas canvas,.lw-map [data-target="MODEL_COMPARE"],.lw-assist-toggle')?.focus({preventScroll:true}))}
 useEffect(()=>{setModelView(null)},[user?.id,shell.zone])
 const [readyZone,setReadyZone]=useState<Zone|null>(null)
 // G3 Phase 1: game-first shell (proof route). Menu/overlays open on demand; world stays mounted underneath.
 const skipDeparture=useRef<(()=>void)|null>(null)
 const [q1,setQ1]=useState<string[]>([]),[menu,setMenu]=useState(false),[hints,setHints]=useState(false),[xray,setXray]=useState(false)
 // G3 immersive: underground zones are walked inside; the interpretive cutaway is a separate observation mode.
 useEffect(()=>{setXray(false)},[shell.zone])
 // Q1 hatch stage (G3 QA P0 Q1-STATE): physical discovery → sweep → open → crawl down; closed and re-covered on return.
 const q1Live=useRef(q1);useEffect(()=>{q1Live.current=q1},[q1])
 const [firstPerson,setFirstPerson]=useState(false),[p2,setP2]=useState<P2State>(initialP2)
 // Escape closes the Menu (keyboard contract; R2 BENCH-MENU found Escape did nothing)
 useEffect(()=>{if(!menu)return;const k=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenu(false);document.querySelector<HTMLButtonElement>('.lw-menu-button')?.focus()}};window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[menu])
 // Safe spawn view in tunnels (QC-CAMERA): face the open passage, never a wall.
 useEffect(()=>{if(!proof||!shell.zone.startsWith('L'))return;setShell(s=>{const h=openHeading(s.zone,s.position,s.heading);return h===s.heading?s:{...s,heading:h}})},[shell.zone,proof])
 // QC-CAMERA: passages are 0.72–0.8 m wide (Baseline sizes kept); a follow camera behind a crouching Avatar still leaves the
 // Avatar covering much of the way ahead. Underground layers therefore open in the first-person-equivalent view;
 // V / the button switches to the over-the-shoulder third-person view at any time.
 const viewZone=useRef(shell.zone) // r16 PO: surface↔underground passages switch to that world's default view (TP on the surface, FP in tunnels); tunnel↔tunnel passages keep the player's V choice
 useEffect(()=>{const prev=viewZone.current,under=shell.zone.startsWith('L');viewZone.current=shell.zone;if(!transferRef.current?.route.passage||prev.startsWith('L')!==under)setFirstPerson(proof&&under)},[shell.zone,proof]) // ?debug=1 (QA labels) stays third-person
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(!storyOpenRef.current&&!modelView&&e.key.toLowerCase()==='v'&&!(e.target instanceof HTMLElement&&e.target.matches('input,select,textarea'))&&shell.zone.startsWith('L'))setFirstPerson(v=>!v)};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[shell.zone,modelView])
 const [hatch,setHatch]=useState<HatchStage>('HIDDEN'),arrivedVia=useRef<string|null>(null),hatchTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 useEffect(()=>{if(shell.zone!=='S1')return;const via=arrivedVia.current;arrivedVia.current=null
  if(via==='ENTRANCE_SURFACE'){setHatch('OPEN')}else setHatch(q1.includes('Q1_HATCH')?'COVERED':'HIDDEN')
  return()=>{if(hatchTimer.current)clearTimeout(hatchTimer.current)}
 },[shell.zone])
 // G3 free exploration (LOCK §9): Chrono speaks one short ambient line per arrival and it fades by itself;
 // guidance is a 3-level hint ladder the player asks for. On-demand dialogue still stays until closed.
 const [bark,setBark]=useState<string|null>(null),[barkMs,setBarkMs]=useState(5000),[hintLevel,setHintLevel]=useState(0)
 useEffect(()=>{setHintLevel(0);if(!proof)return;const line=BARKS[shell.zone];if(line)setBark(line)},[shell.zone,proof])
 useEffect(()=>{if(!bark)return;const id=window.setTimeout(()=>setBark(null),barkMs);return()=>window.clearTimeout(id)},[bark,barkMs])
 const pickRef=useRef<(id:string)=>void>(()=>{}),nearRef=useRef<{id:string;label:string}|null>(null)
 const [a04Phase,setA04Phase]=useState<A04Phase>('IDLE'),[sound,setSound]=useState(false)
 const [volume,setVolume]=useState(()=>{try{const raw=localStorage.getItem('timelens-world-volume');if(raw!==null){const v=Number(raw);if(Number.isFinite(v)&&v>=0&&v<=1)return v}}catch{/* optional device preference */}return 1})
 const audio=useRef<(ReturnType<typeof createS2Audio>&{echo?:()=>void;setAlert?:(on:boolean)=>void;setListener?:(x:number,z:number,yaw:number)=>void})|null>(null)
 useEffect(()=>()=>audio.current?.close(),[])
 // Partner's pestle keeps time audibly while the NPC works (matches the scene's ~1.05s stroke cycle).
 useEffect(()=>{if(shell.zone!=='S2')setA04Phase('IDLE');if(sound&&shell.zone!=='S0')audio.current=shell.zone==='S2'?createS2Audio():createLivingAudio(shell.zone);return()=>{audio.current?.close();audio.current=null}},[shell.zone,sound])
 useEffect(()=>{audio.current?.setVolume(volume);try{localStorage.setItem('timelens-world-volume',String(volume))}catch{/* Audio still works if browser storage is unavailable. */}},[volume,shell.zone,sound])

 const [linkMode,setLinkMode]=useState(false),[linkStart,setLinkStart]=useState<string|null>(null),[assist,setAssist]=useState(false)
 const workTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const lastIntent=useRef<string|null>(null)
 const owner=useRef(user?.id)
 useEffect(()=>{owner.current=user?.id},[user?.id])
 const [activityStorageReady,setActivityStorageReady]=useState(false)
 const [availableQuests,setAvailableQuests]=useState<string[]>(['Q1','Q2','Q3'])
 const [synthesisDraft,setSynthesisDraft]=useState<string[]>([])
 const [synthesisStart,setSynthesisStart]=useState<string|null>(null)
 useEffect(()=>{setSynthesisStart(null)},[shell.zone])
 const [modelCompared,setModelCompared]=useState(false)
 const [smokeDraft,setSmokeDraft]=useState<string[]>([])
 const [synthesisPayoff,setSynthesisPayoff]=useState(false)
 const [echoSeen,setEchoSeen]=useState(false),[echoReady,setEchoReady]=useState(false)
 useEffect(()=>{setEchoSeen(user?.id?false:readNavigation('guest')?.kitchenEcho===true);setEchoReady(false)},[user?.id])
 useEffect(()=>{audio.current?.setListener?.(shell.position[0],shell.position[1],shell.heading)},[shell.position,shell.heading,sound])
 const [memorial,setMemorial]=useState<MemorialCheckpoint|null>(null)
 const [memorialStorageReady,setMemorialStorageReady]=useState(false)
 const [memorialOpen,setMemorialOpen]=useState(false)
 const [epilogueReturned,setEpilogueReturned]=useState(false)
 const [m2State,setM2State]=useState<M2OwnerState>(()=>readM2OwnerState(user?.id??'guest'))
 const [atmosphereSeen,setAtmosphereSeen]=useState(false)
 const [creativeReset,setCreativeReset]=useState(0)
 const updateM2State=(updater:(prev:M2OwnerState)=>M2OwnerState)=>{
  const currentOwner=owner.current??'guest',next=updater(readM2OwnerState(currentOwner))
  if(!saveM2OwnerState(currentOwner,next)){setNote('Không lưu được trên thiết bị. Dữ liệu chưa được xác nhận đã lưu; hãy giải phóng bộ nhớ hoặc thử lại.');return false}
  setM2State(next);return true
 }
 const savePersonalCreation=(updater:(prev:M2OwnerState)=>M2OwnerState)=>{
  if(!readM2OwnerState(owner.current??'guest').consentAccepted)throw new Error('Hãy chủ động đồng ý lưu trên thiết bị trước khi lưu sản phẩm.')
  if(!updateM2State(updater))throw new Error('Không đủ bộ nhớ hoặc trình duyệt đang chặn lưu dữ liệu. Sản phẩm chưa được lưu.')
 }
 useEffect(()=>{setMemorial(user?.id?null:readMemorialCheckpoint(readNavigation('guest')?.memorial));setEpilogueReturned(user?.id?false:readNavigation('guest')?.epilogue==='RETURNED');setMemorialStorageReady(false);setMemorialOpen(false);setM2State(readM2OwnerState(user?.id??'guest'));setAtmosphereSeen(false)},[user?.id])
 useEffect(()=>{const nav=readNavigation(user?.id??'guest');setModelCompared(nav?.modelCompared===true);setSmokeDraft((Array.isArray(nav?.smokeDraft)?nav.smokeDraft:[]).filter(n=>['HEARTH','CHANNEL','DIFFUSION'].includes(n)));setSynthesisDraft(Array.isArray(nav?.synthesisDraft)?nav.synthesisDraft.filter(x=>synthesisRelations.includes(x)):[]);setSynthesisStart(null);setSynthesisPayoff(false)},[user?.id])
 const [pendingCore,setPendingCore]=useState<string[]>([])
 const [pending,setPending]=useState(0),[syncError,setSyncError]=useState('')
 const [travel,setTravel]=useState(false)
 const [bootLoading,setBootLoading]=useState(Boolean(user))
 const [visibility,setVisibility]=useState(document.visibilityState)
 const [cameraBusy,setCameraBusy]=useState(false),[deliveredMoment,setDeliveredMoment]=useState<WorldState['moment']>('LOCKED')
 useEffect(()=>{const change=()=>setVisibility(document.visibilityState);document.addEventListener('visibilitychange',change);return()=>document.removeEventListener('visibilitychange',change)},[])
 const atmosphere=useWorldAtmosphere({owner:user?.id??'guest',zone:shell.zone,paused:storyOpen||!!modelView||!proof||bootLoading||(!fallback&&readyZone!==shell.zone)||prologue||!!talk||menu||!!transfer||!!routePrompt||moment||memorialOpen||panel!=='WORLD'||visibility!=='visible'})
 useEffect(()=>{audio.current?.setAlert?.(atmosphere.phase==='ALERT');if(atmosphere.phase==='ALERT'||atmosphere.phase==='RECOVERY'||atmosphere.phase==='SETTLED')setAtmosphereSeen(true)},[atmosphere.phase,sound,shell.zone])
 const mergeM2Activities=(serverActivities:string[],currentOwner=owner.current??'guest')=>{
  const localM2=readM2OwnerState(currentOwner).activities
  return mergeM2PresentationActivities(serverActivities,localM2)
 }
 const applyState=(state:WorldState,rows:QueueRow[]=[])=>{setEchoReady(state.echoPersistence===true);setEchoSeen(reconcileKitchenEcho(state.checkpoint?.kitchenEcho,rows));setMemorialStorageReady(state.memorialPersistence===true);setMemorial(reconcileMemorial(state.checkpoint?.memorial,rows));setEpilogueReturned(reconcileEpilogue(state.checkpoint?.epilogue,rows));setAvailableQuests(state.quests??['Q1','Q2','Q3']);setActivityStorageReady(state.activityPersistence===true);if(state.activityPersistence)setLivingDone(mergeM2Activities(reconcileRoomActivities(state.activities??[],rows)));setFacts(state.facts??[]);setDeliveredMoment(state.moment??'LOCKED');if(state.moment==='VIEWED'){setCallbackSeen(true);setMoment(false)}}
 const sync=async()=>{
  const id=owner.current;if(!id)return
  const current=()=>owner.current===id&&getSessionMeta()?.userId===id
  try{await syncWorld(id,current);let state=await readWhileCurrent(readWorldState,current);if(!state)return;let rows=await pendingWorld(id);if(!current())return;
   const migration=state.activityPersistence?planM2ActivityMigration(readM2OwnerState(id).activities,state.activities??[],rows):[]
   for(const intent of migration){if(!current())return;await enqueueWorld(id,intent)}
   if(migration.length){await syncWorld(id,current);state=await readWhileCurrent(readWorldState,current);if(!state)return;rows=await pendingWorld(id);if(!current())return}
   applyState(state,rows);setPending(rows.length);setPendingCore(pendingCoreFacts(rows));setSyncError(rows.find(r=>r.error)?.error??'')}
  catch{if(current())setSyncError('Máy chủ chưa sẵn sàng. Hành động đã lưu sẽ chờ đồng bộ; chưa xác nhận tiến độ.')}
 }
 const submit=async(intent:WorldIntent)=>{
  const id=owner.current;if(!id)return
  try{await enqueueWorld(id,intent);const rows=await pendingWorld(id);if(owner.current!==id||getSessionMeta().userId!==id)return;setPending(rows.length);setPendingCore(pendingCoreFacts(rows));await sync()}
  catch{if(owner.current===id){const rows=await pendingWorld(id).catch(()=>[]);if(owner.current!==id)return;setLivingDone(reconcileRoomActivities(readVerifiedState(id)?.activities??[],rows));setMemorial(reconcileMemorial(readVerifiedState(id)?.checkpoint?.memorial,rows));setEpilogueReturned(reconcileEpilogue(readVerifiedState(id)?.checkpoint?.epilogue,rows));setEchoSeen(reconcileKitchenEcho(readVerifiedState(id)?.checkpoint?.kitchenEcho,rows));setSyncError('Không lưu được hành động trên thiết bị này. Hãy giữ trang mở và thử lại; chưa xác nhận tiến độ.')}}
 }
 useEffect(()=>{
  setPresentationOwner(null);routeEpoch.current++;passageWait.current?.();passageWait.current=null;pendingDoor.current=null;pendingHatch.current=false;setTransferBoth(null);setRoutePrompt(null);
  if(hatchTimer.current)clearTimeout(hatchTimer.current);hatchTimer.current=null;setHatch('HIDDEN');setLivingDone([]);setFacts([]);setQ1([]);setCallbackSeen(false);setMoment(false);setShell(initialShell());setRice(initialRice());setA04Phase('IDLE');audio.current?.close();audio.current=null;setSound(false);setMode('STORY');setTalk(null);setPath([]);setPairs([]);setPairFrom('STRUCT_LAYER_1');setPairTo('STRUCT_LAYER_2');setObserve(false);setTravel(false);setWorking(false);setPrologue(true);setPanel('WORLD');setPending(0);setPendingCore([]);setAvailableQuests(['Q1','Q2','Q3']);setActivityStorageReady(false);setSyncError('');lastIntent.current=null
  setNote('Chrono: Một khe nhỏ trên mặt đất có thể liên quan gì tới cuộc sống bên dưới?')
  if(workTimer.current)clearTimeout(workTimer.current)
  setBootLoading(Boolean(user))
  setDeliveredMoment('LOCKED');setCameraBusy(false);setAssist(false);setLinkMode(false);setLinkStart(null)
  if(!user?.id){if(proof){const nav=readNavigation('guest'),m2Guest=readM2OwnerState('guest');setM2State(m2Guest);if(nav){setShell(resumeShell(enterZone(initialShell(),nav.zone),nav,nav.zone,isSafeWorldPoint));setFacts(nav.facts??[]);setSynthesisDraft((nav.synthesisDraft??[]).filter(x=>synthesisRelations.includes(x)));setLivingDone(Array.from(new Set([...(nav.activities??[]).filter(id=>!!livingTarget(id)),...m2Guest.activities])));setQ1(Array.isArray(nav.q1)?nav.q1.filter((x:unknown)=>typeof x==='string'&&x.startsWith('Q1_')):[]);setRice({processed:nav.rice??0,last:nav.last??null,finished:nav.rice>=6});setCallbackSeen(!!nav.callbackSeen);if(['FREE','STORY','MEMORY'].includes(nav.mode??''))setMode(nav.mode as Mode);setPrologue(false)}else if(m2Guest.activities.length)setLivingDone(m2Guest.activities)}setPresentationOwner('guest');return}
  const id=user.id;let active=true
  setM2State(readM2OwnerState(id))
  void (async()=>{
   try{
    // Queue start/resume before any checkpoint or proof, including an initially offline visit.
    if(!(await pendingWorld(id)).some(r=>r.intent.actionType==='START_EXPERIENCE'))await enqueueWorld(id,{actionType:'START_EXPERIENCE',targetId:'',payload:{}})
    if(proof)await sync()
    const state=await readWhileCurrent(readWorldState,()=>active&&owner.current===id&&getSessionMeta().userId===id);if(!state)return
    const queued=await pendingWorld(id);if(!active||owner.current!==id||getSessionMeta().userId!==id)return;applyState(state,queued);if(['FREE','STORY','MEMORY'].includes(state.mode??''))setMode(state.mode as Mode)
    const nav=proof?readNavigation(id):null
    const resumeZone=(nav?.zone&&!SERVER_CHECKPOINT_ZONES.has(nav.zone)&&Object.hasOwn(zones,nav.zone))?nav.zone:(state.checkpoint?.zone&&Object.hasOwn(zones,state.checkpoint.zone)?state.checkpoint.zone as Zone:null)
    if(resumeZone){setShell(s=>resumeShell(enterZone(s,resumeZone),nav,resumeZone,isSafeWorldPoint));if(proof)setPrologue(false)}
    if(state.checkpoint?.rice!==undefined)setRice({processed:state.checkpoint.rice,last:state.checkpoint.last??null,finished:state.checkpoint.rice>=6})
    await sync()
   }catch{if(active){if(proof){const cache=readVerifiedState(id),nav=readNavigation(id);if(cache){const queued=await pendingWorld(id).catch(()=>[]);if(!active||owner.current!==id||getSessionMeta().userId!==id)return;applyState(cache,queued);const rememberedMode=nav?.mode??cache.mode;if(['FREE','STORY','MEMORY'].includes(rememberedMode??''))setMode(rememberedMode as Mode);const zone=nav?.zone??cache.checkpoint?.zone as Zone;if(zone&&Object.hasOwn(zones,zone))setShell(s=>resumeShell(enterZone(s,zone),nav,zone,isSafeWorldPoint));setRice({processed:nav?.rice??cache.checkpoint?.rice??0,last:nav?.last??cache.checkpoint?.last??null,finished:(nav?.rice??cache.checkpoint?.rice??0)>=6});setPrologue(false)}}setSyncError('Chưa kết nối được máy chủ. Dữ liệu trên thiết bị (nếu có) vẫn được giữ; hành động mới đang chờ xác nhận.')}}
   finally{if(active){setBootLoading(false);setPresentationOwner(id)}}
  })()
  const online=()=>{void sync()};window.addEventListener('online',online)
  return()=>{active=false;window.removeEventListener('online',online)}
 // Account boundary deliberately restarts presentation and reloads canonical server state.
 },[user?.id])
 const hasAir=facts.includes('AIR_MEANING_CONFIRMED'),hasStructure=facts.includes('STRUCT_MEANING_CONFIRMED'),connected=hasAir&&hasStructure
 useEffect(()=>{let previous=performance.now();const timer=setInterval(()=>{const now=performance.now(),elapsed=Math.min(1,(now-previous)/1000) /* wall-clock walking: a busy main thread (slow frames/timers) must not stretch a 1.5 s approach to 10+ s (G3 QA E2E forensics) */;previous=now;if(storyOpenRef.current)return;setShell(s=>{let next=s;for(let left=elapsed;left>0;left-=.05)next=advanceShell(next,Math.min(.05,left));return next})},50);return()=>{clearInterval(timer);if(workTimer.current)clearTimeout(workTimer.current)}},[])
 const cancelTransfer=()=>{const current=transferRef.current;if(!current)return;routeEpoch.current++;passageWait.current?.();passageWait.current=null;pendingDoor.current=null;pendingHatch.current=false;setTransferBoth(null);setShell(current.origin);setRoutePrompt(null);setTalk(null);lastIntent.current=null;setNote('Đã giữ vị trí trước điểm chuyển. Bạn có thể thử lại.')}
 useEffect(()=>{
  const listener=(e:KeyboardEvent)=>{
   if(storyOpenRef.current)return
   if(e.key==='Tab'&&transferRef.current){const buttons=[...document.querySelectorAll<HTMLButtonElement>('.lw-transfer button')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}return}
   if(e.key==='Escape'){if(modelView){closeModelView();return}if(transferRef.current)cancelTransfer();setRoutePrompt(null);setTalk(null);setA04Phase('IDLE');return}
   if(modelView){if(e.key==='Escape')closeModelView();if(e.key==='Tab'&&!(e.target instanceof Element&&e.target.closest('.lw-model-viewer'))){e.preventDefault();document.querySelector<HTMLButtonElement>('.lw-model-close')?.focus()}return}
   if(transferRef.current||routePrompt)return
   if(proof&&(e.key==='e'||e.key==='E')&&nearRef.current&&!(e.target instanceof HTMLElement&&e.target.matches('input,select,textarea'))){e.preventDefault();pickRef.current(nearRef.current.id);return}
   if((e.target instanceof HTMLElement&&e.target.matches('input,select,textarea,button'))||talk)return
   if(proof&&'wasd'.includes(e.key.toLowerCase())&&e.key.length===1)return
   const offset:Record<string,Point>={w:[0,-0.5],a:[-0.5,0],s:[0,0.5],d:[0.5,0]}
   const step=offset[e.key.toLowerCase()];if(step){e.preventDefault();setShell(s=>moveTo(s,[s.position[0]+step[0],s.position[1]+step[1]]))}
  };window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener)
 },[talk,routePrompt,modelView])
 useEffect(()=>{
  if(connected&&!talk&&shell.path.length===0&&!callbackSeen&&(!user||deliveredMoment==='AVAILABLE'))setMoment(true)
 },[connected,talk,shell.path.length,callbackSeen,user,deliveredMoment])
 const changeZone=(zone:Zone)=>{setA04Phase('IDLE');setLinkMode(false);setLinkStart(null);setTalk(null);lastIntent.current=null;setShell(s=>enterZone(s,zone));setPanel('WORLD');setNote('Chuyển cảnh theo chủ đề; không phải đường nối khảo cổ đã khảo sát.');if(owner.current&&SERVER_CHECKPOINT_ZONES.has(zone))void submit({actionType:'SAVE_CHECKPOINT',targetId:zone,payload:{rice:rice.processed,last:rice.last}})}
 const beginTransfer=async(route:WorldRoute)=>{if(transferRef.current||route.from!==shell.zone)return;if(route.id==='EPILOGUE_RETURN'&&!facts.includes('MS_SYNTHESIS_COMPLETE')){setBark('Phần tổng hợp đang chờ hoàn tất hoặc xác nhận.');setRoutePrompt(null);return;}if(route.id==='FOREST_ENTRANCE'&&!q1Live.current.includes('Q1_HATCH')){setNote('Hãy tìm và kiểm tra nắp hầm trước.');setRoutePrompt(null);setShell(s=>startApproach(s,'Q1_HATCH'));return;}const next:Transfer={route,origin:shell,id:++routeEpoch.current,owner:owner.current,phase:route.passage?'DEPARTING':'LOADING'};setTransferBoth(next);setRoutePrompt(null);setTalk(null);setMoment(false);setPrologue(false);setA04Phase('IDLE');const started=performance.now();try{const motion=route.passage?new Promise<void>(done=>{passageWait.current=done}):Promise.resolve();await Promise.all([prepareWorldZone(route.to),route.passage?prepareR2Zone(route.to):Promise.resolve(),motion])
  // P4→P5: hold the in-scene departure (Avatar boards, Kha operates, vessel powers up) briefly; skippable.
  if(proof&&route.from==='S0'&&route.type==='TEMPORAL_PORTAL'){const wait=Math.max(0,1800-(performance.now()-started));if(wait)await new Promise<void>(done=>{skipDeparture.current=done;setTimeout(done,wait)});skipDeparture.current=null}
  if((transferRef.current as Transfer|null)?.id!==next.id||owner.current!==next.owner)return;arrivedVia.current=route.id;if(route.passage)setTransferBoth({...next,phase:'LOADING'});setShell({...enterZone(shell,route.to),position:route.spawn,heading:route.heading});setPanel('WORLD')}catch{if((transferRef.current as Transfer|null)?.id===next.id&&owner.current===next.owner)setTransferBoth({...next,phase:'FAILED'})}}
 const commitTransfer=(current:Transfer)=>{if(transferRef.current?.id!==current.id||owner.current!==current.owner)return;setTransferBoth(null);setLinkMode(false);setLinkStart(null);lastIntent.current=null;setNote(typeLabels[current.route.type]);if(current.route.id==='EPILOGUE_RETURN'){setEpilogueReturned(true);setBark('Hành trình 1967 đã khép lại tại Củ Chi hôm nay. Bạn có thể tự nguyện tưởng niệm hoặc tiếp tục tham quan.')}if(current.route.id==='ENTRANCE_SURFACE'){setHatch('CLOSING');hatchTimer.current=setTimeout(()=>setHatch('COVERED'),1400)}if(owner.current&&SERVER_CHECKPOINT_ZONES.has(current.route.to))void submit({actionType:'SAVE_CHECKPOINT',targetId:current.route.to,payload:{rice:rice.processed,last:rice.last,...checkpointEpiloguePayload(current.route.to,epilogueReturned||current.route.id==='EPILOGUE_RETURN')}});requestAnimationFrame(()=>document.querySelector<HTMLCanvasElement>('.lw-canvas canvas')?.focus({preventScroll:true}))}
 const passageComplete=()=>{const current=transferRef.current;if(!current)return;if(current.phase==='DEPARTING'){passageWait.current?.();passageWait.current=null}else if(current.phase==='ARRIVING')commitTransfer(current)}
 const sceneReady=(zone:Zone)=>{const current=transferRef.current;if(!current||current.phase!=='LOADING'||zone!==current.route.to||owner.current!==current.owner)return;if(current.route.passage&&!fallback)setTransferBoth({...current,phase:'ARRIVING'});else commitTransfer(current)}
 const approachRoute=(route:WorldRoute)=>{if(transferRef.current)return;if(route.type==='KNOWLEDGE_LINK'){setXray(true);setNote('Liên kết kiến thức trong mô hình · không phải lối đi.');return}if(route.id==='FOREST_ENTRANCE'&&!q1Live.current.includes('Q1_HATCH')){setTalk(null);setShell(s=>startApproach(s,'Q1_HATCH'));return;}setPanel('WORLD');setTalk(null);setRoutePrompt(null);lastIntent.current=null;if(route.passage)pendingDoor.current=route;setShell(s=>startApproach(s,route.target))}
 const goToZone=(zone:Zone)=>{if(!proof){changeZone(zone);return}const route=nextRouteStep(shell.zone,zone);if(route){if(route.to!==zone)setNote(`Đi qua ${zones[route.to].title} để tới ${zones[zone].title}.`);approachRoute(route)}else setNote('Hãy tiếp tục qua các điểm chuyển trong khu hiện tại; không có đường trực tiếp được khai báo.')}
 useEffect(()=>{if(!proof||bootLoading||presentationOwner!==(user?.id??'guest')||transfer||shell.path.length)return;saveNavigation(user?.id??'guest',{version:1,zone:shell.zone,position:shell.position,heading:shell.heading,rice:rice.processed,last:rice.last,q1,...(!user?{facts,callbackSeen,activities:livingDone,memorial,kitchenEcho:echoSeen,...(epilogueReturned?{epilogue:'RETURNED'}:{})}:{}),mode,synthesisDraft,modelCompared,smokeDraft})},[proof,bootLoading,presentationOwner,transfer,shell,mode,rice,facts,callbackSeen,q1,livingDone,user?.id,synthesisDraft,modelCompared,smokeDraft,memorial,echoSeen,epilogueReturned])
 const chooseMode=(value:Mode)=>{setMode(value);if(owner.current)void submit({actionType:'SELECT_MODE',targetId:value,payload:{}});const destination=modeDestination(value);if(destination==='SOURCES')setPanel('SOURCES');else if(proof)setPanel('WORLD');else changeZone(destination as Zone)}
 const addFact=(code:string)=>setFacts(s=>s.includes(code)?s:[...s,code])
 const prove=(quest:string,action:string,target:string,payload:Record<string,unknown>,code:string)=>{
  if(!owner.current){addFact(code);return}
  setNote('Đã gửi tương tác để kiểm tra. Chỉ tiến độ được máy chủ chấp nhận mới xuất hiện trong Atlas.')
  void submit({actionType:'STRUCTURED_INTERACTION',targetId:target,payload:{...payload,quest,action}})
 }
 const inspect=(target=talk)=>{
  if(!target)return
  // L2-D interpretive corner: opens the four-layer cutaway; local only, never a fact or XP.
  if(target==='L2D_NICHE'){setTalk('L2D_NICHE');setNote('');return}
  // Q1 vertical slice: observations stay on this device (no server quest rules for Q1 yet) — never XP or verified facts.
  if(target.startsWith('S1_DECOY_')){setTalk(null);setNote('Bạn đã xem kỹ: đây là dấu tự nhiên, không phải lớp ngụy trang.');return}
  // Q1: local observation always (never XP/foundation on the client); accounts also queue canonical evidence (offline-safe).
  if(target.startsWith('Q1_')){if(!q1Live.current.includes(target))q1Live.current=[...q1Live.current,target];setQ1(q=>q.includes(target)?q:[...q,target]);setNote(owner.current?'Đã ghi lại điều bạn thấy. Kết quả sẽ được lưu khi có kết nối.':'Đã ghi lại điều bạn thấy (chơi thử: chỉ lưu trên máy này).');if(owner.current)void submit({actionType:'STRUCTURED_INTERACTION',targetId:target,payload:{quest:'Q1',action:'INSPECT_TARGET'}})
   // Either order works (R2 A3): if the hatch was already opened before this clue was noticed, the entrance is confirmed now.
   if(owner.current&&(target==='Q1_TRAIL'||target==='Q1_LEAVES')&&q1Live.current.includes('Q1_OPENED')&&!facts.includes('ENTRANCE_CONFIRMED'))void submit({actionType:'STRUCTURED_INTERACTION',targetId:'Q1_HATCH',payload:{quest:'Q1',action:'CONFIRM_ENTRANCE',relation:'CONCEALED_ENTRANCE'}})
   setTalk(null);return}
  const air:Record<string,string>={AIR_SURFACE_OPENING:'AIR_OPENING_INSPECTED',AIR_PASSAGE:'AIR_PASSAGE_INSPECTED',AIR_INTERIOR:'AIR_INTERIOR_INSPECTED'}
  if(air[target]||target.startsWith('STRUCT_'))prove(air[target]?'Q2':'Q3','INSPECT_TARGET',target,{},air[target]??target)
  setTalk(null)
 }
 const stroke=(side:'LEFT'|'RIGHT')=>{
  const next=strokeRice(rice,side);if(next===rice){setNote('Hãy phối hợp luân phiên hai phía; nhịp lặp lại không làm thay đổi mẻ gạo.');return}
  setRice(next);setWorking(true);setNote(next.finished?'Mẻ gạo đã chuyển trạng thái; người cùng làm kết thúc nhịp phối hợp.':`Đúng nhịp ${next.processed}/6. Người cùng làm đáp lại; hãy luân phiên hai phía.`)
  if(owner.current)void submit({actionType:'SAVE_CHECKPOINT',targetId:'S2',payload:{rice:next.processed,last:next.last}})
  if(workTimer.current)clearTimeout(workTimer.current)
  workTimer.current=setTimeout(()=>setWorking(false),500)
 }
 useEffect(()=>{
  if(!travel)return
  const timer=setTimeout(()=>{setTravel(false);setWorking(false);changeZone('S2')},1200)
  return()=>clearTimeout(timer)
 // The short optional machine gesture never creates a fact or reward.
 },[travel])
 const actA04=(action:string)=>{if(['READY','GRIP','LIFT','RELEASE'].includes(action)&&arrivedInteraction(shell)!=='A04'){setNote('Hãy trở lại vị trí cạnh cối trước khi cầm dụng cụ.');lastIntent.current=null;setShell(s=>startApproach(s,'A04'));return}if(action==='REPLAY'){setRice(initialRice());setA04Phase('DEMO');if(owner.current)void submit({actionType:'SAVE_CHECKPOINT',targetId:'S2',payload:{rice:0,last:null}});return}const next=stepA04(a04Phase,action);setA04Phase(next.phase);if(next.stroke&&!rice.finished)stroke(rice.last==='LEFT'?'RIGHT':'LEFT');if(action==='COMPARE')setNote('Hai mẹt nguyên liệu thể hiện trước và sau; không thay số nhịp đã làm.')}
 const releaseSide=(side:'LEFT'|'RIGHT')=>{if(a04Phase!=='RAISED')return;stroke(side);setA04Phase('READY')}
 const tryAirPath=(candidate:string[])=>{if(!['AIR_OPENING_INSPECTED','AIR_PASSAGE_INSPECTED','AIR_INTERIOR_INSPECTED'].every(f=>facts.includes(f)))setNote('Hãy tới gần và quan sát cả ba điểm trước khi nối.');else if(candidate.join('_')!=='OPENING_PASSAGE_INTERIOR')setNote('Đường nối chưa đi từ lỗ mở qua đoạn dẫn tới không gian trong. Bạn có thể sửa lại.');else{prove('Q2','SELECT_AIR_PATH','',{path:'AIR_PATH_'+candidate.join('_')},'AIR_PATH_CORRECT');if(!owner.current)setNote('Đường nối đã có nghĩa. Chạm bảng Liên hệ đời sống để lưu phát hiện.')}}
 const confirmAirMeaning=()=>{if(!facts.includes('AIR_PATH_CORRECT')){setNote('Hãy nối lỗ mở, đoạn dẫn và không gian trong trước khi liên hệ đời sống.');return}prove('Q2','CONFIRM_AIR_MEANING','',{relation:'AIR_SUPPORTS_LIVING_CONDITIONS'},'AIR_MEANING_CONFIRMED');if(!owner.current)setNote('Không khí là một điều kiện của không gian có người sử dụng. Cấu trúc nhiều tầng sẽ giúp bạn hiểu thêm mối liên hệ ấy.')}
 const tryStructure=(candidate:string[][])=>{if(!['STRUCT_LAYER_1','STRUCT_LAYER_2','STRUCT_LAYER_3','STRUCT_LINK_12','STRUCT_LINK_23'].every(f=>facts.includes(f)))setNote('Hãy xem cả ba lớp và hai điểm chuyển trước khi kết nối.');else if(JSON.stringify(candidate)!==JSON.stringify([['STRUCT_LAYER_1','STRUCT_LAYER_2'],['STRUCT_LAYER_2','STRUCT_LAYER_3']]))setNote('Hãy xem lại các điểm chuyển: đường nối cần thể hiện từng lớp kề nhau.');else{prove('Q3','CONFIRM_STRUCTURE_MEANING','',{relation:'LAYER_SYSTEM_CONNECTED',pairs:candidate},'STRUCT_MEANING_CONFIRMED');if(!owner.current)setNote('Những đoạn hầm đã hiện ra như một hệ thống có tổ chức. Nếu đã khám phá thông khí, hãy quay lại nhìn nó trong toàn cảnh.')}}
 // P2: the machine only starts after the era + reference site are chosen and confirmed (no auto-departure).
 const activateMachine=()=>{if(p2.stage!=='CONFIRM'||p2.era!=='1967-01'||!p2.site){setTalk('MACHINE');return}playVesselDeparture();if(proof)void beginTransfer(timeRoute(mode));else{setPrologue(false);setTalk(null);setWorking(true);setTravel(true)}}
 const hatchAction=()=>{
  if(['SWEEPING','OPENING','DESCENDING','CLOSING'].includes(hatch)||transferRef.current)return
  setTalk(null);setRoutePrompt(null)
  const wait=(ms:number,then:()=>void)=>{if(hatchTimer.current)clearTimeout(hatchTimer.current);hatchTimer.current=setTimeout(then,reducedMotion()?80:ms)}
  const descend=()=>{setHatch('DESCENDING');void beginTransfer(routesFrom('S1').find(r=>r.id==='FOREST_ENTRANCE')!)}
  const open=()=>{if(!owner.current&&q1Live.current.includes('Q1_HATCH')&&(q1Live.current.includes('Q1_TRAIL')||q1Live.current.includes('Q1_LEAVES')))addFact('ENTRANCE_CONFIRMED');setHatch('OPENING');if(!q1Live.current.includes('Q1_OPENED'))q1Live.current=[...q1Live.current,'Q1_OPENED'];setQ1(q=>q.includes('Q1_OPENED')?q:[...q,'Q1_OPENED']);if(owner.current&&(q1Live.current.includes('Q1_TRAIL')||q1Live.current.includes('Q1_LEAVES'))&&!facts.includes('ENTRANCE_CONFIRMED'))void submit({actionType:'STRUCTURED_INTERACTION',targetId:'Q1_HATCH',payload:{quest:'Q1',action:'CONFIRM_ENTRANCE',relation:'CONCEALED_ENTRANCE'}});wait(1300,()=>{setHatch('OPEN');wait(250,descend)})}
  if(hatch==='HIDDEN'||hatch==='COVERED'){setHatch('SWEEPING');audio.current?.strike();wait(1500,()=>{setHatch('REVEALED');inspect('Q1_HATCH');wait(250,open)});return}
  if(hatch==='REVEALED'){open();return}if(hatch==='OPEN')descend()
 }
 const doLivingAction=(id:string)=>{const next=performLivingAction(livingDone,id);if(next!==livingDone){setLivingDone(next);audio.current?.strike();setNote('');if(!SERVER_ACTIVITY_TARGETS.has(id))updateM2State(prev=>({...prev,activities:Array.from(new Set([...prev.activities,id]))}));if(owner.current&&activityStorageReady&&SERVER_ACTIVITY_TARGETS.has(id))void submit({actionType:'COMPLETE_ACTIVITY',targetId:id,payload:{}})}}
 const recordNpcTopic=(topicId:string)=>{updateM2State(prev=>({...prev,npcTopicsSeen:Array.from(new Set([...prev.npcTopicsSeen,topicId]))}))}
 const recordZoneEcho=(echoId:string)=>{audio.current?.strike();updateM2State(prev=>({...prev,echoesHeard:Array.from(new Set([...prev.echoesHeard,echoId]))}))}
 const recordCedarSection=(sectionId:string)=>{updateM2State(prev=>({...prev,cedarFallsSections:Array.from(new Set([...prev.cedarFallsSections,sectionId]))}))}
 const completeCedarFalls=()=>{audio.current?.strike();setLivingDone(prev=>prev.includes('A23_CAMPAIGN')?prev:[...prev,'A23_CAMPAIGN']);updateM2State(prev=>({...prev,...(!owner.current?{activities:Array.from(new Set([...prev.activities,'A23_CAMPAIGN']))}:{}),cedarFallsSections:['TIMELINE_1967','GEOGRAPHY_DISTINCTION','CIVILIAN_IMPACT','TIME_LAYER_GATE']}));if(owner.current&&activityStorageReady)void submit({actionType:'COMPLETE_ACTIVITY',targetId:'A23_CAMPAIGN',payload:{}})}
 const saveFutureLetter=(entry:{promptId:string;recipient:string;message:string})=>{audio.current?.strike();savePersonalCreation(prev=>({...prev,futureLetter:{...entry,savedAt:new Date().toISOString()}}))}
 const changeMemorial=(next:MemorialCheckpoint)=>{
  if(shell.zone!=='S5'||(owner.current&&!memorialStorageReady))return
  setMemorial(next)
  if(owner.current)void submit({actionType:'SAVE_CHECKPOINT',targetId:'S5',payload:{memorial:next}})
 }
 const leaveMemorial=()=>{
  changeMemorial({choice:memorial?.choice??'SKIP',phase:'LEFT'})
  setMemorialOpen(false);setTalk(null)
 }
 const hearKitchenEcho=()=>{audio.current?.echo?.();setEchoSeen(true);if(owner.current&&echoReady)void submit({actionType:'SAVE_CHECKPOINT',targetId:'L1-C',payload:{kitchenEcho:true}})}
 const onScenePick=(id:string)=>{
  if(transferRef.current||modelView)return
  if(id==='ROUTE_EPILOGUE_RETURN'&&!facts.includes('MS_SYNTHESIS_COMPLETE')){setBark('Hãy hoàn tất phần tổng hợp trước khi khép hành trình. Bạn vẫn có thể trở về trạm bất cứ lúc nào.');return}
  if(id==='NPC_COOK'){if(arrivedInteraction(shell)!==id){setTalk(null);setShell(s=>startApproach(s,id));return}setTalk(id);return}
  if(Object.hasOwn(ZONE_NPC_PROFILES,id)){
   if(arrivedInteraction(shell)!==id){setTalk(null);setShell(s=>startApproach(s,id));return}
   const firstTopic=ZONE_NPC_PROFILES[id]?.topics[0]?.id
   if(firstTopic)recordNpcTopic(firstTopic)
   setTalk(id);return
  }
  if(id==='A23_CAMPAIGN'){
   if(arrivedInteraction(shell)!==id){setTalk(null);setShell(s=>startApproach(s,id));return}
   recordCedarSection('TIMELINE_1967')
   setTalk(id);return
  }
  if(shell.zone==='L1-C'&&id.startsWith('Q4_')){
   if(shell.path.length||Math.hypot(shell.position[0],shell.position[1]+1.5)>.2){setTalk(null);setShell(s=>startApproach(s,id));return}
   setTalk(null)
   if(user&&!availableQuests.includes('Q4')){setBark('Phần khám phá bếp chưa được phát hành trên môi trường hiện tại.');return}
   const available=[...facts,...pendingCore],node=id.slice(3)
   if(node==='COMMUNITY'){
    if(!available.includes('KITCHEN_SMOKE_PATH_CORRECT')){setBark('Hãy lần theo nguồn nhiệt, rãnh dẫn và khoang phân tán trước khi liên hệ với bữa ăn.');return}
    if(!available.includes('KITCHEN_MEANING_CONFIRMED'))prove('Q4','CONFIRM_KITCHEN_MEANING','',{relation:'KITCHEN_SUPPORTS_COMMUNITY'},'KITCHEN_MEANING_CONFIRMED')
    audio.current?.strike();setBark('Người nấu bếp: Những công việc quanh bếp cùng hướng tới bữa ăn cho mọi người. Lời kể diễn giải của nhân vật hư cấu.');return
   }
   if(!['KITCHEN_HEARTH_INSPECTED','KITCHEN_SMOKE_INSPECTED'].every(f=>available.includes(f))){setBark('Hãy quan sát và ghi nhận cả công việc ở bàn bếp lẫn mô hình dẫn khói trước.');return}
   const next=selectSmokeNode(smokeDraft,node);setSmokeDraft(next.path)
   if(next.result==='WRONG'){setBark('Đường nối chưa đi từ nguồn nhiệt qua rãnh dẫn. Hãy thử lần lại trên các vật thể.');return}
   if(next.result==='INVALID')return
   audio.current?.strike();setBark(next.path.map(n=>kitchenNodes.find(k=>k.id===n)?.label).join(' → '))
   if(next.result==='COMPLETE'){
    if(!available.includes('KITCHEN_SMOKE_PATH_CORRECT'))prove('Q4','SELECT_SMOKE_PATH','',{path:'SMOKE_HEARTH_CHANNEL_DIFFUSION'},'KITCHEN_SMOKE_PATH_CORRECT')
    setBark('Đã nối đường khói. Chọn bát ở bàn chuẩn bị để liên hệ công việc của bếp với bữa ăn cộng đồng.')
   }
   return
  }
  if(shell.zone==='S5'&&id.startsWith('MEMORIAL_')){
   if(arrivedInteraction(shell)!==id){setTalk(null);setShell(s=>startApproach(s,id));return}
   if(memorial?.phase==='SELECTED'&&((id==='MEMORIAL_FLOWERS'&&memorial.choice==='FLOWERS')||(id==='MEMORIAL_INCENSE'&&memorial.choice==='INCENSE'))){
    changeMemorial({...memorial,phase:'OFFERED'});audio.current?.strike();setBark('Một khoảng lặng để nhớ về những con người đã sống và gìn giữ nơi này.');setTalk(null);setMemorialOpen(true);return
   }
   setTalk(null);setBark(zones.S5.targets.find(target=>target.id===id)?.description??'');setMemorialOpen(id!=='MEMORIAL_READ');return
  }
  if(shell.zone==='L2-D'&&id==='MODEL_COMPARE'){
   if(xray){setBark('Hãy tắt lát cắt X-ray để quan sát sa bàn trong phòng.');return}
   if(shell.path.length||Math.hypot(shell.position[0],shell.position[1]-.5)>.2){setShell(s=>startApproach(s,id));return}
   setBark(null);setTalk(null);setMenu(false);setPanel('WORLD');setAssist(false);setXray(false);setModelView({...initialModelView(),diagram:fallback});return
  }
  if(shell.zone==='L3-D'&&id.startsWith('SYN_')){
   if(shell.path.length||Math.hypot(shell.position[0],shell.position[1]-.5)>.2){setShell(s=>startApproach(s,id));return}
   setTalk(null)
   if(user&&!availableQuests.includes('Q6')){setNote('Q6 chưa được phát hành trên môi trường hiện tại.');return}
   if(!canSynthesize(facts)){setBark('Còn phát hiện chưa được máy chủ xác nhận. Bạn có thể quan sát mô hình rồi tiếp tục khám phá.');return}
   if(facts.includes('MS_SYNTHESIS_COMPLETE')){setSynthesisPayoff(true);return}
   if(pendingCore.includes('MS_SYNTHESIS_COMPLETE')){setBark('Tổng hợp đang chờ máy chủ xác nhận. Bạn vẫn có thể tiếp tục khám phá.');return}
   const node=id.slice(4)
   if(synthesisStart===node){setSynthesisStart(null);setNote('Đã bỏ chọn. Chọn một điểm khác trên mô hình.');return}
   if(!synthesisStart){setSynthesisStart(node);setNote('Đã chọn '+(synthesisNodes.find(n=>n[0]===node)?.[1]??node)+'. Chọn điểm có quan hệ trên mô hình; chọn lại để bỏ chọn.');return}
   const relation=connectSynthesis(synthesisStart,node);setSynthesisStart(null)
   if(!relation){setBark('Hai điểm này chưa diễn tả quan hệ. Hãy xem lại những điều đã khám phá.');return}
   const next=Array.from(new Set([...synthesisDraft,relation]));setSynthesisDraft(next);audio.current?.strike();setBark(synthesisPayoffs[relation]+' '+next.length+'/3 mối liên hệ.')
   if(next.length===3){prove('Q6','CONFIRM_SYNTHESIS','',{relations:next},'MS_SYNTHESIS_COMPLETE');setSynthesisPayoff(true)}
   return
  }
  if(proof){const route=routesFrom(shell.zone).find(r=>r.target===id&&id!=='MACHINE');if(route){if(route.type==='KNOWLEDGE_LINK'){setXray(true);return}if(route.passage&&(arrivedInteraction(shell)===id||Math.hypot(shell.position[0]-route.approach[0],shell.position[1]-route.approach[1])<.35)){pendingDoor.current=null;void beginTransfer(route)}else if(route.passage)approachRoute(route);else if(arrivedInteraction(shell)===id){setTalk(null);setRoutePrompt(route)}else approachRoute(route);return}}
  if(proof&&shell.zone==='S1'&&id==='Q1_HATCH'){if(arrivedInteraction(shell)==='Q1_HATCH')hatchAction();else{pendingHatch.current=true;setTalk(null);setShell(s=>startApproach(s,'Q1_HATCH'))}return}
  if(proof&&shell.zone==='S1'&&isGroundClue(id)&&id!=='Q1_HATCH'&&arrivedInteraction(shell)===id&&talk!==id){setTalk(id);setObserve(false);return}
  if(id==='NPC_A04')id='A04'
  if(id==='RICE_BEFORE'||id==='RICE_AFTER'){setTalk('A04');setObserve(false);actA04('COMPARE');return}
  if(id.startsWith('STROKE_')){if(arrivedInteraction(shell)!=='A04'){setShell(s=>startApproach(s,'A04'));return}setObserve(false);if(id==='STROKE_RIGHT'){setNote('Người cùng làm giữ nhịp; chọn chày của bạn để nắm, nâng và hạ.');return}actA04(a04Phase==='READY'?'GRIP':a04Phase==='HELD'?'LIFT':a04Phase==='RAISED'?'RELEASE':'DEMO');return}
  if(livingTarget(id)&&arrivedInteraction(shell)===id){setTalk(id);doLivingAction(id);return}
  if(id==='LINK_AIR_LIFE'){confirmAirMeaning();return}
  if(linkMode&&shell.zone==='L1-B'&&id.startsWith('AIR_')){const keys:Record<string,string>={AIR_SURFACE_OPENING:'OPENING',AIR_PASSAGE:'PASSAGE',AIR_INTERIOR:'INTERIOR'};const candidate=[...path,keys[id]].slice(-3);setPath(candidate);if(candidate.length===3)tryAirPath(candidate);return}
  if(linkMode&&id.startsWith('STRUCT_LAYER_')){if(!linkStart){setLinkStart(id);setNote('Đã chọn đầu nối. Chạm lớp thứ hai trong mô hình.');return}const candidate=[...pairs,[linkStart,id]].slice(-2);setPairs(candidate);setLinkStart(null);if(candidate.length===2)tryStructure(candidate);return}
  if(arrivedInteraction(shell)===id){if(talk!==id){setTalk(id);setObserve(false)}else if(id==='MACHINE'){activateMachine()}else if(id==='Q1_HATCH'&&q1.includes('Q1_HATCH')){const r=routesFrom('S1').find(r=>r.id==='FOREST_ENTRANCE')!;setTalk(null);setRoutePrompt(r)}else if(id!=='KHA'&&id!=='A04')inspect(id);return}
  const destination=(Object.keys(zones) as Zone[]).find(z=>zones[z].targets.some(t=>t.id===id));if(!destination)return
  if(destination!==shell.zone){if(proof){goToZone(destination);return}changeZone(destination)}
  if(id==='KHA'||id==='MACHINE')setPrologue(false)
  setTalk(null);setShell(s=>startApproach(s,id))
 }
 useEffect(()=>{
  const id=arrivedInteraction(shell)
  if(id==='Q1_HATCH'&&pendingHatch.current){pendingHatch.current=false;requestAnimationFrame(()=>pickRef.current('Q1_HATCH'))}
  if(id&&pendingDoor.current?.target===id){const route=pendingDoor.current;pendingDoor.current=null;void beginTransfer(route)}
  else if(id&&id!==lastIntent.current&&!(proof&&isGroundClue(id))&&!id.startsWith('Q4_')&&!id.startsWith('SYN_')){const route=proof?routesFrom(shell.zone).find(r=>r.target===id&&id!=='MACHINE'):undefined;if(route){if(!route.passage){setTalk(null);setRoutePrompt(route)}}else{if(Object.hasOwn(ZONE_NPC_PROFILES,id)){const firstTopic=ZONE_NPC_PROFILES[id]?.topics[0]?.id;if(firstTopic)recordNpcTopic(firstTopic)}if(id==='A23_CAMPAIGN')recordCedarSection('TIMELINE_1967');setTalk(id);setObserve(false)}}
  lastIntent.current=id
 },[shell])
 const resolveMoment=(resolution:'WATCHED'|'SKIPPED')=>{setCallbackSeen(true);setMoment(false);if(owner.current)void submit({actionType:'MOMENT_RESOLVED',targetId:'AIR_STRUCTURE',payload:{resolution}})}
 const momentVisible=!transfer&&!routePrompt&&!bootLoading&&!cameraBusy&&canPresentMoment(moment,panel,talk,visibility)
 useEffect(()=>{
  if(!momentVisible)return
  const element=document.querySelector<HTMLElement>('.lw-moment[aria-label="Một góc nhìn mới"]')
  if(!element)return
  element.closest('.lw-compass')?.scrollTo({top:0})
  if(!user?.id)return
  const id=user.id;let acknowledged=false
  const observer=new IntersectionObserver(entries=>{
   const entry=entries[0]
   if(!acknowledged&&entry.isIntersecting&&entry.intersectionRect.height>=Math.min(48,entry.boundingClientRect.height*.15)&&document.visibilityState==='visible'&&owner.current===id){acknowledged=true;void submit({actionType:'MOMENT_PRESENTED',targetId:'AIR_STRUCTURE',payload:{}})}
  },{threshold:[0,.15,.5,1]})
  observer.observe(element)
  return()=>observer.disconnect()
 },[momentVisible,user?.id])
 const continueJourney=()=>{
  if(shell.zone==='S5'){setTalk(null);if(!memorial||memorial.phase==='LEFT')setMemorialOpen(true);else goToZone('S0');return}
  if(shell.zone==='L2-D'||shell.zone==='L3-D'){setTalk(null);setShell(s=>startApproach(s,shell.zone==='L2-D'?'MODEL_COMPARE':'SYN_ENTRANCE'));return}
  if(shell.zone==='S3'||shell.zone==='S4'){
   const nextTarget=zones[shell.zone].targets.find(t=>!t.id.startsWith('ROUTE_')&&!t.id.startsWith('NPC_')&&!livingDone.includes(t.id))
   if(nextTarget){lastIntent.current=null;setShell(s=>startApproach(s,nextTarget.id));return}
   goToZone(shell.zone==='S3'?'S4':'S2');return
  }
  if(isLivingZone(shell.zone)){
   const available=[...facts,...pendingCore]
   const target=livingSpaces[shell.zone].targets.find(t=>!livingDone.includes(t.id)||(coreObservations[t.id]&&!available.includes(coreObservations[t.id].fact)))
   if(target){lastIntent.current=null;setShell(s=>startApproach(s,target.id));return}
   if(shell.zone==='L3-B'||shell.zone==='L3-C'){
    const care=describeCareProgress(facts,pendingCore)
    if(care.canConfirm&&!available.includes('CARE_MEANING_CONFIRMED')){lastIntent.current=null;setShell(s=>startApproach(s,shell.zone==='L3-B'?'A15_CARE':'A14_SHARE'));return}
    if(care.nextZone){goToZone(care.nextZone);return}
   }
   if(shell.zone==='L1-C'&&available.includes('KITCHEN_HEARTH_INSPECTED')&&available.includes('KITCHEN_SMOKE_INSPECTED')&&!available.includes('KITCHEN_MEANING_CONFIRMED')){lastIntent.current=null;setShell(s=>startApproach(s,'Q4_HEARTH'));return}
   goToZone(shell.zone==='L1-C'?'L2-C':shell.zone==='L2-C'?'L2-B':shell.zone==='L2-B'?'L3-B':shell.zone==='L3-B'?'L3-C':'L1-C')
   return
  }
  if(proof&&shell.zone==='S0'){approachRoute(timeRoute(mode));return}
  if(proof&&shell.zone==='S1'){const next=zones.S1.targets.find(t=>t.id.startsWith('Q1_')&&!q1.includes(t.id));if(next){lastIntent.current=null;setShell(s=>startApproach(s,next.id))}else goToZone('S2');return}
  if(proof&&shell.zone==='S2'&&rice.finished){goToZone('L1-B');return}
  const destination=nextStop(mode,shell.zone,facts)
  if(destination==='SOURCES'){setPanel('SOURCES');return}
  if(destination!==shell.zone){goToZone(destination);return}
  const air:Record<string,string>={AIR_SURFACE_OPENING:'AIR_OPENING_INSPECTED',AIR_PASSAGE:'AIR_PASSAGE_INSPECTED',AIR_INTERIOR:'AIR_INTERIOR_INSPECTED'}
  const target=zones[shell.zone].targets.find(t=>isQuestTarget(t.id)&&!facts.includes(air[t.id]??t.id))
  if(target){lastIntent.current=null;setShell(s=>startApproach(s,target.id))}
  else {setAssist(true);setNote('Dùng các điểm nối trong mô hình hoặc điều khiển tương đương bên cạnh.')}
 }
 useEffect(()=>{if(!talk)return;const frame=requestAnimationFrame(()=>{const dialog=document.querySelector<HTMLElement>('.lw-dialog');dialog?.closest('.lw-compass')?.scrollTo({top:0});dialog?.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true})});return()=>cancelAnimationFrame(frame)},[talk])
 useEffect(()=>{if(fallback&&transfer?.phase==='LOADING'&&shell.zone===transfer.route.to)sceneReady(shell.zone)},[fallback,shell.zone,transfer?.id])
 useEffect(()=>{const frame=requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(transfer?'.lw-transfer button':routePrompt?'.lw-route-dialog button':'.lw-never-focus')?.focus({preventScroll:true}));return()=>cancelAnimationFrame(frame)},[transfer?.id,transfer?.phase,routePrompt?.id])
 const title=zones[transfer?transfer.origin.zone:shell.zone].title
 // Undiscovered ground clues get a neutral label (no spoiler); the hatch shows the next physical action.
 const clueLabel=(id:string,label:string)=>{if(!proof||shell.zone!=='S1'||!isGroundClue(id))return label;if(id==='Q1_HATCH')return HATCH_ACTION[hatch];return q1.includes(id)?label:'Quan sát kỹ mặt đất'}
 // 2D equivalent list: distinct, non-spoiling names (ordered left → right, not by role)
 const groundOrder=zones.S1.targets.filter(t=>isGroundClue(t.id)).sort((a,b)=>a.at[0]-b.at[0]).map(t=>t.id)
 const altLabel=(id:string,label:string)=>proof&&shell.zone==='S1'&&isGroundClue(id)&&!(id!=='Q1_HATCH'&&q1.includes(id))?`Điểm quan sát mặt đất ${groundOrder.indexOf(id)+1}`+(id==='Q1_HATCH'&&hatch!=='HIDDEN'?' · '+HATCH_ACTION[hatch]:''):label
 const nearby=(()=>{if(!proof||routePrompt||transfer||shell.path.length)return null;const list=[...zones[shell.zone].targets.filter(t=>!t.id.startsWith('ROUTE_')).map(t=>({id:t.id,label:clueLabel(t.id,t.label),at:t.at})),...routesFrom(shell.zone).filter(r=>r.type!=='KNOWLEDGE_LINK'&&r.target!=='MACHINE'&&!(proof&&r.id==='FOREST_ENTRANCE')).map(r=>({id:r.target,label:r.label,at:r.at}))];const here=arrivedInteraction(shell),mine=here?list.find(t=>t.id===here):undefined;if(mine)return {id:mine.id,label:mine.label} // the spot the player walked to wins over a closer neighbour
 let best:{id:string;label:string}|null=null,bd=2.2;for(const t of list){const d=Math.hypot(t.at[0]-shell.position[0],t.at[1]-shell.position[1]);if(d<bd){bd=d;best={id:t.id,label:t.label}}}return best})()
 useEffect(()=>{pickRef.current=onScenePick;nearRef.current=nearby})
 const kitchenCareConnected=facts.includes('KITCHEN_MEANING_CONFIRMED')&&facts.includes('CARE_MEANING_CONFIRMED')
 const structureCareConnected=facts.includes('STRUCT_MEANING_CONFIRMED')&&facts.includes('CARE_MEANING_CONFIRMED')
 const activityCtx:ActivityCompletionContext={
  facts,
  livingDone,
  riceProcessed:rice.processed,
  memorialChoice:memorial?.choice??null,
  memorialPhase:memorial?.phase??null,
  atmosphereSeen,
  echoSeen,
  modelCompared,
  m2:m2State,
 }
 const sourcesView=<section className="lw-card"><p className="lw-eyebrow">NHÌN LẠI NGUỒN TƯ LIỆU · BASELINE CHƯƠNG 18 &amp; 31</p><h2>Điều gì có căn cứ, điều gì được diễn giải?</h2><p>Không gian Mạch Sống Củ Chi 01/1967 được đối chiếu từ các hồ sơ di sản chính thức và phân tách minh bạch 5 cấp độ sự thật; không trình bày bố cục gameplay như bản vẽ khảo cổ GPS 1:1.</p><ul><li><b>[R01] UNESCO World Heritage Centre:</b> <a href="https://whc.unesco.org/en/tentativelists/7038/" target="_blank" rel="noreferrer">Cu Chi Tunnels · Tentative List #7038</a> (cấu trúc nhiều tầng, lỗ thông hơi, bếp Hoàng Cầm và đời sống ngầm).</li><li><b>[R02] Cục Di sản văn hóa (Bộ VHTTDL):</b> <a href={sourceUrl} target="_blank" rel="noreferrer">Di tích quốc gia đặc biệt Địa đạo Củ Chi</a> &amp; <a href="https://vietnamtourism.gov.vn/post/36365" target="_blank" rel="noreferrer">Tư liệu khu tái hiện &amp; Đền tưởng niệm Bến Dược (1993–1995)</a>.</li><li><b>[R03] Bối cảnh tháng 01/1967 (Cedar Falls):</b> B. W. Rogers, <i>Cedar Falls–Junction City: A Turning Point</i> (US Army CMH Pub 90-7-1) &amp; Mangold / Penycate, <i>The Tunnels of Cu Chi</i> (1985).</li><li><b>[R08, R09] Tiếp cận số:</b> <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noreferrer">W3C WCAG 2.2</a> (tương tác 1 chạm tương đương, giảm chuyển động, phụ đề âm thanh).</li></ul><dl><dt>RECONSTRUCTED</dt><dd>Cấu trúc ba tầng, thông khí, bếp Hoàng Cầm, giã gạo, tráng bánh, làm dép cao su, đèn dầu truyền thống bóng thủy tinh, trang phục bà ba – khăn rằn – nón tai bèo – áo choàng vải dù và điểm đăng ký tòng quân là phục dựng giáo dục (<code>REVIEW_CANDIDATE</code>, chờ chuyên gia lịch sử/trang phục ký duyệt).</dd><dt>FICTIONAL_EDUCATIONAL</dt><dd>Kha, Chrono, cỗ máy thời gian, các nhân vật đại diện, lời thoại, câu hò biên tập và đường chuyển cảnh theo chủ đề do TimeLens biên soạn.</dd><dt>MODERN_MEMORIAL</dt><dd>Không gian tưởng niệm tại S5 thuộc bối cảnh Củ Chi hiện đại (tham chiếu Đền Bến Dược khởi công 1993, khánh thành 1995), tách biệt với niên đại 1967.</dd><dt>GATED_SOURCE_PENDING / UNCONFIRMED</dt><dd>Độ sâu khảo sát cụ thể, vị trí từng căn phòng theo tọa độ thực địa, tính năng trượt chồng 2 lớp thời gian (A17) và tư liệu video/360 thực địa (A24) được giữ cổng khóa cho tới khi có hồ sơ bản quyền và khảo sát đồng vị trí.</dd></dl><button onClick={()=>{setPanel('WORLD');goToZone('L1-B')}}>Tiếp tục tại khu thông khí</button></section>
 const atlasView=<section className="lw-card"><h2>Những điều đang kết nối</h2>{facts.length===0?<p>Mỗi phát hiện nhỏ sẽ xuất hiện ở đây, trước cả khi bạn hoàn thành một nhiệm vụ.</p>:<ul>{facts.map(f=><li key={f}>{factLabels[f]??'Phát hiện đang chờ mô tả'}</li>)}</ul>}{connected&&<div className="lw-reveal"><h3>Thông khí ↔ cấu trúc không gian</h3><p>Những lỗ mở không còn là chi tiết rời rạc. Hãy trở lại đoạn thông khí: cấu trúc vừa khám phá sẽ giúp bạn đọc lại nó theo một góc nhìn khác.</p><button onClick={()=>{setPanel('WORLD');goToZone('L1-B')}}>Nhìn lại hơi thở của lòng đất</button></div>}{kitchenCareConnected&&<div className="lw-reveal"><h3>Bếp Hoàng Cầm ↔ Nước và chăm sóc</h3><p>{facts.includes('KITCHEN_CARE_REFLECTED')?'Bạn đã nhìn lại gian bếp sau khi hiểu nguồn nước và chăm sóc: bữa ăn, từng gàu nước và những bàn tay chăm lo gắn kết thành đời sống chung.':'Một bữa ăn không khói còn phụ thuộc vào nguồn nước chia sẻ và gắn với những người cần được chăm sóc. Hãy quay lại gian bếp (L1-C) để mở góc nhìn mới.'}</p>{!facts.includes('KITCHEN_CARE_REFLECTED')&&<button onClick={()=>{setPanel('WORLD');goToZone('L1-C')}}>Quay lại gian bếp (L1-C)</button>}</div>}{structureCareConnected&&<div className="lw-reveal"><h3>Cấu trúc nhiều tầng ↔ Giữ sự sống</h3><p>Bước ngoặt nhận thức: Hệ thống địa đạo nhiều lớp không chỉ là công trình kỹ thuật, mà được tổ chức để che chở và nuôi dưỡng nhu cầu sống của con người.</p></div>}{canSynthesize(facts)&&<div className="lw-reveal"><h3>Năm nền tảng đã hội tụ</h3><p>{facts.includes('MS_SYNTHESIS_COMPLETE')?'Bạn đã hoàn thành tổng hợp Mạch Sống tại L3-D. Bạn có thể thăm không gian tưởng niệm hiện đại (S5) hoặc tiếp tục khám phá tự do.':'Đủ 5 nền tảng đã được xác nhận. Hãy tới sa bàn tổng hợp tại L3-D để nối bức tranh cộng đồng.'}</p><button onClick={()=>{setPanel('WORLD');goToZone(facts.includes('MS_SYNTHESIS_COMPLETE')?'S5':'L3-D')}}>{facts.includes('MS_SYNTHESIS_COMPLETE')?'Thăm không gian tưởng niệm (S5)':'Tới sa bàn tổng hợp (L3-D)'}</button></div>}<ActivityChainsAtlasSection ctx={activityCtx} onGoToZone={z=>{setPanel('WORLD');goToZone(z as Zone)}}/><CreativeMemoryStudio key={`${user?.id??'guest'}:${creativeReset}`} currentZone={shell.zone} currentZoneTitle={zones[shell.zone].title} ctx={activityCtx} onToggleConsent={accepted=>updateM2State(prev=>({...prev,consentAccepted:accepted}))} onSavePostcard={card=>savePersonalCreation(prev=>({...prev,postcards:[...prev.postcards,{...card,id:`PC_${Date.now()}`,watermark:'TÁI DỰNG GIÁO DỤC / ẢNH SÁNG TẠO · TIMELENS',createdAt:new Date().toISOString()}]}))} onSaveExhibition={(themeTitle,curatorNote,itemIds,previewVerified)=>savePersonalCreation(prev=>({...prev,exhibition:{themeTitle,curatorNote,itemIds,previewVerified,updatedAt:new Date().toISOString()}}))} onSaveDirectorsCut={(title,momentIds,narrationStyle,verification)=>savePersonalCreation(prev=>({...prev,directorsCut:{title,momentIds,narrationStyle,...verification,updatedAt:new Date().toISOString()}}))} onSaveLetter={saveFutureLetter} onClearPersonalData={()=>{setM2State(clearM2PersonalCreations(owner.current??'guest'));setCreativeReset(value=>value+1)}}/><button onClick={()=>setPanel('WORLD')}>Tiếp tục hành trình</button></section>
 const stageTools=<div className="lw-stage-tools">{shell.zone!=='S0'&&<button aria-pressed={sound} onClick={()=>setSound(v=>!v)}>{shell.zone==='S2'?(sound?'Tắt âm thanh khu lao động':'Bật âm thanh khu lao động'):(sound?'Tắt âm thanh không gian':'Bật âm thanh không gian')}</button>}{shell.zone.startsWith('L')&&!xray&&!linkMode&&<button aria-pressed={firstPerson} title="Phím V" onClick={()=>setFirstPerson(v=>!v)}>{firstPerson?'Góc nhìn sau lưng':'Góc nhìn thứ nhất'}</button>}<button onClick={()=>setFallback(v=>!v)}>{fallback?'Thử lại 3D':'Dùng sơ đồ 2D'}</button><button onClick={()=>{setTalk(null);setA04Phase('IDLE');setShell(s=>enterZone(s,s.zone));setCameraReset(v=>v+1)}}>Về vị trí an toàn</button><span>{shell.path.length?'Đang tới gần…':'Chạm mặt đất để đi · WASD · kéo để nhìn'}</span></div>
 const context=shell.zone==='S5'?'HIỆN TẠI · không gian tưởng niệm diễn giải':shell.zone==='S0'?'HIỆN TẠI · trạm thời gian hư cấu':'CỦ CHI 01/1967 · TÁI DỰNG CÓ KIỂM SOÁT'+(['L1-A','L1-B','L1-D','L2-A','L3-A'].includes(shell.zone)?' · lát cắt diễn giải':'')
 if(bootLoading)return <main className="lw-root"><h1>Đang khôi phục hành trình…</h1><p>Đang đọc đúng tiến độ của tài khoản này.</p></main>
 const isolateModelView=(event:{target:EventTarget;preventDefault:()=>void;stopPropagation:()=>void})=>{if(modelView&&event.target instanceof Element&&!event.target.closest('.lw-model-viewer,.lw-canvas')){event.preventDefault();event.stopPropagation()}}
 return <main onPointerDownCapture={isolateModelView} onClickCapture={isolateModelView} className={`${proof?'lw-root lw-game':'lw-root'}${presentation==='product'?' lw-product':''}`} data-story-open={storyOpen?'on':'off'} data-model-viewer={modelView?'on':'off'} data-atmosphere={atmosphere.phase} data-walking={shell.path.length?'1':'0'} data-arrived={arrivedInteraction(shell)??''} data-hints={hints?'on':'off'} data-transfer={transfer?'on':'off'}>
    {transfer&&<div className={`lw-transfer-veil${transfer.route.passage?' lw-transfer-veil--passage lw-transfer-veil--'+transfer.phase.toLowerCase():''} lw-transfer-veil--${transfer.route.type.toLowerCase()}${proof&&transfer.route.from==='S0'?' lw-transfer-veil--depart':''}`} aria-hidden="true"/>}{transfer&&(!transfer.route.passage||transfer.phase==='FAILED')&&<section className="lw-transfer" role="dialog" aria-modal="true" aria-label="Chuyển cảnh có ngữ cảnh"><h2>{transfer.phase==='FAILED'?'Chưa mở được không gian':'Đang mở không gian tiếp theo…'}</h2><p>{transfer.route.label}</p><p>{typeLabels[transfer.route.type]}</p><p>Điểm trước: {zones[transfer.origin.zone].title}. Chưa xác nhận checkpoint đến khi cảnh hoặc sơ đồ2D sẵn sàng.</p><button onClick={cancelTransfer}>Hủy · giữ nơi đang đứng</button>{proof&&transfer.phase==='LOADING'&&transfer.route.from==='S0'&&shell.zone==='S0'&&<button onClick={()=>skipDeparture.current?.()}>Bỏ qua chuyển cảnh</button>}{transfer.phase==='FAILED'&&<><button onClick={()=>{cancelTransfer();window.location.reload()}}>Tải lại từ nơi trước</button><button onClick={()=>{setFallback(true);setShell({...enterZone(transfer.origin,transfer.route.to),position:transfer.route.spawn});setTransferBoth({...transfer,phase:'LOADING'});requestAnimationFrame(()=>sceneReady(transfer.route.to))}}>Tiếp tục bằng sơ đồ2D</button></>}</section>}
  {!proof&&<><header className="lw-header"><Link to="/explore">← TimeLens</Link><span>BẢN THỬ NỘI BỘ · PHỤC DỰNG CÓ KIỂM SOÁT</span><button disabled={!!transfer} onClick={()=>goToZone('S0')}>Về trạm</button></header>
  <div className="lw-heading"><div><p className="lw-eyebrow">MẠCH SỐNG / CỦ CHI</p><h1>{title}</h1></div><label>Cách khám phá<select disabled={!!transfer} aria-label="Cách khám phá" value={mode} onChange={e=>chooseMode(e.target.value as Mode)}><option value="FREE">Khám phá tự do</option><option value="STORY">Hành trình câu chuyện</option><option value="MEMORY">Di sản & ký ức</option></select></label></div>
  <p className="lw-scope">{user?'Bản thử tài khoản · tiến độ do máy chủ xác nhận.':'Chế độ khách: thử tương tác, không lưu thành tích hay nhận XP.'} Nội dung hiện có: thông khí, cấu trúc nhiều tầng và góc giã gạo.</p>
  {user&&<div role="status" className="lw-scope">{pending>0?`${pending} hành động chờ xác nhận. `:''}{syncError}<button onClick={()=>{void sync()}}>Đồng bộ</button>{syncError&&<button onClick={()=>{void retryWorld(user.id).then(sync)}}>Thử lại hành động bị từ chối</button>}</div>}
  <nav className="lw-tabs" aria-label="Không gian khám phá"><button disabled={!!transfer} aria-pressed={panel==='WORLD'} onClick={()=>setPanel('WORLD')}>Không gian</button><button disabled={!!transfer} aria-pressed={panel==='ATLAS'} onClick={()=>setPanel('ATLAS')}>Atlas ký ức · {facts.length}</button><button disabled={!!transfer} aria-pressed={panel==='SOURCES'} onClick={()=>setPanel('SOURCES')}>Tư liệu & giả định</button></nav></>}
  {proof&&<div className="lw-hud" role="banner"><div className="lw-hud-place"><p className="lw-eyebrow">{context}</p><h1>{title}</h1><span className="lw-small">{user?'Hành trình TimeLens · tiến độ tài khoản':'Chế độ khách: không lưu thành tích hay nhận XP.'}</span></div><div className="lw-hud-actions"><button disabled={!!transfer||!!modelView} className="lw-story-button" onClick={()=>setStoryOpen(true)}>Hành trình</button>{shell.zone.startsWith('L')&&shell.zone!=='L1-A'&&!isLivingZone(shell.zone)&&<button disabled={!!transfer||linkMode} aria-pressed={xray||linkMode} title="Chế độ quan sát lát cắt diễn giải; không phải bản vẽ khảo sát" onClick={()=>setXray(v=>!v)}>Lát cắt X-ray</button>}<button disabled={!!transfer} aria-pressed={panel==='ATLAS'} onClick={()=>setPanel(panel==='ATLAS'?'WORLD':'ATLAS')}>Atlas ký ức · {facts.length}</button><button disabled={!!transfer} aria-pressed={panel==='SOURCES'} onClick={()=>setPanel(panel==='SOURCES'?'WORLD':'SOURCES')}>Tư liệu & giả định</button>{panel!=='WORLD'&&<button onClick={()=>setPanel('WORLD')}>Không gian</button>}<button className="lw-menu-button" aria-expanded={menu} aria-controls="lw-menu" onClick={()=>setMenu(v=>!v)}>Menu</button></div></div>}
  {proof&&user&&(pending>0||syncError)&&<div role="status" className="lw-sync">{pending>0?`${pending} hành động chờ xác nhận. `:''}{syncError}<button onClick={()=>{void sync()}}>Đồng bộ</button>{syncError&&<button onClick={()=>{void retryWorld(user.id).then(sync)}}>Thử lại hành động bị từ chối</button>}</div>}
  {storyOpen&&<WorldStoryPanel facts={facts} zone={shell.zone} epilogueReturned={epilogueReturned} onClose={()=>setStoryOpen(false)}/>}
  {modelView&&<ModelViewerPanel view={modelView} exploded={modelCompared} onView={setModelView} onExploded={setModelCompared} onClose={closeModelView}/>}
  {proof&&<AtmospherePanel phase={atmosphere.phase} zone={shell.zone} onSkip={atmosphere.skip}/>}
  {proof&&menu&&<aside id="lw-menu" className="lw-menu" aria-label="Menu"><div className="lw-menu-head"><h2>Menu</h2><button onClick={()=>setMenu(false)}>Đóng menu</button></div><Link to="/explore">← Về TimeLens</Link><button disabled={!!transfer} onClick={()=>{setMenu(false);goToZone('S0')}}>Về trạm (hiện tại)</button><label>Cách khám phá<select disabled={!!transfer} aria-label="Cách khám phá" value={mode} onChange={e=>{setMenu(false);chooseMode(e.target.value as Mode)}}><option value="FREE">Khám phá tự do</option><option value="STORY">Hành trình câu chuyện</option><option value="MEMORY">Di sản & ký ức</option></select></label><p className="lw-small">{user?'Bản thử tài khoản · tiến độ do máy chủ xác nhận.':'Chế độ khách: không lưu thành tích hay nhận XP.'}</p><label>Thời gian hiện lời Chrono<select value={barkMs} onChange={e=>setBarkMs(Number(e.target.value))}><option value={5000}>5 giây</option><option value={8000}>8 giây</option><option value={12000}>12 giây</option></select></label><label>Âm lượng không gian · {Math.round(volume*100)}%<input aria-label="Âm lượng không gian" type="range" min="0" max="100" step="5" value={volume*100} onChange={e=>setVolume(Number(e.target.value)/100)}/></label><AtmosphereSettings zone={shell.zone} enabled={atmosphere.enabled} onEnabled={atmosphere.setEnabled} onReplay={atmosphere.replay}/>{stageTools}<button aria-pressed={hints} onClick={()=>setHints(v=>!v)}>{hints?'Ẩn nhãn gợi ý trong cảnh':'Hiện nhãn gợi ý trong cảnh'}</button><p className="lw-small">Điều khiển: WASD hoặc chạm mặt đất để đi · kéo để xoay camera · cuộn/chụm để thu phóng · E hoặc chạm để tương tác · Esc để đóng.</p></aside>}
  {!proof&&panel!=='WORLD'?(panel==='SOURCES'?sourcesView:atlasView):<>
   {proof&&panel!=='WORLD'&&<div className="lw-overlay" role="dialog" aria-modal="false" aria-label={panel==='ATLAS'?'Atlas ký ức':'Tư liệu & giả định'}>{panel==='SOURCES'?sourcesView:atlasView}</div>}
   <div className="lw-play" inert={transfer?true:undefined}><section className="lw-stage" aria-label="Không gian chơi">
    {!fallback?<Suspense fallback={<div className="lw-preview">Không gian đang mở… Bạn có thể dùng các điểm quan sát bên dưới ngay.</div>}><Scene modelView={modelView??undefined} atmosphere={atmosphere.phase} selectedTarget={shell.zone==='L3-D'&&synthesisStart?'SYN_'+synthesisStart:undefined} passageMotion={transfer?.route.passage&&transfer.phase!=='FAILED'?{id:transfer.route.passage,phase:transfer.phase,token:transfer.id}:undefined} onPassageComplete={passageComplete} completed={[...livingDone,...synthesisDraft,...(memorial?[`A01_${memorial.choice}_${memorial.phase}`]:[]),...(modelCompared?['MODEL_COMPARE']:[])]} onImpact={()=>audio.current?.strike()} onPartnerImpact={()=>audio.current?.partner()} proof={proof} p2={shell.zone==='S0'&&talk==='MACHINE'?p2.stage:'OFF'} p2Era={p2.era} firstPerson={firstPerson&&!xray&&!linkMode} hatch={shell.zone==='S1'?hatch:undefined} departing={!!transfer&&transfer.phase==='LOADING'&&transfer.route.from==='S0'&&shell.zone==='S0'} view={linkMode||xray?'xray':'walk'} controlsActive={!storyOpen&&!modelView&&!routePrompt&&!transfer&&!menu&&panel==='WORLD'} onReady={zone=>{setReadyZone(zone);sceneReady(zone)}} key={cameraReset} shell={shell} rice={rice.processed} a04Phase={a04Phase} working={working} airConfirmed={facts.includes('AIR_PATH_CORRECT')} structureConfirmed={hasStructure} onBusy={setCameraBusy} onMove={p=>{setTalk(null);setA04Phase('IDLE');setShell(s=>moveTo(s,p))}} onWalk={p=>{pendingDoor.current=null;pendingHatch.current=false;if(talk==='A04')setTalk(null);setA04Phase('IDLE');setShell(s=>moveTo(s,p))}} linkMode={linkMode} path={path} pairs={pairs} talk={talk} onPick={onScenePick} onFailure={()=>{const current=transferRef.current;if(current)setTransferBoth({...current,phase:'FAILED'});else setFallback(true)}}/></Suspense>:<div className="lw-map"><p className="lw-map-title">Sơ đồ 2D · cùng điểm quan sát và hành động</p><div className="lw-map-field" onPointerDown={e=>{if((e.target as HTMLElement).closest('button'))return;const b=e.currentTarget.getBoundingClientRect(),scale=shell.zone==='S2'?6:12;setTalk(null);setA04Phase('IDLE');setShell(s=>moveTo(s,[(e.clientX-b.x-b.width/2)/b.width*100/scale,(e.clientY-b.y-b.height/2)/b.height*100/scale]))}}>{zones[shell.zone].targets.filter(t=>!t.id.startsWith('ROUTE_')).map(t=><button key={t.id} data-target={t.id} style={{left:`${Math.min(92,Math.max(8,50+t.at[0]*(shell.zone==='S2'?6:12)))}%`,top:`${Math.min(88,Math.max(8,50+t.at[1]*(shell.zone==='S2'?6:12)))}%`}} onClick={()=>{lastIntent.current=null;setTalk(null);setShell(s=>startApproach(s,t.id))}}>{altLabel(t.id,t.label)}</button>)}<span className="lw-map-avatar" style={{left:`${50+shell.position[0]*(shell.zone==='S2'?6:12)}%`,top:`${50+shell.position[1]*(shell.zone==='S2'?6:12)}%`}}>● Bạn</span></div><div className="lw-targets">{([['Đi lên',0,-.5],['Đi trái',-.5,0],['Đi xuống',0,.5],['Đi phải',.5,0]] as const).map(([label,x,z])=><button key={label} onClick={()=>{setTalk(null);setA04Phase('IDLE');setShell(s=>moveTo(s,[s.position[0]+x,s.position[1]+z]))}}>{label}</button>)}</div></div>}
    {proof&&nearby&&!talk&&!synthesisPayoff&&<button className="lw-prompt" data-target={nearby.id} onClick={()=>onScenePick(nearby.id)}><kbd>E</kbd> / Chạm · {nearby.label}</button>}
    <div className="lw-scene-hud"><span>{linkMode?'Chạm các điểm trong mô hình để nối.':'Chạm vật thể để tới gần; chạm lại để ghi quan sát.'}</span>{shell.zone==='L1-B'&&<button aria-pressed={linkMode} onClick={()=>{setTalk(null);setLinkMode(v=>!v);setPath([])}}>Nối đường khí trong mô hình</button>}{['L1-D','L2-A','L3-A'].includes(shell.zone)&&<button aria-pressed={linkMode} onClick={()=>{setTalk(null);setLinkMode(v=>!v);setPairs([]);setLinkStart(null)}}>Nối các tầng trong mô hình</button>}</div>{!proof&&stageTools}
   </section>{proof&&(xray||linkMode)&&shell.zone.startsWith('L')&&<ol className="lw-xray-legend" aria-label="Các lớp trong mặt cắt">{([['S','Mặt đất · bìa rừng (S1)'],['L1','Tầng 1 · '+(shell.zone.startsWith('L1')?zones[shell.zone].title:'lớp trên')],['L2','Tầng 2 · lớp giữa (L2-A, góc L2-D)'],['L3','Tầng 3 · lớp dưới (L3-A)']] as const).map(([k,label])=><li key={k} aria-current={shell.zone.startsWith(k)?'location':undefined}>{label}{shell.zone.startsWith(k)?' · bạn đang ở đây':''}</li>)}<li className="lw-xray-route lw-xray-route--thematic">━ Chuyển cảnh chủ đề (nắp hầm → lối vào)</li><li className="lw-xray-route lw-xray-route--knowledge">━ Liên kết kiến thức giữa các tầng · không phải lối đi</li><li className="lw-xray-note">Sơ đồ diễn giải: khoảng cách giữa các tầng được nén lại</li></ol>}{synthesisPayoff&&<section className="lw-bark lw-synthesis-payoff" role="status"><p>Chrono: Từ lối vào và các lớp đất, đến không khí, bữa ăn và những bàn tay chăm sóc — một cộng đồng hiện ra.</p><p>{facts.includes('MS_SYNTHESIS_COMPLETE')?'Tổng hợp đã được ghi nhận.':'Kết quả đang chờ xác nhận; bạn có thể tiếp tục hoặc trở về.'}</p><button disabled={!facts.includes('MS_SYNTHESIS_COMPLETE')} onClick={()=>{setSynthesisPayoff(false);goToZone('S5')}}>Khép hành trình · về hiện tại</button><button onClick={()=>setSynthesisPayoff(false)}>Bỏ qua / tiếp tục khám phá</button></section>}{proof&&bark&&!memorialOpen&&!synthesisPayoff&&<p className="lw-bark" role="status" aria-live="polite"><b>Chrono:</b> {bark}</p>}<aside className="lw-compass">{shell.zone==='L1-C'&&!talk&&!echoSeen&&<p className="lw-echo" role="status">Tiếng dụng cụ khẽ chạm · phía cuối phòng, bên phải lối vào. Âm thanh giả lập; bạn có thể lần theo bằng mô tả này khi tắt tiếng.</p>}{shell.zone==='S5'&&memorialOpen&&<MemorialPanel checkpoint={memorial} pending={pending>0} available={!user||memorialStorageReady} epilogueReturned={epilogueReturned} synthesisConfirmed={facts.includes('MS_SYNTHESIS_COMPLETE')} onOffer={()=>{const t=memorial?.choice==='FLOWERS'?'MEMORIAL_FLOWERS':memorial?.choice==='INCENSE'?'MEMORIAL_INCENSE':null;if(t)onScenePick(t)}} onReturnStation={()=>{setMemorialOpen(false);goToZone('S0')}} onChange={changeMemorial} onClose={leaveMemorial}/>}{routePrompt&&<RoutePanel route={routePrompt} onEnter={()=>{void beginTransfer(routePrompt)}} onClose={()=>setRoutePrompt(null)}/>}  {talk&&<section className="lw-dialog" data-target={talk} role="dialog" aria-modal="false" aria-label={zones[shell.zone].targets.find(t=>t.id===talk)?.label}><button className="lw-close" onClick={()=>{setTalk(null);setA04Phase('IDLE')}}>Đóng</button><p className="lw-eyebrow">{talk==='NPC_COOK'?'NGƯỜI NẤU BẾP':Object.hasOwn(ZONE_NPC_PROFILES,talk)?ZONE_NPC_PROFILES[talk].speakerLabel:talk==='KHA'?'KHA':'CHRONO'}</p><h2>{zones[shell.zone].targets.find(t=>t.id===talk)?.label}</h2>{!livingTarget(talk)&&<p>{zones[shell.zone].targets.find(t=>t.id===talk)?.description}</p>}
    {talk==='NPC_COOK'?<CookConversation facts={facts} echoSeen={echoSeen} onEcho={hearKitchenEcho} pending={pending>0} durable={!user||echoReady}/>:Object.hasOwn(ZONE_NPC_PROFILES,talk)?<ZoneNpcConversation targetId={talk} ctx={activityCtx} onTopicSeen={recordNpcTopic} onEchoHeard={recordZoneEcho}/>:talk==='A23_CAMPAIGN'?<CedarFallsTablePanel completed={livingDone.includes('A23_CAMPAIGN')} m2={m2State} onInspectSection={recordCedarSection} onCompleteActivity={completeCedarFalls}/>:talk==='KHA'?<KhaConversation facts={facts} onBoard={()=>{setTalk(null);setShell(s=>startApproach(s,'MACHINE'))}}/>:talk==='MACHINE'?<P2Panel state={p2} onChange={setP2} onActivate={activateMachine}/>:talk==='A04'?<A04Panel phase={a04Phase} processed={rice.processed} observe={observe} onObserve={setObserve} onAction={actA04} onStroke={releaseSide} onContinue={()=>goToZone('L1-B')}/>:talk==='MODEL_COMPARE'?<button onClick={()=>onScenePick('MODEL_COMPARE')}>Quan sát sa bàn</button>:talk==='L2D_NICHE'?<><p>Các lớp chỉ có ý nghĩa khi có đường nối và điều kiện sinh hoạt. Đối chiếu mô hình đất trước mặt với phần thông khí bạn đã khám phá.</p><button onClick={()=>{setTalk(null);setXray(true)}}>Đối chiếu mặt cắt bốn lớp</button><button onClick={()=>goToZone('L1-B')}>Nhìn lại thông khí</button></>:talk==='MEMORIAL_READ'?<><p>Tại Củ Chi hôm nay, không gian tưởng niệm là nơi lắng lại để tri ân những con người đã sống, lao động và gìn giữ vùng đất này. Công trình Đền tưởng niệm liệt sĩ Bến Dược ngoài thực địa được khởi công năm 1993, khánh thành giai đoạn đầu năm 1995 (theo tư liệu Cục Di sản văn hóa); sân tưởng niệm 3D này là không gian diễn giải hiện đại, không đặt vào bối cảnh 1967.</p>{epilogueReturned&&facts.includes('MS_SYNTHESIS_COMPLETE')&&<p role="status">Epilogue: Bạn đã đi trọn Mạch Sống 1967 và trở về hiện tại. Những căn hầm, bếp lửa, nguồn nước và bàn tay chăm sóc nay kết nối thành ký ức cộng đồng.</p>}<div className="lw-targets"><button onClick={()=>{setTalk(null);setMemorialOpen(true)}}>Mở khoảng lặng tưởng niệm</button><button onClick={()=>{setTalk(null);goToZone('S0')}}>Trở về trạm thời gian</button></div></>:talk?.startsWith('MEMORIAL_')?<div className="lw-targets"><button onClick={()=>onScenePick(talk)}>{memorial?.phase==='SELECTED'&&((talk==='MEMORIAL_FLOWERS'&&memorial.choice==='FLOWERS')||(talk==='MEMORIAL_INCENSE'&&memorial.choice==='INCENSE'))?(talk==='MEMORIAL_FLOWERS'?'Đặt hoa tưởng niệm':'Thắp hương tưởng niệm'):'Mở khoảng lặng tưởng niệm'}</button><button onClick={()=>{setTalk(null);goToZone('S0')}}>Trở về trạm thời gian</button></div>:livingTarget(talk)?<><details className="lw-room-story"><summary>Câu chuyện &amp; tư liệu</summary><p>{livingTarget(talk)!.description}</p>{getM2SurfaceTarget(talk)&&<><p><b>Ý nghĩa trong mạch sống:</b> {getM2SurfaceTarget(talk)!.why}</p><p className="lw-small"><b>Hỗ trợ tiếp cận (1 chạm):</b> {getM2SurfaceTarget(talk)!.oneTapHint} · Nhãn sự thật: <b>{getM2SurfaceTarget(talk)!.truth}</b></p></>}<p className="lw-small">Cảnh diễn giải và nhân vật hư cấu giáo dục; vị trí phòng chưa được xác minh.</p></details><button disabled={livingDone.includes(talk)||!!(livingTarget(talk)?.requires&&!livingDone.includes(livingTarget(talk)!.requires!))} onClick={()=>doLivingAction(talk)}>{livingDone.includes(talk)?'Đã thực hiện':livingTarget(talk)!.action}</button>{livingTarget(talk)?.requires&&!livingDone.includes(livingTarget(talk)!.requires!)&&<p>Hãy chuẩn bị vật dụng ở điểm trước.</p>}{livingDone.includes(talk)&&!getM2SurfaceTarget(talk)&&<p>{livingTarget(talk)!.payoff}</p>}<M2StationGuide target={talk} completed={livingDone} onApproach={id=>{setTalk(null);lastIntent.current=null;setShell(s=>startApproach(s,id))}} onNavigate={zone=>{setTalk(null);goToZone(zone)}}/>{talk==='L2B_LETTER'&&<FutureLetterPanel key={`${user?.id??'guest'}:${creativeReset}`} m2={m2State} onToggleConsent={accepted=>updateM2State(prev=>({...prev,consentAccepted:accepted}))} onSaveLetter={saveFutureLetter}/>}<CoreProofPanel onSpatial={()=>{setTalk(null);setShell(s=>startApproach(s,'Q4_HEARTH'))}} onNavigateTarget={id=>{setTalk(null);lastIntent.current=null;setShell(s=>startApproach(s,id))}} onNavigateZone={z=>{setTalk(null);goToZone(z)}} key={talk} target={talk} enabled={!user||availableQuests.includes(coreObservations[talk]?.quest??'Q6')} facts={facts} pendingFacts={pendingCore} onProof={prove} onNote={setNote}/></>:<button onClick={()=>inspect()}>Ghi điều vừa quan sát</button>}
  </section>}
  {travel&&<section className="lw-moment"><h2>Qua cánh cửa thời gian…</h2><p>Bối cảnh tái dựng giáo dục · Củ Chi 1967</p><button onClick={()=>{setTravel(false);setWorking(false);changeZone('S2')}}>Bỏ qua chuyển cảnh</button></section>}
  {prologue&&shell.zone==='S0'&&<WorldStoryOpening onMeet={()=>{setPrologue(false);setShell(s=>startApproach(s,'KHA'))}} onExplore={()=>{setPrologue(false);if(proof)approachRoute(timeRoute(mode));else goToZone('L1-B')}}/>}
  {momentVisible&&<section className="lw-moment" aria-label="Một góc nhìn mới"><h2>Một cấu trúc, nhiều điều kiện sống</h2><p>Hai phát hiện đã gặp nhau. Quay lại thông khí để thấy điều bạn vừa hiểu thay đổi cách đọc một chi tiết cũ.</p><button onClick={()=>{setMoment(false);setCallbackSeen(true);goToZone('L1-B')}}>Nhìn lại thông khí</button><button onClick={()=>{resolveMoment('SKIPPED')}}>Để sau · vẫn còn trong Atlas</button></section>}{!talk&&!memorialOpen&&!(prologue&&shell.zone==='S0')&&!travel&&!routePrompt&&!momentVisible&&<>{proof?<><p className="lw-eyebrow">MỤC TIÊU</p><h2>{shell.zone==='S5'?(epilogueReturned?'Hành trình đã khép lại · ký ức và tri ân':'Tham quan hoặc dừng lại yên lặng'):m2ZoneGoals[shell.zone]?m2ZoneGoals[shell.zone]:isLivingZone(shell.zone)?livingSpaces[shell.zone].goal:shell.zone==='L3-D'?'Nối ba quan hệ trên sa bàn':shell.zone==='L2-D'?'Đối chiếu các lớp trong nội cảnh':shell.zone==='S1'?(q1.includes('Q1_HATCH')?'Từ dấu cửa tới đời sống trên mặt đất':'Dấu cửa giữa rừng'):shell.zone==='S2'?'Thử một nhịp lao động':['L1-D','L2-A','L3-A'].includes(shell.zone)&&!hasStructure?'Những lớp hầm liên hệ thế nào?':connected?'Nhìn lại bằng một góc nhìn mới':mode==='MEMORY'?'Một câu chuyện có nhiều lớp nguồn':hasAir?'Những lớp hầm liên hệ thế nào?':'Điều gì giúp không gian ngầm có thể sử dụng?'}</h2>{hintLevel>0&&HINTS[shell.zone]&&<p className="lw-hint">{HINTS[shell.zone]![Math.min(hintLevel,2)-1]}</p>}<button className="lw-hint-button" onClick={()=>{if(hintLevel>=2||!HINTS[shell.zone]){continueJourney();return}setHintLevel(v=>v+1)}}>{hintLevel===0?'Gợi ý':hintLevel===1?'Gợi ý thêm':'Đưa tôi tới gần'}</button>{connected&&deliveredMoment==='PRESENTED'&&!moment&&<button onClick={()=>setMoment(true)}>Tiếp tục góc nhìn mới</button>}{shell.zone==='S1'&&<p className="lw-small">{user?'Phát hiện của bạn được lưu vào hành trình khi có kết nối.':'Chơi thử: những gì bạn tìm thấy chỉ lưu trên máy này.'}</p>}</>:<><p className="lw-eyebrow">CHRONO / LA BÀN</p><h2>{shell.zone==='S5'?(epilogueReturned?'Hành trình đã khép lại · ký ức và tri ân':'Tham quan hoặc dừng lại yên lặng'):m2ZoneGoals[shell.zone]?m2ZoneGoals[shell.zone]:isLivingZone(shell.zone)?livingSpaces[shell.zone].goal:shell.zone==='L3-D'?'Nối ba quan hệ trên sa bàn':shell.zone==='L2-D'?'Đối chiếu các lớp trong nội cảnh':shell.zone==='S1'?(q1.includes('Q1_HATCH')?'Từ dấu cửa tới đời sống trên mặt đất':'Dấu cửa giữa rừng'):shell.zone==='S2'?'Thử một nhịp lao động':['L1-D','L2-A','L3-A'].includes(shell.zone)&&!hasStructure?'Những lớp hầm liên hệ thế nào?':connected?'Nhìn lại bằng một góc nhìn mới':mode==='MEMORY'?'Một câu chuyện có nhiều lớp nguồn':hasAir?'Những lớp hầm liên hệ thế nào?':'Điều gì giúp không gian ngầm có thể sử dụng?'}</h2><button className="lw-primary" onClick={continueJourney}>Tiếp tục hành trình</button>{connected&&deliveredMoment==='PRESENTED'&&!moment&&<button onClick={()=>setMoment(true)}>Tiếp tục góc nhìn mới</button>}<p className="lw-small">{shell.zone==='S1'?'Những gì bạn tìm thấy ở bìa rừng được lưu trên máy này cho tới khi hành trình được xác nhận.':'Bạn có thể khám phá khác thứ tự. Không cần hoàn thành “Dấu cửa giữa rừng”.'}</p></>}</>}<p className="lw-feedback" role="status" aria-live="polite">{proof&&note.startsWith('Chrono:')?'':note}</p>   {!talk&&connected&&shell.zone==='L1-B'&&<section className="lw-card lw-reveal"><h2>Nhìn lại: từ một lỗ mở đến cả hệ thống</h2><p>Trước đó bạn nhìn lỗ thông hơi như một chi tiết riêng. Khi đã thấy các lớp và điểm chuyển, ta có thể đặt câu hỏi mới: một cấu trúc có tổ chức hỗ trợ điều kiện sử dụng không gian bên trong như thế nào? Các mũi tên chỉ là diễn giải, không khẳng định khí chạy qua mọi đoạn của mô hình.</p><button onClick={()=>{resolveMoment('WATCHED');setNote('Bạn vừa nhìn lại một phát hiện bằng kiến thức mới. Điều kiện sinh hoạt sẽ mở ra những câu hỏi tiếp theo.')}}>Lưu góc nhìn này</button></section>}{!talk&&kitchenCareConnected&&!facts.includes('KITCHEN_CARE_REFLECTED')&&!pendingCore.includes('KITCHEN_CARE_REFLECTED')&&shell.zone==='L1-C'&&<section className="lw-card lw-reveal"><h2>Nhìn lại gian bếp sau nơi chăm sóc</h2><p>Khi đã đi qua nguồn nước và nơi chăm sóc, bữa cơm không khói hiện ra trong một mạch sống rộng hơn: công trình, từng gàu nước và những bàn tay chăm lo cùng nâng đỡ đời sống cộng đồng.</p><button onClick={()=>prove('Q4','REFLECT_KITCHEN_CARE','',{},'KITCHEN_CARE_REFLECTED')}>Lưu góc nhìn mới về bếp</button></section>}
{proof&&<details key={shell.zone} className="lw-world-exits"><summary>Điểm chuyển trong khu hiện tại</summary>{routesFrom(shell.zone).filter(r=>r.type!=='KNOWLEDGE_LINK'&&r.id!=='FOREST_ENTRANCE' /* the concealed hatch itself is the way down (Q1 P0) */).map(r=><button key={r.id} data-target={r.target} onClick={()=>approachRoute(r)}>Tới điểm · {r.label}</button>)}</details>}
<button className="lw-assist-toggle" aria-expanded={assist||fallback} onClick={()=>setAssist(v=>!v)}>Điều khiển bàn phím / 2D</button>{(assist||fallback)&&<div className="lw-alternatives">   <section className="lw-card"><h2>Đến gần để khám phá</h2><div className="lw-targets">{zones[shell.zone].targets.filter(t=>(proof||!t.id.startsWith('ROUTE_'))&&!(proof&&t.id==='ROUTE_FOREST_ENTRANCE')).map(t=><button key={t.id} data-target={t.id} onClick={()=>{lastIntent.current=null;setTalk(null);setShell(s=>startApproach(s,t.id))}}>{altLabel(t.id,t.label)}</button>)}</div>
   {shell.zone==='L1-B'&&<div className="lw-workbench"><h3>Thử nối một đường thông khí</h3><p>Chọn các điểm theo thứ tự bạn muốn nối, rồi xem kết quả.</p><div className="lw-targets">{[['Mặt đất','OPENING'],['Đoạn dẫn','PASSAGE'],['Không gian trong','INTERIOR']].map(([label,key])=><button key={key} onClick={()=>setPath(s=>[...s,key].slice(-3))}>{label}</button>)}</div><p>{path.map(k=>({OPENING:'Lỗ mở',PASSAGE:'Đoạn dẫn',INTERIOR:'Bên trong'}[k]??k)).join(' → ')||'Chưa có đường nối'}</p><button onClick={()=>tryAirPath(path)}>Thử đường nối</button><button disabled={!facts.includes('AIR_PATH_CORRECT')} onClick={confirmAirMeaning}>Nối thông khí ↔ điều kiện sinh hoạt</button></div>}
   {['L1-D','L2-A','L3-A'].includes(shell.zone)&&<div className="lw-workbench"><h3>Kết nối các lớp trong mô hình</h3><label>Từ<select aria-label="Lớp bắt đầu" value={pairFrom} onChange={e=>setPairFrom(e.target.value)}>{[1,2,3].map(n=><option key={n} value={`STRUCT_LAYER_${n}`}>Lớp {n}</option>)}</select></label><label>Đến<select aria-label="Lớp kết thúc" value={pairTo} onChange={e=>setPairTo(e.target.value)}>{[1,2,3].map(n=><option key={n} value={`STRUCT_LAYER_${n}`}>Lớp {n}</option>)}</select></label><button onClick={()=>setPairs(s=>[...s,[pairFrom,pairTo]].slice(-2))}>Đặt đường nối</button><p>{pairs.map(p=>p.map(v=>v.at(-1)).join(' ↔ ')).join(' / ')}</p><button onClick={()=>tryStructure(pairs)}>Ghép thành hệ thống</button></div>}
   </section>
</div>}</aside></div>
   {!proof&&<nav className="lw-zone-nav" aria-label="Chuyển cảnh theo chủ đề">{(Object.keys(zones) as Zone[]).map(z=><button aria-current={shell.zone===z?'location':undefined} key={z} onClick={()=>changeZone(z)}>{zones[z].title}</button>)}</nav>}
  </>}

 </main>
}
