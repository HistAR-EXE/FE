import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const routes = readFileSync(join(root, 'src/routes/AppRoutes.tsx'), 'utf8')
const chapterPaths = [
  '/explore/:locationId',
  '/artifacts',
  '/tour/360/:locationId?',
  '/time-portal/:locationId',
  '/quests/:questId/play/:minigameId',
  '/scan',
  '/chat',
]

const missing = chapterPaths.filter((path) => !routes.includes(`path="${path}"`))
if (missing.length) {
  console.error('Cu Chi chapter routes are not registered:', missing.join(', '))
  process.exit(1)
}

const gateUrl = pathToFileURL(join(root, 'src/features/gamification/questGate.ts')).href
const { questMissingTourKeys } = await import(gateUrl)
const kitchen = 'scene:22222222-2222-2222-2222-222222222221'
const meeting = 'scene:22222222-2222-2222-2222-222222222223'
const quest = { unlockDiscoveryKeys: `${kitchen},${meeting}` }

if (!questMissingTourKeys(quest, [kitchen])) {
  console.error('One scene key must keep quests 337-339 locked')
  process.exit(1)
}
if (questMissingTourKeys(quest, [kitchen, meeting])) {
  console.error('Both scene keys must open quests 337-339')
  process.exit(1)
}

console.log('cu-chi chapter routes ok')
