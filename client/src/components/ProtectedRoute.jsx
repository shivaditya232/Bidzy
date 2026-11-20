import {Navigate} from 'react-router-dom'
import { isLoggedIn } from '../api/auth'

// for pages that just need you logged in (e.g. the future lobby).
// pages inside a room use RoomGuard instead, which also checks your role in that room.
function ProtectedRoute({children}){
    if(!isLoggedIn()){
        return <Navigate to="/login" />
    }
    return children
}
export default ProtectedRoute
