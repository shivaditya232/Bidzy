import { useEffect, useState, Fragment } from 'react'
import { Navigate } from 'react-router-dom'
import { useRoomId } from '../api/room'
import { getRoom, roomHome } from '../api/rooms'
import { isLoggedIn, logout } from '../api/auth'
import { RoomContext } from './roomContext'

// Where to send people who open a room they aren't in (or one that doesn't exist)
const NO_ROOM_PATH='/lobby'

// Guards every /rooms/:roomId/... page.
// Asks the server who you are in THIS room (the server is the real check; this just routes you sensibly).
// allowedRole: 'host' | 'team' | undefined (any member)
function RoomGuard({ children, allowedRole }) {
    const roomId=useRoomId()
    const [state,setState]=useState({ roomId:null })

    useEffect(()=>{
        if(!isLoggedIn()) return
        let cancelled=false
        getRoom(roomId)
            .then(data=>{ if(!cancelled) setState({ roomId, room:data.room, role:data.me.role, me:data.me }) })
            .catch(err=>{ if(!cancelled) setState({ roomId, error:err.response?.status||500 }) })
        return ()=>{ cancelled=true }
    },[roomId])

    if(!isLoggedIn()) return <Navigate to="/login" replace />
    if(state.roomId!==roomId) return null // still loading this room

    if(state.error===401){
        logout()
        return <Navigate to="/login" replace />
    }
    if(state.error) return <Navigate to={NO_ROOM_PATH} replace /> // 403 not a member / 404 no such room

    // wrong page for your role (e.g. a team opening /host) -> your page in this room
    if(allowedRole && state.role!==allowedRole) return <Navigate to={roomHome(roomId,state.role)} replace />

    // key: switching to another room fully re-mounts the page, so nothing from the old room lingers
    return (
        <RoomContext.Provider value={{ roomId, room:state.room, role:state.role, me:state.me }}>
            <Fragment key={roomId}>{children}</Fragment>
        </RoomContext.Provider>
    )
}

export default RoomGuard
