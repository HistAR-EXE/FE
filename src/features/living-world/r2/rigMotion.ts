import type {AnimationAction} from 'three'

/** A stopped mixer clock cannot finish fades; settle the current pose before freezing it. */
export function finishPoseTransition(actions:Iterable<AnimationAction>,current:AnimationAction){
 for(const action of actions){action.stopFading();action.setEffectiveWeight(action===current?1:0)}
}
