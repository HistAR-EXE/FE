import type {Zone} from './worldModel'
// Environment modules are imported on demand per zone (scene streaming); nothing preloads all zones.
let s2:typeof import('./s2Environment')|undefined,zonesModule:typeof import('./zoneEnvironments')|undefined
let loadingS2:Promise<void>|undefined,loadingZones:Promise<void>|undefined
export async function prepareWorldZone(zone:Zone){
 if(zone==='S2'){if(s2)return;if(!loadingS2)loadingS2=import('./s2Environment').then(module=>{s2=module}).catch(error=>{loadingS2=undefined;throw error});await loadingS2;return}
 if(zonesModule)return
 if(!loadingZones)loadingZones=import('./zoneEnvironments').then(module=>{zonesModule=module}).catch(error=>{loadingZones=undefined;throw error})
 await loadingZones
}
export function buildPreparedS2(...args:Parameters<typeof import('./s2Environment')['createS2']>){if(!s2)throw new Error('S2 resources are not ready');return s2.createS2(...args)}
export function buildPreparedZone(...args:Parameters<typeof import('./zoneEnvironments')['buildZone']>){if(!zonesModule)throw new Error('Zone resources are not ready');return zonesModule.buildZone(...args)}
// G3 immersive (default journey only): R2 runtime chunk + this zone's optimized assets, streamed on demand.
let r2:typeof import('./r2/r2Runtime')|undefined
export async function prepareR2Zone(zone:Zone){if(!r2)r2=await import('./r2/r2Runtime');await r2.prepareR2(zone);return r2}
