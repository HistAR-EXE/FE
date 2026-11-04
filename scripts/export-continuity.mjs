import {worldRoutes,typeLabels} from '../src/features/living-world/worldContinuity.ts'
import {writeFileSync} from 'node:fs'
const base='../docs/superpowers/m1/2026-11-02-continuity-proof/'
writeFileSync(base+'routes.json',JSON.stringify({scope:'Six existing scenes only; no physical verified routes',routes:worldRoutes},null,2))
const q=x=>'"'+String(x).replaceAll('"','""')+'"'
writeFileSync(base+'routes.csv',[['ID','From','To','Route type','Target','Label','Context','Truth class','Historical approval'],...worldRoutes.map(r=>[r.id,r.from,r.to,r.type,r.target,r.label,typeLabels[r.type],'FICTIONAL_EDUCATIONAL transition; RECONSTRUCTED educational destination','NOT HISTORICALLY APPROVED; no archaeological adjacency claimed'])].map(r=>r.map(q).join(',')).join('\n'))
