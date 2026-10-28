import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { photoFlowPath } from '../features/photo-flow/photoFlow'
/** Compatibility entry: all saved-image links use the single studio screen. */
export function SharePage() {
 const [params] = useSearchParams(), location = useLocation()
 return <Navigate replace to={photoFlowPath(params,'share')} state={location.state}/>
}
