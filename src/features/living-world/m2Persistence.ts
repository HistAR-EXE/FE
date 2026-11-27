import {m2SurfaceTargets,SERVER_ACTIVITY_TARGETS} from './m2WorldExpansion'
import type {WorldIntent} from './worldQueue'

type ExistingAction={intent:{actionType:string;targetId:string}}
/** Imported local v1 actions are proposals, never server acknowledgements. */
export function planM2ActivityMigration(local:readonly string[],verified:readonly string[],queued:readonly ExistingAction[]):WorldIntent[]{
 const known=new Set(verified),pending=new Set(queued.filter(r=>r.intent.actionType==='COMPLETE_ACTIVITY').map(r=>r.intent.targetId))
 const remaining=new Set(local.filter(id=>SERVER_ACTIVITY_TARGETS.has(id)&&!known.has(id)&&!pending.has(id)))
 const result:WorldIntent[]=[],baseRequirements:Record<string,string>={A02_SMOKE:'A02_PREPARE',A13_REST:'A13_BELONGINGS',A14_SHARE:'A14_WATER',A15_CARE:'A15_CLOTH',L2B_LETTER:'L2B_RECORDS'}
 let advanced=true
 while(advanced){advanced=false;for(const id of remaining){const requires=m2SurfaceTargets[id]?.requires??baseRequirements[id];if(requires&&!known.has(requires)&&!pending.has(requires))continue
  result.push({actionType:'COMPLETE_ACTIVITY',targetId:id,payload:{}});known.add(id);remaining.delete(id);advanced=true
 }}
 return result
}
/** Canonical or queued reconciliation decides activity display; legacy local rows never acknowledge it. */
export function mergeM2PresentationActivities(serverOrQueued:readonly string[],_legacyLocal:readonly string[]):string[]{return [...new Set(serverOrQueued)]}
