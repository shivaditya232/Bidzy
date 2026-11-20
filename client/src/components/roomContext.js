import { createContext, useContext } from 'react'

export const RoomContext=createContext(null)

// inside any page under a RoomGuard: const { roomId, room, role, me } = useRoom()
// role is 'host' or 'team'; me = {id, role, teamName, purseRemaining}
export const useRoom=()=>useContext(RoomContext)
