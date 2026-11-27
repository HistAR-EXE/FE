/** Scoped GPU regression entry point. The former seeded 24/24 fixture is archived in the refinement evidence.
 * Natural account coverage: m1-natural-journey.browser.mjs with LW_M2_EXTENSION=true. */
import {spawnSync} from 'node:child_process'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const fe=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const output=process.argv[2]??`../docs/m2-refinement-2026-11-24/media-runtime-${new Date().toISOString().replace(/[:.]/g,'-')}`
const build=process.argv[3]??'../docs/m2-refinement-2026-11-24/candidate-reviewed'
const result=spawnSync(process.execPath,[path.join(fe,'scripts/m2-refinement.browser.mjs'),output,build],{cwd:fe,stdio:'inherit',windowsHide:true})
if(result.error)throw result.error
process.exit(result.status??1)
