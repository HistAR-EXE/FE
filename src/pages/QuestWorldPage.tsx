import {AppLayout} from '../components/layout/AppLayout'
import LivingWorldPage from '../features/living-world/LivingWorldPage'

/** The mission tab is the world itself, inside the existing authenticated product. */
export function QuestWorldPage(){
 return <AppLayout hideTopNav className="quest-world-layout"><div className="quest-world-viewport" aria-label="Nhiệm vụ · Thế giới TimeLens"><LivingWorldPage presentation="product"/></div></AppLayout>
}
